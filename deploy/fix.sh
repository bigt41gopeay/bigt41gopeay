#!/usr/bin/env bash
set -euo pipefail

log() { echo -e "\033[1;36m[fix]\033[0m $*"; }
err() { echo -e "\033[1;31m[err]\033[0m $*"; }

CRM_DOMAIN="crm.oktoja.lt"
N8N_DOMAIN="n8n.oktoja.lt"
PB_EMAIL="admin@oktoja.lt"
PB_PASS="Oktoja2026CRM!"
PB_PORT=8090
WEB_DIR="/var/www/${CRM_DOMAIN}"
INSTALL_DIR="/opt/moderncrm"

log "1/6 — Tikrinama ar PocketBase veikia..."
if ! curl -sf "http://localhost:${PB_PORT}/api/health" > /dev/null 2>&1; then
  err "PocketBase neveikia. Restartuojam..."
  cd "${INSTALL_DIR}/backend" && docker compose restart pocketbase
  sleep 5
fi

if curl -sf "http://localhost:${PB_PORT}/api/health" > /dev/null 2>&1; then
  log "   PocketBase OK (port ${PB_PORT})"
else
  err "   PocketBase vis dar neveikia. Patikrinkite: docker logs crm_pocketbase"
  exit 1
fi

log "2/6 — Kuriamas PocketBase superuser..."
docker exec crm_pocketbase /usr/local/bin/pocketbase superuser upsert "${PB_EMAIL}" "${PB_PASS}" 2>/dev/null || true
log "   Admin: ${PB_EMAIL} / ${PB_PASS}"

log "3/6 — Gaunamas admin token..."
TOKEN=$(curl -sf "http://localhost:${PB_PORT}/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"${PB_EMAIL}\",\"password\":\"${PB_PASS}\"}" 2>/dev/null \
  | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4) || true

if [ -z "${TOKEN:-}" ]; then
  TOKEN=$(curl -sf "http://localhost:${PB_PORT}/api/collections/users/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"${PB_EMAIL}\",\"password\":\"${PB_PASS}\"}" 2>/dev/null \
    | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4) || true
fi

if [ -z "${TOKEN:-}" ]; then
  log "   Admin token nepavyko gauti per API — naudosim superuser CLI"
fi

log "4/6 — Taisome nginx (HTTPS redirect + proxy)..."
cat > "/etc/nginx/sites-available/${CRM_DOMAIN}" << 'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name crm.oktoja.lt;

    root /var/www/crm.oktoja.lt;
    index index.html;

    client_max_body_size 50m;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location /api/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 600;
    }
    location /_/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    location /p/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate" always;
    }
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

ln -sf "/etc/nginx/sites-available/${CRM_DOMAIN}" "/etc/nginx/sites-enabled/${CRM_DOMAIN}"
nginx -t && systemctl reload nginx
log "   nginx OK (HTTP)"

log "5/6 — SSL sertifikatas..."
if command -v certbot &>/dev/null; then
  certbot --nginx -d "${CRM_DOMAIN}" --register-unsafely-without-email --agree-tos --non-interactive 2>/dev/null || {
    log "   certbot klaida — SSL praleistas, veiks per HTTP"
  }
else
  apt-get install -y -qq certbot python3-certbot-nginx 2>/dev/null
  certbot --nginx -d "${CRM_DOMAIN}" --register-unsafely-without-email --agree-tos --non-interactive 2>/dev/null || {
    log "   certbot klaida — SSL praleistas, veiks per HTTP"
  }
fi

log "6/6 — Tikrinama..."
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:${PB_PORT}/_/" 2>/dev/null || echo "000")
FRONT_CODE=$(curl -sf -o /dev/null -w "%{http_code}" -H "Host: ${CRM_DOMAIN}" "http://localhost/" 2>/dev/null || echo "000")

echo ""
echo "══════════════════════════════════════════════════════"
echo "  ModernCRM — STATUS"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  PocketBase API:  ${HTTP_CODE} (turėtų būti 200)"
echo "  Frontend:        ${FRONT_CODE} (turėtų būti 200)"
echo ""
echo "  ┌──────────────────────────────────────────────────┐"
echo "  │  CRM:    http://${CRM_DOMAIN}                    │"
echo "  │  Admin:  http://${CRM_DOMAIN}/_/                 │"
echo "  │                                                  │"
echo "  │  Admin login:                                    │"
echo "  │    Email:    ${PB_EMAIL}                         │"
echo "  │    Password: ${PB_PASS}                          │"
echo "  │                                                  │"
echo "  │  CRM login (tas pats):                           │"
echo "  │    Email:    ${PB_EMAIL}                         │"
echo "  │    Password: ${PB_PASS}                          │"
echo "  └──────────────────────────────────────────────────┘"
echo ""
echo "  Jei CRM rodo 'serveris nepasiekiamas':"
echo "    1. Eikite į http://${CRM_DOMAIN}/_/"
echo "    2. Prisijunkite su admin login"
echo "    3. Patikrinkite ar yra 'users' kolekcija"
echo "    4. Jei nėra — sukurkite: New Collection -> 'users' -> Auth"
echo ""
echo "══════════════════════════════════════════════════════"
