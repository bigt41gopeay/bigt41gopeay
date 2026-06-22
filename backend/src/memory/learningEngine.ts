// Learning Engine — analyzes completed jobs and learns patterns
// ~/missioncontrol/backend/src/memory/learningEngine.ts

import { db } from '../db';
import { agentRegistry } from '../council/agentRegistry';
import type { 
  WorkPattern, UserPreference, TaskTemplate, LearningInsight, 
  LearningMetrics, AdaptiveConfig 
} from './types';
import type { AutonomousJob } from '../council/automation_types';

// ─── Pattern Detection ───

export async function analyzeCompletedJob(job: AutonomousJob): Promise<WorkPattern[]> {
  const patterns: WorkPattern[] = [];
  const now = new Date().toISOString();

  // 1. Agent preference pattern
  const agentUsage: Record<string, number> = {};
  for (const st of job.subtasks) {
    agentUsage[st.agentId] = (agentUsage[st.agentId] || 0) + 1;
  }
  const preferredAgent = Object.entries(agentUsage)
    .sort((a, b) => b[1] - a[1])[0];

  if (preferredAgent) {
    const taskKeywords = extractKeywords(job.userRequest);
    patterns.push({
      id: `pattern-${Date.now()}-agent`,
      userId: 'default',
      patternType: 'agent_preference',
      pattern: `For tasks containing "${taskKeywords.join(', ')}"`,
      frequency: 1,
      confidence: 0.6,
      lastObserved: now,
      firstObserved: now,
      examples: [job.id],
      metadata: { preferredAgent: preferredAgent[0], taskKeywords },
    });
  }

  // 2. Time of day pattern
  const hour = new Date(job.createdAt).getHours();
  patterns.push({
    id: `pattern-${Date.now()}-time`,
    userId: 'default',
    patternType: 'time_of_day',
    pattern: `Jobs started at ${hour}:00-${hour+1}:00`,
    frequency: 1,
    confidence: 0.5,
    lastObserved: now,
    firstObserved: now,
    examples: [job.id],
    metadata: { hour, success: job.status === 'completed' },
  });

  // 3. Task sequence pattern
  if (job.subtasks.length > 1) {
    const sequence = job.subtasks.map(s => s.agentId).join(' -> ');
    patterns.push({
      id: `pattern-${Date.now()}-sequence`,
      userId: 'default',
      patternType: 'task_sequence',
      pattern: `Task sequence: ${sequence}`,
      frequency: 1,
      confidence: 0.7,
      lastObserved: now,
      firstObserved: now,
      examples: [job.id],
      metadata: { sequence, taskCount: job.subtasks.length },
    });
  }

  // 4. Error recovery pattern
  const retries = job.subtasks.filter(s => s.retries > 0);
  if (retries.length > 0) {
    patterns.push({
      id: `pattern-${Date.now()}-error`,
      userId: 'default',
      patternType: 'error_recovery',
      pattern: `Retry needed for ${retries.map(r => r.agentId).join(', ')}`,
      frequency: 1,
      confidence: 0.8,
      lastObserved: now,
      firstObserved: now,
      examples: [job.id],
      metadata: { 
        failedAgents: retries.map(r => r.agentId),
        fallbackAgents: retries.map(r => r.result?.error ? 'unknown' : r.agentId),
      },
    });
  }

  // Save patterns to DB
  for (const pattern of patterns) {
    await savePattern(pattern);
  }

  // Update or create task template
  await updateTaskTemplate(job);

  // Generate insights
  await generateInsights(job);

  return patterns;
}

// ─── Task Template Learning ───

async function updateTaskTemplate(job: AutonomousJob) {
  const keywords = extractKeywords(job.userRequest);

  // Find existing template with similar keywords
  const existing = await findSimilarTemplate(keywords);

  if (existing) {
    // Update existing template with new data
    const newSuccess = job.status === 'completed' ? 1 : 0;
    const totalCost = job.subtasks.reduce((sum, s) => sum + (s.result?.metrics.cost || 0), 0);
    const duration = new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime();

    const updatedTemplate: TaskTemplate = {
      ...existing,
      successRate: (existing.successRate * existing.usageCount + newSuccess) / (existing.usageCount + 1),
      avgActualCost: (existing.avgActualCost * existing.usageCount + totalCost) / (existing.usageCount + 1),
      avgActualDuration: (existing.avgActualDuration * existing.usageCount + duration) / (existing.usageCount + 1),
      usageCount: existing.usageCount + 1,
      lastUsed: new Date().toISOString(),
      triggerPatterns: [...new Set([...existing.triggerPatterns, ...keywords])],
    };

    await saveTemplate(updatedTemplate);
  } else if (job.status === 'completed') {
    // Create new template from successful job
    const template: TaskTemplate = {
      id: `template-${Date.now()}`,
      name: generateTemplateName(job.userRequest),
      description: job.userRequest.substring(0, 100),
      triggerPatterns: keywords,
      decomposition: {
        subtasks: job.subtasks.map(s => ({
          description: s.description,
          agentId: s.agentId,
          method: s.method,
          estimatedTokens: s.estimatedTokens,
          whyThisAgent: `Learned from successful job ${job.id}`,
        })),
        estimatedDuration: job.decomposition?.estimatedDuration || 10,
        estimatedCost: job.decomposition?.estimatedCost || 0,
      },
      successRate: 1,
      avgActualCost: job.subtasks.reduce((sum, s) => sum + (s.result?.metrics.cost || 0), 0),
      avgActualDuration: new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime(),
      usageCount: 1,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      userFeedback: 0,
    };

    await saveTemplate(template);
  }
}

// ─── Insight Generation ───

async function generateInsights(job: AutonomousJob) {
  const insights: LearningInsight[] = [];
  const now = new Date().toISOString();

  // Cost efficiency insight
  if (job.decomposition && job.subtasks.length > 0) {
    const estimatedCost = job.decomposition.estimatedCost;
    const actualCost = job.subtasks.reduce((sum, s) => sum + (s.result?.metrics.cost || 0), 0);
    const costDiff = estimatedCost - actualCost;

    if (Math.abs(costDiff) > 0.01) {
      insights.push({
        id: `insight-${Date.now()}-cost`,
        timestamp: now,
        type: costDiff > 0 ? 'cost_saving' : 'efficiency_gain',
        title: costDiff > 0 ? 'Cost estimate was too high' : 'Cost estimate was too low',
        description: `Estimated $${estimatedCost.toFixed(4)}, actual $${actualCost.toFixed(4)}. ${
          costDiff > 0 
            ? 'Future estimates will be adjusted down.' 
            : 'Consider using local models for some subtasks.'
        }`,
        impact: Math.abs(costDiff) > 0.05 ? 'high' : 'medium',
        data: { before: estimatedCost, after: actualCost, saving: costDiff, metric: 'cost', value: actualCost },
        applied: false,
        dismissed: false,
      });
    }
  }

  // Agent suggestion insight
  const successfulAgents = job.subtasks
    .filter(s => s.result?.success)
    .map(s => s.agentId);

  if (successfulAgents.length > 0) {
    const taskType = categorizeTask(job.userRequest);
    insights.push({
      id: `insight-${Date.now()}-agent`,
      timestamp: now,
      type: 'agent_suggestion',
      title: `${successfulAgents[0]} works well for ${taskType}`,
      description: `Based on successful completion, ${successfulAgents[0]} is effective for ${taskType} tasks. Future similar tasks will prefer this agent.`,
      impact: 'medium',
      data: { agent: successfulAgents[0], taskType },
      applied: false,
      dismissed: false,
    });
  }

  // Time efficiency insight
  if (job.decomposition && job.subtasks.length > 0) {
    const estimatedDuration = job.decomposition.estimatedDuration * 60 * 1000; // convert to ms
    const actualDuration = new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime();

    if (actualDuration > estimatedDuration * 1.5) {
      insights.push({
        id: `insight-${Date.now()}-time`,
        timestamp: now,
        type: 'efficiency_gain',
        title: 'Tasks taking longer than estimated',
        description: `Consider breaking tasks into smaller subtasks or using faster agents for simple steps.`,
        impact: 'medium',
        data: { before: estimatedDuration, after: actualDuration, metric: 'duration', value: actualDuration },
        applied: false,
        dismissed: false,
      });
    }
  }

  for (const insight of insights) {
    await saveInsight(insight);
  }
}

// ─── Adaptive Decomposition ───

export async function getAdaptiveDecomposition(
  request: string,
  defaultDecomposition: any
): Promise<any> {
  const config = await getAdaptiveConfig();

  // Check for matching template
  const keywords = extractKeywords(request);
  const template = await findSimilarTemplate(keywords);

  if (template && template.successRate > 0.7 && config.autoSelectAgent) {
    // Use learned template with adaptations
    const adapted = adaptTemplate(template, config);
    return {
      ...adapted,
      source: 'learned_template',
      templateId: template.id,
      confidence: template.successRate,
    };
  }

  // Check user preferences
  const preferences = await getUserPreferences();
  const preferredAgents = preferences
    .filter(p => p.category === 'agent' && p.confidence > 0.6)
    .map(p => p.value);

  if (preferredAgents.length > 0 && config.autoSelectAgent) {
    // Override agent assignments based on preferences
    const modified = { ...defaultDecomposition };
    modified.subtasks = modified.subtasks.map((st: any) => {
      const bestMatch = preferredAgents.find(a => {
        const agent = agentRegistry.getAgent(a);
        return agent?.specialties.some(s => 
          st.description.toLowerCase().includes(s.toLowerCase())
        );
      });

      if (bestMatch) {
        return { ...st, agentId: bestMatch, source: 'user_preference' };
      }
      return st;
    });

    return { ...modified, source: 'preference_override' };
  }

  // Apply cost preference
  if (config.costPreference === 'minimize') {
    const modified = { ...defaultDecomposition };
    modified.subtasks = modified.subtasks.map((st: any) => {
      const agent = agentRegistry.getAgent(st.agentId);
      if (agent && agent.costPer1K > 0) {
        // Try to find cheaper alternative
        const cheaper = agentRegistry.findBestFor(st.description, { maxCost: 0.001 })[0];
        if (cheaper) {
          return { ...st, agentId: cheaper.id, source: 'cost_optimized' };
        }
      }
      return st;
    });
    return { ...modified, source: 'cost_optimized' };
  }

  return { ...defaultDecomposition, source: 'default' };
}

// ─── Metrics & Analytics ───

export async function getLearningMetrics(): Promise<LearningMetrics> {
  try {
    const jobs = db.query(`
      SELECT status, subtasks, created_at, updated_at 
      FROM autonomous_jobs 
      ORDER BY created_at DESC
    `).all() as any[];

    const totalJobs = jobs.length;
    const successfulJobs = jobs.filter(j => j.status === 'completed').length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;

    let totalCost = 0;
    let totalTokens = 0;
    let totalDuration = 0;
    const agentCounts: Record<string, number> = {};
    const taskKeywords: Record<string, number> = {};

    for (const job of jobs) {
      const subtasks = JSON.parse(job.subtasks || '[]');
      for (const st of subtasks) {
        totalCost += st.result?.metrics?.cost || 0;
        totalTokens += st.result?.metrics?.tokensUsed || 0;
        agentCounts[st.agentId] = (agentCounts[st.agentId] || 0) + 1;
      }

      const duration = new Date(job.updated_at).getTime() - new Date(job.created_at).getTime();
      totalDuration += duration;

      // Count task keywords
      const keywords = extractKeywords(job.user_request || '');
      for (const kw of keywords) {
        taskKeywords[kw] = (taskKeywords[kw] || 0) + 1;
      }
    }

    const mostUsedAgent = Object.entries(agentCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    const mostCommonTask = Object.entries(taskKeywords)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    const patterns = db.query('SELECT COUNT(*) as count FROM work_patterns').get() as any;
    const insights = db.query('SELECT COUNT(*) as count FROM learning_insights').get() as any;
    const appliedInsights = db.query('SELECT COUNT(*) as count FROM learning_insights WHERE applied = 1').get() as any;

    return {
      totalJobs,
      successfulJobs,
      failedJobs,
      totalCost,
      totalTokens,
      avgJobDuration: totalJobs > 0 ? totalDuration / totalJobs / 1000 : 0, // seconds
      mostUsedAgent,
      mostCommonTask,
      improvementRate: calculateImprovementRate(jobs),
      costEfficiency: successfulJobs > 0 ? totalCost / successfulJobs : 0,
      timeEfficiency: successfulJobs > 0 ? totalDuration / successfulJobs / 1000 : 0,
      patternsLearned: patterns?.count || 0,
      insightsGenerated: insights?.count || 0,
      insightsApplied: appliedInsights?.count || 0,
    };
  } catch (e) {
    return {
      totalJobs: 0, successfulJobs: 0, failedJobs: 0,
      totalCost: 0, totalTokens: 0, avgJobDuration: 0,
      mostUsedAgent: 'none', mostCommonTask: 'none',
      improvementRate: 0, costEfficiency: 0, timeEfficiency: 0,
      patternsLearned: 0, insightsGenerated: 0, insightsApplied: 0,
    };
  }
}

function calculateImprovementRate(jobs: any[]): number {
  if (jobs.length < 4) return 0;

  // Split into first half and second half
  const mid = Math.floor(jobs.length / 2);
  const firstHalf = jobs.slice(0, mid);
  const secondHalf = jobs.slice(mid);

  const firstSuccess = firstHalf.filter(j => j.status === 'completed').length / firstHalf.length;
  const secondSuccess = secondHalf.filter(j => j.status === 'completed').length / secondHalf.length;

  return ((secondSuccess - firstSuccess) * 100);
}

// ─── Helpers ───

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'and', 'but', 'or', 'yet', 'so', 'if', 'because', 'although', 'though', 'while', 'where', 'when', 'that', 'which', 'who', 'whom', 'whose', 'what', 'this', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing']);

  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 10);
}

function categorizeTask(request: string): string {
  const lower = request.toLowerCase();
  if (lower.includes('code') || lower.includes('program') || lower.includes('script') || lower.includes('refactor')) return 'coding';
  if (lower.includes('write') || lower.includes('draft') || lower.includes('document')) return 'writing';
  if (lower.includes('analyze') || lower.includes('research') || lower.includes('study')) return 'analysis';
  if (lower.includes('fix') || lower.includes('debug') || lower.includes('error')) return 'debugging';
  if (lower.includes('seo') || lower.includes('rank') || lower.includes('search')) return 'seo';
  if (lower.includes('git') || lower.includes('commit') || lower.includes('branch')) return 'git';
  if (lower.includes('file') || lower.includes('folder') || lower.includes('directory')) return 'file_management';
  return 'general';
}

function generateTemplateName(request: string): string {
  const keywords = extractKeywords(request);
  return keywords.slice(0, 3).join('_') + '_template';
}

function adaptTemplate(template: TaskTemplate, config: AdaptiveConfig): any {
  const modified = { ...template.decomposition };

  // Apply complexity preference
  if (config.complexityPreference === 'simple') {
    modified.subtasks = modified.subtasks.slice(0, Math.min(3, modified.subtasks.length));
  } else if (config.complexityPreference === 'thorough') {
    // Add verification step
    modified.subtasks.push({
      description: 'Verify and validate all outputs',
      agentId: 'qwen-local',
      method: 'ollama:generate',
      estimatedTokens: 500,
      whyThisAgent: 'Local verification to ensure quality',
    });
  }

  // Apply preferred agents
  for (const st of modified.subtasks) {
    if (config.preferredAgents.includes(st.agentId)) {
      st.whyThisAgent += ' (user preferred)';
    }
    if (config.blacklistedAgents.includes(st.agentId)) {
      const alternative = agentRegistry.findBestFor(st.description)
        .find(a => !config.blacklistedAgents.includes(a.id));
      if (alternative) {
        st.agentId = alternative.id;
        st.whyThisAgent = `Replaced blacklisted agent with ${alternative.name}`;
      }
    }
  }

  return modified;
}

// ─── DB Operations ───

async function savePattern(pattern: WorkPattern) {
  try {
    db.query(`INSERT INTO work_patterns 
      (id, user_id, pattern_type, pattern, frequency, confidence, last_observed, first_observed, examples, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        frequency = frequency + 1,
        confidence = (confidence + excluded.confidence) / 2,
        last_observed = excluded.last_observed,
        examples = json_insert(examples, '$[#]', json_extract(excluded.examples, '$[0]'))
    `).run(
      pattern.id, pattern.userId, pattern.patternType, pattern.pattern,
      pattern.frequency, pattern.confidence, pattern.lastObserved,
      pattern.firstObserved, JSON.stringify(pattern.examples), JSON.stringify(pattern.metadata)
    );
  } catch (e) {
    console.error('Failed to save pattern:', e);
  }
}

async function saveTemplate(template: TaskTemplate) {
  try {
    db.query(`INSERT INTO task_templates 
      (id, name, description, trigger_patterns, decomposition, success_rate, avg_actual_cost, avg_actual_duration, usage_count, last_used, created_at, user_feedback)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        success_rate = excluded.success_rate,
        avg_actual_cost = excluded.avg_actual_cost,
        avg_actual_duration = excluded.avg_actual_duration,
        usage_count = excluded.usage_count,
        last_used = excluded.last_used,
        trigger_patterns = excluded.trigger_patterns
    `).run(
      template.id, template.name, template.description,
      JSON.stringify(template.triggerPatterns), JSON.stringify(template.decomposition),
      template.successRate, template.avgActualCost, template.avgActualDuration,
      template.usageCount, template.lastUsed, template.createdAt, template.userFeedback
    );
  } catch (e) {
    console.error('Failed to save template:', e);
  }
}

async function saveInsight(insight: LearningInsight) {
  try {
    db.query(`INSERT INTO learning_insights 
      (id, timestamp, type, title, description, impact, data, applied, dismissed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      insight.id, insight.timestamp, insight.type, insight.title,
      insight.description, insight.impact, JSON.stringify(insight.data),
      insight.applied ? 1 : 0, insight.dismissed ? 1 : 0
    );
  } catch (e) {
    console.error('Failed to save insight:', e);
  }
}

async function findSimilarTemplate(keywords: string[]): Promise<TaskTemplate | null> {
  try {
    const allTemplates = db.query('SELECT * FROM task_templates').all() as any[];

    let bestMatch: any = null;
    let bestScore = 0;

    for (const row of allTemplates) {
      const patterns = JSON.parse(row.trigger_patterns || '[]');
      const matches = keywords.filter(k => patterns.some((p: string) => p.includes(k) || k.includes(p))).length;
      const score = matches / Math.max(keywords.length, patterns.length);

      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = row;
      }
    }

    if (!bestMatch) return null;

    return {
      id: bestMatch.id,
      name: bestMatch.name,
      description: bestMatch.description,
      triggerPatterns: JSON.parse(bestMatch.trigger_patterns || '[]'),
      decomposition: JSON.parse(bestMatch.decomposition || '{}'),
      successRate: bestMatch.success_rate,
      avgActualCost: bestMatch.avg_actual_cost,
      avgActualDuration: bestMatch.avg_actual_duration,
      usageCount: bestMatch.usage_count,
      lastUsed: bestMatch.last_used,
      createdAt: bestMatch.created_at,
      userFeedback: bestMatch.user_feedback,
    };
  } catch (e) {
    return null;
  }
}

async function getUserPreferences(): Promise<UserPreference[]> {
  try {
    const rows = db.query('SELECT * FROM user_preferences WHERE user_id = ?', ['default']).all() as any[];
    return rows.map(r => ({
      id: r.id,
      category: r.category,
      key: r.key,
      value: JSON.parse(r.value || 'null'),
      confidence: r.confidence,
      source: r.source,
      updatedAt: r.updated_at,
    }));
  } catch (e) {
    return [];
  }
}

export async function getAdaptiveConfig(): Promise<AdaptiveConfig> {
  try {
    const row = db.query('SELECT * FROM adaptive_config WHERE user_id = ?', ['default']).get() as any;
    if (!row) return getDefaultConfig();

    return {
      userId: row.user_id,
      learningEnabled: Boolean(row.learning_enabled),
      autoOptimize: Boolean(row.auto_optimize),
      autoSelectAgent: Boolean(row.auto_select_agent),
      suggestionFrequency: row.suggestion_frequency,
      complexityPreference: row.complexity_preference,
      costPreference: row.cost_preference,
      preferredAgents: JSON.parse(row.preferred_agents || '[]'),
      blacklistedAgents: JSON.parse(row.blacklisted_agents || '[]'),
      peakHours: JSON.parse(row.peak_hours || '[]'),
      timezone: row.timezone,
      updatedAt: row.updated_at,
    };
  } catch (e) {
    return getDefaultConfig();
  }
}

function getDefaultConfig(): AdaptiveConfig {
  return {
    userId: 'default',
    learningEnabled: true,
    autoOptimize: false,
    autoSelectAgent: true,
    suggestionFrequency: 'daily',
    complexityPreference: 'balanced',
    costPreference: 'balanced',
    preferredAgents: [],
    blacklistedAgents: [],
    peakHours: ['09:00-12:00', '14:00-17:00'],
    timezone: 'Europe/Vilnius',
    updatedAt: new Date().toISOString(),
  };
}

export async function updateAdaptiveConfig(config: Partial<AdaptiveConfig>) {
  const current = await getAdaptiveConfig();
  const merged = { ...current, ...config, updatedAt: new Date().toISOString() };

  try {
    db.query(`INSERT INTO adaptive_config 
      (user_id, learning_enabled, auto_optimize, auto_select_agent, suggestion_frequency,
       complexity_preference, cost_preference, preferred_agents, blacklisted_agents, peak_hours, timezone, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        learning_enabled = excluded.learning_enabled,
        auto_optimize = excluded.auto_optimize,
        auto_select_agent = excluded.auto_select_agent,
        suggestion_frequency = excluded.suggestion_frequency,
        complexity_preference = excluded.complexity_preference,
        cost_preference = excluded.cost_preference,
        preferred_agents = excluded.preferred_agents,
        blacklisted_agents = excluded.blacklisted_agents,
        peak_hours = excluded.peak_hours,
        timezone = excluded.timezone,
        updated_at = excluded.updated_at
    `).run(
      merged.userId, merged.learningEnabled ? 1 : 0, merged.autoOptimize ? 1 : 0,
      merged.autoSelectAgent ? 1 : 0, merged.suggestionFrequency, merged.complexityPreference,
      merged.costPreference, JSON.stringify(merged.preferredAgents),
      JSON.stringify(merged.blacklistedAgents), JSON.stringify(merged.peakHours),
      merged.timezone, merged.updatedAt
    );
  } catch (e) {
    console.error('Failed to update config:', e);
  }
}

// ─── DB Initialization ───

export function initMemoryTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS work_patterns (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      pattern_type TEXT,
      pattern TEXT,
      frequency INTEGER DEFAULT 1,
      confidence REAL,
      last_observed TEXT,
      first_observed TEXT,
      examples TEXT,
      metadata TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      category TEXT,
      key TEXT,
      value TEXT,
      confidence REAL,
      source TEXT,
      updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS task_templates (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      trigger_patterns TEXT,
      decomposition TEXT,
      success_rate REAL,
      avg_actual_cost REAL,
      avg_actual_duration REAL,
      usage_count INTEGER DEFAULT 0,
      last_used TEXT,
      created_at TEXT,
      user_feedback REAL
    )`,
    `CREATE TABLE IF NOT EXISTS learning_insights (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      type TEXT,
      title TEXT,
      description TEXT,
      impact TEXT,
      data TEXT,
      applied INTEGER DEFAULT 0,
      dismissed INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS work_sessions (
      id TEXT PRIMARY KEY,
      start_time TEXT,
      end_time TEXT,
      jobs_completed INTEGER,
      total_cost REAL,
      total_tokens INTEGER,
      agents_used TEXT,
      productivity_score REAL,
      peak_hour TEXT,
      patterns TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS adaptive_config (
      user_id TEXT PRIMARY KEY,
      learning_enabled INTEGER DEFAULT 1,
      auto_optimize INTEGER DEFAULT 0,
      auto_select_agent INTEGER DEFAULT 1,
      suggestion_frequency TEXT DEFAULT 'daily',
      complexity_preference TEXT DEFAULT 'balanced',
      cost_preference TEXT DEFAULT 'balanced',
      preferred_agents TEXT,
      blacklisted_agents TEXT,
      peak_hours TEXT,
      timezone TEXT DEFAULT 'Europe/Vilnius',
      updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      provider TEXT,
      tier TEXT,
      api_key TEXT,
      rate_limit TEXT,
      usage TEXT,
      status TEXT,
      expires_at TEXT,
      last_checked TEXT,
      metadata TEXT
    )`,
  ];

  for (const sql of tables) {
    try {
      db.query(sql).run();
    } catch (e) {
      console.error('Failed to create table:', e);
    }
  }

  // Insert default config if not exists
  try {
    db.query(`INSERT OR IGNORE INTO adaptive_config (user_id, learning_enabled) VALUES ('default', 1)`).run();
  } catch (e) {}
}
