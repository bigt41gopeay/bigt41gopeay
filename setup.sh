#!/bin/bash
# Mission Control — Full Setup Script
# This script automates the installation of all components

set -e

echo "🚀 Mission Control — Autonomous Agent Council Setup"
echo "===================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
check_prereq() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    if ! command -v bun &> /dev/null; then
        echo -e "${RED}❌ Bun not found. Install with: curl -fsSL https://bun.sh/install | bash${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Bun found${NC}"

    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git not found. Install with: brew install git${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Git found${NC}"

    if [ ! -d "$HOME/missioncontrol" ]; then
        echo -e "${RED}❌ ~/missioncontrol not found. Please install Mission Control first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Mission Control found${NC}"
}

# Backup existing files
backup_existing() {
    echo -e "${BLUE}Creating backup...${NC}"
    BACKUP_DIR="$HOME/missioncontrol/.backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    cp -r "$HOME/missioncontrol/backend/src" "$BACKUP_DIR/" 2>/dev/null || true
    cp -r "$HOME/missioncontrol/web/src" "$BACKUP_DIR/" 2>/dev/null || true

    echo -e "${GREEN}✓ Backup created at $BACKUP_DIR${NC}"
}

# Create directories
create_dirs() {
    echo -e "${BLUE}Creating directories...${NC}"
    mkdir -p "$HOME/missioncontrol/backend/src/council"
    mkdir -p "$HOME/missioncontrol/backend/src/memory"
    mkdir -p "$HOME/missioncontrol/backend/src/automation"
    mkdir -p "$HOME/missioncontrol/backend/src/integrations"
    echo -e "${GREEN}✓ Directories created${NC}"
}

# Copy files
copy_files() {
    echo -e "${BLUE}Copying files...${NC}"

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    cp -r "$SCRIPT_DIR/backend/src/council/"* "$HOME/missioncontrol/backend/src/council/"
    cp -r "$SCRIPT_DIR/backend/src/memory/"* "$HOME/missioncontrol/backend/src/memory/"
    cp -r "$SCRIPT_DIR/backend/src/automation/"* "$HOME/missioncontrol/backend/src/automation/"
    cp -r "$SCRIPT_DIR/backend/src/integrations/"* "$HOME/missioncontrol/backend/src/integrations/"
    cp "$SCRIPT_DIR/web/src/"*.tsx "$HOME/missioncontrol/web/src/"

    echo -e "${GREEN}✓ Files copied${NC}"
}

# Modify server.ts (manual step)
modify_server() {
    echo -e "${YELLOW}⚠️  Manual step required: Modify server.ts${NC}"
    echo ""
    echo "Add these imports at the TOP of ~/missioncontrol/backend/src/server.ts:"
    echo ""
    echo "import { createJob, getJob, listJobs, cancelJob, initAutonomousTables, loadJobsFromDB } from './council/orchestrator';"
    echo "import { agentRegistry } from './council/agentRegistry';"
    echo "import { initMemoryTables, getLearningMetrics, updateAdaptiveConfig, getAdaptiveConfig } from './memory/learningEngine';"
    echo "import { getSubscriptions, addOrUpdateSubscription, deleteSubscription, checkSubscriptionHealth, getBudgetAlerts, syncSubscriptionsFromConfig } from './memory/subscriptionManager';"
    echo "import { initScheduler, createScheduledJob, listScheduledJobs, toggleScheduledJob, deleteScheduledJob } from './automation/scheduler';"
    echo "import { initVoiceTables, parseVoiceCommand, executeVoiceCommand } from './automation/voiceTrigger';"
    echo "import { initFileWatcher, addWatchedFolder, removeWatchedFolder, listWatchedFolders, toggleWatchedFolder } from './automation/fileWatcher';"
    echo "import { initGitHooks, addGitHook, removeGitHook, listGitHooks, toggleGitHook, handleGitEvent, installGitHook } from './automation/gitHook';"
    echo "import { initShortcutsBridge, addShortcutAction, removeShortcutAction, listShortcutActions, handleUrlScheme, generateAppleScript, generateShortcutsAppAction, handleSiriCommand } from './automation/shortcutsBridge';"
    echo "import { initEmail, getEmailConfig, setEmailConfig, testEmailConnection, sendEmail } from './integrations/email';"
    echo "import { initSlack, getSlackConfig, setSlackConfig, testSlackConnection, handleSlackSlashCommand } from './integrations/slack';"
    echo "import { initTelegram, getTelegramConfig, setTelegramConfig, handleTelegramWebhook } from './integrations/telegram';"
    echo "import { initN8n, getN8nConfig, setN8nConfig, handleN8nIncomingWebhook } from './integrations/n8n';"
    echo ""
    echo "Add after DB init:"
    echo "initAutonomousTables();"
    echo "loadJobsFromDB();"
    echo "initMemoryTables();"
    echo "initScheduler();"
    echo "initVoiceTables();"
    echo "initFileWatcher();"
    echo "initGitHooks();"
    echo "initShortcutsBridge();"
    echo "initEmail();"
    echo "initSlack();"
    echo "initTelegram();"
    echo "initN8n();"
    echo ""
    read -p "Press Enter when you've modified server.ts..."
}

# Modify App.tsx (manual step)
modify_app() {
    echo -e "${YELLOW}⚠️  Manual step required: Modify App.tsx${NC}"
    echo ""
    echo "Add these imports at the TOP of ~/missioncontrol/web/src/App.tsx:"
    echo ""
    echo "import { AutonomousPanel } from './AutonomousPanel';"
    echo "import { MemoryPanel } from './MemoryPanel';"
    echo "import { AutomationPanel } from './AutomationPanel';"
    echo "import { IntegrationsPanel } from './IntegrationsPanel';"
    echo ""
    echo "Add to NAV array (after existing items):"
    echo "{ id: 'autonomous', label: 'Autonomous', icon: '🤖' },"
    echo "{ id: 'memory', label: 'Memory', icon: '🧠' },"
    echo "{ id: 'automation', label: 'Automation', icon: '⚡' },"
    echo "{ id: 'integrations', label: 'Integrations', icon: '🔗' },"
    echo ""
    echo "Add to Dashboard switch:"
    echo "case 'autonomous':"
    echo "  return <AutonomousPanel token={token} />;"
    echo "case 'memory':"
    echo "  return <MemoryPanel token={token} />;"
    echo "case 'automation':"
    echo "  return <AutomationPanel token={token} />;"
    echo "case 'integrations':"
    echo "  return <IntegrationsPanel token={token} />;"
    echo ""
    read -p "Press Enter when you've modified App.tsx..."
}

# Build and restart
build_and_restart() {
    echo -e "${BLUE}Building frontend...${NC}"
    cd "$HOME/missioncontrol/web" && ~/.bun/bin/bun run build
    echo -e "${GREEN}✓ Build complete${NC}"

    echo -e "${BLUE}Restarting backend...${NC}"
    launchctl kickstart -k gui/$(id -u)/com.missioncontrol.backend
    echo -e "${GREEN}✓ Backend restarted${NC}"
}

# Test connection
test_connection() {
    echo -e "${BLUE}Testing connection...${NC}"
    TOKEN=$(jq -r .token ~/.missioncontrol/config.json 2>/dev/null || echo "")
    if [ -z "$TOKEN" ]; then
        echo -e "${YELLOW}⚠️  Could not read token. Test manually with:${NC}"
        echo "curl -s http://127.0.0.1:8787/api/autonomous/agents -H \"Authorization: Bearer YOUR_TOKEN\""
        return
    fi

    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8787/api/autonomous/agents -H "Authorization: Bearer $TOKEN")
    if [ "$RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓ Connection successful!${NC}"
    else
        echo -e "${RED}❌ Connection failed (HTTP $RESPONSE). Check logs: tail -f ~/.missioncontrol/backend.log${NC}"
    fi
}

# Main
main() {
    check_prereq
    backup_existing
    create_dirs
    copy_files
    modify_server
    modify_app
    build_and_restart
    test_connection

    echo ""
    echo -e "${GREEN}🎉 Setup complete!${NC}"
    echo ""
    echo "Open: http://127.0.0.1:8787/#token=$TOKEN"
    echo ""
    echo "New tabs available:"
    echo "  🤖 Autonomous — Create and monitor AI jobs"
    echo "  🧠 Memory — View patterns, insights, subscriptions"
    echo "  ⚡ Automation — Scheduled jobs, voice, file watcher, git hooks"
    echo "  🔗 Integrations — Email, Slack, Discord, Telegram, n8n"
}

main "$@"
