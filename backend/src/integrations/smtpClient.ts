// Minimal SMTP client (RFC 5321) with STARTTLS / implicit TLS and AUTH PLAIN / LOGIN.
// ~/missioncontrol/backend/src/integrations/smtpClient.ts
//
// Bun has no built-in SMTP client and the project has no nodemailer dependency,
// so this module talks SMTP directly over node:net / node:tls (both supported by Bun).

import * as net from 'node:net';
import * as tls from 'node:tls';

export interface SmtpOptions {
  host: string;
  port: number;
  /** Encrypt the connection: implicit TLS on port 465, otherwise STARTTLS. */
  secure: boolean;
  user?: string;
  pass?: string;
  /** Milliseconds to wait for a server reply before failing. */
  timeoutMs?: number;
  /** Name sent in EHLO. */
  clientName?: string;
}

export interface SmtpMessage {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
}

export class SmtpError extends Error {
  constructor(message: string, public code?: number, public response?: string) {
    super(message);
    this.name = 'SmtpError';
  }
}

interface SmtpReply {
  code: number;
  lines: string[];
  raw: string;
}

class SmtpConnection {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = '';
  private waiters: Array<{ resolve: (r: SmtpReply) => void; reject: (e: Error) => void }> = [];
  private closed = false;
  private closeError: Error | null = null;
  private timeoutMs: number;

  constructor(socket: net.Socket | tls.TLSSocket, timeoutMs: number) {
    this.socket = socket;
    this.timeoutMs = timeoutMs;
    this.attach(socket);
  }

  private attach(socket: net.Socket | tls.TLSSocket) {
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => this.onData(chunk));
    socket.on('error', (err: Error) => this.fail(err));
    socket.on('close', () => this.fail(new SmtpError('Connection closed by server')));
    socket.on('timeout', () => this.fail(new SmtpError('SMTP connection timed out')));
  }

  private onData(chunk: string) {
    this.buffer += chunk;
    // A reply is complete when the last line has the form "NNN " (space, not dash).
    for (;;) {
      const lines = this.buffer.split(/\r?\n/);
      // Find the first terminal line.
      let endIdx = -1;
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3}( |$)/.test(lines[i])) { endIdx = i; break; }
      }
      if (endIdx === -1) return;
      const replyLines = lines.slice(0, endIdx + 1);
      this.buffer = lines.slice(endIdx + 1).join('\n');
      const code = parseInt(replyLines[endIdx].slice(0, 3), 10);
      const reply: SmtpReply = {
        code,
        lines: replyLines.map(l => l.slice(4)),
        raw: replyLines.join('\n'),
      };
      const waiter = this.waiters.shift();
      if (waiter) waiter.resolve(reply);
    }
  }

  private fail(err: Error) {
    if (this.closed) return;
    this.closed = true;
    this.closeError = err;
    const pending = this.waiters.splice(0);
    for (const w of pending) w.reject(err);
  }

  /** Wait for the next server reply (used for the greeting and after STARTTLS). */
  read(): Promise<SmtpReply> {
    if (this.closed) return Promise.reject(this.closeError || new SmtpError('Connection closed'));
    return new Promise<SmtpReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.findIndex(w => w.resolve === wrappedResolve);
        if (idx !== -1) this.waiters.splice(idx, 1);
        reject(new SmtpError(`Timed out waiting for SMTP reply after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
      const wrappedResolve = (r: SmtpReply) => { clearTimeout(timer); resolve(r); };
      const wrappedReject = (e: Error) => { clearTimeout(timer); reject(e); };
      this.waiters.push({ resolve: wrappedResolve, reject: wrappedReject });
    });
  }

  /** Send one command line and wait for its reply. */
  async command(line: string): Promise<SmtpReply> {
    if (this.closed) throw this.closeError || new SmtpError('Connection closed');
    const replyPromise = this.read();
    this.socket.write(line + '\r\n');
    return replyPromise;
  }

  /** Send a command and throw unless the reply code is one of `expected`. */
  async expect(line: string, expected: number[], what: string): Promise<SmtpReply> {
    const reply = await this.command(line);
    if (!expected.includes(reply.code)) {
      throw new SmtpError(`${what} failed: ${reply.raw.trim()}`, reply.code, reply.raw);
    }
    return reply;
  }

  /** Upgrade the current plaintext socket to TLS (after a successful STARTTLS). */
  upgradeToTls(host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const plain = this.socket as net.Socket;
      plain.removeAllListeners('data');
      plain.removeAllListeners('error');
      plain.removeAllListeners('close');
      plain.removeAllListeners('timeout');
      const secure = tls.connect({ socket: plain, servername: host, host }, () => {
        if (!secure.authorized) {
          reject(new SmtpError(`TLS certificate verification failed: ${secure.authorizationError}`));
          return;
        }
        this.socket = secure;
        this.buffer = '';
        this.attach(secure);
        resolve();
      });
      secure.once('error', (e: Error) => reject(new SmtpError(`TLS handshake with ${host} failed: ${e.message}`)));
    });
  }

  destroy() {
    this.closed = true;
    try { this.socket.destroy(); } catch {}
  }
}

function openSocket(opts: SmtpOptions, implicitTls: boolean, timeoutMs: number): Promise<net.Socket | tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => reject(new SmtpError(`Could not connect to ${opts.host}:${opts.port}: ${err.message}`));
    const onTimeout = () => { socket.destroy(); reject(new SmtpError(`Connection to ${opts.host}:${opts.port} timed out`)); };
    const connected = () => {
      socket.removeListener('error', onError);
      socket.removeListener('timeout', onTimeout);
      resolve(socket);
    };
    let socket: net.Socket | tls.TLSSocket;
    if (implicitTls) {
      socket = tls.connect({ host: opts.host, port: opts.port, servername: opts.host }, () => {
        if (!(socket as tls.TLSSocket).authorized) {
          reject(new SmtpError(`TLS certificate verification failed: ${(socket as tls.TLSSocket).authorizationError}`));
          socket.destroy();
          return;
        }
        connected();
      });
    } else {
      socket = net.connect({ host: opts.host, port: opts.port }, connected);
    }
    socket.setTimeout(timeoutMs);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
  });
}

function parseExtensions(ehlo: SmtpReply): Set<string> {
  const ext = new Set<string>();
  // First line is the server name; the rest are extensions such as "STARTTLS", "AUTH PLAIN LOGIN".
  for (const line of ehlo.lines.slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (!parts[0]) continue;
    ext.add(parts[0].toUpperCase());
    if (parts[0].toUpperCase() === 'AUTH') {
      for (const m of parts.slice(1)) ext.add(`AUTH:${m.toUpperCase()}`);
    }
  }
  return ext;
}

/**
 * Open a connection, negotiate TLS and authenticate.
 * Returns a ready-to-use session; callers must `destroy()` the connection when done.
 */
async function connectAndAuth(opts: SmtpOptions): Promise<{ conn: SmtpConnection; ext: Set<string> }> {
  if (!opts.host) throw new SmtpError('SMTP host is not configured');
  const timeoutMs = opts.timeoutMs ?? 15000;
  const clientName = opts.clientName || 'missioncontrol.local';
  const implicitTls = opts.port === 465;

  const socket = await openSocket(opts, implicitTls, timeoutMs);
  const conn = new SmtpConnection(socket, timeoutMs);
  try {
    const greeting = await conn.read();
    if (greeting.code !== 220) throw new SmtpError(`Unexpected greeting: ${greeting.raw.trim()}`, greeting.code, greeting.raw);

    let ehlo = await conn.expect(`EHLO ${clientName}`, [250], 'EHLO');
    let ext = parseExtensions(ehlo);

    if (!implicitTls) {
      if (ext.has('STARTTLS')) {
        await conn.expect('STARTTLS', [220], 'STARTTLS');
        await conn.upgradeToTls(opts.host);
        ehlo = await conn.expect(`EHLO ${clientName}`, [250], 'EHLO after STARTTLS');
        ext = parseExtensions(ehlo);
      } else if (opts.secure) {
        throw new SmtpError(`Server ${opts.host}:${opts.port} does not offer STARTTLS. Use port 465 for implicit TLS or disable TLS.`);
      } else if (opts.pass) {
        throw new SmtpError('Refusing to send a password over an unencrypted connection. Enable TLS or use port 465.');
      }
    }

    if (opts.user && opts.pass) {
      if (ext.has('AUTH:PLAIN') || !ext.has('AUTH:LOGIN')) {
        const token = Buffer.from(`\0${opts.user}\0${opts.pass}`, 'utf8').toString('base64');
        await conn.expect(`AUTH PLAIN ${token}`, [235], 'Authentication');
      } else {
        await conn.expect('AUTH LOGIN', [334], 'AUTH LOGIN');
        await conn.expect(Buffer.from(opts.user, 'utf8').toString('base64'), [334], 'AUTH LOGIN username');
        await conn.expect(Buffer.from(opts.pass, 'utf8').toString('base64'), [235], 'Authentication');
      }
    }
    return { conn, ext };
  } catch (e) {
    conn.destroy();
    throw e;
  }
}

/** Connect, negotiate TLS, authenticate, then QUIT. Throws on any failure. */
export async function verifySmtp(opts: SmtpOptions): Promise<{ extensions: string[] }> {
  const { conn, ext } = await connectAndAuth(opts);
  try {
    await conn.command('QUIT');
  } catch {
    // Some servers drop the connection right after QUIT; that is fine.
  } finally {
    conn.destroy();
  }
  return { extensions: [...ext] };
}

/** Send a message. Resolves with the server's final DATA response on success. */
export async function sendSmtp(opts: SmtpOptions, msg: SmtpMessage): Promise<{ response: string; messageId: string }> {
  const recipients = msg.to.map(t => t.trim()).filter(Boolean);
  if (recipients.length === 0) throw new SmtpError('No recipients configured');
  const fromAddr = extractAddress(msg.from);
  if (!fromAddr) throw new SmtpError('Invalid From address');

  const { messageId, data } = buildMime({ ...msg, to: recipients }, opts.host);
  const { conn } = await connectAndAuth(opts);
  try {
    await conn.expect(`MAIL FROM:<${fromAddr}>`, [250], 'MAIL FROM');
    for (const rcpt of recipients) {
      const addr = extractAddress(rcpt);
      if (!addr) throw new SmtpError(`Invalid recipient address: ${rcpt}`);
      await conn.expect(`RCPT TO:<${addr}>`, [250, 251], `RCPT TO ${addr}`);
    }
    await conn.expect('DATA', [354], 'DATA');
    const final = await conn.command(data + '\r\n.');
    if (final.code !== 250) throw new SmtpError(`Message rejected: ${final.raw.trim()}`, final.code, final.raw);
    try { await conn.command('QUIT'); } catch {}
    return { response: final.raw.trim(), messageId };
  } finally {
    conn.destroy();
  }
}

// ---------- MIME helpers ----------

/** Pull the bare address out of "Name <addr@host>" or "addr@host". */
export function extractAddress(input: string): string | null {
  const m = /<([^>]+)>/.exec(input);
  const addr = (m ? m[1] : input).trim();
  return /^[^\s@<>]+@[^\s@<>]+$/.test(addr) ? addr : null;
}

/** RFC 2047 encode a header value when it contains non-ASCII characters. */
export function encodeHeaderValue(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  // Split into encoded-words of at most 75 characters (RFC 2047 §2).
  const chunkSize = 45; // 45 bytes → 60 base64 chars + "=?UTF-8?B?" + "?=" = 72 chars
  const bytes = Buffer.from(value, 'utf8');
  const words: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    words.push(`=?UTF-8?B?${bytes.subarray(i, i + chunkSize).toString('base64')}?=`);
  }
  return words.join('\r\n ');
}

function base64Lines(input: string): string {
  const b64 = Buffer.from(input, 'utf8').toString('base64');
  return b64.replace(/(.{76})/g, '$1\r\n');
}

function dotStuff(body: string): string {
  return body.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

function buildMime(msg: SmtpMessage, host: string): { messageId: string; data: string } {
  const fromAddr = extractAddress(msg.from) || msg.from;
  const domain = fromAddr.split('@')[1] || host || 'missioncontrol.local';
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}>`;
  const headers = [
    `From: ${msg.from}`,
    `To: ${msg.to.join(', ')}`,
    `Subject: ${encodeHeaderValue(msg.subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'X-Mailer: Mission Control',
  ];

  let body: string;
  if (msg.html && msg.text) {
    const boundary = `----=_MC_${Math.random().toString(36).slice(2)}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Lines(msg.text),
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Lines(msg.html),
      `--${boundary}--`,
    ].join('\r\n');
  } else {
    const isHtml = Boolean(msg.html);
    headers.push(`Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`);
    headers.push('Content-Transfer-Encoding: base64');
    body = base64Lines(msg.html || msg.text || '');
  }

  return { messageId, data: headers.join('\r\n') + '\r\n\r\n' + dotStuff(body) };
}
