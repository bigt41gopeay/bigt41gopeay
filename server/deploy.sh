#!/bin/bash
# ManoKRM Auto-Deploy Script
# Pulls latest code from GitHub and rebuilds

set -e

DEPLOY_DIR="/var/www/mano-crm"
BRANCH="claude/examine-server-deployment-UTbjL"
LOG="/var/log/manocrm-deploy.log"

echo "$(date) — Deploy started" >> "$LOG"

cd "$DEPLOY_DIR"

# Pull latest
git fetch origin "$BRANCH" >> "$LOG" 2>&1
git reset --hard "origin/$BRANCH" >> "$LOG" 2>&1

# Install deps if package.json changed
npm install --production=false >> "$LOG" 2>&1

# Build
npm run build >> "$LOG" 2>&1

echo "$(date) — Deploy finished successfully" >> "$LOG"
