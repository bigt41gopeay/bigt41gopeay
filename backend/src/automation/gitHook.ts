// Git Hook Integration — auto-review code on push
// ~/missioncontrol/backend/src/automation/gitHook.ts

import { db } from '../db';
import { createJob } from '../council/orchestrator';
import { getSubscriptions } from '../memory/subscriptionManager';

export interface GitHookConfig {
  id: string;
  repoPath: string;
  name: string;
  enabled: boolean;
  triggers: {
    onPush: boolean;
    onCommit: boolean;
    onPR: boolean;
    onMerge: boolean;
  };
  actions: {
    codeReview: boolean;
    testGeneration: boolean;
    docGeneration: boolean;
    securityCheck: boolean;
  };
  branches: string[]; // which branches to watch, e.g. ["main", "develop"]
  prompt: string; // custom prompt template
  createdAt: string;
}

const gitHooks = new Map<string, GitHookConfig>();

export function initGitHooks() {
  initGitHookTables();
  loadGitHooks();
  console.log('[GitHook] Initialized');
}

// ─── CRUD ───

export async function addGitHook(config: Omit<GitHookConfig, 'id' | 'createdAt'>): Promise<GitHookConfig> {
  const id = `git-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hook: GitHookConfig = { ...config, id, createdAt: new Date().toISOString() };
  gitHooks.set(id, hook);
  persistGitHook(hook);
  return hook;
}

export function removeGitHook(id: string): boolean {
  const removed = gitHooks.delete(id);
  if (removed) { try { db.query('DELETE FROM git_hooks WHERE id = ?', [id]).run(); } catch (e) {} }
  return removed;
}

export function listGitHooks(): GitHookConfig[] {
  return Array.from(gitHooks.values());
}

export function toggleGitHook(id: string): boolean {
  const hook = gitHooks.get(id);
  if (!hook) return false;
  hook.enabled = !hook.enabled;
  persistGitHook(hook);
  return hook.enabled;
}

// ─── Hook Execution ───

export async function handleGitEvent(
  repoPath: string,
  event: 'push' | 'commit' | 'pr' | 'merge',
  branch: string,
  commitHash?: string,
  changedFiles?: string[]
) {
  // Find matching hook
  const hook = Array.from(gitHooks.values()).find(h => {
    const hookPath = h.repoPath.replace(/^~/, process.env.HOME || '');
    const eventPath = repoPath.replace(/^~/, process.env.HOME || '');
    return hookPath === eventPath && h.enabled && h.branches.includes(branch);
  });

  if (!hook) return;

  // Check if this event type is enabled
  if (event === 'push' && !hook.triggers.onPush) return;
  if (event === 'commit' && !hook.triggers.onCommit) return;
  if (event === 'pr' && !hook.triggers.onPR) return;
  if (event === 'merge' && !hook.triggers.onMerge) return;

  console.log(`[GitHook] Processing ${event} on ${branch} in ${repoPath}`);

  // Build prompt based on actions
  const parts: string[] = [];

  if (hook.actions.codeReview) {
    parts.push(`Review the following code changes for quality, bugs, and best practices.`);
  }
  if (hook.actions.testGeneration) {
    parts.push(`Generate unit tests for the modified code.`);
  }
  if (hook.actions.docGeneration) {
    parts.push(`Update documentation for any API changes.`);
  }
  if (hook.actions.securityCheck) {
    parts.push(`Check for security vulnerabilities in the changes.`);
  }

  // Get diff
  const diff = await getGitDiff(repoPath, commitHash);
  const files = changedFiles?.join('\n') || '';

  const prompt = `${hook.prompt || parts.join(' ')}

Repository: ${repoPath}
Branch: ${branch}
Event: ${event}
Commit: ${commitHash || 'N/A'}
Changed files:
${files}

Git diff:
${diff.substring(0, 8000)}`; // limit diff size

  try {
    const subs = await getSubscriptions();
    const apiKeys: Record<string, string> = {};
    for (const sub of subs) { apiKeys[sub.provider === 'google' ? 'gemini' : sub.provider] = sub.apiKey; }

    const job = await createJob(prompt, apiKeys, false, globalThis.aiRouter);

    // Notify
    try {
      const { Bun } = await import('bun');
      Bun.spawn(['osascript', '-e', 
        `display notification "Git ${event} on ${branch} — review started" with title "Git Hook"`
      ], { stdout: 'pipe', stderr: 'pipe' });
    } catch (e) {}

  } catch (e: any) {
    console.error('[GitHook] Failed:', e.message);
  }
}

async function getGitDiff(repoPath: string, commitHash?: string): Promise<string> {
  try {
    const { Bun } = await import('bun');
    const cmd = commitHash 
      ? ['git', '-C', repoPath, 'show', commitHash, '--stat']
      : ['git', '-C', repoPath, 'diff', 'HEAD~1', '--stat'];

    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
    return await new Response(proc.stdout).text();
  } catch (e) {
    return 'Unable to get diff';
  }
}

// ─── Install Hook Script ───

export function generateHookScript(repoPath: string): string {
  return `#!/bin/bash
# Mission Control Git Hook
# Auto-installed by Mission Control

REPO_PATH="${repoPath}"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT=$(git rev-parse HEAD)
FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

# Send event to Mission Control backend
curl -s -X POST http://127.0.0.1:8787/api/automation/git-hook \\
  -H "Content-Type: application/json" \\
  -d "{\\"repoPath\\":\\"$REPO_PATH\\",\\"event\\":\\"push\\",\\"branch\\":\\"$BRANCH\\",\\"commitHash\\":\\"$COMMIT\\",\\"changedFiles\\":\\"$FILES\\"}"
`;
}

export async function installGitHook(repoPath: string): Promise<boolean> {
  try {
    const fs = require('fs');
    const path = require('path');
    const hookPath = path.join(repoPath, '.git', 'hooks', 'post-commit');
    const script = generateHookScript(repoPath);

    fs.writeFileSync(hookPath, script, { mode: 0o755 });
    console.log(`[GitHook] Installed at ${hookPath}`);
    return true;
  } catch (e: any) {
    console.error('[GitHook] Install failed:', e.message);
    return false;
  }
}

// ─── DB ───

function initGitHookTables() {
  try {
    db.query(`CREATE TABLE IF NOT EXISTS git_hooks (
      id TEXT PRIMARY KEY, repo_path TEXT, name TEXT, enabled INTEGER DEFAULT 1,
      triggers TEXT, actions TEXT, branches TEXT, prompt TEXT, created_at TEXT
    )`).run();
  } catch (e) {}
}

function persistGitHook(hook: GitHookConfig) {
  try {
    db.query(`INSERT OR REPLACE INTO git_hooks 
      (id, repo_path, name, enabled, triggers, actions, branches, prompt, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      hook.id, hook.repoPath, hook.name, hook.enabled ? 1 : 0,
      JSON.stringify(hook.triggers), JSON.stringify(hook.actions),
      JSON.stringify(hook.branches), hook.prompt, hook.createdAt
    );
  } catch (e) {}
}

function loadGitHooks() {
  try {
    const rows = db.query('SELECT * FROM git_hooks').all() as any[];
    for (const row of rows) {
      gitHooks.set(row.id, {
        id: row.id, repoPath: row.repo_path, name: row.name, enabled: Boolean(row.enabled),
        triggers: JSON.parse(row.triggers || '{}'), actions: JSON.parse(row.actions || '{}'),
        branches: JSON.parse(row.branches || '[]'), prompt: row.prompt, createdAt: row.created_at,
      });
    }
    console.log(`[GitHook] Loaded ${rows.length} hooks`);
  } catch (e) { console.log('[GitHook] No existing hooks'); }
}
