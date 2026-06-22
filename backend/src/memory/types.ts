// Adaptive Memory & Learning System — Types
// ~/missioncontrol/backend/src/memory/types.ts

export interface WorkPattern {
  id: string;
  userId: string; // for multi-user support
  patternType: 'agent_preference' | 'time_of_day' | 'task_sequence' | 'error_recovery' | 'tool_usage' | 'output_format';
  pattern: string; // description of the pattern
  frequency: number; // how many times observed
  confidence: number; // 0-1, how sure we are
  lastObserved: string; // ISO date
  firstObserved: string;
  examples: string[]; // job IDs as examples
  metadata: Record<string, any>;
}

export interface UserPreference {
  id: string;
  category: 'agent' | 'output_format' | 'communication_style' | 'tool' | 'schedule' | 'complexity';
  key: string; // e.g., "preferred_agent_for_coding"
  value: any; // the preference value
  confidence: number; // how sure based on observations
  source: 'explicit' | 'inferred'; // user told us or we learned
  updatedAt: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string; // what kind of tasks this template covers
  triggerPatterns: string[]; // keywords/phrases that trigger this template
  decomposition: {
    subtasks: {
      description: string;
      agentId: string;
      method: string;
      estimatedTokens: number;
      whyThisAgent: string; // learned reason
    }[];
    estimatedDuration: number;
    estimatedCost: number;
  };
  successRate: number; // 0-1, how often this template succeeds
  avgActualCost: number; // average real cost
  avgActualDuration: number; // average real duration
  usageCount: number;
  lastUsed: string;
  createdAt: string;
  userFeedback: number; // -1 to 1, average user rating
}

export interface Subscription {
  id: string;
  provider: 'openai' | 'anthropic' | 'google' | 'moonshot' | 'groq' | 'ollama';
  tier: 'free' | 'pro' | 'enterprise' | 'custom';
  apiKey: string; // encrypted
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerDay: number;
  };
  usage: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    currentMonthCost: number;
    currentMonthTokens: number;
  };
  status: 'active' | 'limited' | 'expired' | 'paused';
  expiresAt?: string;
  lastChecked: string;
  metadata: Record<string, any>;
}

export interface LearningInsight {
  id: string;
  timestamp: string;
  type: 'efficiency_gain' | 'cost_saving' | 'agent_suggestion' | 'pattern_detected' | 'error_prevention' | 'schedule_optimization';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  data: {
    before?: any;
    after?: any;
    saving?: number; // cost or time saved
    metric?: string;
    value?: number;
  };
  applied: boolean; // did user apply this insight?
  dismissed: boolean;
}

export interface WorkSession {
  id: string;
  startTime: string;
  endTime?: string;
  jobsCompleted: number;
  totalCost: number;
  totalTokens: number;
  agentsUsed: string[];
  productivityScore: number; // 0-100
  peakHour: string; // when user was most productive
  patterns: string[]; // pattern IDs observed
}

export interface AdaptiveConfig {
  userId: string;
  learningEnabled: boolean;
  autoOptimize: boolean; // automatically apply optimizations
  autoSelectAgent: boolean; // skip council for known patterns
  suggestionFrequency: 'always' | 'daily' | 'weekly' | 'never';
  complexityPreference: 'simple' | 'balanced' | 'thorough'; // how detailed should decompositions be
  costPreference: 'minimize' | 'balanced' | 'performance'; // cost vs quality tradeoff
  preferredAgents: string[]; // agent IDs user prefers
  blacklistedAgents: string[]; // agents user doesn't want
  peakHours: string[]; // e.g., ["09:00-12:00", "14:00-17:00"]
  timezone: string;
  updatedAt: string;
}

export interface LearningMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalCost: number;
  totalTokens: number;
  avgJobDuration: number;
  mostUsedAgent: string;
  mostCommonTask: string;
  improvementRate: number; // % improvement over time
  costEfficiency: number; // cost per successful task, trending
  timeEfficiency: number; // time per successful task, trending
  patternsLearned: number;
  insightsGenerated: number;
  insightsApplied: number;
}
