# Mission Control — Autonomous Agent Council

> 🤖 Multi-AI orchestration platform with adaptive learning, automation hub, and full integrations

## Features

- **Autonomous Agent Council** — 7 AI agents (Claude Code, ChatGPT, Gemini, Kimi, Qwen Local, Qwen Coder, System) that debate and vote on the best execution strategy
- **Adaptive Memory & Learning** — Learns from your work patterns, creates templates, generates insights
- **Automation Hub** — Scheduled jobs, voice commands, file watcher, git hooks, macOS shortcuts
- **Integrations** — Email, Slack, Discord, Telegram, n8n webhook
- **Budget Control** — API usage tracking, cost alerts, automatic fallback to local models

## Quick Start

```bash
# 1. Clone this repo into your missioncontrol directory
git clone https://github.com/YOUR_USERNAME/missioncontrol-autonomous.git

# 2. Copy backend files
cp -r missioncontrol-autonomous/backend/src/council ~/missioncontrol/backend/src/
cp -r missioncontrol-autonomous/backend/src/memory ~/missioncontrol/backend/src/
cp -r missioncontrol-autonomous/backend/src/automation ~/missioncontrol/backend/src/
cp -r missioncontrol-autonomous/backend/src/integrations ~/missioncontrol/backend/src/

# 3. Copy frontend files
cp missioncontrol-autonomous/web/src/*.tsx ~/missioncontrol/web/src/

# 4. Modify server.ts (see INTEGRATION.md)
# 5. Modify App.tsx (see INTEGRATION.md)

# 6. Build and restart
cd ~/missioncontrol/web && ~/.bun/bin/bun run build
launchctl kickstart -k gui/$(id -u)/com.missioncontrol.backend
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS AGENT COUNCIL                 │
├─────────────────────────────────────────────────────────────┤
│  DECOMPOSER  →  Breaks tasks into subtasks                 │
│  COUNCIL     →  Agents debate and vote                     │
│  EXECUTOR    →  Executes on 7 agents with fallback         │
│  ORCHESTRATOR →  Coordinates, retries, verifies, learns    │
├─────────────────────────────────────────────────────────────┤
│                    ADAPTIVE MEMORY                          │
├─────────────────────────────────────────────────────────────┤
│  Work Patterns    →  Agent preferences, timing, sequences    │
│  Task Templates   →  Reusable successful workflows           │
│  Learning Insights →  Cost savings, efficiency gains         │
│  Subscriptions    →  API keys, budgets, usage tracking       │
├─────────────────────────────────────────────────────────────┤
│                    AUTOMATION HUB                           │
├─────────────────────────────────────────────────────────────┤
│  Scheduled Jobs   →  Cron-like with natural language       │
│  Voice Commands   →  Natural language intent parsing         │
│  File Watcher     →  Auto-trigger on file changes            │
│  Git Hooks        →  Auto-review on push/commit            │
│  Shortcuts        →  URL schemes, AppleScript, Siri          │
├─────────────────────────────────────────────────────────────┤
│                    INTEGRATIONS                               │
├─────────────────────────────────────────────────────────────┤
│  📧 Email    →  SMTP, HTML reports, scheduled digests      │
│  💬 Slack    →  Webhooks, Block Kit, slash commands          │
│  🎮 Discord  →  Webhook notifications                        │
│  ✈️ Telegram →  Bot API, webhook, commands                  │
│  🔗 n8n      →  Bidirectional webhooks, workflow triggers    │
└─────────────────────────────────────────────────────────────┘
```

## Agents

| Agent | Specialty | Cost | Speed |
|-------|-----------|------|-------|
| Claude Code | Coding, git, architecture | $0.008/1K | Medium |
| ChatGPT | Analysis, writing, math | $0.005/1K | Fast |
| Gemini | Research, multimodal, long context | $0.0035/1K | Medium |
| Kimi | Chinese, long documents | $0.002/1K | Fast |
| Qwen Local | Free, offline, quick | $0 | Fast |
| Qwen Coder | Free coding | $0 | Fast |
| System | Shell, AppleScript, files | $0 | Fast |

## Telegram Bot Setup

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. In Mission Control UI: Integrations → Telegram → paste token
5. Set webhook URL: `https://YOUR_DOMAIN/api/integrations/telegram/webhook`
6. Add your chat ID to allowed list (use `/start` to get your chat ID)

**Commands:**
- `/start` — Welcome
- `/run [task]` — Execute AI task
- `/status` — Show running jobs
- `/schedule [when] [task]` — Schedule job
- `/agents` — List agents
- `/budget` — Show budget
- `/help` — Help

## n8n Integration Setup

1. In your n8n instance, create a workflow with a Webhook node
2. Set method to POST and copy the webhook URL
3. In Mission Control UI: Integrations → n8n → paste URL and API key
4. Configure which events trigger which n8n workflows

**Events sent to n8n:**
- `job_complete` — When job finishes
- `job_failed` — When job fails
- `budget_alert` — When budget threshold reached
- `insight` — When new insight generated

**Actions from n8n:**
- `execute_job` — Trigger AI job from n8n
- `get_status` — Get running jobs
- `get_metrics` — Get learning metrics
- `get_agents` — List available agents
- `schedule_job` — Schedule recurring job

## File Structure

```
backend/src/
├── council/
│   ├── automation_types.ts    # Types for jobs, tasks, agents
│   ├── agentRegistry.ts         # 7 agents with capabilities
│   ├── decomposer.ts            # Task decomposition
│   ├── deliberator.ts           # Council voting
│   ├── executor.ts              # Agent execution
│   ├── orchestrator.ts          # Main orchestrator
│   └── orchestrator_memory_patch.ts  # Memory integration
├── memory/
│   ├── types.ts                 # Memory types
│   ├── learningEngine.ts        # Pattern detection, templates
│   └── subscriptionManager.ts   # API keys, budgets
├── automation/
│   ├── scheduler.ts             # Cron jobs
│   ├── voiceTrigger.ts          # Voice commands
│   ├── fileWatcher.ts           # File monitoring
│   ├── gitHook.ts               # Git integration
│   ├── shortcutsBridge.ts       # macOS shortcuts
│   └── routes.ts                # Automation API routes
├── integrations/
│   ├── email.ts                 # SMTP email reports
│   ├── smtpClient.ts            # SMTP client (STARTTLS/TLS + AUTH)
│   ├── slack.ts                 # Slack webhooks
│   ├── telegram.ts              # Telegram bot
│   ├── n8n.ts                   # n8n webhooks
│   └── routes.ts                # Integration API routes
└── ...

web/src/
├── AutonomousPanel.tsx          # Autonomous job UI
├── MemoryPanel.tsx              # Memory & learning UI
├── AutomationPanel.tsx          # Automation hub UI
├── IntegrationsPanel.tsx        # Integrations UI
└── ...
```

## License

MIT
