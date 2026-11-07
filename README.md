<div align="center">

# VynCost

### Self-Hosted Cloud Cost Management Dashboard

**Multi-cloud · AI-powered · Zero lock-in · Open source**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
![AI](https://img.shields.io/badge/AI-Multi--provider-orange)

*Track, analyse, and optimise cloud spend across AWS, GCP, Azure, and OCI — from a single self-hosted dashboard.*

[**Live Demo**](https://cost.vynops.online) · [**Docs**](https://vynops.com/docs) · [**GitHub**](https://github.com/vynops/VynCost) · [**Part of VynOps**](https://vynops.com)

</div>

---

## Overview

VynCost gives engineering and FinOps teams a **single pane of glass** for cloud cost visibility — without sending your billing data to a third-party SaaS product.

- **Multi-cloud:** AWS, GCP, Azure, and OCI in one view. Connect multiple accounts per provider.
- **AI Copilot:** Ask questions in plain English — *"Why did my costs spike this week?"*, *"What can I cut today?"* Powered by your selected AI provider and model, with cost context injected automatically.
- **Actionable recommendations:** Rightsizing, reserved instance coverage, idle resource cleanup — each with the exact CLI command to act immediately.
- **Demo mode:** Runs fully offline with a realistic simulation engine. No cloud credentials required to evaluate.
- **Zero external dependencies:** No database, no Redis, no message queue. Plain JSON files. Runs on a $5 VPS.

---

## Screenshots

| 01 · Login & Authentication | 02 · Executive Overview |
| :---: | :---: |
| <a href="screenshots/Screenshot%202026-09-01%20130227.png"><img src="screenshots/Screenshot%202026-09-01%20130227.png" alt="Login & Authentication" width="100%" /></a> | <a href="screenshots/Screenshot%202026-09-01%20130330.png"><img src="screenshots/Screenshot%202026-09-01%20130330.png" alt="Executive Overview" width="100%" /></a> |

| 03 · Multi-Cloud Cost Explorer | 04 · Team Cost Allocation |
| :---: | :---: |
| <a href="screenshots/Screenshot%202026-09-01%20130449.png"><img src="screenshots/Screenshot%202026-09-01%20130449.png" alt="Multi-Cloud Cost Explorer" width="100%" /></a> | <a href="screenshots/Screenshot%202026-09-01%20130631.png"><img src="screenshots/Screenshot%202026-09-01%20130631.png" alt="Team Cost Allocation" width="100%" /></a> |

| 05 · Waste & Resource Cleanup | 06 · Rightsizing Recommendations |
| :---: | :---: |
| <a href="screenshots/Screenshot%202026-09-01%20130709.png"><img src="screenshots/Screenshot%202026-09-01%20130709.png" alt="Waste & Resource Cleanup" width="100%" /></a> | <a href="screenshots/Screenshot%202026-09-01%20130742.png"><img src="screenshots/Screenshot%202026-09-01%20130742.png" alt="Rightsizing Recommendations" width="100%" /></a> |

| 07 · Budgets & Threshold Alerts | 08 · Anomaly Detection |
| :---: | :---: |
| <a href="screenshots/Screenshot%202026-09-01%20130840.png"><img src="screenshots/Screenshot%202026-09-01%20130840.png" alt="Budgets & Threshold Alerts" width="100%" /></a> | <a href="screenshots/Screenshot%202026-09-01%20130938.png"><img src="screenshots/Screenshot%202026-09-01%20130938.png" alt="Anomaly Detection" width="100%" /></a> |

| 09 · Cost Forecasting | 10 · Commitments & RIs |
| :---: | :---: |
| <a href="screenshots/Screenshot%202026-09-01%20131040.png"><img src="screenshots/Screenshot%202026-09-01%20131040.png" alt="Cost Forecasting" width="100%" /></a> | <a href="screenshots/Screenshot%202026-09-01%20131120.png"><img src="screenshots/Screenshot%202026-09-01%20131120.png" alt="Commitments & RIs" width="100%" /></a> |

| 11 · FinOps AI Copilot | 12 · Settings & Cloud Accounts |
| :---: | :---: |
| <a href="screenshots/Screenshot%202026-09-01%20131145.png"><img src="screenshots/Screenshot%202026-09-01%20131145.png" alt="FinOps AI Copilot" width="100%" /></a> | <a href="screenshots/Screenshot%202026-09-01%20131220.png"><img src="screenshots/Screenshot%202026-09-01%20131220.png" alt="Settings & Cloud Accounts" width="100%" /></a> |

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
- Configurable AI provider, API key, and model selection from the Settings UI (Groq, OpenAI, Anthropic, Google Gemini, and custom OpenAI-compatible endpoints)
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
- Configure AI Copilot provider, model, API key, and custom endpoint
- Set alert thresholds, Slack, Teams, email, and custom webhooks
- Test each notification channel and the selected AI provider directly from Settings
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
| AI | Groq, OpenAI, Anthropic, Google Gemini, or custom OpenAI-compatible API | Editable model ID; Groq defaults to `openai/gpt-oss-120b` |
| Auth | [jose](https://github.com/panva/jose) | JWT session cookies (HS256, 7-day expiry) |
| Storage | JSON files | Zero-dependency local persistence |

No database. No ORM. No Redis. No external services required (beyond an optional Groq API key).

---

## Quick Start

### Prerequisites

- **Node.js 20.9+**
- Cloud provider credentials — or run in **demo mode** with no credentials at all

### 1. Clone and install

```bash
git clone https://github.com/vynops/VynCost
cd VynCost
npm install
```

### 2. Start development server

```bash
npm run dev
# Open: http://localhost:3020
```

### 3. Login and explore

On a fresh install, `npm install` creates `.env.local` automatically if it does not exist. It generates a session secret and creates the admin account on first login:

- **Email:** `admin@vyncost.local`
- **Password:** `changeme`

You must replace the temporary password with one that is at least 8 characters before the dashboard opens. No cloud accounts are needed to try demo mode. Existing `.env.local` files are left untouched.

The same bootstrap credentials are used in every environment. Do not expose a public production instance before the admin signs in and changes the temporary password.

### 4. Connect your first cloud account

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

The AI Copilot supports Groq, OpenAI, Anthropic, Google Gemini, and custom OpenAI-compatible endpoints. Groq defaults to `openai/gpt-oss-120b`.

**Configuration** (Settings → AI Copilot):

| Setting | Description |
|---|---|
| AI Provider & API Key | Configure a provider and API key in Settings. Keys are stored in `data/settings.json` and are never committed. |
| AI Model | Enter an editable model ID for any provider. Groq defaults to `openai/gpt-oss-120b`; retired Groq model IDs are rejected with an actionable error. |

**Test Connection** sends a short real prompt to the selected model and reports the model returned by the provider. The Copilot page also shows the last responding model and provider errors.

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
| `POST` | `/api/copilot/test` | Test the selected AI model with a short prompt (admin only) |
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
| `VYNCOST_SECRET` | Auto-generated | A random 32-byte session secret is written to `.env.local` if missing. |
| `VYNCOST_ADMIN_EMAIL` | Auto-generated | Defaults to `admin@vyncost.local`. |
| `VYNCOST_ADMIN_PASSWORD` | Auto-generated | Defaults to `changeme`; must be changed on first login. |
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
- **`.env.local`** is generated automatically if missing and is git-ignored. Keep its session secret private and back it up securely.
- **Password hashing** — user passwords use PBKDF2 (100,000 iterations, SHA-256) via Node.js built-in `crypto`. No external bcrypt dependency.
- All API routes are protected by JWT session middleware. No anonymous API access.
- Use HTTPS (nginx + Let's Encrypt) in production.
- For AWS, use a dedicated IAM user with **read-only billing permissions**. Never use root credentials or admin keys.
- **`data/`** is in `.gitignore`. Never commit it.

---

## Roadmap

### Implemented
- Live OCI cost and usage data
- On-demand CSV exports in several cost views
- Persisted anomaly acknowledgement

### Planned
- Live AWS, GCP, and Azure billing integrations with scheduled data sync
- Automated budget alerts through Slack, Teams, webhooks, and email, with delivery history
- Approval-based execution of recommendation actions
- Custom tag allocation rules and Kubernetes cost allocation
- Scheduled CSV/PDF reports and Terraform cost estimation
- Prometheus metrics and SSO/OIDC support

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run `npx tsc --noEmit` — must pass with zero errors
5. Commit: `git commit -m "feat: describe your change"`
6. Push and open a pull request

---

## Part of the VynOps Suite

| Product | Purpose | Repo |
|---|---|---|
| **VynOps** | Kubernetes operations platform | [vynops/VynOps](https://github.com/vynops/VynOps) |
| **VynAI** | Ollama fleet manager and AI gateway | [vynops/VynAI](https://github.com/vynops/VynAI) |
| **VynCost** | Cloud cost visibility | [vynops/VynCost](https://github.com/vynops/VynCost) |
| **VynDB** | Database operations | [vynops/VynDB](https://github.com/vynops/VynDB) |
| **VynDC** | Data center management | [vynops/VynDC](https://github.com/vynops/VynDC) |
| **VynCICD** | CI/CD pipeline management | [vynops/VynCICD](https://github.com/vynops/VynCICD) |
| **VynHana** | SAP HANA Database management | [vynops/VynHana](https://github.com/vynops/VynHana) |
| **VynSAP** | SAP ERP management | [vynops/VynSAP](https://github.com/vynops/VynSAP) |


---

## License

MIT — see [LICENSE](LICENSE)

---
