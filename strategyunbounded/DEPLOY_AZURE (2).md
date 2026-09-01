# Azure Deployment Guide

This deploys StrategyUnbounded as three Azure resources:

| Resource | Purpose |
|---|---|
| Azure Database for PostgreSQL Flexible Server | Managed PostgreSQL |
| Azure App Service (Python 3.12, Linux) | FastAPI backend |
| Azure App Service (Node.js 20, Linux) | Next.js frontend |

All three share a single App Service Plan (B1 tier — adequate for a demo, ~$13/month each).

---

## Prerequisites

Install and authenticate:

```bash
# Azure CLI
# Windows: https://aka.ms/installazurecliwindows
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Node.js 20+ (for building the frontend)
node --version   # must be 20+

# Python 3.12 (for local testing only — Azure builds remotely)
python --version
```

Pick names. These must be globally unique across Azure:

```
RESOURCE_GROUP=rg-strategyunbounded
LOCATION=westeurope
POSTGRES_SERVER=su-postgres-demo        # becomes su-postgres-demo.postgres.database.azure.com
POSTGRES_USER=suadmin
POSTGRES_PASSWORD=YourStr0ngPassword!   # min 8 chars, must include uppercase + number + special
POSTGRES_DB=strategyunbounded
APP_PLAN=su-plan
BACKEND_APP=su-backend-demo             # becomes su-backend-demo.azurewebsites.net
FRONTEND_APP=su-frontend-demo           # becomes su-frontend-demo.azurewebsites.net
```

---

## Required Code Changes (do these first)

### 1. Enable standalone Next.js output

Azure App Service needs Next.js to produce a self-contained server bundle.
Edit `frontend/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

### 2. Enable SSL for Azure PostgreSQL

Azure PostgreSQL Flexible Server requires TLS on all connections.
asyncpg does not read `sslmode` from the connection URL, so pass it explicitly.
Edit `backend/database.py`, line 21:

```python
# Before:
_pool = await asyncio.wait_for(
    asyncpg.create_pool(settings.DATABASE_URL, min_size=2, max_size=10),
    timeout=15.0,
)

# After:
_pool = await asyncio.wait_for(
    asyncpg.create_pool(settings.DATABASE_URL, min_size=2, max_size=10, ssl="require"),
    timeout=15.0,
)
```

Commit both changes before deploying.

---

## Step 1 — Create the Resource Group and App Service Plan

```bash
az group create \
  --name rg-strategyunbounded \
  --location westeurope

az appservice plan create \
  --resource-group rg-strategyunbounded \
  --name su-plan \
  --location westeurope \
  --sku B1 \
  --is-linux
```

---

## Step 2 — Create the PostgreSQL Flexible Server

This creates the server, opens the Azure-internal firewall rule, and creates the database.

```bash
az postgres flexible-server create \
  --resource-group rg-strategyunbounded \
  --name su-postgres-demo \
  --location westeurope \
  --admin-user suadmin \
  --admin-password "YourStr0ngPassword!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --storage-size 32 \
  --yes

az postgres flexible-server db create \
  --resource-group rg-strategyunbounded \
  --server-name su-postgres-demo \
  --database-name strategyunbounded

# Allow Azure services (App Service) to reach the DB
az postgres flexible-server firewall-rule create \
  --resource-group rg-strategyunbounded \
  --name su-postgres-demo \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

Your connection string will be:
```
postgresql://suadmin:YourStr0ngPassword!@su-postgres-demo.postgres.database.azure.com:5432/strategyunbounded
```

Keep this — you will paste it as `DATABASE_URL` in Step 4.

---

## Step 3 — Create the Backend App Service

```bash
az webapp create \
  --resource-group rg-strategyunbounded \
  --plan su-plan \
  --name su-backend-demo \
  --runtime "PYTHON:3.12"
```

Tell Azure to install dependencies and run oryx build:

```bash
az webapp config appsettings set \
  --resource-group rg-strategyunbounded \
  --name su-backend-demo \
  --settings \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    ENABLE_ORYX_BUILD=true
```

Set the startup command (uvicorn, not gunicorn — required for asyncio agents):

```bash
az webapp config set \
  --resource-group rg-strategyunbounded \
  --name su-backend-demo \
  --startup-file "uvicorn main:app --host 0.0.0.0 --port 8000"
```

---

## Step 4 — Set Backend Environment Variables

Replace every value in angle brackets with your real secrets.

```bash
az webapp config appsettings set \
  --resource-group rg-strategyunbounded \
  --name su-backend-demo \
  --settings \
    AZURE_OPENAI_API_KEY="<your-azure-openai-key>" \
    AZURE_OPENAI_ENDPOINT="https://<your-resource>.openai.azure.com/" \
    AZURE_OPENAI_API_VERSION="2024-10-01-preview" \
    AZURE_OPENAI_CHAT_DEPLOYMENT="gpt-4o-mini" \
    DATABASE_URL="postgresql://suadmin:YourStr0ngPassword!@su-postgres-demo.postgres.database.azure.com:5432/strategyunbounded" \
    ADMIN_PIN="1234" \
    SESSION_SECRET="<long-random-string-at-least-32-chars>" \
    DEFAULT_SYSTEM_PROMPT="You are Benjamin, an expert AI strategy consultant facilitating a business innovation workshop. Your role is to help organisations discover practical, commercially viable AI use cases that address their real operational challenges. Prioritise ideas that are implementable within 12 months by a mid-sized organisation. Be specific to the industry and problem context described. All monetary estimates must use euros (€)." \
    ALLOWED_ORIGINS="https://su-frontend-demo.azurewebsites.net"
```

Generate a `SESSION_SECRET` with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Step 5 — Deploy the Backend

Zip only the backend source (no venv, no tests):

```bash
# Windows PowerShell — run from repo root
cd backend
Compress-Archive -Path * -DestinationPath ..\backend.zip `
  -Force `
  -CompressionLevel Optimal

# Exclude venv and cache manually if needed:
# The venv dir will not be in the zip if you run this from the repo
# because Azure installs deps fresh from requirements.txt

cd ..
```

Deploy:

```bash
az webapp deploy \
  --resource-group rg-strategyunbounded \
  --name su-backend-demo \
  --src-path backend.zip \
  --type zip
```

Watch the startup log to confirm it's running:

```bash
az webapp log tail \
  --resource-group rg-strategyunbounded \
  --name su-backend-demo
```

You should see lines like:
```
Database pool created
Running migration: 001_initial.sql
Migration OK: 001_initial.sql
Database initialised — all migrations applied
INFO: Application startup complete.
```

Test the health endpoint:
```
GET https://su-backend-demo.azurewebsites.net/health
→ { "status": "ok" }
```

---

## Step 6 — Build the Frontend

You must build the frontend locally with the backend URL set, because
`NEXT_PUBLIC_API_URL` is compiled into the JavaScript bundle at build time.

```bash
cd frontend
npm install

# Windows PowerShell
$env:NEXT_PUBLIC_API_URL = "https://su-backend-demo.azurewebsites.net"
npm run build

cd ..
```

After the build, `frontend/.next/standalone/` will contain a complete Node.js server.

---

## Step 7 — Create and Deploy the Frontend App Service

```bash
az webapp create \
  --resource-group rg-strategyunbounded \
  --plan su-plan \
  --name su-frontend-demo \
  --runtime "NODE:20-lts"

az webapp config appsettings set \
  --resource-group rg-strategyunbounded \
  --name su-frontend-demo \
  --settings \
    NEXT_PUBLIC_API_URL="https://su-backend-demo.azurewebsites.net" \
    NODE_ENV="production" \
    WEBSITES_PORT=3000

az webapp config set \
  --resource-group rg-strategyunbounded \
  --name su-frontend-demo \
  --startup-file "node server.js"
```

Package the standalone output. The standalone build needs three things copied together:

```bash
# Windows PowerShell — run from repo root

# Copy static assets and public files into the standalone bundle
Copy-Item -Recurse -Force frontend\.next\static frontend\.next\standalone\.next\static
Copy-Item -Recurse -Force frontend\public frontend\.next\standalone\public

# Zip the standalone directory
Compress-Archive -Path frontend\.next\standalone\* `
  -DestinationPath frontend-standalone.zip `
  -Force
```

Deploy:

```bash
az webapp deploy \
  --resource-group rg-strategyunbounded \
  --name su-frontend-demo \
  --src-path frontend-standalone.zip \
  --type zip
```

Watch the log:

```bash
az webapp log tail \
  --resource-group rg-strategyunbounded \
  --name su-frontend-demo
```

You should see:
```
▲ Next.js 16.3.2
- Local: http://localhost:3000
```

Open the app:
```
https://su-frontend-demo.azurewebsites.net
```

---

## Step 8 — Verify End-to-End

Work through the full workshop flow:

1. **Landing page** loads at `https://su-frontend-demo.azurewebsites.net`
2. Click **Begin Stage 1 → Submit 5 problems** (`/workshop`)
3. Watch the **SSE stream** in `/activity/processing` — you should see each problem agent complete
4. **Results page** loads with use cases and AI-assigned priorities (`/activity/results`)
5. Click **Download PowerPoint** — a `.pptx` file should download
6. Navigate to `/admin`, enter your `ADMIN_PIN`, and confirm admin access

If the SSE stream hangs at "Analysing your five challenges…" for more than 90 seconds, check the backend log for database or OpenAI connection errors.

---

## Troubleshooting

### Backend won't start — "Database unreachable"

The App Service cannot reach PostgreSQL. Check:

```bash
# Confirm the firewall rule exists
az postgres flexible-server firewall-rule list \
  --resource-group rg-strategyunbounded \
  --name su-postgres-demo
```

The rule `AllowAzureServices` (0.0.0.0–0.0.0.0) must appear. If it's missing, re-run the firewall-rule create command from Step 2.

### SSL error in backend logs

If you see `ssl: CERTIFICATE_VERIFY_FAILED` or `ssl required`, confirm the change to `database.py` in the **Required Code Changes** section was deployed. Re-zip and re-deploy if needed.

### Frontend shows "Failed to connect to brainstorm stream"

`ALLOWED_ORIGINS` on the backend does not include the frontend URL. Update it:

```bash
az webapp config appsettings set \
  --resource-group rg-strategyunbounded \
  --name su-backend-demo \
  --settings ALLOWED_ORIGINS="https://su-frontend-demo.azurewebsites.net"
```

Then restart the backend:

```bash
az webapp restart \
  --resource-group rg-strategyunbounded \
  --name su-backend-demo
```

### SSE stream disconnects mid-way

Azure App Service has a default request timeout of 230 seconds, which is longer than the 90-second per-problem timeout. If you see premature disconnects, ensure `SCM_DO_BUILD_DURING_DEPLOYMENT=true` is set (slow cold starts can eat into the timeout window).

### Admin PIN not accepted

Confirm `ADMIN_PIN` is set on the backend:

```bash
az webapp config appsettings list \
  --resource-group rg-strategyunbounded \
  --name su-backend-demo \
  --query "[?name=='ADMIN_PIN']"
```

---

## Restart and Redeploy Commands

```bash
# Restart both apps
az webapp restart --resource-group rg-strategyunbounded --name su-backend-demo
az webapp restart --resource-group rg-strategyunbounded --name su-frontend-demo

# Redeploy backend after code change
az webapp deploy --resource-group rg-strategyunbounded --name su-backend-demo --src-path backend.zip --type zip

# Redeploy frontend after code change
# (rebuild first with NEXT_PUBLIC_API_URL set, re-package standalone, then:)
az webapp deploy --resource-group rg-strategyunbounded --name su-frontend-demo --src-path frontend-standalone.zip --type zip
```

---

## Teardown (after the demo)

Delete everything at once:

```bash
az group delete --name rg-strategyunbounded --yes --no-wait
```

This permanently deletes the database, both App Services, and the App Service Plan.

---

## Cost Estimate (demo duration)

| Resource | SKU | ~Monthly |
|---|---|---|
| App Service Plan | B1 | ~$13 |
| Backend Web App | (shares plan) | included |
| Frontend Web App | (shares plan) | included |
| PostgreSQL Flexible Server | Burstable B1ms | ~$13 |
| **Total** | | **~$26/month** |

For a one-day demo you will spend well under $5.
