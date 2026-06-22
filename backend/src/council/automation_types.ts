// Autonomous Agent Council — Types
// ~/missioncontrol/backend/src/council/automation.ts

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  methods: ExecutionMethod[];
  costPer1K: number; // estimated cost per 1K tokens
  speed: 'fast' | 'medium' | 'slow';
  reliability: number; // 0-1
  contextWindow: number;
  specialties: string[]; // e.g. ['code', 'analysis', 'creative', 'math']
}

export interface ExecutionMethod {
  id: string;
  name: string;
  description: string;
  parameters: MethodParameter[];
  example: string;
}

export interface MethodParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  default?: any;
}

export interface TaskDecomposition {
  originalRequest: string;
  subtasks: SubTask[];
  estimatedDuration: number; // minutes
  estimatedCost: number;
  dependencies: string[][]; // task IDs that must complete before next
}

export interface SubTask {
  id: string;
  description: string;
  agentId: string; // which agent executes this
  method: string; // which method to use
  parameters: Record<string, any>;
  dependencies: string[]; // task IDs
  estimatedTokens: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  result?: TaskResult;
  startedAt?: string;
  completedAt?: string;
  retries: number;
}

export interface TaskResult {
  success: boolean;
  output: string;
  artifacts?: string[]; // file paths, URLs
  metrics: {
    tokensUsed: number;
    durationMs: number;
    cost: number;
  };
  error?: string;
}

export interface CouncilDeliberation {
  taskId: string;
  proposals: AgentProposal[];
  votes: Vote[];
  winner: AgentProposal;
  reasoning: string;
  confidence: number;
}

export interface AgentProposal {
  agentId: string;
  agentName: string;
  method: string;
  reasoning: string;
  estimatedCost: number;
  estimatedTime: number;
  confidence: number;
  alternatives: string[];
}

export interface Vote {
  agentId: string;
  votedFor: string; // proposal ID
  reasoning: string;
  confidence: number;
}

export interface AutonomousJob {
  id: string;
  userRequest: string;
  status: 'planning' | 'deliberating' | 'executing' | 'verifying' | 'completed' | 'failed';
  decomposition?: TaskDecomposition;
  deliberation?: CouncilDeliberation;
  subtasks: SubTask[];
  finalResult?: string;
  createdAt: string;
  updatedAt: string;
  logs: JobLog[];
}

export interface JobLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  agent?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface AgentRegistry {
  agents: AgentCapability[];
  register(agent: AgentCapability): void;
  unregister(id: string): void;
  findBestFor(task: string, constraints?: { maxCost?: number; minSpeed?: string }): AgentCapability[];
}
