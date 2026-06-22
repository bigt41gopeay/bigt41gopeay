// File Watcher — monitors folders and auto-triggers jobs on changes
// ~/missioncontrol/backend/src/automation/fileWatcher.ts

import { db } from '../db';
import { createJob } from '../council/orchestrator';
import { getSubscriptions } from '../memory/subscriptionManager';

export interface WatchedFolder {
  id: string;
  path: string;
  name: string;
  events: ('create' | 'modify' | 'delete' | 'rename')[];
  filter: {
    extensions?: string[]; // e.g., [".js", ".ts"]
    patterns?: string[]; // e.g., ["*.test.*"]
    exclude?: string[]; // e.g., ["node_modules"]
  };
  prompt: string; // what to do when file changes: "Review this code for errors"
  enabled: boolean;
  cooldownMinutes: number; // minimum time between triggers
  lastTriggered?: string;
  triggerCount: number;
  createdAt: string;
}

let fsWatcher: any = null;
const watchedFolders = new Map<string, WatchedFolder>();
const cooldowns = new Map<string, number>(); // path -> last trigger time

export function initFileWatcher() {
  initFileWatcherTables();
  loadWatchedFolders();
  startWatching();
  console.log('[FileWatcher] Initialized');
}

export function stopFileWatcher() {
  if (fsWatcher) {
    fsWatcher.close();
    fsWatcher = null;
  }
  watchedFolders.clear();
}

// ─── CRUD ───

export async function addWatchedFolder(folder: Omit<WatchedFolder, 'id' | 'triggerCount' | 'createdAt'>): Promise<WatchedFolder> {
  const id = `watch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const watched: WatchedFolder = { ...folder, id, triggerCount: 0, createdAt: new Date().toISOString() };
  watchedFolders.set(id, watched);
  persistWatchedFolder(watched);
  restartWatching();
  return watched;
}

export function removeWatchedFolder(id: string): boolean {
  const removed = watchedFolders.delete(id);
  if (removed) {
    try { db.query('DELETE FROM watched_folders WHERE id = ?', [id]).run(); } catch (e) {}
    restartWatching();
  }
  return removed;
}

export function listWatchedFolders(): WatchedFolder[] {
  return Array.from(watchedFolders.values());
}

export function toggleWatchedFolder(id: string): boolean {
  const folder = watchedFolders.get(id);
  if (!folder) return false;
  folder.enabled = !folder.enabled;
  persistWatchedFolder(folder);
  restartWatching();
  return folder.enabled;
}

// ─── Watching Logic ───

function startWatching() {
  if (fsWatcher) { fsWatcher.close(); fsWatcher = null; }

  const enabled = Array.from(watchedFolders.values()).filter(f => f.enabled);
  if (enabled.length === 0) return;

  const paths = enabled.map(f => f.path.replace(/^~/, process.env.HOME || ''));

  try {
    // Use fs.watch for macOS FSEvents
    const fs = require('fs');
    const path = require('path');

    for (const watchPath of paths) {
      if (!fs.existsSync(watchPath)) {
        console.warn(`[FileWatcher] Path does not exist: ${watchPath}`);
        continue;
      }

      const watcher = fs.watch(watchPath, { recursive: true }, (eventType: string, filename: string) => {
        if (!filename) return;
        handleFileChange(watchPath, filename, eventType as any);
      });

      if (!fsWatcher) fsWatcher = watcher;
    }

    console.log(`[FileWatcher] Watching ${paths.length} folders`);
  } catch (e) {
    console.error('[FileWatcher] Failed to start:', e);
  }
}

function restartWatching() {
  startWatching();
}

async function handleFileChange(watchPath: string, filename: string, eventType: 'rename' | 'change') {
  const fullPath = require('path').join(watchPath, filename);

  // Find matching watched folder
  for (const folder of watchedFolders.values()) {
    if (!folder.enabled) continue;

    const folderPath = folder.path.replace(/^~/, process.env.HOME || '');
    if (!fullPath.startsWith(folderPath)) continue;

    // Check filters
    if (!matchesFilter(filename, folder.filter)) continue;

    // Check cooldown
    const now = Date.now();
    const lastTrigger = cooldowns.get(folder.id) || 0;
    if (now - lastTrigger < folder.cooldownMinutes * 60000) continue;

    cooldowns.set(folder.id, now);
    folder.lastTriggered = new Date().toISOString();
    folder.triggerCount++;
    persistWatchedFolder(folder);

    console.log(`[FileWatcher] Triggered: ${folder.name} — ${filename}`);

    // Trigger job
    await triggerFolderJob(folder, fullPath, eventType);
  }
}

function matchesFilter(filename: string, filter: WatchedFolder['filter']): boolean {
  // Check extensions
  if (filter.extensions && filter.extensions.length > 0) {
    const ext = require('path').extname(filename).toLowerCase();
    if (!filter.extensions.includes(ext)) return false;
  }

  // Check patterns (simple glob)
  if (filter.patterns && filter.patterns.length > 0) {
    const matches = filter.patterns.some(p => {
      const regex = new RegExp(p.replace(/\*/g, '.*').replace(/\?/g, '.'));
      return regex.test(filename);
    });
    if (!matches) return false;
  }

  // Check exclusions
  if (filter.exclude && filter.exclude.length > 0) {
    if (filter.exclude.some(e => filename.includes(e))) return false;
  }

  return true;
}

async function triggerFolderJob(folder: WatchedFolder, filePath: string, eventType: string) {
  try {
    const subs = await getSubscriptions();
    const apiKeys: Record<string, string> = {};
    for (const sub of subs) { apiKeys[sub.provider === 'google' ? 'gemini' : sub.provider] = sub.apiKey; }

    const prompt = folder.prompt.replace(/\{file\}/g, filePath).replace(/\{event\}/g, eventType);
    const job = await createJob(prompt, apiKeys, false, globalThis.aiRouter);

    // macOS notification
    try {
      const { Bun } = await import('bun');
      Bun.spawn(['osascript', '-e', 
        `display notification "${folder.name}: ${eventType} on ${require('path').basename(filePath)}" with title "File Watcher"`
      ], { stdout: 'pipe', stderr: 'pipe' });
    } catch (e) {}

  } catch (e: any) {
    console.error('[FileWatcher] Job trigger failed:', e.message);
  }
}

// ─── DB ───

function initFileWatcherTables() {
  try {
    db.query(`CREATE TABLE IF NOT EXISTS watched_folders (
      id TEXT PRIMARY KEY, path TEXT, name TEXT, events TEXT, filter TEXT,
      prompt TEXT, enabled INTEGER DEFAULT 1, cooldown_minutes INTEGER DEFAULT 5,
      last_triggered TEXT, trigger_count INTEGER DEFAULT 0, created_at TEXT
    )`).run();
  } catch (e) {}
}

function persistWatchedFolder(folder: WatchedFolder) {
  try {
    db.query(`INSERT OR REPLACE INTO watched_folders 
      (id, path, name, events, filter, prompt, enabled, cooldown_minutes, last_triggered, trigger_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      folder.id, folder.path, folder.name, JSON.stringify(folder.events),
      JSON.stringify(folder.filter), folder.prompt, folder.enabled ? 1 : 0,
      folder.cooldownMinutes, folder.lastTriggered, folder.triggerCount, folder.createdAt
    );
  } catch (e) {}
}

function loadWatchedFolders() {
  try {
    const rows = db.query('SELECT * FROM watched_folders').all() as any[];
    for (const row of rows) {
      watchedFolders.set(row.id, {
        id: row.id, path: row.path, name: row.name,
        events: JSON.parse(row.events || '[]'),
        filter: JSON.parse(row.filter || '{}'),
        prompt: row.prompt, enabled: Boolean(row.enabled),
        cooldownMinutes: row.cooldown_minutes, lastTriggered: row.last_triggered,
        triggerCount: row.trigger_count, createdAt: row.created_at,
      });
    }
    console.log(`[FileWatcher] Loaded ${rows.length} watched folders`);
  } catch (e) { console.log('[FileWatcher] No existing folders'); }
}
