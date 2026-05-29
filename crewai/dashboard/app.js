"use strict";

// CrewAI monitoring dashboard — dependency-free.
// The API is served from the same origin, so relative paths work in dev and prod.

const API = "/api/v1";
// sessionStorage (not localStorage): the token is cleared when the tab closes,
// limiting exposure if the device is shared. All DOM writes use textContent to
// prevent XSS from run inputs/results.
const TOKEN_KEY = "crewai_token";

const $ = (id) => document.getElementById(id);
const state = { runs: new Map(), ws: null };

function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
function setToken(t) { sessionStorage.setItem(TOKEN_KEY, t); }
function clearToken() { sessionStorage.removeItem(TOKEN_KEY); }

async function api(path, options = {}) {
  const headers = Object.assign({}, options.headers);
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (res.status === 401) { logout(); throw new Error("Unauthorized"); }
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

// --- Auth --------------------------------------------------------------------

async function login(username, password) {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${API}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Incorrect username or password");
  const data = await res.json();
  setToken(data.access_token);
}

function logout() {
  clearToken();
  if (state.ws) { state.ws.close(); state.ws = null; }
  $("dash-view").hidden = true;
  $("logout-btn").hidden = true;
  $("login-view").hidden = false;
  setWsStatus(false);
}

// --- Rendering ---------------------------------------------------------------

function setWsStatus(online) {
  $("ws-dot").className = `dot ${online ? "online" : "offline"}`;
  $("ws-label").textContent = online ? "connected" : "disconnected";
}

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString();
}

function renderRuns() {
  const body = $("runs-body");
  body.textContent = "";
  const runs = [...state.runs.values()].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  if (runs.length === 0) {
    const tr = document.createElement("tr");
    tr.className = "empty";
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "No runs yet.";
    tr.appendChild(td);
    body.appendChild(tr);
  } else {
    for (const run of runs) {
      const tr = document.createElement("tr");
      tr.appendChild(cell(run.id.slice(0, 8), "mono"));
      tr.appendChild(cell(run.crew_id));
      const status = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `badge ${run.status}`;
      badge.textContent = run.status;
      status.appendChild(badge);
      tr.appendChild(status);
      tr.appendChild(cell(fmtTime(run.started_at)));
      const action = document.createElement("td");
      if (run.status === "running" || run.status === "pending") {
        const btn = document.createElement("button");
        btn.className = "ghost";
        btn.textContent = "Cancel";
        btn.onclick = () => cancelRun(run.id);
        action.appendChild(btn);
      }
      tr.appendChild(action);
      body.appendChild(tr);
    }
  }
  $("stat-total").textContent = runs.length;
  $("stat-active").textContent = runs.filter(
    (r) => r.status === "running" || r.status === "pending"
  ).length;
}

function cell(text, cls) {
  const td = document.createElement("td");
  if (cls) td.className = cls;
  td.textContent = text;
  return td;
}

function logEvent(message) {
  const log = $("event-log");
  const li = document.createElement("li");
  const t = document.createElement("span");
  t.className = "t";
  t.textContent = `[${fmtTime(message.timestamp)}] `;
  li.appendChild(t);
  const label = describeEvent(message);
  li.appendChild(document.createTextNode(label));
  log.prepend(li);
  while (log.children.length > 200) log.removeChild(log.lastChild);
}

function describeEvent(msg) {
  const rid = msg.run_id ? msg.run_id.slice(0, 8) : "—";
  switch (msg.type) {
    case "agent.activity":
      return `${rid} · ${msg.data.agent || "agent"} ${msg.data.status}` +
        (msg.data.task ? ` (${msg.data.task})` : "");
    case "run.completed": return `${rid} · run completed`;
    case "run.failed": return `${rid} · run failed: ${msg.data.error || ""}`;
    case "run.started": return `${rid} · run started`;
    case "run.created": return `${rid} · run created`;
    case "run.cancelled": return `${rid} · run cancelled`;
    default: return `${rid} · ${msg.type}`;
  }
}

// --- Data --------------------------------------------------------------------

async function loadCrews() {
  const crews = await api("/crews");
  const select = $("crew-select");
  select.textContent = "";
  for (const crew of crews) {
    const opt = document.createElement("option");
    opt.value = crew.id;
    opt.textContent = crew.name;
    opt.dataset.desc = crew.description;
    select.appendChild(opt);
  }
  updateCrewDesc();
}

function updateCrewDesc() {
  const opt = $("crew-select").selectedOptions[0];
  $("crew-desc").textContent = opt ? opt.dataset.desc : "";
}

async function loadRuns() {
  const runs = await api("/runs");
  state.runs.clear();
  for (const run of runs) state.runs.set(run.id, run);
  renderRuns();
}

async function startRun(crewId, topic) {
  const inputs = topic ? { topic } : {};
  await api("/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ crew_id: crewId, inputs }),
  });
}

async function cancelRun(runId) {
  await api(`/runs/${runId}/cancel`, { method: "POST" });
}

// --- WebSocket ---------------------------------------------------------------

function connectWs() {
  const token = getToken();
  if (!token) return;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}${API}/ws?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);
  state.ws = ws;

  ws.onopen = () => setWsStatus(true);
  ws.onclose = () => {
    setWsStatus(false);
    // Reconnect with backoff while still authenticated.
    if (getToken()) setTimeout(connectWs, 3000);
  };
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    logEvent(msg);
    // Lightweight refresh of run state on lifecycle changes.
    if (msg.type.startsWith("run.")) loadRuns().catch(() => {});
  };
}

// --- Bootstrap ---------------------------------------------------------------

async function enterDashboard() {
  $("login-view").hidden = true;
  $("dash-view").hidden = false;
  $("logout-btn").hidden = false;
  await Promise.all([loadCrews(), loadRuns()]);
  connectWs();
}

document.addEventListener("DOMContentLoaded", () => {
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("login-error").textContent = "";
    try {
      await login($("username").value, $("password").value);
      await enterDashboard();
    } catch (err) {
      $("login-error").textContent = err.message;
    }
  });

  $("logout-btn").addEventListener("click", logout);
  $("crew-select").addEventListener("change", updateCrewDesc);

  $("launch-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await startRun($("crew-select").value, $("topic-input").value.trim());
      $("topic-input").value = "";
      await loadRuns();
    } catch (err) {
      alert(`Could not start run: ${err.message}`);
    }
  });

  if (getToken()) {
    enterDashboard().catch(() => logout());
  }
});
