# Infrastructure — nginx/ & docker-compose (Infra)

Inherits all rules from root CLAUDE.md. These rules are infra-specific additions.

## Reference Reviews

Before working on the following areas, read the corresponding review docs first:

| Area                                                        | Review Document                                       |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| Docker compose structure, jackpotchain node container setup | `docs/reviews/docker-plan.md`                         |
| Local stack QA verification checklist                       | `docs/reviews/local-stack-qa-checklist-2026-03-22.md` |
| Architecture / port assignments                             | `docs/reviews/architecture.md`                        |

## Scope

- nginx reverse proxy configuration
- Docker Compose orchestration (local and production)
- Jenkinsfile CI/CD pipeline

## Port Reference

| Service          | Port  | Exposed to host?                   |
| ---------------- | ----- | ---------------------------------- |
| Frontend (nginx) | 3000  | Local only                         |
| Backend (Spring) | 18080 | Local only                         |
| Node RPC         | 8332  | Local only (never in prod)         |
| Node P2P         | 8333  | External (TUI miners connect here) |

**RPC port (8332) must NOT be published to host in production.** Backend accesses RPC via internal Docker network only.

## nginx Rules

**Configuration safety:**

- Every location block must have explicit `proxy_pass` or `return` — no implicit fallthrough
- Set explicit timeouts: `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout`
- Buffer sizes set explicitly — do not rely on nginx defaults under load
- Access log and error log paths must be defined per server block

**Routing convention:**

- Frontend: `/` routes → React SPA shell (always return `index.html` for unknown paths)
- API: `/api/` routes → Spring Backend
- Internal webhook `/internal/` must NOT be exposed externally

**Security headers (required on all external-facing servers):**

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

**TLS:**

- Minimum TLS 1.2; prefer TLS 1.3
- Strong cipher suites only
- HSTS header on HTTPS servers
- Certificate renewal must be automated

**Rate limiting:**

- Apply `limit_req_zone` on auth endpoints and any write endpoints
- Return 429 with `Retry-After` header on limit exceeded

## Docker Compose Rules

**Image discipline:**

- Pin image versions — never use `latest` in production
- Use multi-stage builds in Dockerfiles to minimize image size
- Build args for environment-specific values; secrets via env files, not baked into images

**Healthchecks:**

- Every service that other services depend on must have a `healthcheck`
- `depends_on` must use `condition: service_healthy`, not just `condition: service_started`

**Networking:**

- Services communicate on internal networks — only nginx exposed externally
- No unnecessary port publishing to host

**Environment separation:**

- `docker-compose.local.yml` — local stack with volume mounts and dev ports
- `.env.local` — local environment variables (never commit secrets)
- Production values injected via CI/CD secrets, not committed files

## JackpotChain Node Container Requirements

From `docs/reviews/docker-plan.md`:

**Dockerfile must include:**

- Python 3.11-slim or equivalent base image
- `requirements.txt` install
- `curl` for healthcheck
- Non-root user
- `PYTHONUNBUFFERED=1`
- `ENTRYPOINT` or `CMD` using `python -m blockchain.cli.main node ...`

**entrypoint.sh must map env vars to CLI args:**

- `NODE_DATA_DIR` → `--data-dir`
- `NODE_RPC_HOST` → `--rpc-host` (default: `127.0.0.1`; Docker override: `0.0.0.0`)
- `NODE_RPC_PORT` → `--rpc-port`
- `NODE_P2P_PORT` → `--port`
- `NODE_WALLET_FILE` → wallet file path (fixed to `/wallets/default.json`)
- `NODE_SEED` → `--seed` (peer discovery seed)

**Volume requirements:**

- Wallet data volume must persist across restarts: `node-wallet:/wallets`
- Chain data volume must persist across restarts: `node-data:/data`
- Loss of these volumes = loss of wallet and blockchain state

**Healthcheck:**

```
curl -s -X POST http://localhost:8332/ -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}' | grep result
```

**Startup log verification (required):**
The node must log actual bind host/port, wallet file path, and data dir on startup.
Do not consider the container healthy if these are not visible in logs.

## Jenkinsfile Rules

**Pipeline stages must be explicit:**

```
Checkout → Build → Test → Static Analysis → Build Image → Push Image → Deploy
```

**Failure behavior:**

- Test failures must block deployment
- Notify on failure
- Tag images with git commit SHA

**Secrets:**

- Credentials via Jenkins credential store only
- Never `echo` secrets to build logs

**Rollback:**

- Deploy step must be able to target a previous image tag
- Document rollback procedure in `docs/runbooks/`

## Change Safety Checklist

Before any infra change:

- [ ] Change is backward compatible OR a migration plan exists
- [ ] Rollback procedure is known
- [ ] Downstream services are not broken by this change
- [ ] Config changes are validated (`nginx -t` before reload)
- [ ] No secrets introduced into version control
- [ ] Node wallet/data volumes are not at risk of data loss
- [ ] RPC port is not accidentally exposed to the public internet
