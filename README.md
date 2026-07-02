<div align="center">

# VynCost

### Self-Hosted Cloud Cost Management Dashboard

**Multi-cloud · AI-powered · Zero lock-in · Open source**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Groq](https://img.shields.io/badge/AI-Groq_Llama_3.3-orange)](https://groq.com)

*Track, analyse, and optimise cloud spend across AWS, GCP, Azure, and OCI — from a single self-hosted dashboard.*

[**Live Demo**](https://vyncost.vynops.io) · [**Docs**](https://vynops.io/docs) · [**GitHub**](https://github.com/vynops/VynCost) · [**Part of VynOps**](https://github.com/vynops)

</div>

---

## Overview

VynCost gives engineering and FinOps teams a **single pane of glass** for cloud cost visibility — without sending your billing data to a third-party SaaS product.

- **Multi-cloud:** AWS, GCP, Azure, and OCI in one view. Connect multiple accounts per provider.
- **AI Copilot:** Ask questions in plain English — *"Why did my costs spike this week?"*, *"What can I cut today?"* Powered by Groq Llama 3.3 70B with full cost context injected automatically.
- **Actionable recommendations:** Rightsizing, reserved instance coverage, idle resource cleanup — each with the exact CLI command to act immediately.
- **Demo mode:** Runs fully offline with a realistic simulation engine. No cloud credentials required to evaluate.
- **Zero external dependencies:** No database, no Redis, no message queue. Plain JSON files. Runs on a $5 VPS.

---

## Features

### 💰 Cost Overview
Real-time month-to-date spend, end-of-month projection, daily cost trend chart, provider breakdown, and top service drivers — refreshed every 30 seconds via SWR polling.

### 🔍 Cost Explorer
Drill down into spend by service, region, account, or provider. Filter by date range (7 / 30 / 90 days). Export any view to CSV in one click.

### 💡 Recommendations
Rightsizing suggestions, purchase advisors, and optimisation opportunities — each with:
- Current vs. optimised resource spec
- Monthly and annual savings estimate
- Risk level (Low / Medium / High) and confidence score
- Copy-paste CLI command to apply immediately (AWS CLI, gcloud, az CLI)

### 🗑️ Waste Detection
Automatically surfaces idle and orphaned resources: unattached EBS volumes, unused Elastic IPs, stopped instances, orphaned snapshots, zero-target load balancers. Shows idle-day count and monthly waste cost.

### 📊 Anomaly Detection
Statistical anomaly detection across all providers. Severity classification (Critical / High / Medium / Low), per-provider filtering, and one-click acknowledge workflow.

### 📈 Forecasting
30 / 60 / 90-day spend forecasting with confidence bands. Visual area chart plus daily granular forecast table. Export to CSV.

### 🔒 RI / Savings Plan Coverage
Reserved Instance and Savings Plan coverage analysis. Usage bars, expiry alerts, waste highlights. Understand coverage gaps before your next commitment renewal.

### 💼 Budget Management
Create budgets scoped to provider, account, service, or team. Real-time progress bars, configurable alert thresholds, Slack webhook notifications.

### 🏷️ Team Allocation
Cost allocation by team with tag coverage statistics. Track which teams are properly tagging resources and what it costs.

### 🤖 AI Copilot
Conversational FinOps assistant with live cost context:
- Answers questions about spend, anomalies, recommendations, and waste
- Configurable Groq API key and model selection from the Settings UI
- Token usage tracking (requests / prompt tokens / completion tokens) per day
- Demo mode with intelligent pre-loaded responses — no API key required to evaluate

### 👥 Team Management (RBAC)
Multi-user support with role-based access control:

| Role | Capabilities |
|---|---|
| **Admin** | Full access, manage users, view all data |
| **Editor** | View + acknowledge anomalies, apply recommendations |
| **Viewer** | Read-only access to all dashboards |

### ⚙️ Settings
- Connect cloud accounts (AWS, GCP, Azure, OCI) with credential testing
- Configure AI Copilot model and API key
- Set alert thresholds, Slack webhooks, default date ranges
- Data source status banner (Demo Mode vs. Live Mode)

---

## Tech Stack

| Layer | Library | Purpose |
|---|---|---|
| Framework | [Next.js 16](https://nextjs.org) App Router | Pages, API routes, middleware |
| Language | TypeScript 5 | End-to-end type safety |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) | Utility-first dark theme |
| Data fetching | [SWR](https://swr.vercel.app) | Real-time polling with auto-revalidation |
| Charts | [Recharts](https://recharts.org) | Area, bar, and pie charts |
| AI | [Groq SDK](https://groq.com) | Llama 3.3 70B — configurable model |
| Auth | [jose](https://github.com/panva/jose) | JWT session cookies (HS256, 7-day expiry) |
| Storage | JSON files | Zero-dependency local persistence |

No database. No ORM. No Redis. No external services required (beyond an optional Groq API key).

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- Cloud provider credentials — or run in **demo mode** with no credentials at all

### 1. Clone and install

```bash
git clone https://github.com/vynops/VynCost
cd VynCost
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Generate with: openssl rand -base64 32
VYNCOST_SECRET=your-random-secret-here

# Admin login credentials
VYNCOST_ADMIN_EMAIL=admin@example.com
VYNCOST_ADMIN_PASSWORD=your-secure-password

# Optional: Groq API key for AI Copilot
# Leave empty for demo mode (intelligent pre-loaded responses)
# Or configure in Settings UI after login
GROQ_API_KEY=

# Optional: port override (default 3020 in production)
# PORT=3020
```

### 3. Start development server

```bash
npm run dev
# Open: http://localhost:3020
```

### 4. Login and explore

Default login uses the `VYNCOST_ADMIN_EMAIL` / `VYNCOST_ADMIN_PASSWORD` you set.
No cloud accounts needed — demo mode activates automatically with realistic simulated data.

### 5. Connect your first cloud account

1. Go to **Settings → Cloud Accounts → Add Account**
2. Select your provider (AWS / GCP / Azure / OCI)
3. Fill in the provider credential form
4. Click **Test Connection** — validates credentials before saving
5. Click **Save Account**

Real cost data appears within one polling cycle (30 seconds).

---

## Demo Mode

VynCost runs fully without any cloud accounts. The simulation engine generates:

- 30 days of daily spend data across all 4 providers
- 12+ rightsizing and optimisation recommendations with real CLI commands
- Idle and orphaned resources with idle-day counts and monthly costs
- Team allocation breakdown with tag coverage statistics
- Anomaly events, 90-day forecasts, and RI coverage data
- AI Copilot with contextual FinOps responses (no API key needed)

Demo mode is **automatic** — no configuration. Connect a real account to switch that provider to live data.

---

## Cloud Provider Setup

### AWS

VynCost needs read-only access to AWS Cost Explorer. Create a dedicated IAM user with this inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ce:GetCostAndUsage",
      "ce:GetRecommendations",
      "ce:GetRightsizingRecommendation",
      "ec2:DescribeInstances",
      "ec2:DescribeVolumes",
      "ec2:DescribeSnapshots",
      "ec2:DescribeAddresses",
      "rds:DescribeDBInstances",
      "s3:ListAllMyBuckets"
    ],
    "Resource": "*"
  }]
}
```

**Required fields:** Account ID · Access Key ID (`AKIA...`) · Secret Access Key · Default Region

---

### GCP

Create a **Service Account** with the `Billing Account Viewer` and `Cloud Asset Viewer` roles. Download the JSON key file.

**Required fields:** Project ID · Service Account Email · Service Account JSON

---

### Azure

Create an **App Registration** (Service Principal) in Azure AD. Assign the `Cost Management Reader` role at the subscription scope.

**Required fields:** Subscription ID · Tenant ID · Client ID · Client Secret

---

### OCI

Create an API signing key pair and add the public key to your OCI user profile. Grant `read` access to Cost & Usage reports.

**Required fields:** Tenancy OCID · User OCID · Fingerprint · Private Key (PEM) · Region

---

## AI Copilot

The AI Copilot is powered by [Groq](https://groq.com) — ultra-fast Llama 3.3 inference.

**Configuration** (Settings → AI Copilot):

| Setting | Description |
|---|---|
| Groq API Key | Get a free key at [console.groq.com](https://console.groq.com). Stored in `data/settings.json`, never committed. |
| AI Model | `llama-3.3-70b-versatile` (recommended), `llama-3.1-70b`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it` |

**Today's usage stats** (requests, prompt tokens, completion tokens) are shown live on the Settings page, tracked in `data/copilot-usage.json`.

Without a key, VynCost falls back to intelligent demo responses based on keyword matching.

---

## API Reference

All endpoints require authentication (session cookie). Base path: `/api`

### Accounts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/accounts` | List all accounts (secrets stripped) |
| `POST` | `/api/accounts` | Add account `{ provider, name, ...credentials }` |
| `PATCH` | `/api/accounts/:id` | Update account |
| `DELETE` | `/api/accounts/:id` | Remove account |
| `POST` | `/api/accounts/test` | Test credentials `{ provider, ...credentials }` |

### Cost Data

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/overview` | MTD spend, top drivers, daily chart, alerts |
| `GET` | `/api/explorer` | Breakdown `?groupBy=service|provider|region|account&days=7|30|90` |
| `GET` | `/api/recommendations` | Rightsizing suggestions `?category=&provider=` |
| `GET` | `/api/waste` | Idle/orphaned resources `?provider=` |
| `GET` | `/api/allocation` | Team cost allocation + tag coverage |
| `GET` | `/api/anomalies` | Detected anomalies with severity |
| `GET` | `/api/forecast` | Spend forecast `?horizon=30|60|90` |
| `GET` | `/api/commitments` | RI/Savings Plan coverage data |

### Budgets

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/budgets` | List budgets with current spend progress |
| `POST` | `/api/budgets` | Create budget `{ name, scope, amountUsd, period, alertAt }` |
| `PATCH` | `/api/budgets/:id` | Update budget |
| `DELETE` | `/api/budgets/:id` | Remove budget |

### Users & Auth

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List users (admin only) |
| `POST` | `/api/users` | Create user (admin only) |
| `PATCH` | `/api/users/:id` | Update user name / role / password |
| `DELETE` | `/api/users/:id` | Remove user (admin only) |
| `GET` | `/api/auth/me` | Current session `{ id, email, name, role }` |
| `POST` | `/api/auth/login` | Login `{ email, password }` → sets session cookie |
| `POST` | `/api/auth/logout` | Logout → clears session cookie |

### AI & Settings

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/copilot` | AI chat `{ messages: [{role, content}] }` |
| `GET` | `/api/copilot/usage` | Token usage stats `{ today, last7Days }` |
| `GET` | `/api/settings` | Load app settings |
| `POST` | `/api/settings` | Save app settings |

---

## Data Storage

VynCost uses plain JSON files in `data/`. No database required.

```
data/
├── accounts.json       # Cloud accounts + credentials (secrets stored, never sent to browser)
├── budgets.json        # Budget definitions and alert thresholds
├── settings.json       # Dashboard config + AI Copilot key/model
├── users.json          # User accounts with PBKDF2-hashed passwords
└── copilot-usage.json  # Daily AI token usage counters
```

**`data/` is in `.gitignore` and is never committed.** All credentials and secrets stay on your machine.

To back up: `cp -r data/ data-backup/`. To migrate: copy `data/` to the new machine and restart.

### Credential Security

Cloud credentials (AWS secret keys, GCP service account JSON, Azure client secrets, OCI private keys) are stored in `data/accounts.json` **server-side only**. The `sanitize()` function in `lib/account-store.ts` strips all secret fields before every API response — credentials are write-only from the browser's perspective.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VYNCOST_SECRET` | **Yes** | JWT signing secret. Generate: `openssl rand -base64 32` |
| `VYNCOST_ADMIN_EMAIL` | **Yes** | Bootstrap admin email |
| `VYNCOST_ADMIN_PASSWORD` | **Yes** | Bootstrap admin password |
| `GROQ_API_KEY` | No | Groq API key. Can also be set via Settings UI. Demo mode when empty. |
| `PORT` | No | HTTP port (default: `3020`) |

---

## Production Deployment

### With PM2

```bash
npm run build
pm2 start npm --name vyncost -- start -- -p 3020
pm2 save
pm2 startup   # auto-start on reboot
```

### With nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name vyncost.yourdomain.com;
    location / {
        proxy_pass http://localhost:3020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### With Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3020
ENV PORT=3020
CMD ["npm", "start"]
```

---

## Project Structure

```
VynCost/
├── app/
│   ├── (dashboard)/          # All authenticated dashboard pages
│   │   ├── overview/         # MTD spend + daily chart
│   │   ├── explorer/         # Cost drill-down with filters
│   │   ├── recommendations/  # Rightsizing + optimisation
│   │   ├── waste/            # Idle resource cleanup
│   │   ├── anomalies/        # Anomaly detection
│   │   ├── forecast/         # 30/60/90-day forecasting
│   │   ├── commitments/      # RI / Savings Plan coverage
│   │   ├── budgets/          # Budget management
│   │   ├── allocation/       # Team cost allocation
│   │   ├── copilot/          # AI chat interface
│   │   ├── team/             # User management (RBAC)
│   │   └── settings/         # App + AI configuration
│   └── api/                  # All API route handlers
├── lib/
│   ├── simulation/           # Deterministic mock data engine
│   │   ├── index.ts          # Unified router
│   │   ├── seed.ts           # Seeded PRNG
│   │   └── vendors/          # Per-provider simulators (aws/gcp/azure/oci)
│   ├── auth.ts               # JWT session management + RBAC helpers
│   ├── user-store.ts         # Multi-user store with PBKDF2 hashing
│   ├── account-store.ts      # Cloud account CRUD + credential sanitisation
│   ├── settings-store.ts     # App settings persistence
│   ├── copilot-usage.ts      # Daily AI token usage tracking
│   └── utils.ts              # CSV export + shared utilities
├── components/
│   ├── layout/               # Sidebar, Header, DashboardLayout
│   └── ui/                   # Shared UI components
├── middleware.ts              # Auth guard — redirects unauthenticated requests
└── data/                     # Runtime data (gitignored)
```

---

## Security Notes

- **Cloud credentials** are stored in `data/accounts.json` server-side. Secure the host VynCost runs on.
- **Credential sanitisation** — `sanitize()` in `lib/account-store.ts` strips all secret fields before any API response. Credentials are write-only from the browser.
- **`VYNCOST_SECRET`** must be a random 32+ byte value in production. Do not reuse across deployments.
- **Password hashing** — user passwords use PBKDF2 (100,000 iterations, SHA-256) via Node.js built-in `crypto`. No external bcrypt dependency.
- All API routes are protected by JWT session middleware. No anonymous API access.
- Use HTTPS (nginx + Let's Encrypt) in production.
- For AWS, use a dedicated IAM user with **read-only billing permissions**. Never use root credentials or admin keys.
- **`data/`** is in `.gitignore`. Never commit it.

---

## Roadmap

### v0.2 — Real Cloud Integration
- [ ] AWS Cost Explorer API integration
- [ ] GCP Billing Export / BigQuery integration
- [ ] Azure Cost Management API integration
- [ ] OCI Usage Reports API integration
- [ ] Scheduled background data sync

### v0.3 — Alerting & Automation
- [ ] Slack / webhook budget threshold alerts
- [ ] Email alerts via SMTP
- [ ] Alert history log with acknowledgement
- [ ] Auto-apply low-risk recommendations (with approval flow)

### v0.4 — Advanced FinOps
- [ ] Custom tag-based allocation rules (YAML config)
- [ ] CSV / PDF cost report export (scheduled)
- [ ] Terraform cost estimation (pre-apply plan diffing)
- [ ] Kubernetes cost allocation (via VynOps integration)
- [ ] Prometheus metrics export (`/metrics`)
- [ ] SSO / OIDC support

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run `npx tsc --noEmit` — must pass with zero errors
5. Commit: `git commit -m "feat: describe your change"`
6. Push and open a pull request

---

## License

MIT — see [LICENSE](LICENSE)

---

## Part of the VynOps Platform

VynCost is one component of the [VynOps](https://github.com/vynops) open-source platform engineering suite.

| Project | Status | Description |
|---|---|---|
| [VynOps](https://github.com/vynops/VynOps) | Active | AI-native Kubernetes operations dashboard |
| [VynAI](https://github.com/vynops/VynAI) | Active | Ollama fleet management & GPU monitoring |
| [VynCost](https://github.com/vynops/VynCost) | **Active** | Cloud cost management ← *this project* |
| [VynDB](https://github.com/vynops/VynDB) | Planned | Database operations & query management |
| [VynDC](https://github.com/vynops/VynDC) | Planned | Container & Docker management |
| [VynCICD](https://github.com/vynops/VynCICD) | Planned | CI/CD pipeline management |

---

<div align="center">

**[vynops.io](https://vynops.io)** · MIT License · Open Source

</div>
