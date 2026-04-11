#!/bin/bash
# ============================================
# MažųjųPasaulis - Update Script
# Run this on the server to pull latest changes
# ============================================
set -e

APP_DIR="/var/www/mazujupasaulis"
BRANCH="claude/kids-learning-platform-4tReq"

echo "🔄 MažųjųPasaulis - Atnaujinimas pradedamas..."
echo "============================================"

cd "$APP_DIR"

# Pull latest changes
echo "📥 Gaunami pakeitimai..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# Update frontend deps & build
echo "🏗️  Atnaujinama frontend..."
npm install
npx vite build

# Update backend deps
echo "🏗️  Atnaujinama backend..."
cd server
npm install

# Run seed (safe - only adds missing data)
node seed.js || true

# Restart PM2
cd ..
pm2 restart mazujupasaulis || PORT=3001 pm2 start server/index.js --name mazujupasaulis
pm2 save

# Reload nginx (config may have changed)
nginx -t && systemctl reload nginx

echo ""
echo "============================================"
echo "✅ Atnaujinimas baigtas!"
echo "============================================"
echo ""
echo "🌐 Svetainė: http://88.198.130.212"
echo "📊 Logai:    pm2 logs mazujupasaulis"
echo "============================================"
