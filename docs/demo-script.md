## OpsGuard AI — Demo Video Script (3 minutes)

### Pre-demo Setup
- Dashboard open in browser
- Elastic Cloud Kibana ready (Agent Builder tab)
- Terminal ready for data ingestion

---

### SCRIPT

**[0:00 - 0:15] — PROBLEM (15 sec)**

> *"When a production system goes down, engineers spend 2 to 4 hours correlating logs, metrics, and traces across multiple dashboards. Every minute of downtime costs thousands of dollars. Traditional monitoring alerts you — but it doesn't diagnose or act."*

**VISUAL:** Show a simulated alert flooding a Slack channel or monitoring dashboard

---

**[0:15 - 0:40] — ARCHITECTURE (25 sec)**

> *"OpsGuard AI solves this with 4 collaborative agents built on Elastic Agent Builder. Monitor Agent detects anomalies using ES|QL time-series queries. Diagnose Agent correlates logs and searches similar past incidents. Impact Agent calculates business revenue loss. And Commander Agent orchestrates everything, resolves disagreements between agents, and takes action through Elastic Workflows."*

**VISUAL:** Show the architecture diagram from `docs/architecture.md`

---

**[0:40 - 1:15] — DEMO: DETECTION (35 sec)**

> *"Let me show you this in action. I'll ask the Commander Agent to check system health."*

**ACTION:** In Kibana Agent Builder chat:
```
Check system health and report any anomalies across all services
```

> *"The Monitor Agent fires an ES|QL query — STATS average CPU and memory BY service name — and immediately detects payment-service at 92% CPU, 88% memory. This is classified as CRITICAL."*

**VISUAL:** Show ES|QL query output, highlight the anomaly

---

**[1:15 - 2:00] — DEMO: DIAGNOSIS + DISAGREEMENT (45 sec)**

> *"Now the Diagnose Agent investigates. It correlates logs and finds 847 errors in the last 40 minutes with DB_CONN_TIMEOUT codes. It also checks recent deployments — version 2.4.2 was deployed exactly 2 minutes before errors started."*

> *"Here's where it gets interesting. The agent finds TWO possible root causes: Hypothesis A — bad deployment at 87% confidence, and Hypothesis B — database degradation at 42%. It searches past incidents using vector search and finds INC-2026-001 — a nearly identical case where connection pool exhaustion was caused by a config reset."*

> *"The Commander evaluates both hypotheses, confirms deployment timestamp matches error onset, and transparently chooses Hypothesis A."*

**VISUAL:** Show the hypothesis comparison, confidence scores, and similar incident match

---

**[2:00 - 2:30] — DEMO: IMPACT + ACTION (30 sec)**

> *"Impact Agent calculates the business cost: $12,450 per hour in lost revenue, 73% transaction drop, 486 users affected. This is automatically classified as P0-CRITICAL."*

> *"Commander then executes two Elastic Workflows: creates an incident ticket and sends a notification to the ops-critical channel — all in under 2 minutes."*

**VISUAL:** Show business impact numbers, workflow execution

---

**[2:30 - 2:50] — MEASURABLE RESULTS (20 sec)**

> *"The whole process — detection, diagnosis, impact assessment, and action — took 1 minute 42 seconds. The industry average MTTR is 2.5 hours. That's a 97% improvement. More importantly, by resolving faster, we reduced potential revenue loss from $49,800 to under $2,000."*

**VISUAL:** Show before/after comparison metrics on dashboard

---

**[2:50 - 3:00] — CLOSE (10 sec)**

> *"OpsGuard AI — multi-agent autonomous incident response, built on Elastic Agent Builder. 5 ES|QL tools, semantic search, and Elastic Workflows working together. Thank you!"*

**VISUAL:** Show GitHub repo link and @elastic_devs tag

---

### Tips for Recording
1. **Use clean audio** — record in a quiet room, use a good microphone
2. **Show Kibana Agent Builder UI** during the chat interaction
3. **Zoom in** on ES|QL queries and results
4. **Use the dashboard** for visual impact metrics
5. **Keep a smooth pace** — rehearse at least twice before recording
