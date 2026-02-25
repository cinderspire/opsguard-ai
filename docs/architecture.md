# OpsGuard AI — Architecture

## System Overview

OpsGuard AI is a multi-agent autonomous incident response system built on Elastic Agent Builder. It uses 4 specialized agents that collaborate to detect, diagnose, assess, and respond to production incidents in real-time.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpsGuard AI Platform                        │
│                                                                 │
│  ┌─────────────┐    ┌──────────────────────────────────────┐   │
│  │  Dashboard   │    │        Agent Builder (Kibana)        │   │
│  │  (Frontend)  │◄──►│                                      │   │
│  └─────────────┘    │  ┌──────────────────────────────────┐│   │
│                      │  │     🎖️ Commander Agent            ││   │
│                      │  │     (Orchestrator)                ││   │
│                      │  │                                    ││   │
│                      │  │  Disagreement Resolution Engine    ││   │
│                      │  │  ┌─────┐ ┌─────┐ ┌────┐          ││   │
│                      │  │  │Conf.│ │Evid.│ │Hist│          ││   │
│                      │  │  │Score│ │Match│ │Prec│          ││   │
│                      │  │  └─────┘ └─────┘ └────┘          ││   │
│                      │  └────────────┬───────────────────────┘│   │
│                      │               │ orchestrates            │   │
│                      │  ┌────────────┼────────────────────┐   │   │
│                      │  │            ▼                    │   │   │
│                      │  │ ┌──────────┐  ┌──────────────┐ │   │   │
│                      │  │ │ 📡       │  │ 🔍            │ │   │   │
│                      │  │ │ Monitor  │  │ Diagnose     │ │   │   │
│                      │  │ │ Agent    │  │ Agent        │ │   │   │
│                      │  │ │          │  │              │ │   │   │
│                      │  │ │ Detects  │  │ Root Cause   │ │   │   │
│                      │  │ │ anomaly  │  │ + Confidence │ │   │   │
│                      │  │ └──────────┘  └──────────────┘ │   │   │
│                      │  │                                 │   │   │
│                      │  │ ┌──────────┐                   │   │   │
│                      │  │ │ 💰       │                   │   │   │
│                      │  │ │ Impact   │                   │   │   │
│                      │  │ │ Agent    │                   │   │   │
│                      │  │ │          │                   │   │   │
│                      │  │ │ Revenue  │                   │   │   │
│                      │  │ │ Loss Calc│                   │   │   │
│                      │  │ └──────────┘                   │   │   │
│                      │  └────────────────────────────────┘   │   │
│                      └──────────────────────────────────────┘   │
│                                         │                       │
│                      ┌──────────────────┼───────────────────┐   │
│                      │    Tools Layer   │                    │   │
│                      │                  ▼                    │   │
│                      │ ┌────────────────────────────────┐   │   │
│                      │ │     ES|QL Tools                │   │   │
│                      │ │  • detect_anomalies            │   │   │
│                      │ │  • detect_error_spikes         │   │   │
│                      │ │  • correlate_logs_and_errors   │   │   │
│                      │ │  • check_recent_deployments    │   │   │
│                      │ │  • calculate_business_impact   │   │   │
│                      │ └────────────────────────────────┘   │   │
│                      │ ┌────────────────────────────────┐   │   │
│                      │ │     Search Tools               │   │   │
│                      │ │  • search_similar_incidents    │   │   │
│                      │ │    (semantic / vector search)  │   │   │
│                      │ └────────────────────────────────┘   │   │
│                      │ ┌────────────────────────────────┐   │   │
│                      │ │     Workflow Tools             │   │   │
│                      │ │  • create_incident_ticket      │   │   │
│                      │ │  • notify_team                 │   │   │
│                      │ └────────────────────────────────┘   │   │
│                      └──────────────────────────────────────┘   │
│                                         │                       │
│                      ┌──────────────────┼───────────────────┐   │
│                      │  Elasticsearch   ▼    Data Layer     │   │
│                      │ ┌──────────┐ ┌──────────┐            │   │
│                      │ │  Logs    │ │ Metrics  │            │   │
│                      │ │  Index   │ │  Index   │            │   │
│                      │ └──────────┘ └──────────┘            │   │
│                      │ ┌──────────┐ ┌──────────┐            │   │
│                      │ │Incidents │ │ Business │            │   │
│                      │ │ History  │ │ Metrics  │            │   │
│                      │ │(vectors) │ │          │            │   │
│                      │ └──────────┘ └──────────┘            │   │
│                      └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Production Systems → Elasticsearch Indices
         │
         ▼
    Monitor Agent
    (ES|QL: time-series anomaly detection)
         │
         ▼ anomaly detected
    Diagnose Agent
    (ES|QL: log correlation + Vector Search: similar incidents)
         │
         ▼ root cause hypotheses (with confidence scores)
    Impact Agent
    (ES|QL: business metrics comparison)
         │
         ▼ revenue loss calculated
    Commander Agent
    (Evaluates all inputs, resolves disagreements)
         │
         ├─→ Workflow: Create Incident Ticket
         ├─→ Workflow: Notify Ops Team
         └─→ Structured Incident Report
```

## Agent Disagreement Resolution

One of OpsGuard's key innovations is its **disagreement resolution** mechanism. When multiple root cause hypotheses emerge:

1. **Confidence Scoring**: Each hypothesis gets a confidence score (0-100%)
2. **Historical Validation**: Similar past incidents support or weaken each hypothesis
3. **Temporal Correlation**: Which event happened first? (deployment vs. error onset)
4. **Transparent Decision**: Commander explains why it chose one hypothesis over another

Example:
```
Hypothesis A (85%): "Bad deployment v2.4.2 caused connection pool exhaustion"
  Evidence: Error onset exactly matches deployment time, similar to INC-2026-001
  
Hypothesis B (45%): "Database performance degradation under load"
  Evidence: DB metrics show elevated queries, but timing doesn't match

Decision: Choosing Hypothesis A — deployment timestamp (14:32) matches
first error (14:34), and historical incident INC-2026-001 had identical
symptoms resolved by rollback.
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Data Store | Elasticsearch | Logs, metrics, incidents, business data |
| Agent Platform | Elastic Agent Builder | Multi-agent orchestration |
| Analytics | ES|QL | Time-series queries, aggregations |
| Search | Semantic Search (ELSER) | Similar incident matching |
| Automation | Elastic Workflows | Ticket creation, notifications |
| Frontend | HTML/CSS/JS | Dashboard & visualization |
| Hosting | Elastic Cloud Serverless | Managed infrastructure |

## Elastic Features Used

1. **ES|QL** — 5 custom tools with parameterized queries:
   - `STATS ... BY TIME_BUCKET()` for time-series aggregation
   - `CASE()` for dynamic severity classification
   - `PERCENTILE()` for latency analysis
   - `COUNT_DISTINCT()` for error diversity

2. **Semantic Search** — Vector similarity on incident descriptions using `semantic_text` field type

3. **Elastic Workflows** — YAML-defined deterministic actions:
   - Incident ticket creation with auto-generated IDs
   - Team notifications with severity-based formatting
   - Complete audit trail logging

4. **Agent Builder** — 4 custom agents with specialized instructions, tools, and collaboration patterns
