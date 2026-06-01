# Deployment runbook — CrewAI Control Gateway on Ubuntu

Step-by-step guide to deploy this stack on a fresh Ubuntu server (e.g. a public
VPS). Run every command **on the server**, as your own user — not from this repo
checkout on your laptop.

> Security first: never expose password-based root login on a public IP, never
> commit `.env` or TLS keys, and treat any secret that has touched a chat window
> or shared channel as compromised — rotate it.

> **Fast path:** to do all of the below in one shot, run the helper script from
> your own machine:
> ```bash
> SERVER=185.2.103.72 ./scripts/deploy.sh        # add DOMAIN=... for a real origin
> ```
> It prompts for the admin password (streamed over SSH, never stored), installs
> Docker, checks out this branch, configures `.env`, provisions a cert, and
> brings the stack up. The manual steps below are the same actions, broken out.

---

## 0. Harden the server before anything else

SSH in once as root (using whatever credential the provider gave you), then
immediately lock it down.

```bash
# Create a non-root sudo user you will use from now on
adduser deploy
usermod -aG sudo deploy

# Install YOUR public key for that user (run on your *laptop*):
#   ssh-copy-id deploy@<server-ip>
# or paste it manually:
mkdir -p /home/deploy/.ssh
echo "ssh-ed25519 AAAA... your-key" > /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Now disable password auth and root login over SSH:

```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/'              /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

**Open a second terminal and confirm `ssh deploy@<server-ip>` works with your key
BEFORE closing the root session** — otherwise you can lock yourself out.

The private SSH key stays on **your machine only**. Do not copy it to the server.

Firewall — expose only SSH + HTTP/HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
sudo ufw status
```

---

## 1. Install Docker Engine + compose plugin

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker            # apply group without re-login
docker version
```

---

## 2. Get the code

```bash
git clone https://github.com/bigt41gopeay/bigt41gopeay.git
cd bigt41gopeay
git checkout claude/crewai-docker-dashboard-setup-7wJI0
cd crewai
```

---

## 3. Configure secrets (`.env`)

`.env` is git-ignored and excluded from the Docker build context — it must never
leave the server.

```bash
cp .env.example .env

# Production mode
sed -i 's/^CREWAI_ENVIRONMENT=.*/CREWAI_ENVIRONMENT=production/' .env

# Strong signing secret
echo "CREWAI_SECRET_KEY=$(openssl rand -hex 32)" >> .env

# Admin password hash (stores the HASH, never the plaintext)
docker run --rm -v "$PWD":/app -w /app python:3.12-slim \
  sh -c "pip install -q 'passlib[bcrypt]' && python -m app.security hash 'CHOOSE-A-STRONG-PASSWORD'"
#  -> copy the printed hash into CREWAI_ADMIN_PASSWORD_HASH=  in .env

# Lock down file permissions
chmod 600 .env
```

Optional:

```bash
# Real CrewAI agents (otherwise runs in simulated mode):
echo "CREWAI_OPENAI_API_KEY=sk-..." >> .env
# Static API key for the iOS service account:
echo "CREWAI_SERVICE_API_KEY=$(openssl rand -hex 32)" >> .env
# Allowed dashboard / app origins:
sed -i 's#^CREWAI_CORS_ALLOW_ORIGINS=.*#CREWAI_CORS_ALLOW_ORIGINS=https://your-domain#' .env
```

---

## 4. TLS certificates

The nginx proxy terminates TLS. Provide a real certificate for production.

**Let's Encrypt (recommended)** — issue a cert for your domain, then point the
proxy at it:

```bash
sudo apt-get update && sudo apt-get install -y certbot
sudo certbot certonly --standalone -d your-domain     # needs port 80 free
sudo cp /etc/letsencrypt/live/your-domain/fullchain.pem nginx/certs/fullchain.pem
sudo cp /etc/letsencrypt/live/your-domain/privkey.pem   nginx/certs/privkey.pem
sudo chmod 600 nginx/certs/privkey.pem
```

Set up auto-renewal (cert files are bind-mounted read-only; reload nginx after
renewal via a deploy hook or a periodic `docker compose restart proxy`).

**Quick self-signed cert (testing only):**

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout nginx/certs/privkey.pem -out nginx/certs/fullchain.pem -subj "/CN=your-domain"
```

`nginx/certs/*.pem` and `*.key` are git-ignored — they never get committed.

---

## 5. Launch

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f gateway
```

Verify:

```bash
curl -fsS https://your-domain/healthz        # -> {"status":"ok",...}
```

Open `https://your-domain/` for the dashboard and sign in with the admin
username + the password you hashed in step 3.

---

## 6. Operations

```bash
# Update to the latest code
git pull && docker compose up -d --build

# Tail logs
docker compose logs -f gateway

# Restart / stop
docker compose restart gateway
docker compose down

# Rotate the signing secret (invalidates all issued tokens)
sed -i "s/^CREWAI_SECRET_KEY=.*/CREWAI_SECRET_KEY=$(openssl rand -hex 32)/" .env
docker compose up -d
```

---

## Security checklist

- [ ] Root password login over SSH **disabled**; key-only auth confirmed working.
- [ ] Private SSH key kept on your machine only — **not** stored on the server.
- [ ] Any credential ever shared in chat/email **rotated**.
- [ ] `ufw` allows only 22/80/443.
- [ ] `.env` is `chmod 600`, `CREWAI_ENVIRONMENT=production`, strong
      `CREWAI_SECRET_KEY`, admin password stored as a hash.
- [ ] Real TLS certificate in place with auto-renewal.
- [ ] `CREWAI_CORS_ALLOW_ORIGINS` set to your real origins (no `*`).
- [ ] Interactive API docs are auto-disabled in production.

See [SECURITY.md](SECURITY.md) for the full security posture.
