# Deployment Runbook

How EduFlow AI is built, released and rolled back.

## Pipelines

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | push / PR to `main`, `dev` | Build and test backend, frontend, mobile, AI agent |
| CD | `.github/workflows/cd.yml` | push to `main`, manual | Deploy backend to OCI VM, AI agent and frontend to Vercel, run smoke tests |

## Required GitHub secrets (environment: `production`)

- `OCI_VM_HOST`, `OCI_VM_USER`, `OCI_SSH_PRIVATE_KEY`
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID` (frontend), `VERCEL_AI_PROJECT_ID` (AI agent)
- `VERCEL_AI_DOMAIN`, `VERCEL_FRONTEND_DOMAIN`

## Release flow

1. Open a PR into `main`; CI must pass.
2. Merge the PR. CD starts automatically.
3. Backend: `deploy.sh` extracts the artifact, backs up the current release to `backend_previous`, restarts the `eduflow` systemd service and runs `health-check.sh`.
4. If the health check fails, `rollback.sh` restores the previous release automatically.
5. Frontend deploys only after the backend and AI agent succeed.
6. Smoke tests hit `/health` on the backend and AI service and the frontend URL.

## Manual rollback (OCI VM)

```bash
ssh <user>@<OCI_VM_HOST>
/var/www/eduflow/scripts/rollback.sh
journalctl -u eduflow -n 100 --no-pager
```

`rollback.sh` needs `/var/www/eduflow/backend_previous` to exist. It is removed after a successful deploy, so a rollback is only possible right after a failed one. For older releases, re-run the CD workflow from an earlier commit using **Run workflow**.

## Local full stack with Docker

```bash
cp .env.docker.example .env      # fill in secrets
docker compose up -d --build
```

Only the frontend (Nginx) is published, on `HTTP_PORT` (default 80). Postgres, backend and AI agent stay on the private network.

## Health checks

```bash
bash deployment/scripts/health-check.sh 5000 localhost
```

## Troubleshooting

- **Service will not start**: `journalctl -u eduflow -n 200 --no-pager`
- **Nginx 502**: confirm the service is on port 5000 and `deployment/nginx/eduflow.conf` is active.
- **CD fails at SCP/SSH**: check the three `OCI_*` secrets and that the VM allows port 22 from GitHub runners.
