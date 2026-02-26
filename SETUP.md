# OpsGuard AI — Complete Setup Guide

> Follow these steps to reproduce the demo from scratch on your own Elastic Cloud account.

---

## Prerequisites

- [Elastic Cloud account](https://cloud.elastic.co/) — free 14-day trial works
- Python 3.8+
- An Elastic **Serverless** project (Security or Observability type recommended)

---

## Step 1 — Create an Elastic Cloud Serverless Project

1. Log into [cloud.elastic.co](https://cloud.elastic.co/)
2. Click **Create project** → choose **Elasticsearch** (General Purpose)
3. Name it `opsguard-ai`, select your region, click **Create**
4. Once ready, note your **Elasticsearch endpoint URL** (e.g., `https://my-project.es.region.gcp.elastic.cloud`)

---

## Step 2 — Create an API Key

1. In Kibana → **Stack Management** → **API Keys**
2. Click **Create API key**
3. Name: `opsguard-ingest`, Role: `superuser` (for setup only)
4. Copy the key (shown once!)

---

## Step 3 — Ingest Sample Data

```bash
# Clone the repo
git clone https://github.com/cinderspire/opsguard-ai.git
cd opsguard-ai

# Generate sample data (incident scenario + historical incidents)
python3 data/sample-data-generator.py --output-dir generated-data --bulk

# Ingest to Elastic Cloud (creates all 7 indices automatically)
export ES_URL="https://your-project.es.region.gcp.elastic.cloud"
export ES_API_KEY="your-api-key-here"
python3 scripts/ingest_to_elastic.py
```

**Expected output:**
```
📦 STEP 1: Creating Indices (Serverless Compatible)
  Creating opsguard-incidents... ✅ OK
  Creating opsguard-metrics...   ✅ OK
  Creating opsguard-business...  ✅ OK
  Creating opsguard-history...   ✅ OK
  Creating opsguard-active...    ✅ OK
  ...

📊 STEP 2: Ingesting Data via Bulk API
  logs_bulk.ndjson → opsguard-incidents  ✅ 500 docs ingested
  metrics_bulk.ndjson → opsguard-metrics ✅ 288 docs ingested
  ...

🔍 STEP 3: Verification
  opsguard-incidents: 500 documents
  opsguard-metrics:   288 documents
  opsguard-business:  240 documents
  opsguard-history:   20 documents
```

---

## Step 4 — Create ES|QL Tools in Agent Builder

In Kibana → **Agent Builder** → **Tools** → **New Tool**

Create these 5 ES|QL tools (copy query from `elastic/tools/`):

| Tool ID | Query File | Description |
|---------|-----------|-------------|
| `detect_anomalies` | `detect-anomalies.esql` | CPU/memory spike detection |
| `detect_error_spikes` | `detect-error-spikes.esql` | Error rate analysis |
| `correlate_logs_and_errors` | `correlate-logs.esql` | Per-service log deep-dive |
| `check_recent_deployments` | `check-deployments.esql` | Deployment correlation |
| `calculate_business_impact` | `business-impact.esql` | Revenue loss calculation |

Create 1 **Search** tool:

| Tool ID | Config File | Description |
|---------|------------|-------------|
| `search_similar_incidents` | `search-incidents.json` | Vector search on incident history |

---

## Step 5 — Create Elastic Workflows

In Kibana → **Workflow Automation** → **New Workflow**

Import these 2 workflows from `elastic/workflows/`:

1. `create-ticket.yaml` → Named: `opsguard-create-incident-ticket`
2. `notify-team.yaml` → Named: `opsguard-notify-team`

After creating each workflow, copy its **Workflow ID** — you'll need it in the next step.

---

## Step 6 — Create the OpsGuard Commander Agent

In Kibana → **Agent Builder** → **Agents** → **New Agent**

- **Display name:** `OpsGuard AI Commander`
- **Instructions:** Copy from `elastic/agents/commander-agent.yaml` (the `instructions:` block)
- **Tools:** Add all 7 tools created in Step 4 + the 2 workflow tools

---

## Step 7 — Test the Agent

In the Agent Builder chat interface, type:

```
Check system health and report any anomalies across all services
```

**Expected behavior:**
1. Agent calls `detect_anomalies` → finds `payment-service` CRITICAL (92% CPU)
2. Agent calls `correlate_logs_and_errors` → finds 847 DB_CONN_TIMEOUT errors
3. Agent calls `check_recent_deployments` → finds v2.4.2 deployed 2 min before errors
4. Agent calls `search_similar_incidents` → matches INC-2026-001 (identical case)
5. Agent evaluates hypotheses: Deployment (87%) vs Database (42%) → chooses Deployment
6. Agent calls `calculate_business_impact` → $12,450/hr loss, P0-CRITICAL
7. Agent calls `create_incident_ticket` → creates OPS-ticket
8. Agent calls `notify_team` → sends ops-critical alert
9. Agent outputs structured incident report

Total time: ~2 minutes vs 2.5 hour industry average.

---

## Step 8 — Connect the Dashboard (Optional)

Open `frontend/index.html` in a browser, then in the browser console:

```javascript
configureES('https://your-project.es.region.gcp.elastic.cloud', 'your-api-key')
```

The dashboard will switch from DEMO MODE to LIVE DATA and pull real metrics.

---

## Step 9 — Import Kibana Dashboard (Optional)

In Kibana → **Stack Management** → **Saved Objects** → **Import**

Select the file: `elastic/kibana-dashboard.ndjson`

This imports a pre-built dashboard with 8 visualizations:
- Average CPU % metric (from `opsguard-metrics`)
- Active incident count metric
- Error distribution bar chart by service
- Revenue impact metric
- Incident history data table
- Memory usage metric
- Response time metric
- Error rate gauge

---

## Index Reference

| Index Name | Contents | Used By |
|-----------|----------|---------|
| `opsguard-incidents` | Application logs, errors, events | Monitor, Diagnose agents |
| `opsguard-metrics` | System CPU/memory/disk metrics | Monitor agent |
| `opsguard-business` | Revenue, transactions, active users | Impact agent |
| `opsguard-history` | Past incidents with `semantic_text` | Diagnose agent (vector search) |
| `opsguard-active` | Open incident tickets (written by Workflow) | Commander → Workflow |
| `opsguard-notifications` | Alert log (written by Workflow) | Commander → Workflow |
| `opsguard-audit` | Full audit trail of all agent actions | Compliance |
