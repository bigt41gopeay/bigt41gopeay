#!/bin/bash
# ============================================
# MažųjųPasaulis - Deployment Script
# Server: 88.198.130.212 (Ubuntu 24.04)
# ============================================
set -e

echo "🌟 MažųjųPasaulis - Deployment pradedamas..."
echo "============================================"

# === 1. SYSTEM UPDATE ===
echo "📦 1/7 Atnaujinami sistemos paketai..."
apt-get update -qq
apt-get upgrade -y -qq

# === 2. INSTALL NODE.JS 20 ===
echo "📦 2/7 Diegiamas Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
echo "   Node.js: $(node --version)"
echo "   npm: $(npm --version)"

# === 3. INSTALL NGINX ===
echo "📦 3/7 Diegiamas Nginx..."
apt-get install -y -qq nginx
systemctl enable nginx

# === 4. INSTALL PM2 ===
echo "📦 4/7 Diegiamas PM2..."
npm install -g pm2 2>/dev/null
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# === 5. INSTALL GIT ===
echo "📦 5/7 Diegiamas Git..."
apt-get install -y -qq git build-essential python3

# === 6. CLONE & BUILD ===
echo "📦 6/7 Klonuojama ir buildinama..."
APP_DIR="/var/www/mazujupasaulis"
BRANCH="claude/kids-learning-platform-4tReq"

if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  rm -rf "$APP_DIR"
  git clone https://github.com/bigt41gopeay/bigt41gopeay.git "$APP_DIR"
  cd "$APP_DIR"
  git checkout "$BRANCH"
fi

# Build frontend
echo "   Building frontend..."
npm install
npx vite build

# Setup backend
echo "   Setting up backend..."
cd server
mkdir -p data uploads cache/tts
npm install
node seed.js

# Persist .env across deploys: create a template if missing
if [ ! -f .env ]; then
  cat > .env << 'ENV'
# Azure Speech Service (lt-LT Neural voices). Get from portal.azure.com
# AZURE_SPEECH_KEY=
# AZURE_SPEECH_REGION=westeurope

# Stripe (optional)
# STRIPE_SECRET_KEY=
ENV
  echo "   ⚠️  Sukurtas tuščias server/.env — pridėk AZURE_SPEECH_KEY!"
fi

# === 7. START WITH PM2 ===
echo "📦 7/7 Paleidžiamas serveris..."
pm2 delete mazujupasaulis 2>/dev/null || true
PORT=3001 pm2 start index.js --name mazujupasaulis
pm2 save

# === NGINX CONFIG ===
echo "📦 Konfigūruojamas Nginx..."
mkdir -p /etc/ssl/mazujupasaulis
[ -f /etc/ssl/mazujupasaulis/fullchain.pem ] || openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout /etc/ssl/mazujupasaulis/privkey.pem -out /etc/ssl/mazujupasaulis/fullchain.pem -subj "/CN=mazujupasaulis.lt" -addext "subjectAltName=DNS:mazujupasaulis.lt,DNS:www.mazujupasaulis.lt" 2>/dev/null
cat > /etc/nginx/sites-available/mazujupasaulis << 'NGINX'
# Increase client body size for image uploads
client_max_body_size 10M;

server {
    listen 80;
    listen 443 ssl;
    ssl_certificate /etc/ssl/mazujupasaulis/fullchain.pem;
    ssl_certificate_key /etc/ssl/mazujupasaulis/privkey.pem;
    server_name 88.198.130.212 mazujupasaulis.lt www.mazujupasaulis.lt;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Gzip
    gzip on;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss image/svg+xml;
    gzip_min_length 1000;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Uploaded images - served by backend
    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        expires 30d;
        add_header Cache-Control "public";
    }

    # SEO files - served by backend
    location = /sitemap.xml { proxy_pass http://127.0.0.1:3001; }
    location = /robots.txt { proxy_pass http://127.0.0.1:3001; }

    # Static files
    location / {
        root /var/www/mazujupasaulis/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINX

ln -sf /etc/nginx/sites-available/mazujupasaulis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# === FIREWALL ===
echo "🔒 Konfigūruojamas firewall..."
if command -v ufw &> /dev/null; then
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 22/tcp
  echo "y" | ufw enable 2>/dev/null || true
fi

echo ""
echo "============================================"
echo "🎉 MažųjųPasaulis sėkmingai paleistas!"
echo "============================================"
echo ""
echo "🌐 Svetainė: http://88.198.130.212"
echo "📡 API:      http://88.198.130.212/api/products"
echo ""
echo "👤 Admin prisijungimas:"
echo "   Email:    admin@mazujupasaulis.lt"
echo "   Password: admin123"
echo ""
echo "📂 Failai:   $APP_DIR"
echo "📊 PM2:      pm2 status / pm2 logs mazujupasaulis"
echo "🔄 Restart:  pm2 restart mazujupasaulis"
echo ""
echo "Kitas žingsnis: pridėti SSL su Let's Encrypt:"
echo "  apt install certbot python3-certbot-nginx"
echo "  certbot --nginx -d mazujupasaulis.lt"
echo "============================================"
