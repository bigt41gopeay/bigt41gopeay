// Agent Registry — knows all available agents and their capabilities
// ~/missioncontrol/backend/src/council/agentRegistry.ts

import type { AgentCapability, AgentRegistry as IAgentRegistry } from './automation_types';

class Registry implements IAgentRegistry {
  agents: AgentCapability[] = [];

  constructor() {
    this.loadDefaultAgents();
  }

  private loadDefaultAgents() {
    this.agents = [
      {
        id: 'claude-code',
        name: 'Claude Code',
        description: 'Anthropic Claude via CLI — best for complex coding, refactoring, git operations, and project-wide changes. Runs in terminal.',
        methods: [
          {
            id: 'claude-code:prompt',
            name: 'Direct Prompt',
            description: 'Send a natural language prompt to Claude Code in the project directory',
            parameters: [
              { name: 'prompt', type: 'string', required: true, description: 'The task description' },
              { name: 'cwd', type: 'string', required: false, description: 'Working directory', default: '~' },
              { name: 'timeout', type: 'number', required: false, description: 'Timeout in seconds', default: 300 },
            ],
            example: 'claude "Refactor the auth module to use JWT" --cwd ~/myproject',
          },
          {
            id: 'claude-code:edit',
            name: 'File Edit',
            description: 'Edit specific files with Claude Code',
            parameters: [
              { name: 'files', type: 'array', required: true, description: 'Array of file paths' },
              { name: 'instruction', type: 'string', required: true, description: 'Edit instruction' },
            ],
            example: 'claude --files src/auth.ts "Add error handling"',
          },
          {
            id: 'claude-code:git',
            name: 'Git Operation',
            description: 'Execute git commands and commit via Claude Code',
            parameters: [
              { name: 'operation', type: 'string', required: true, description: 'commit, branch, merge, etc.' },
              { name: 'message', type: 'string', required: false, description: 'Commit message' },
            ],
            example: 'claude --git commit "Fix login bug"',
          },
        ],
        costPer1K: 0.008,
        speed: 'medium',
        reliability: 0.95,
        contextWindow: 200000,
        specialties: ['code', 'refactoring', 'git', 'architecture', 'debugging'],
      },
      {
        id: 'chatgpt',
        name: 'ChatGPT (OpenAI)',
        description: 'OpenAI GPT-4o/4.5 via API — best for analysis, writing, math, reasoning, and creative tasks.',
        methods: [
          {
            id: 'chatgpt:completion',
            name: 'Chat Completion',
            description: 'Send prompt to GPT-4o and get response',
            parameters: [
              { name: 'prompt', type: 'string', required: true, description: 'The prompt' },
              { name: 'model', type: 'string', required: false, description: 'Model name', default: 'gpt-4o' },
              { name: 'temperature', type: 'number', required: false, description: 'Creativity (0-2)', default: 0.7 },
              { name: 'maxTokens', type: 'number', required: false, description: 'Max response tokens', default: 4096 },
            ],
            example: '{ prompt: "Analyze this data and summarize", model: "gpt-4o" }',
          },
          {
            id: 'chatgpt:function',
            name: 'Function Calling',
            description: 'Use GPT with structured function calling for precise outputs',
            parameters: [
              { name: 'prompt', type: 'string', required: true, description: 'The prompt' },
              { name: 'functions', type: 'array', required: true, description: 'Function definitions' },
              { name: 'model', type: 'string', required: false, default: 'gpt-4o' },
            ],
            example: '{ prompt: "Extract entities", functions: [...] }',
          },
        ],
        costPer1K: 0.005,
        speed: 'fast',
        reliability: 0.93,
        contextWindow: 128000,
        specialties: ['analysis', 'writing', 'math', 'reasoning', 'creative', 'data'],
      },
      {
        id: 'gemini',
        name: 'Gemini (Google)',
        description: 'Google Gemini 2.5 Pro — best for long-context analysis, multimodal (images), and research.',
        methods: [
          {
            id: 'gemini:generate',
            name: 'Generate Content',
            description: 'Send text or multimodal prompt to Gemini',
            parameters: [
              { name: 'prompt', type: 'string', required: true, description: 'The prompt' },
              { name: 'model', type: 'string', required: false, default: 'gemini-2.5-pro' },
              { name: 'files', type: 'array', required: false, description: 'File paths for multimodal input' },
            ],
            example: '{ prompt: "Analyze this screenshot", files: ["/path/to/image.png"] }',
          },
          {
            id: 'gemini:research',
            name: 'Deep Research',
            description: 'Use Gemini for web-grounded research with citations',
            parameters: [
              { name: 'query', type: 'string', required: true, description: 'Research query' },
              { name: 'depth', type: 'string', required: false, default: 'medium' },
            ],
            example: '{ query: "Latest React 19 features", depth: "deep" }',
          },
        ],
        costPer1K: 0.0035,
        speed: 'medium',
        reliability: 0.90,
        contextWindow: 1000000,
        specialties: ['research', 'multimodal', 'long-context', 'analysis', 'summarization'],
      },
      {
        id: 'kimi',
        name: 'Kimi (Moonshot)',
        description: 'Moonshot AI Kimi — best for long-document processing, Chinese content, and coding.',
        methods: [
          {
            id: 'kimi:chat',
            name: 'Chat Completion',
            description: 'Send prompt to Kimi API',
            parameters: [
              { name: 'prompt', type: 'string', required: true, description: 'The prompt' },
              { name: 'model', type: 'string', required: false, default: 'kimi-k2' },
            ],
            example: '{ prompt: "Translate this to Chinese", model: "kimi-k2" }',
          },
        ],
        costPer1K: 0.002,
        speed: 'fast',
        reliability: 0.88,
        contextWindow: 256000,
        specialties: ['chinese', 'long-document', 'coding', 'translation'],
      },
      {
        id: 'qwen-local',
        name: 'Qwen 2.5 (Local Ollama)',
        description: 'Local Qwen 2.5 7B via Ollama — free, fast, private. Best for simple tasks, quick answers, and when offline.',
        methods: [
          {
            id: 'ollama:generate',
            name: 'Ollama Generate',
            description: 'Send prompt to local Ollama model',
            parameters: [
              { name: 'prompt', type: 'string', required: true, description: 'The prompt' },
              { name: 'model', type: 'string', required: false, default: 'qwen2.5:7b' },
              { name: 'stream', type: 'boolean', required: false, default: false },
            ],
            example: '{ prompt: "Summarize this text", model: "qwen2.5:7b" }',
          },
        ],
        costPer1K: 0,
        speed: 'fast',
        reliability: 0.75,
        contextWindow: 32768,
        specialties: ['quick', 'free', 'offline', 'simple', 'privacy'],
      },
      {
        id: 'qwen-coder-local',
        name: 'Qwen Coder (Local Ollama)',
        description: 'Local Qwen 2.5 Coder 7B via Ollama — specialized for coding tasks. Free and fast.',
        methods: [
          {
            id: 'ollama:code',
            name: 'Code Generation',
            description: 'Generate or refactor code locally',
            parameters: [
              { name: 'prompt', type: 'string', required: true, description: 'Coding task' },
              { name: 'language', type: 'string', required: false, description: 'Target language', default: 'typescript' },
              { name: 'model', type: 'string', required: false, default: 'qwen2.5-coder:7b' },
            ],
            example: '{ prompt: "Write a React hook for debounce", language: "typescript" }',
          },
        ],
        costPer1K: 0,
        speed: 'fast',
        reliability: 0.80,
        contextWindow: 32768,
        specialties: ['code', 'quick', 'free', 'offline', 'refactoring'],
      },
      {
        id: 'system',
        name: 'System Agent',
        description: 'Direct system commands — shell, AppleScript, file operations. Requires ARM state.',
        methods: [
          {
            id: 'system:shell',
            name: 'Shell Command',
            description: 'Execute shell command (requires ARM)',
            parameters: [
              { name: 'command', type: 'string', required: true, description: 'Shell command' },
              { name: 'cwd', type: 'string', required: false, default: '~' },
              { name: 'timeout', type: 'number', required: false, default: 60 },
            ],
            example: '{ command: "ls -la", cwd: "~/missioncontrol" }',
          },
          {
            id: 'system:applescript',
            name: 'AppleScript',
            description: 'Execute AppleScript to control macOS apps',
            parameters: [
              { name: 'script', type: 'string', required: true, description: 'AppleScript code' },
            ],
            example: '{ script: "tell application \"Safari\" to activate" }',
          },
          {
            id: 'system:file',
            name: 'File Operation',
            description: 'Read, write, or manipulate files',
            parameters: [
              { name: 'operation', type: 'string', required: true, description: 'read, write, append, delete, copy, move' },
              { name: 'path', type: 'string', required: true, description: 'File path' },
              { name: 'content', type: 'string', required: false, description: 'Content for write/append' },
            ],
            example: '{ operation: "read", path: "~/.missioncontrol/config.json" }',
          },
        ],
        costPer1K: 0,
        speed: 'fast',
        reliability: 0.98,
        contextWindow: 0,
        specialties: ['system', 'files', 'shell', 'automation', 'macos'],
      },
    ];
  }

  register(agent: AgentCapability): void {
    const idx = this.agents.findIndex(a => a.id === agent.id);
    if (idx >= 0) this.agents[idx] = agent;
    else this.agents.push(agent);
  }

  unregister(id: string): void {
    this.agents = this.agents.filter(a => a.id !== id);
  }

  findBestFor(task: string, constraints?: { maxCost?: number; minSpeed?: string }): AgentCapability[] {
    let candidates = [...this.agents];

    // Score each agent based on task relevance
    const scored = candidates.map(agent => {
      let score = 0;
      const taskLower = task.toLowerCase();

      // Specialty match
      for (const spec of agent.specialties) {
        if (taskLower.includes(spec.toLowerCase())) score += 10;
      }

      // Reliability bonus
      score += agent.reliability * 5;

      // Speed preference
      if (constraints?.minSpeed === 'fast' && agent.speed === 'fast') score += 5;

      // Cost constraint
      if (constraints?.maxCost !== undefined && agent.costPer1K > constraints.maxCost) {
        score = -999; // disqualify
      }

      return { agent, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.agent);
  }

  getAgent(id: string): AgentCapability | undefined {
    return this.agents.find(a => a.id === id);
  }

  listAll(): AgentCapability[] {
    return [...this.agents];
  }
}

export const agentRegistry = new Registry();
