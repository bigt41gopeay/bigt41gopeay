# CrewAI Control Gateway

A self-contained, production-oriented setup for running [CrewAI](https://docs.crewai.com/)
multi-agent crews on an Ubuntu server with Docker. It bundles:

- **API gateway** (FastAPI) — secure REST + WebSocket interface for launching,
  monitoring, and controlling crew runs. Designed for remote control from an
  **iOS mobile app**.
- **Monitoring dashboard** — a dependency-free web UI showing crews, runs, and a
  live agent-activity stream.
- **Docker packaging** — multi-stage, non-root image plus a hardened
  `docker-compose` stack with an nginx TLS-terminating reverse proxy.

This lives alongside the existing React/Vite app and does not affect it.

```
crewai/
├── app/                  # FastAPI gateway (config, security, routes, crew mgmt)
│   ├── routes/           # auth, crews, runs, health, websocket
│   ├── config.py         # env-driven settings (no hardcoded secrets)
│   ├── security.py       # JWT, bcrypt, API keys
│   ├── crew_factory.py   # crew/agent/task definitions (add yours here)
│   └── crew_manager.py   # run lifecycle, concurrency, event streaming
├── dashboard/            # static monitoring UI (HTML/CSS/JS)
├── nginx/                # TLS reverse-proxy config
├── tests/                # pytest suite
├── Dockerfile           # multi-stage, non-root
├── docker-compose.yml   # gateway + nginx proxy
└── .env.example         # configuration template
```

## Quick start (local development)

```bash
cd crewai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

cp .env.example .env
# Generate a secret and an admin password hash:
echo "CREWAI_SECRET_KEY=$(openssl rand -hex 32)" >> .env
python -m app.security hash 'choose-a-strong-password'   # paste into CREWAI_ADMIN_PASSWORD_HASH

uvicorn app.main:app --reload
```

Open <http://localhost:8000> for the dashboard and sign in with the admin
credentials. Without `CREWAI_OPENAI_API_KEY`, crews run in **simulated mode** so
you can exercise the dashboard and API end-to-end without LLM credentials.

## Deploy on Ubuntu with Docker

```bash
# Prereqs: Docker Engine + the compose plugin
cd crewai
cp .env.example .env            # then edit: set CREWAI_ENVIRONMENT=production,
                                # a strong CREWAI_SECRET_KEY, and the admin hash

# Provide TLS certs (Let's Encrypt recommended):
#   nginx/certs/fullchain.pem
#   nginx/certs/privkey.pem

docker compose up -d --build
docker compose logs -f gateway
```

The gateway is reachable only through the nginx proxy on `https://<host>`. The
container itself is never published directly.

For a full server-hardening + deployment runbook (SSH key-only auth, firewall,
TLS, secret rotation), see [DEPLOY.md](DEPLOY.md).

## API reference (for the iOS app)

Base URL: `https://<your-host>`. All `/api/v1/*` endpoints except `/healthz`
require a Bearer token.

### 1. Obtain a token

```
POST /api/v1/auth/token
Content-Type: application/x-www-form-urlencoded

username=<user>&password=<password>
```

Response:

```json
{ "access_token": "<jwt>", "token_type": "bearer", "expires_in": 3600 }
```

Send it on every subsequent request: `Authorization: Bearer <jwt>`.

Machine clients may instead use a static `CREWAI_SERVICE_API_KEY` as the
WebSocket token (see below).

### 2. List available crews

```
GET /api/v1/crews
```

### 3. Launch a run

```
POST /api/v1/runs
Content-Type: application/json

{ "crew_id": "research_brief", "inputs": { "topic": "vector databases" } }
```

Returns `201` with `{ "id": "<run_id>", "status": "pending" }`.

### 4. Inspect runs

```
GET  /api/v1/runs            # all runs (recent first)
GET  /api/v1/runs/{run_id}   # full record incl. agent activity + result
POST /api/v1/runs/{run_id}/cancel
```

### 5. Live updates (WebSocket)

```
GET /api/v1/ws?token=<jwt-or-api-key>     (wss:// in production)
```

The server pushes JSON events as agents work:

```json
{ "type": "agent.activity", "run_id": "…", "data": { "agent": "…", "status": "started" }, "timestamp": "…" }
```

Event types: `run.created`, `run.started`, `agent.activity`, `run.completed`,
`run.failed`, `run.cancelled`.

Interactive OpenAPI docs are available at `/docs` in non-production
environments.

## Adding your own crews

Define agents, tasks, and a crew builder in `app/crew_factory.py` and register
it in `CREW_REGISTRY`. The API and dashboard pick it up automatically.

## Security

See [SECURITY.md](SECURITY.md) for the full posture. Highlights:

- No secrets in code or images; everything via environment, refused-on-default
  in production.
- JWT auth (short-lived) + bcrypt password hashing + constant-time API-key check.
- Strict input validation (`extra="forbid"`), CORS allow-list, security headers,
  per-IP rate limiting, hidden docs in production.
- Least-privilege container: non-root user, read-only FS, dropped capabilities,
  `no-new-privileges`, TLS terminated at the proxy.

## Testing & linting

```bash
pip install -r requirements-dev.txt
pytest          # unit + integration tests (run in simulated mode)
ruff check .    # lint (security rules enabled via flake8-bandit "S")
```
