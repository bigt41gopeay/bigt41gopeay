#!/usr/bin/env bash
# ModernCRM — vieno žingsnio diegimas.
# Paleiskite ant serverio kaip root:
#   curl -sSL https://raw.githubusercontent.com/bigt41gopeay/bigt41gopeay/claude/create-crm-system-5MIl6/deploy/install.sh | bash
# arba jau klonuotame repo:
#   sudo bash deploy/install.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/bigt41gopeay/bigt41gopeay.git}"
REPO_BRANCH="${REPO_BRANCH:-claude/create-crm-system-5MIl6}"
INSTALL_DIR="${INSTALL_DIR:-/opt/moderncrm}"
WEB_DIR="${WEB_DIR:-/var/www/crm.oktoja.lt}"
DOMAIN_CRM="${DOMAIN_CRM:-crm.oktoja.lt}"
DOMAIN_N8N="${DOMAIN_N8N:-n8n.oktoja.lt}"
OWNER="${OWNER:-crmuser:www-data}"

log() { echo -e "\033[1;36m[install]\033[0m $*"; }
err() { echo -e "\033[1;31m[error]\033[0m $*" >&2; }

if [[ $EUID -ne 0 ]]; then err "Paleiskite kaip root (sudo)"; exit 1; fi

log "1/7 — Diegiu priklausomybes (docker, node, nginx)"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git nginx rsync jq

if ! command -v docker &>/dev/null; then
  log "   Diegiu Docker"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc || \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

if ! command -v node &>/dev/null; then
  log "   Diegiu Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

log "2/7 — Kloniuoju / atnaujinu repo į ${INSTALL_DIR}"
if [[ -d "${INSTALL_DIR}/.git" ]]; then
  git -C "${INSTALL_DIR}" fetch --all --prune
  git -C "${INSTALL_DIR}" checkout "${REPO_BRANCH}"
  git -C "${INSTALL_DIR}" pull --ff-only
else
  git clone --branch "${REPO_BRANCH}" "${REPO_URL}" "${INSTALL_DIR}"
fi

log "3/7 — .env paruošimas"
if [[ ! -f "${INSTALL_DIR}/backend/.env" ]]; then
  cp "${INSTALL_DIR}/backend/.env.example" "${INSTALL_DIR}/backend/.env"
  log "   Sukurtas ${INSTALL_DIR}/backend/.env — PAREDAGUOKITE slaptažodžius ir API raktus!"
fi

log "4/7 — Paleidžiu PocketBase + n8n (docker compose up -d)"
cd "${INSTALL_DIR}/backend"
docker compose --env-file .env up -d
sleep 5
log "   Status:"
docker compose ps

log "5/7 — Konfigūruoju nginx"
install -m 0644 "${INSTALL_DIR}/deploy/nginx-crm.oktoja.lt.conf" /etc/nginx/sites-available/crm.oktoja.lt
install -m 0644 "${INSTALL_DIR}/deploy/nginx-n8n.oktoja.lt.conf" /etc/nginx/sites-available/n8n.oktoja.lt
ln -sf /etc/nginx/sites-available/crm.oktoja.lt /etc/nginx/sites-enabled/crm.oktoja.lt
ln -sf /etc/nginx/sites-available/n8n.oktoja.lt /etc/nginx/sites-enabled/n8n.oktoja.lt
nginx -t
systemctl reload nginx

log "6/7 — Build + deploy frontend → ${WEB_DIR}"
cd "${INSTALL_DIR}/frontend"
npm install --silent --no-audit --no-fund
npm run build --silent
mkdir -p "${WEB_DIR}"
# NEtrinam esamų failų — tik pridedam/perrašom naujus
rsync -a --update dist/ "${WEB_DIR}/"
chown -R "${OWNER}" "${WEB_DIR}"
find "${WEB_DIR}" -type d -exec chmod 775 {} \;
find "${WEB_DIR}" -type f -exec chmod 664 {} \;

log "7/7 — Gautas baigtas!"
cat <<EOF

══════════════════════════════════════════════════════════════════
  ModernCRM paleistas
══════════════════════════════════════════════════════════════════

  🌐 CRM:     https://${DOMAIN_CRM}
  🤖 n8n:     https://${DOMAIN_N8N}  (admin / žr. .env)
  📊 PB UI:   https://${DOMAIN_CRM}/_/  (sukurti admin prie pirmo apsilankymo)

  📁 Installacija:  ${INSTALL_DIR}
  📁 Web root:      ${WEB_DIR}

  Toliau:
    1. Atidarykite https://${DOMAIN_CRM}/_/ ir sukurkite PocketBase admin
    2. Paredaguokite ${INSTALL_DIR}/backend/.env (SMTP, AI, API raktai)
    3. docker compose --env-file .env -f ${INSTALL_DIR}/backend/docker-compose.yml restart
    4. n8n importuokite workflow'us iš ${INSTALL_DIR}/backend/n8n/workflows/

  Atnaujinimui ateityje:
    sudo bash ${INSTALL_DIR}/deploy/install.sh

══════════════════════════════════════════════════════════════════
EOF
