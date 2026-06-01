#!/usr/bin/env bash
#
# One-shot deployment helper for the CrewAI Control Gateway.
#
# Run this FROM YOUR OWN MACHINE (which can reach the server over SSH). It
# connects to the target Ubuntu host, installs Docker, checks out this branch,
# configures secrets, provisions a cert, and brings the stack up.
#
# Usage:
#   SERVER=1.2.3.4 ./deploy.sh
#   SERVER=1.2.3.4 SSH_USER=deploy DOMAIN=crew.example.com ./deploy.sh
#
# Environment:
#   SERVER    (required)  hostname/IP of the target server
#   SSH_USER  (default: root)
#   BRANCH    (default: claude/crewai-docker-dashboard-setup-7wJI0)
#   DOMAIN    (optional)  cert CN / origin; defaults to the server's primary IP
#
# Security notes:
#   - The dashboard admin password is read interactively and streamed over the
#     existing SSH channel via stdin — it is never placed in this script, in
#     shell history, or in process arguments on either machine.
#   - This provisions a SELF-SIGNED cert for first boot. For production, use a
#     real certificate (Let's Encrypt) — see crewai/DEPLOY.md.
#   - After first successful boot, harden SSH (key-only auth, disable root
#     password login) and rotate any password shared over chat. See DEPLOY.md.

set -euo pipefail

SERVER="${SERVER:-}"
SSH_USER="${SSH_USER:-root}"
BRANCH="${BRANCH:-claude/crewai-docker-dashboard-setup-7wJI0}"
DOMAIN="${DOMAIN:-}"
REPO_URL="${REPO_URL:-https://github.com/bigt41gopeay/bigt41gopeay.git}"

if [[ -z "$SERVER" ]]; then
  echo "ERROR: set SERVER, e.g.  SERVER=1.2.3.4 ./deploy.sh" >&2
  exit 1
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "ERROR: ssh client not found on this machine." >&2
  exit 1
fi

read -rs -p "Dashboard admin password (for user 'admin'): " ADMIN_PW; echo
if [[ ${#ADMIN_PW} -lt 8 ]]; then
  echo "ERROR: choose a password of at least 8 characters." >&2
  exit 1
fi

echo ">> Deploying to ${SSH_USER}@${SERVER} (branch: ${BRANCH})"

# The remote script reads the admin password from the first line of stdin so it
# never appears in argv or the remote shell history.
remote_script=$(cat <<'REMOTE'
set -euo pipefail
IFS= read -r ADMIN_PW
BRANCH="$1"; DOMAIN="$2"; REPO_URL="$3"

echo ">> [remote] installing Docker if needed"
command -v docker >/dev/null 2>&1 || curl -fsSL https://get.docker.com | sh

echo ">> [remote] fetching code"
if [[ ! -d bigt41gopeay/.git ]]; then
  git clone "$REPO_URL" bigt41gopeay
fi
cd bigt41gopeay
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
cd crewai

echo ">> [remote] configuring .env"
[[ -f .env ]] || cp .env.example .env
sed -i 's/^CREWAI_ENVIRONMENT=.*/CREWAI_ENVIRONMENT=production/' .env
if grep -q '^CREWAI_SECRET_KEY=CHANGE_ME' .env || ! grep -q '^CREWAI_SECRET_KEY=' .env; then
  sed -i "s#^CREWAI_SECRET_KEY=.*#CREWAI_SECRET_KEY=$(openssl rand -hex 32)#" .env
fi
HASH=$(printf '%s' "$ADMIN_PW" | docker run --rm -i -v "$PWD":/app -w /app python:3.12-slim \
  sh -c "pip install -q 'passlib[bcrypt]' >/dev/null 2>&1 && python -c \"import sys;from app.security import hash_password;print(hash_password(sys.stdin.read()))\"")
# Escape '#' and '&' for sed replacement safety.
ESCAPED=$(printf '%s' "$HASH" | sed -e 's/[#&\\]/\\&/g')
sed -i "s#^CREWAI_ADMIN_PASSWORD_HASH=.*#CREWAI_ADMIN_PASSWORD_HASH=${ESCAPED}#" .env
chmod 600 .env

CN="${DOMAIN:-$(hostname -I | awk '{print $1}')}"
if [[ -n "$DOMAIN" ]]; then
  sed -i "s#^CREWAI_CORS_ALLOW_ORIGINS=.*#CREWAI_CORS_ALLOW_ORIGINS=https://${DOMAIN}#" .env
fi

echo ">> [remote] ensuring a TLS certificate (self-signed fallback) for CN=${CN}"
if [[ ! -f nginx/certs/fullchain.pem || ! -f nginx/certs/privkey.pem ]]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
    -keyout nginx/certs/privkey.pem -out nginx/certs/fullchain.pem -subj "/CN=${CN}" >/dev/null 2>&1
fi
chmod 600 nginx/certs/privkey.pem

echo ">> [remote] firewall (allow SSH/HTTP/HTTPS)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 80,443/tcp >/dev/null 2>&1 || true
  yes | ufw enable >/dev/null 2>&1 || true
fi

echo ">> [remote] building and starting the stack"
docker compose up -d --build
sleep 5
docker compose ps
echo ">> [remote] health check:"
curl -fsS -k https://127.0.0.1/healthz || curl -fsS http://127.0.0.1:8000/healthz || true
echo
echo ">> [remote] done. Dashboard: https://${CN}/  (user: admin)"
REMOTE
)

# Stream the password (line 1) followed by the remote script into a remote bash.
{
  printf '%s\n' "$ADMIN_PW"
  printf '%s' "$remote_script"
} | ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" \
      "bash -s -- '${BRANCH}' '${DOMAIN}' '${REPO_URL}'"

echo ">> Local: deployment script finished."
echo ">> Next: rotate any chat-shared password and switch the server to SSH key-only auth (see crewai/DEPLOY.md)."
