// Task Decomposer — breaks user requests into subtasks
// ~/missioncontrol/backend/src/council/decomposer.ts

import { agentRegistry } from './agentRegistry';
import type { TaskDecomposition, SubTask, AgentCapability } from './automation_types';

interface DecompositionPrompt {
  request: string;
  availableAgents: AgentCapability[];
}

export async function decomposeTask(
  request: string,
  aiRouter: any // The existing AI router from the project
): Promise<TaskDecomposition> {
  const agents = agentRegistry.listAll();

  // Build the decomposition prompt
  const prompt = buildDecompositionPrompt(request, agents);

  // Use the local Qwen model for decomposition (fast, free)
  const response = await aiRouter.route({
    prompt,
    mode: 'LOCAL_ONLY', // Use local model for planning to save costs
    systemPrompt: `You are a task decomposition expert. Break the user's request into atomic subtasks.
Each subtask must be assignable to a specific AI agent.
Return ONLY valid JSON matching the expected format.
Consider dependencies between tasks — some must complete before others.
Estimate token usage for each subtask.`,
  });

  try {
    const parsed = JSON.parse(response.text);
    return validateAndEnrichDecomposition(parsed, request, agents);
  } catch (e) {
    // Fallback: simple decomposition
    return fallbackDecomposition(request, agents);
  }
}

function buildDecompositionPrompt(request: string, agents: AgentCapability[]): string {
  const agentDescriptions = agents.map(a => 
    `- ${a.id}: ${a.name} — ${a.description}
  Specialties: ${a.specialties.join(', ')}
  Speed: ${a.speed}, Cost: $${a.costPer1K}/1K tokens, Reliability: ${a.reliability}`
  ).join('
');

  return `User request: "${request}"

Available agents:
${agentDescriptions}

Decompose this request into subtasks. For each subtask, specify:
1. description — what needs to be done
2. agentId — which agent is best suited
3. method — which method to use
4. parameters — required parameters
5. dependencies — which other subtasks must complete first (by index)
6. estimatedTokens — rough estimate

Return JSON:
{
  "subtasks": [
    {
      "id": "task-1",
      "description": "...",
      "agentId": "claude-code",
      "method": "claude-code:prompt",
      "parameters": { "prompt": "...", "cwd": "..." },
      "dependencies": [],
      "estimatedTokens": 2000
    }
  ],
  "estimatedDuration": 15,
  "estimatedCost": 0.05
}`;
}

function validateAndEnrichDecomposition(
  parsed: any,
  request: string,
  agents: AgentCapability[]
): TaskDecomposition {
  const subtasks: SubTask[] = (parsed.subtasks || []).map((st: any, idx: number) => ({
    id: st.id || `task-${idx + 1}`,
    description: st.description || 'Unnamed task',
    agentId: st.agentId || 'qwen-local',
    method: st.method || 'ollama:generate',
    parameters: st.parameters || {},
    dependencies: st.dependencies || [],
    estimatedTokens: st.estimatedTokens || 1000,
    status: 'pending' as const,
    retries: 0,
  }));

  // Build dependency graph
  const dependencies: string[][] = [];
  for (let i = 0; i < subtasks.length; i++) {
    const deps = subtasks[i].dependencies
      .map((dep: string | number) => typeof dep === 'number' ? `task-${dep + 1}` : dep)
      .filter((dep: string) => subtasks.some(s => s.id === dep));
    dependencies.push(deps);
  }

  return {
    originalRequest: request,
    subtasks,
    estimatedDuration: parsed.estimatedDuration || subtasks.length * 5,
    estimatedCost: parsed.estimatedCost || subtasks.reduce((sum: number, s: SubTask) => {
      const agent = agents.find(a => a.id === s.agentId);
      return sum + (agent ? agent.costPer1K * (s.estimatedTokens / 1000) : 0);
    }, 0),
    dependencies,
  };
}

function fallbackDecomposition(request: string, agents: AgentCapability[]): TaskDecomposition {
  // Simple fallback: one task per "best" agent
  const bestAgents = agentRegistry.findBestFor(request);
  const primaryAgent = bestAgents[0] || agents[0];

  const subtasks: SubTask[] = [{
    id: 'task-1',
    description: request,
    agentId: primaryAgent.id,
    method: primaryAgent.methods[0]?.id || 'ollama:generate',
    parameters: { prompt: request },
    dependencies: [],
    estimatedTokens: 2000,
    status: 'pending',
    retries: 0,
  }];

  return {
    originalRequest: request,
    subtasks,
    estimatedDuration: 10,
    estimatedCost: primaryAgent.costPer1K * 2,
    dependencies: [[]],
  };
}

export function getExecutionOrder(decomposition: TaskDecomposition): string[][] {
  // Topological sort of tasks based on dependencies
  const completed = new Set<string>();
  const order: string[][] = [];
  const remaining = new Set(decomposition.subtasks.map(s => s.id));

  while (remaining.size > 0) {
    const batch: string[] = [];
    for (const taskId of remaining) {
      const task = decomposition.subtasks.find(s => s.id === taskId)!;
      const depsSatisfied = task.dependencies.every(dep => completed.has(dep));
      if (depsSatisfied) {
        batch.push(taskId);
      }
    }

    if (batch.length === 0) {
      // Circular dependency or missing dep — force first remaining
      batch.push(remaining.values().next().value);
    }

    for (const id of batch) {
      completed.add(id);
      remaining.delete(id);
    }
    order.push(batch);
  }

  return order;
}
