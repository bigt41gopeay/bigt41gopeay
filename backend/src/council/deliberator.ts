// Council Deliberator — agents debate and vote on the best execution plan
// ~/missioncontrol/backend/src/council/deliberator.ts

import { agentRegistry } from './agentRegistry';
import type { 
  CouncilDeliberation, AgentProposal, Vote, TaskDecomposition, SubTask 
} from './automation_types';

export async function deliberate(
  decomposition: TaskDecomposition,
  aiRouter: any
): Promise<CouncilDeliberation> {
  const agents = agentRegistry.listAll().filter(a => a.id !== 'system');

  // Each agent proposes a plan for each subtask
  const proposals = await Promise.all(
    agents.map(agent => generateProposal(agent, decomposition, aiRouter))
  );

  // Each agent votes on the best proposals
  const votes = await Promise.all(
    agents.map(agent => castVote(agent, proposals, decomposition, aiRouter))
  );

  // Tally votes and pick winner
  const winner = tallyVotes(proposals, votes);

  // Generate collective reasoning
  const reasoning = await generateCollectiveReasoning(winner, proposals, votes, aiRouter);

  return {
    taskId: decomposition.originalRequest,
    proposals: proposals.filter(p => p !== null) as AgentProposal[],
    votes: votes.filter(v => v !== null) as Vote[],
    winner,
    reasoning,
    confidence: winner.confidence,
  };
}

async function generateProposal(
  agent: any,
  decomposition: TaskDecomposition,
  aiRouter: any
): Promise<AgentProposal | null> {
  const prompt = `You are ${agent.name}. A task has been decomposed into subtasks.

Original request: "${decomposition.originalRequest}"

Subtasks:
${decomposition.subtasks.map(st => `- ${st.id}: ${st.description} (assigned to ${st.agentId})`).join('
')}

Your task: Propose the BEST way to execute this. You can:
1. Agree with the current assignment and explain why it's optimal
2. Propose reassigning some subtasks to different agents (including yourself)
3. Suggest merging or splitting subtasks
4. Propose alternative methods

Return your proposal as JSON:
{
  "agentId": "${agent.id}",
  "agentName": "${agent.name}",
  "method": "describe the approach",
  "reasoning": "why this is best",
  "estimatedCost": 0.0,
  "estimatedTime": 0,
  "confidence": 0.0,
  "alternatives": ["alternative 1", "alternative 2"]
}`;

  try {
    const response = await aiRouter.route({
      prompt,
      mode: 'SMART_HYBRID',
      systemPrompt: `You are ${agent.name}. Be honest about your strengths and weaknesses. 
If another agent would be better for a subtask, say so. 
Confidence should reflect your certainty (0-1).`,
    });

    const parsed = JSON.parse(response.text);
    return {
      agentId: agent.id,
      agentName: agent.name,
      method: parsed.method || 'default',
      reasoning: parsed.reasoning || 'No reasoning provided',
      estimatedCost: parsed.estimatedCost || decomposition.estimatedCost,
      estimatedTime: parsed.estimatedTime || decomposition.estimatedDuration,
      confidence: parsed.confidence || 0.5,
      alternatives: parsed.alternatives || [],
    };
  } catch (e) {
    return null;
  }
}

async function castVote(
  voter: any,
  proposals: (AgentProposal | null)[],
  decomposition: TaskDecomposition,
  aiRouter: any
): Promise<Vote | null> {
  const validProposals = proposals.filter(p => p !== null) as AgentProposal[];

  const prompt = `You are ${voter.name}. Review these proposals for the task:
"${decomposition.originalRequest}"

Proposals:
${validProposals.map(p => `
--- ${p.agentName} ---
Method: ${p.method}
Reasoning: ${p.reasoning}
Estimated Cost: $${p.estimatedCost.toFixed(4)}
Estimated Time: ${p.estimatedTime} min
Confidence: ${p.confidence}
Alternatives: ${p.alternatives.join(', ')}
`).join('
')}

Vote for the BEST proposal. Consider:
- Cost efficiency
- Speed
- Reliability
- Whether the agent's specialties match the task

Return JSON:
{
  "votedFor": "agent-id",
  "reasoning": "why you chose this",
  "confidence": 0.0
}`;

  try {
    const response = await aiRouter.route({
      prompt,
      mode: 'LOCAL_ONLY', // Use local model for voting to save costs
    });

    const parsed = JSON.parse(response.text);
    const votedFor = validProposals.find(p => p.agentId === parsed.votedFor);

    return {
      agentId: voter.id,
      votedFor: votedFor ? votedFor.agentId : validProposals[0].agentId,
      reasoning: parsed.reasoning || 'No reasoning',
      confidence: parsed.confidence || 0.5,
    };
  } catch (e) {
    // Fallback: vote for first proposal
    return validProposals[0] ? {
      agentId: voter.id,
      votedFor: validProposals[0].agentId,
      reasoning: 'Fallback vote',
      confidence: 0.3,
    } : null;
  }
}

function tallyVotes(proposals: (AgentProposal | null)[], votes: (Vote | null)[]): AgentProposal {
  const validProposals = proposals.filter(p => p !== null) as AgentProposal[];
  const validVotes = votes.filter(v => v !== null) as Vote[];

  const counts: Record<string, { proposal: AgentProposal; votes: number; totalConfidence: number }> = {};

  for (const vote of validVotes) {
    if (!counts[vote.votedFor]) {
      const proposal = validProposals.find(p => p.agentId === vote.votedFor);
      if (proposal) {
        counts[vote.votedFor] = { proposal, votes: 0, totalConfidence: 0 };
      }
    }
    if (counts[vote.votedFor]) {
      counts[vote.votedFor].votes++;
      counts[vote.votedFor].totalConfidence += vote.confidence;
    }
  }

  const sorted = Object.values(counts).sort((a, b) => {
    // Weight by votes * average confidence
    const scoreA = a.votes * (a.totalConfidence / a.votes || 0);
    const scoreB = b.votes * (b.totalConfidence / b.votes || 0);
    return scoreB - scoreA;
  });

  return sorted[0]?.proposal || validProposals[0];
}

async function generateCollectiveReasoning(
  winner: AgentProposal,
  proposals: AgentProposal[],
  votes: Vote[],
  aiRouter: any
): Promise<string> {
  const voteSummary = votes.map(v => 
    `${v.agentId} voted for ${v.votedFor} (${(v.confidence * 100).toFixed(0)}% confidence): ${v.reasoning}`
  ).join('
');

  const prompt = `The council has voted. Winner: ${winner.agentName}

Vote summary:
${voteSummary}

Generate a concise collective reasoning (2-3 sentences) explaining why this approach was chosen.`;

  try {
    const response = await aiRouter.route({
      prompt,
      mode: 'LOCAL_ONLY',
    });
    return response.text.trim();
  } catch (e) {
    return `${winner.agentName} was chosen by council vote due to ${winner.reasoning}`;
  }
}
