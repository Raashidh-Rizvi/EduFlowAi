# EduFlow AI — Production Deployment Considerations & Master Architecture Runbook

> **Document Status**: Production Master Runbook  
> **Target Architecture**: 3-Tier Production Stack (Vercel Frontend + OCI ASP.NET Core API + Vercel Serverless FastAPI AI + Oracle Database)  
> **OCI VM Instance**: Host `159.13.63.98` (`opc` user, 1 GB RAM Micro Instance)  
> **CI/CD Orchestration**: GitHub Actions (`.github/workflows/ci.yml` and `cd.yml`)  

---

## 1. System Overview

EduFlow AI is an enterprise-grade gamified Learning Management System (LMS) delivering interactive course curricula, automated assessments, squad-based learning, and AI-assisted educational workflows. 

The production deployment decouples the static React web application, the authoritative ASP.NET Core API gateway, the serverless FastAPI AI agent microservice, and the external Oracle database to maximize resource efficiency, scalability, and security.

---

## 2. Production Architecture

```text
                       USERS / BROWSERS
                              │
                              ▼
                       ┌────────────┐
                       │   Vercel   │
                       │  Frontend  │
                       └─────┬──────┘
                             │
                             │ HTTPS (Public API Origin)
                             ▼
                    ┌──────────────────┐
                    │ ASP.NET Core API │
                    │   Oracle Cloud   │
                    │  OCI 159.13.63.98│
                    └────────┬─────────┘
                             │
                    Authenticated Service-to-Service
                    (X-Internal-Api-Key HMAC)
                             │
                             ▼
                    ┌──────────────────┐
                    │ FastAPI AI       │
                    │ Vercel           │
                    │ Serverless       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ External LLM API │
                    │ Provider (Gemini)│
                    └──────────────────┘

                             │
                             ▼
                      Oracle Database
```

---

## 3. Component Responsibilities

| Component | Technology | Target Infrastructure | Primary Responsibilities |
|---|---|---|---|
| **Frontend** | React 18, Vite 5, Zustand, Tailwind | Vercel Edge CDN | User interface, client-side state, media playback, rendering course material. |
| **Backend API** | ASP.NET Core 8 / .NET 10, EF Core | OCI Compute VM (`159.13.63.98`) | Authentication (JWT), RBAC authorization, business rules, DB transactions, API Gateway. |
| **AI Microservice** | FastAPI 0.111, Python 3.11 | Vercel Serverless Functions | Course document RAG indexing, quiz generation, student AI coach grounding, LLM orchestration. |
| **Database** | Oracle Database / OCI Autonomous DB | External Oracle Cloud DB | Authoritative storage for users, courses, enrollments, quizzes, grades, and audit logs. |
| **Reverse Proxy** | Nginx 1.24+ | OCI VM (`159.13.63.98`) | TLS/HTTPS termination, HTTP->HTTPS redirect, rate-limiting, proxying to `127.0.0.1:5000`. |

---

## 4. Frontend Deployment

- **Hosting Platform**: Vercel.
- **Build Output Directory**: `dist`
- **Build Command**: `npm run build`
- **Vercel Routing File**: [frontend/vercel.json](file:///d:/Project/EduFlow/frontend/vercel.json) (enforces single-page app rewrite routing to `/index.html`).
- **Public API Connection**: Interacts strictly with `https://api.eduflow.example.com/api`.
- **Security Rule**: The frontend holds **ZERO** AI API keys, database credentials, or internal tokens.

---

## 5. ASP.NET Backend Deployment

- **Hosting Platform**: OCI Compute VM (`159.13.63.98`, user `opc`).
- **Execution Manager**: systemd unit service [eduflow.service](file:///d:/Project/EduFlow/deployment/systemd/eduflow.service).
- **Binding Address**: `http://127.0.0.1:5000` (Private interface only).
- **Executable**: `dotnet /var/www/eduflow/backend/EduFlow.Api.dll`
- **Environment**: `ASPNETCORE_ENVIRONMENT=Production`

---

## 6. OCI Configuration

- **Target Public IP**: `159.13.63.98`
- **Default System User**: `opc`
- **Security List Inbound Ports**:
  - Port `22` (SSH - Restricted to admin/CI runner IPs).
  - Port `80` (HTTP - Open for Let's Encrypt renewal).
  - Port `443` (HTTPS - Open for public API traffic).
- **Firewall Setup (Oracle Linux / `firewalld`)**:
  ```bash
  sudo firewall-cmd --permanent --add-service=http
  sudo firewall-cmd --permanent --add-service=https
  sudo firewall-cmd --reload
  ```

---

## 7. Nginx Configuration

- **Site Configuration**: [deployment/nginx/eduflow.conf](file:///d:/Project/EduFlow/deployment/nginx/eduflow.conf) (`/etc/nginx/sites-available/eduflow.conf`).
- **Proxy Upstream**: `http://127.0.0.1:5000`
- **Memory Footprint Tuning**: `proxy_buffering off;` (Prevents buffer allocations on 1 GB RAM VM).
- **Security Headers**: HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.

---

## 8. HTTPS / SSL

- **Provider**: Let's Encrypt via Certbot.
- **Certificate Issuance Command**:
  ```bash
  sudo certbot --nginx -d api.eduflow.example.com
  ```
- **Automated Renewal**: Systemd timer executing `certbot renew --quiet`.

---

## 9. Oracle Database

- **Provider**: Oracle Database / OCI Autonomous Database.
- **Connection Model**: EF Core / Oracle Data Provider ODP.NET managed driver.
- **Connection String Key**: `ConnectionStrings__DefaultConnection`
- **Wallet Requirement**: If using Autonomous DB TCPS wallet, place wallet in `/var/www/eduflow/wallet` with restricted `600` permissions.

---

## 10. FastAPI AI Deployment

- **Directory**: `ai-agent/`
- **Hosting Platform**: Vercel Serverless Functions (`@vercel/python` runtime).
- **Vercel Entrypoint**: [ai-agent/api/index.py](file:///d:/Project/EduFlow/ai-agent/api/index.py) importing `app` from `main.py`.
- **Vercel Routing File**: [ai-agent/vercel.json](file:///d:/Project/EduFlow/ai-agent/vercel.json).
- **FastAPI Health Route**: `GET /health` returning `{"status": "healthy", "service": "EduFlow Simple RAG Service"}`.

---

## 11. Vercel Configuration

- **Frontend Vercel Project**: `eduflow-frontend`
- **AI Service Vercel Project**: `eduflow-ai-service`
- **Environment Separation**: Distinct Vercel Projects ensure environment variables (like `GEMINI_API_KEY`) stay isolated to the serverless Python worker.

---

## 12. AI Provider Configuration

- **Supported Providers**: Google Gemini (`google-genai`), Groq, Azure OpenAI.
- **Primary Active Provider**: Google Gemini (`models/gemini-flash-latest`).
- **Security Standard**: API keys live exclusively in server-side Vercel environment variables (`GEMINI_API_KEY`, `GROQ_API_KEY`).

---

## 13. Service-to-Service Authentication

- **Gateway Client**: `.NET` backend `AiGatewayClient` transmits header `X-Internal-Api-Key`.
- **FastAPI Validator**: `verify_internal_token()` validates header against `INTERNAL_SERVICE_TOKEN` using constant-time `hmac.compare_digest()`.
- **Fail-Closed Rule**: Unauthenticated requests are rejected immediately with HTTP 401/503.

---

## 14. Environment Variables

| Variable | Component | Target Host | Secret | Purpose |
|---|---|---|---:|---|
| `ConnectionStrings__DefaultConnection` | Backend API | OCI VM | Yes | Oracle DB Connection String |
| `JwtSettings__Secret` | Backend API | OCI VM | Yes | 256-bit JWT signing key |
| `AiService__BaseUrl` | Backend API | OCI VM | No | Vercel FastAPI URL (`https://ai.eduflow.example.com`) |
| `AiService__ApiKey` | Backend API | OCI VM | Yes | Must match `INTERNAL_SERVICE_TOKEN` |
| `INTERNAL_SERVICE_TOKEN` | FastAPI AI | Vercel Serverless | Yes | Shared service-to-service key |
| `GEMINI_API_KEY` | FastAPI AI | Vercel Serverless | Yes | Google Gemini API Key |
| `VITE_API_BASE_URL` | Frontend | Vercel Edge | No | Public API URL (`https://api.eduflow.example.com/api`) |

---

## 15. GitHub Secrets

Configured in GitHub Repository Settings for GitHub Actions CD workflow:
- `OCI_VM_HOST` (`159.13.63.98`)
- `OCI_VM_USER` (`opc`)
- `OCI_SSH_PRIVATE_KEY`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID` (Frontend)
- `VERCEL_AI_PROJECT_ID` (FastAPI Microservice)

---

## 16. CORS

- Enforced in ASP.NET Core `EduFlowCorsPolicy` and FastAPI `CORSMiddleware`.
- Restricted strictly to production Vercel origins (`https://eduflow.example.com`).
- `AllowAnyOrigin()` is **prohibited** in production.

---

## 17. Authentication

- **User Authentication**: Standardized JWT Bearer Authentication with 24-hour expiration.
- **Service Authentication**: HMAC SHA-256 token verification between ASP.NET Core and FastAPI.

---

## 18. CI Pipeline

- **File**: [.github/workflows/ci.yml](file:///d:/Project/EduFlow/.github/workflows/ci.yml)
- **Validation Steps**:
  1. Backend restore, build, and xUnit test execution (`EduFlow.slnx`).
  2. Frontend dependency installation & Vite production build.
  3. Mobile Flutter test suite execution.
  4. AI agent pytest evaluation suite execution.

---

## 19. CD Pipeline

- **File**: [.github/workflows/cd.yml](file:///d:/Project/EduFlow/.github/workflows/cd.yml)
- **Deployment Flow**:
  1. Verifies CI status on `main`.
  2. Compiles backend tarball and deploys to OCI VM `159.13.63.98` via SCP & SSH.
  3. Triggers `deploy.sh` (service restart + health check + rollback on failure).
  4. Deploys FastAPI AI microservice to Vercel Serverless.
  5. Deploys React client to Vercel Edge.
  6. Executes post-deployment smoke tests.

---

## 20. Database Migrations

- Managed via Entity Framework Core Migrations (`EduFlow.Infrastructure`).
- In production, migrations are applied using idempotent SQL scripts prior to binary deployment:
  ```bash
  dotnet ef migrations script --idempotent --output migration.sql
  ```

---

## 21. Health Checks

- **Backend OCI Health Check**: `http://127.0.0.1:5000/health` returning `{"status": "healthy"}`.
- **FastAPI AI Health Check**: `https://ai.eduflow.example.com/health` returning `{"status": "healthy"}`.
- **Automated Script**: [deployment/scripts/health-check.sh](file:///d:/Project/EduFlow/deployment/scripts/health-check.sh).

---

## 22. Smoke Tests

Post-deployment automated checks:
1. `GET /health` on ASP.NET Core backend.
2. `GET /health` on FastAPI AI microservice.
3. HTTP 200 verification on Vercel frontend domain.

---

## 23. Monitoring

- **System Memory & CPU**: `free -m`, `top`, `vmstat`.
- **Systemd Journal Logs**: `journalctl -u eduflow.service -f`.
- **Uptime Monitoring**: Ping check on `/health` endpoint.

---

## 24. Logging

- **Sanitization Rule**: Secrets, passwords, JWT tokens, and sensitive student LLM prompts are scrubbed from log output.

---

## 25. Resource Constraints (1 GB RAM OCI VM)

- **GC Heap Limit**: `DOTNET_GCHeapHardLimit=0x1C000000` (Limits GC heap to ~448 MB).
- **Prohibited Infrastructure on VM**: No local databases, Redis, Docker daemons, or local LLM inference engines.
- **Swap**: 2 GB swapfile (`/swapfile`).

---

## 26. AI Cost Controls

- Token generation limits set on LLM calls (`max_output_tokens=1024`).
- Rate limiting enforced at ASP.NET Core API gateway per authenticated user.

---

## 27. AI Privacy

- Student identities are anonymized prior to sending prompt context to Gemini/Groq LLM providers.

---

## 28. Rate Limiting

- ASP.NET Core rate limiting middleware throttles high-frequency client requests.

---

## 29. Rollback Strategy

- **Backend OCI**: Automated rollback via [deployment/scripts/rollback.sh](file:///d:/Project/EduFlow/deployment/scripts/rollback.sh) restoring `backend_previous`.
- **Vercel Frontend & AI**: Instant rollback via Vercel Dashboard ("Promote Previous Deployment").

---

## 30. Backup

- Daily snapshots of Oracle Cloud Database.
- Version control retention of all systemd and Nginx deployment files in Git.

---

## 31. Disaster Recovery

- **RTO**: < 30 minutes.
- **RPO**: < 1 hour.
- Provision fresh OCI VM -> Run first-time setup -> Execute GitHub Actions CD workflow.

---

## 32. Security Checklist

- [x] HTTPS enforced across all endpoints.
- [x] Service-to-service HMAC authentication enforced.
- [x] Port 5000 bound privately to `127.0.0.1`.
- [x] No LLM keys exposed to browser frontend.
- [x] `DOTNET_GCHeapHardLimit` memory ceiling configured.

---

## 33. First-Time Deployment Checklist

- [ ] SSH into OCI VM (`ssh opc@159.13.63.98`).
- [ ] Install dependencies (`dotnet-runtime-8.0`, `nginx`, `certbot`).
- [ ] Enable firewall rules (`firewall-cmd --permanent --add-service=http --add-service=https`).
- [ ] Create `/var/www/eduflow` directories.
- [ ] Copy `deployment/nginx/eduflow.conf` and issue Certbot SSL certificate.
- [ ] Copy `deployment/systemd/eduflow.service` and start service (`systemctl enable --now eduflow`).
- [ ] Configure GitHub Secrets (`OCI_VM_HOST`, `OCI_VM_USER`, `OCI_SSH_PRIVATE_KEY`, `VERCEL_TOKEN`, etc.).

---

## 34. Normal Deployment Sequence

Developer merges PR to `main` -> GitHub Actions CI verifies build & tests -> CD builds ASP.NET tarball -> Deploys to OCI VM -> Deploys FastAPI to Vercel -> Deploys Frontend to Vercel -> Post-deployment smoke tests pass.

---

## 35. Emergency Rollback Procedure

Execute on OCI VM:
```bash
cd /var/www/eduflow/scripts
sudo ./rollback.sh
```

---

## 36. Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| **HTTP 502** | ASP.NET Core service down | `sudo systemctl status eduflow` |
| **HTTP 401 on AI** | Invalid `INTERNAL_SERVICE_TOKEN` | Check `AiService:ApiKey` in backend config |
| **OOM Crash** | GC memory ceiling missing | Check `DOTNET_GCHeapHardLimit` in `eduflow.service` |

---

## 37. Known Limitations

1. **Vercel Timeout Limits**: Serverless functions on Vercel Hobby/Pro have a 10s-60s timeout limit; complex RAG queries are tuned to execute within < 5s.
2. **Oracle Autonomous DB Wallet**: If TCPS with wallet is used, upload wallet to `/var/www/eduflow/wallet`.

---

## 38. Outstanding Manual Tasks

- [ ] Add `159.13.63.98` and SSH private key to GitHub Actions Secrets.
- [ ] Link `eduflow-frontend` and `eduflow-ai-service` projects on Vercel.
- [ ] Add `GEMINI_API_KEY` to Vercel Environment Variables.
