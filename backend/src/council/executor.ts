// Agent Executor — executes subtasks on the appropriate agents
// ~/missioncontrol/backend/src/council/executor.ts

import { agentRegistry } from './agentRegistry';
import type { SubTask, TaskResult, AutonomousJob, JobLog } from './automation_types';
import { db } from '../db'; // existing db module

interface ExecutionContext {
  jobId: string;
  apiKeys: Record<string, string>;
  armState: boolean;
}

export async function executeSubtask(
  subtask: SubTask,
  ctx: ExecutionContext,
  aiRouter: any
): Promise<TaskResult> {
  const startTime = Date.now();

  try {
    const agent = agentRegistry.getAgent(subtask.agentId);
    if (!agent) {
      throw new Error(`Unknown agent: ${subtask.agentId}`);
    }

    log(ctx.jobId, 'info', subtask.agentId, `Starting execution: ${subtask.description}`);

    let result: TaskResult;

    switch (subtask.agentId) {
      case 'claude-code':
        result = await executeClaudeCode(subtask, ctx);
        break;
      case 'chatgpt':
        result = await executeChatGPT(subtask, ctx);
        break;
      case 'gemini':
        result = await executeGemini(subtask, ctx);
        break;
      case 'kimi':
        result = await executeKimi(subtask, ctx);
        break;
      case 'qwen-local':
      case 'qwen-coder-local':
        result = await executeOllama(subtask, ctx, aiRouter);
        break;
      case 'system':
        result = await executeSystem(subtask, ctx);
        break;
      default:
        result = await executeGeneric(subtask, ctx, aiRouter);
    }

    const duration = Date.now() - startTime;
    result.metrics.durationMs = duration;

    log(ctx.jobId, 'info', subtask.agentId, 
      `Completed in ${duration}ms, tokens: ${result.metrics.tokensUsed}, cost: $${result.metrics.cost.toFixed(4)}`);

    return result;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    log(ctx.jobId, 'error', subtask.agentId, `Execution failed: ${error.message}`);

    return {
      success: false,
      output: '',
      metrics: { tokensUsed: 0, durationMs: duration, cost: 0 },
      error: error.message,
    };
  }
}

// ─── Claude Code Execution ───
async function executeClaudeCode(subtask: SubTask, ctx: ExecutionContext): Promise<TaskResult> {
  const { Bun } = await import('bun');
  const params = subtask.parameters;

  let cmd: string[];

  if (subtask.method === 'claude-code:prompt') {
    cmd = ['claude', params.prompt];
    if (params.cwd) cmd.push('--cwd', params.cwd);
  } else if (subtask.method === 'claude-code:edit') {
    cmd = ['claude', '--files', ...(params.files || []), params.instruction];
  } else if (subtask.method === 'claude-code:git') {
    cmd = ['claude', '--git', params.operation];
    if (params.message) cmd.push(params.message);
  } else {
    cmd = ['claude', params.prompt || subtask.description];
  }

  const timeout = (params.timeout || 300) * 1000;

  const proc = Bun.spawn(cmd, {
    cwd: params.cwd || process.env.HOME,
    timeout,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = proc.exitCode;

  const tokensUsed = estimateTokens(stdout + stderr);
  const cost = agentRegistry.getAgent('claude-code')!.costPer1K * (tokensUsed / 1000);

  return {
    success: exitCode === 0,
    output: stdout || stderr,
    artifacts: extractArtifacts(stdout),
    metrics: { tokensUsed, durationMs: 0, cost },
    error: exitCode !== 0 ? stderr : undefined,
  };
}

// ─── ChatGPT Execution ───
async function executeChatGPT(subtask: SubTask, ctx: ExecutionContext): Promise<TaskResult> {
  const apiKey = ctx.apiKeys.openai;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const params = subtask.parameters;
  const model = params.model || 'gpt-4o';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: params.prompt || subtask.description },
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI API error');
  }

  const tokensUsed = data.usage?.total_tokens || 0;
  const cost = agentRegistry.getAgent('chatgpt')!.costPer1K * (tokensUsed / 1000);

  return {
    success: true,
    output: data.choices[0]?.message?.content || '',
    metrics: { tokensUsed, durationMs: 0, cost },
  };
}

// ─── Gemini Execution ───
async function executeGemini(subtask: SubTask, ctx: ExecutionContext): Promise<TaskResult> {
  const apiKey = ctx.apiKeys.gemini;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const params = subtask.parameters;
  const model = params.model || 'gemini-2.5-pro';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: params.prompt || subtask.description }] }],
      }),
    }
  );

  const data = await response.json();
# Part 4/5

  if (!response.ok) {
    throw new Error(data.error?.message || 'Gemini API error');
  }

  const output = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const tokensUsed = data.usageMetadata?.totalTokenCount || estimateTokens(output);
  const cost = agentRegistry.getAgent('gemini')!.costPer1K * (tokensUsed / 1000);

  return {
    success: true,
    output,
    metrics: { tokensUsed, durationMs: 0, cost },
  };
}

// ─── Kimi Execution ───
async function executeKimi(subtask: SubTask, ctx: ExecutionContext): Promise<TaskResult> {
  const apiKey = ctx.apiKeys.kimi;
  if (!apiKey) throw new Error('Kimi API key not configured');

  const params = subtask.parameters;
  const model = params.model || 'kimi-k2';

  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: params.prompt || subtask.description }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Kimi API error');
  }

  const tokensUsed = data.usage?.total_tokens || 0;
  const cost = agentRegistry.getAgent('kimi')!.costPer1K * (tokensUsed / 1000);

  return {
    success: true,
    output: data.choices[0]?.message?.content || '',
    metrics: { tokensUsed, durationMs: 0, cost },
  };
}

// ─── Ollama (Local) Execution ───
async function executeOllama(subtask: SubTask, ctx: ExecutionContext, aiRouter: any): Promise<TaskResult> {
  const params = subtask.parameters;
  const model = params.model || (subtask.agentId === 'qwen-coder-local' ? 'qwen2.5-coder:7b' : 'qwen2.5:7b');

  const prompt = params.prompt || subtask.description;

  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: params.maxTokens || 2048,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ollama error');
  }

  const output = data.response || '';
  const tokensUsed = data.eval_count || estimateTokens(output);

  return {
    success: true,
    output,
    metrics: { tokensUsed, durationMs: 0, cost: 0 }, // Local = free
  };
}

// ─── System Execution (Shell/AppleScript/File) ───
async function executeSystem(subtask: SubTask, ctx: ExecutionContext): Promise<TaskResult> {
  if (!ctx.armState) {
    throw new Error('System execution requires ARM state. Use Control tab to arm.');
  }

  const { Bun } = await import('bun');
  const params = subtask.parameters;

  let result: { stdout: string; stderr: string; exitCode: number };

  if (subtask.method === 'system:shell') {
    const proc = Bun.spawn(['/bin/sh', '-c', params.command], {
      cwd: params.cwd || process.env.HOME,
      timeout: (params.timeout || 60) * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    result = {
      stdout: await new Response(proc.stdout).text(),
      stderr: await new Response(proc.stderr).text(),
      exitCode: proc.exitCode,
    };
  } else if (subtask.method === 'system:applescript') {
    const proc = Bun.spawn(['osascript', '-e', params.script], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    result = {
      stdout: await new Response(proc.stdout).text(),
      stderr: await new Response(proc.stderr).text(),
      exitCode: proc.exitCode,
    };
  } else if (subtask.method === 'system:file') {
    result = await executeFileOperation(params);
  } else {
    throw new Error(`Unknown system method: ${subtask.method}`);
  }

  // Audit log
  try {
    db.query(`INSERT INTO audit_log (timestamp, action, command, user, result) VALUES (?, ?, ?, ?, ?)`)
      .run(new Date().toISOString(), 'AUTONOMOUS_SYSTEM', 
        `${subtask.method}: ${JSON.stringify(params)}`, 'autonomous-agent', 
        result.exitCode === 0 ? 'success' : 'failed');
  } catch (e) {
    // Audit table might not exist yet
  }

  return {
    success: result.exitCode === 0,
    output: result.stdout || result.stderr,
    metrics: { tokensUsed: 0, durationMs: 0, cost: 0 },
    error: result.exitCode !== 0 ? result.stderr : undefined,
  };
}

async function executeFileOperation(params: any): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { Bun } = await import('bun');
  const fs = await import('fs');
  const path = await import('path');
  const expandedPath = params.path.replace(/^~/, process.env.HOME || '');

  try {
    switch (params.operation) {
      case 'read':
        const content = await Bun.file(expandedPath).text();
        return { stdout: content, stderr: '', exitCode: 0 };
      case 'write':
        await Bun.write(expandedPath, params.content || '');
        return { stdout: 'Written', stderr: '', exitCode: 0 };
      case 'append':
        const existing = await Bun.file(expandedPath).text().catch(() => '');
        await Bun.write(expandedPath, existing + (params.content || ''));
        return { stdout: 'Appended', stderr: '', exitCode: 0 };
      case 'delete':
        fs.unlinkSync(expandedPath);
        return { stdout: 'Deleted', stderr: '', exitCode: 0 };
      case 'copy':
        fs.copyFileSync(expandedPath, params.destination);
        return { stdout: 'Copied', stderr: '', exitCode: 0 };
      case 'move':
        fs.renameSync(expandedPath, params.destination);
        return { stdout: 'Moved', stderr: '', exitCode: 0 };
      default:
        return { stdout: '', stderr: `Unknown operation: ${params.operation}`, exitCode: 1 };
    }
  } catch (e: any) {
    return { stdout: '', stderr: e.message, exitCode: 1 };
  }
}

// ─── Generic Fallback ───
async function executeGeneric(subtask: SubTask, ctx: ExecutionContext, aiRouter: any): Promise<TaskResult> {
  // Fallback: route through the existing AI router
  const response = await aiRouter.route({
    prompt: subtask.description,
    mode: 'SMART_HYBRID',
  });

  return {
    success: true,
    output: response.text,
    metrics: { tokensUsed: response.tokens || 0, durationMs: 0, cost: response.cost || 0 },
  };
}

// ─── Helpers ───
function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

function extractArtifacts(text: string): string[] {
  // Extract file paths, URLs, etc.
  const patterns = [
    /(?:created|modified|saved|wrote)\s+[`"']?([~\/][\w\/.-]+)/gi,
    /(https?:\/\/[^\s]+)/g,
  ];

  const artifacts: string[] = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      artifacts.push(match[1]);
    }
  }
  return [...new Set(artifacts)];
}

function log(jobId: string, level: 'info' | 'warn' | 'error' | 'debug', agent: string, message: string) {
  const entry: JobLog = {
    timestamp: new Date().toISOString(),
    level,
    agent,
    message,
  };

  try {
    db.query(`INSERT INTO autonomous_logs (job_id, timestamp, level, agent, message) VALUES (?, ?, ?, ?, ?)`)
      .run(jobId, entry.timestamp, level, agent, message);
  } catch (e) {
    // Table might not exist
    console.log(`[${level.toUpperCase()}] ${agent}: ${message}`);
  }
}
