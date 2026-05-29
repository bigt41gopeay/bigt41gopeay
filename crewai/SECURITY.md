# Security posture

This document records the security controls built into the CrewAI Control
Gateway and the operational practices required to keep a deployment safe. It is
intended to meet the expectations of a security-conscious (top-tier) review.

## Authentication & authorization

- **JWT access tokens** (HS256), short-lived (default 60 min, configurable).
  Tokens carry `iat`/`exp` and a `type` claim; decoding requires `exp` and `sub`.
- **Password storage**: bcrypt via `passlib`. Only the hash is ever stored
  (in `CREWAI_ADMIN_PASSWORD_HASH`); plaintext passwords never touch disk or code.
- **Service API key** for machine clients, compared in **constant time**
  (`hmac.compare_digest`) to resist timing attacks.
- **No user enumeration**: login returns an identical error for unknown user and
  wrong password.
- Every `/api/v1/*` endpoint (except `/healthz`) and the WebSocket require a
  valid credential; the WS handshake is rejected (code 1008) before any data is
  exchanged if the token is invalid.

## Secrets handling

- All secrets come from environment variables (`CREWAI_*`) or a local `.env`
  that is **git-ignored** and **excluded from the Docker build context**.
- The app **refuses to start in production** without a strong `CREWAI_SECRET_KEY`
  (≥ 32 chars) and an admin password hash. In development it falls back to an
  ephemeral random key rather than a shared default.
- `.env`, `*.pem`, and `*.key` are listed in `.gitignore` and `.dockerignore`.

## Input validation & API hardening

- Pydantic models validate every request body; `RunRequest` uses
  `extra="forbid"` to reject unexpected fields.
- **CORS** uses an explicit origin allow-list (never `*` with credentials) and a
  minimal method/header set.
- **Security headers** on every response: `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, and HSTS in production.
- **Rate limiting** (slowapi) per client IP: a global default plus a tighter
  limit on the login endpoint to slow credential stuffing/brute force.
- Interactive API docs (`/docs`, `/redoc`) are disabled in production.
- Unhandled exceptions return a generic 500 — stack traces are logged, never
  returned to clients.

## Container & deployment hardening

- **Multi-stage build**: build tools stay out of the runtime image.
- Runs as a dedicated **non-root** user.
- `tini` as PID 1 for correct signal handling; `curl`-based healthcheck.
- Compose stack adds `read_only` root FS, `tmpfs` for `/tmp`,
  `cap_drop: ALL`, and `no-new-privileges`.
- The gateway is **not published** to the host; an nginx reverse proxy
  terminates **TLS** (TLS 1.2/1.3, HSTS) and forwards internally. WebSockets are
  proxied with appropriate upgrade headers and timeouts.

## Frontend (dashboard)

- Access token stored in `sessionStorage` (cleared on tab close), not
  `localStorage`.
- All dynamic content is rendered with `textContent` (no `innerHTML`) to prevent
  XSS from run inputs or results.

## Dependency hygiene

- Dependencies are pinned to compatible major ranges in `requirements.txt`.
- `ruff` runs the `S` (flake8-bandit) ruleset in CI/local linting to catch
  common insecure patterns.

## Operational recommendations

- Rotate `CREWAI_SECRET_KEY` and the service API key periodically; rotating the
  secret invalidates outstanding tokens.
- Use automated certificate renewal (e.g. certbot) for the nginx proxy.
- Create per-user accounts rather than sharing the bootstrap admin credential;
  the auth layer is structured so additional users/roles can be added in
  `routes/auth.py` and `security.py`.
- Run behind a firewall exposing only ports 80/443.
- Keep base images and dependencies updated; rebuild regularly.

## Reporting

Report suspected vulnerabilities privately to the repository owner rather than
opening a public issue.
