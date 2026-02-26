/**
 * OpsGuard AI — Dashboard Application
 * Multi-agent incident response demo with auto-play scenario
 * for hackathon demo recording.
 */

// ============================================================
// Configuration & Mock Data
// ============================================================

const SERVICES_HEALTHY = [
    { name: "payment-service", tier: "critical", cpu: 38, memory: 42, status: "healthy" },
    { name: "user-api",        tier: "high",     cpu: 35, memory: 52, status: "healthy" },
    { name: "product-catalog", tier: "high",     cpu: 28, memory: 45, status: "healthy" },
    { name: "notification-svc",tier: "medium",   cpu: 22, memory: 38, status: "healthy" },
    { name: "search-service",  tier: "medium",   cpu: 41, memory: 55, status: "healthy" },
    { name: "auth-service",    tier: "critical", cpu: 38, memory: 48, status: "healthy" },
    { name: "order-processing",tier: "critical", cpu: 43, memory: 51, status: "healthy" },
    { name: "inventory-svc",   tier: "high",     cpu: 31, memory: 44, status: "healthy" },
];

const SERVICES_INCIDENT = [
    { name: "payment-service", tier: "critical", cpu: 92, memory: 88, status: "degraded" },
    { name: "user-api",        tier: "high",     cpu: 35, memory: 52, status: "healthy" },
    { name: "product-catalog", tier: "high",     cpu: 28, memory: 45, status: "healthy" },
    { name: "notification-svc",tier: "medium",   cpu: 22, memory: 38, status: "healthy" },
    { name: "search-service",  tier: "medium",   cpu: 41, memory: 55, status: "healthy" },
    { name: "auth-service",    tier: "critical", cpu: 38, memory: 48, status: "healthy" },
    { name: "order-processing",tier: "critical", cpu: 67, memory: 72, status: "warning" },
    { name: "inventory-svc",   tier: "high",     cpu: 31, memory: 44, status: "healthy" },
];

// SERVICES is the mutable list used by renderServicesGrid
let SERVICES = SERVICES_HEALTHY.map(s => ({ ...s }));

const AGENTS = [
    { id: "monitor",   emoji: "📡", name: "Monitor",   status: "waiting" },
    { id: "diagnose",  emoji: "🔬", name: "Diagnose",  status: "waiting" },
    { id: "impact",    emoji: "💰", name: "Impact",    status: "waiting" },
    { id: "commander", emoji: "🎖️", name: "Commander", status: "waiting" },
];

const TIMELINE_ENTRIES = [
    {
        time: "14:32:15",
        agent: "Monitor",
        content: '<strong>Monitor Agent</strong> — Scanning all services for anomalies...',
        type: "active",
        delay: 500,
    },
    {
        time: "14:32:18",
        agent: "Monitor",
        content: '<strong>ES|QL</strong> <span class="highlight">STATS avg_cpu, max_cpu BY service.name</span> → 8 services scanned',
        type: "completed",
        delay: 2000,
    },
    {
        time: "14:32:19",
        agent: "Monitor",
        content: '🔴 <span class="critical-text">CRITICAL: payment-service</span> — CPU 92%, Memory 88%, Error rate 34%',
        type: "error",
        delay: 1500,
    },
    {
        time: "14:32:20",
        agent: "Monitor",
        content: '🟡 WARNING: order-processing — CPU 67%, cascading failures detected',
        type: "active",
        delay: 1000,
    },
    {
        time: "14:32:22",
        agent: "Diagnose",
        content: '<strong>Diagnose Agent</strong> — Investigating payment-service root cause...',
        type: "active",
        delay: 1500,
    },
    {
        time: "14:32:25",
        agent: "Diagnose",
        content: '<strong>ES|QL</strong> <span class="highlight">correlate_logs_and_errors</span> → 847 errors in last 40min, 12 unique error codes',
        type: "completed",
        delay: 2000,
    },
    {
        time: "14:32:27",
        agent: "Diagnose",
        content: '<strong>ES|QL</strong> <span class="highlight">check_recent_deployments</span> → v2.4.2 deployed at 14:32, error onset at 14:34',
        type: "completed",
        delay: 1500,
    },
    {
        time: "14:32:30",
        agent: "Diagnose",
        content: '<strong>Vector Search</strong> → Found similar incident <span class="highlight">INC-2026-001</span> (connection pool exhaustion, 92% match)',
        type: "completed",
        delay: 2000,
    },
    {
        time: "14:32:33",
        agent: "Diagnose",
        content: '📊 <strong>Hypothesis A (87%)</strong>: Bad deployment v2.4.2 caused DB connection pool exhaustion',
        type: "active",
        delay: 1500,
    },
    {
        time: "14:32:34",
        agent: "Diagnose",
        content: '📊 <strong>Hypothesis B (42%)</strong>: Database performance degradation under load',
        type: "active",
        delay: 1000,
    },
    {
        time: "14:32:36",
        agent: "Impact",
        content: '<strong>Impact Agent</strong> — Calculating business impact...',
        type: "active",
        delay: 1500,
    },
    {
        time: "14:32:38",
        agent: "Impact",
        content: '<strong>ES|QL</strong> <span class="highlight">calculate_business_impact</span> → Revenue loss: <span class="critical-text">$12,450/hour</span>',
        type: "error",
        delay: 2000,
    },
    {
        time: "14:32:39",
        agent: "Impact",
        content: '💰 Priority: <span class="critical-text">P0-CRITICAL</span> — Transaction drop: 73%, Active users: -61%',
        type: "error",
        delay: 1500,
    },
    {
        time: "14:32:42",
        agent: "Commander",
        content: '<strong>Commander Agent</strong> — Evaluating hypotheses and taking action...',
        type: "active",
        delay: 1500,
    },
    {
        time: "14:32:44",
        agent: "Commander",
        content: '⚖️ <strong>Decision:</strong> Choosing <span class="highlight">Hypothesis A (87%)</span> — deployment timestamp matches error onset exactly, confirmed by INC-2026-001 precedent',
        type: "completed",
        delay: 2500,
    },
    {
        time: "14:32:46",
        agent: "Commander",
        content: '📋 <strong>Workflow</strong>: <span class="highlight">create-incident-ticket</span> → Ticket OPS-20260225-143246 created',
        type: "completed",
        delay: 1500,
    },
    {
        time: "14:32:47",
        agent: "Commander",
        content: '📢 <strong>Workflow</strong>: <span class="highlight">notify-team</span> → Alert sent to ops-critical channel',
        type: "completed",
        delay: 1000,
    },
    {
        time: "14:32:48",
        agent: "Commander",
        content: '⚡ <strong>Recommendation:</strong> Rollback to v2.4.1 + increase connection pool to 100',
        type: "completed",
        delay: 1500,
    },
    {
        time: "14:32:50",
        agent: "Commander",
        content: '✅ <strong>Incident Report</strong> generated — Total resolution time: <span class="highlight">1 minute 42 seconds</span> (vs 2.5 hours industry average)',
        type: "completed",
        delay: 2000,
    },
];

// ============================================================
// DOM Elements
// ============================================================
const agentFlowEl       = document.getElementById("agentFlow");
const agentTimelineEl   = document.getElementById("agentTimeline");
const incidentContentEl = document.getElementById("incidentContent");
const servicesGridEl    = document.getElementById("servicesGrid");
const systemStatusPulse = document.getElementById("systemStatusPulse");
const systemStatusText  = document.getElementById("systemStatusText");

// ============================================================
// Render Functions
// ============================================================

function renderAgentFlow() {
    agentFlowEl.innerHTML = "";
    AGENTS.forEach((agent, idx) => {
        const node = document.createElement("div");
        node.className = `agent-node ${agent.status}`;
        node.id = `agent-${agent.id}`;
        node.innerHTML = `
            <span class="agent-emoji">${agent.emoji}</span>
            <span class="agent-name">${agent.name}</span>
            <span class="agent-status-label">${agent.status.toUpperCase()}</span>
            <span class="agent-thinking-dots" aria-hidden="true"><span></span><span></span><span></span></span>
        `;
        agentFlowEl.appendChild(node);

        if (idx < AGENTS.length - 1) {
            const connector = document.createElement("div");
            connector.className = "agent-connector";
            connector.id = `connector-${idx}`;
            connector.textContent = "→";
            agentFlowEl.appendChild(connector);
        }
    });
}

function renderServicesGrid(serviceList) {
    const list = serviceList || SERVICES;
    servicesGridEl.innerHTML = "";
    list.forEach(service => {
        const tile = document.createElement("div");
        tile.className = `service-tile ${service.status}`;
        tile.innerHTML = `
            <div class="service-dot"></div>
            <span class="service-name">${service.name}</span>
            <span class="service-cpu">CPU ${service.cpu}%</span>
        `;
        servicesGridEl.appendChild(tile);
    });
}

function renderIncidentReportEmpty() {
    incidentContentEl.innerHTML = `
        <div class="incident-placeholder">
            <div class="placeholder-icon">📋</div>
            <p class="placeholder-title">No Active Incidents</p>
            <p class="placeholder-detail">All systems are operating normally.<br>Monitor agents are standing by.</p>
        </div>
    `;
}

function renderIncidentReportPartial(phase) {
    // phase: "detecting" | "diagnosing" | "impact" | "actions"
    let html = `
        <div class="incident-section">
            <span class="incident-section-title">📋 Incident Details</span>
            <div class="incident-field">
                <span class="incident-field-label">Incident ID</span>
                <span class="incident-field-value">OPS-20260225-143246</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Severity</span>
                <span class="incident-field-value" style="color: var(--critical)">CRITICAL</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Service</span>
                <span class="incident-field-value">payment-service</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Detected At</span>
                <span class="incident-field-value">14:32:19 UTC</span>
            </div>
        </div>
    `;

    if (phase === "diagnosing" || phase === "impact" || phase === "actions") {
        html += `
        <div class="incident-section">
            <span class="incident-section-title">🔬 Root Cause Analysis</span>
            <div class="incident-field analyzing-field">
                <span class="incident-field-label">Status</span>
                <span class="incident-field-value" style="color: var(--elastic-teal)">
                    Diagnose Agent analyzing
                    <span class="inline-dots"><span>.</span><span>.</span><span>.</span></span>
                </span>
            </div>
        </div>`;
    }

    if (phase === "impact" || phase === "actions") {
        html += `
        <div class="incident-section">
            <span class="incident-section-title">🔬 Root Cause Analysis</span>
            <div class="hypothesis-card primary">
                <span class="hypothesis-title">✅ Hypothesis A — Bad Deployment</span>
                <span class="hypothesis-confidence">87% confidence</span>
                <span class="hypothesis-evidence">
                    Deployment v2.4.2 at 14:32 matches error onset at 14:34.
                    DB_CONN_TIMEOUT errors match INC-2026-001 pattern.
                </span>
            </div>
        </div>
        <div class="incident-section">
            <span class="incident-section-title">💰 Business Impact</span>
            <div class="incident-field">
                <span class="incident-field-label">Revenue Loss</span>
                <span class="incident-field-value" style="color: var(--critical)">$12,450/hr</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Transaction Drop</span>
                <span class="incident-field-value" style="color: var(--high)">-73%</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Users Affected</span>
                <span class="incident-field-value">486 active users</span>
            </div>
        </div>`;
    }

    incidentContentEl.innerHTML = html;
}

function renderIncidentReport() {
    incidentContentEl.innerHTML = `
        <div class="incident-section">
            <span class="incident-section-title">📋 Incident Details</span>
            <div class="incident-field">
                <span class="incident-field-label">Incident ID</span>
                <span class="incident-field-value">OPS-20260225-143246</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Severity</span>
                <span class="incident-field-value" style="color: var(--critical)">CRITICAL</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Service</span>
                <span class="incident-field-value">payment-service</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Detected At</span>
                <span class="incident-field-value">14:32:19 UTC</span>
            </div>
        </div>

        <div class="incident-section">
            <span class="incident-section-title">🔬 Root Cause Analysis</span>
            <div class="hypothesis-card primary">
                <span class="hypothesis-title">✅ Hypothesis A — Bad Deployment</span>
                <span class="hypothesis-confidence">87% confidence</span>
                <span class="hypothesis-evidence">
                    Deployment v2.4.2 at 14:32 matches error onset at 14:34.
                    DB_CONN_TIMEOUT errors match INC-2026-001 pattern
                    (connection pool exhaustion after config reset).
                </span>
            </div>
            <div class="hypothesis-card secondary">
                <span class="hypothesis-title">❌ Hypothesis B — Database Load</span>
                <span class="hypothesis-confidence">42% confidence — rejected</span>
                <span class="hypothesis-evidence">
                    DB metrics show elevated queries but timing doesn't match.
                    Load increase started AFTER errors, not before.
                </span>
            </div>
        </div>

        <div class="incident-section">
            <span class="incident-section-title">💰 Business Impact</span>
            <div class="incident-field">
                <span class="incident-field-label">Revenue Loss</span>
                <span class="incident-field-value" style="color: var(--critical)">$12,450/hr</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Transaction Drop</span>
                <span class="incident-field-value" style="color: var(--high)">-73%</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Users Affected</span>
                <span class="incident-field-value">486 active users</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Projected 4hr Loss</span>
                <span class="incident-field-value" style="color: var(--critical)">$49,800</span>
            </div>
        </div>

        <div class="incident-section">
            <span class="incident-section-title">⚡ Actions Taken</span>
            <div class="incident-field">
                <span class="incident-field-label">✅ Ticket Created</span>
                <span class="incident-field-value" style="color: var(--healthy)">OPS-20260225</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">✅ Team Notified</span>
                <span class="incident-field-value" style="color: var(--healthy)">ops-critical</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">⏳ Recommended</span>
                <span class="incident-field-value" style="color: var(--elastic-teal)">Rollback v2.4.1</span>
            </div>
        </div>

        <div class="incident-section">
            <span class="incident-section-title">⏱️ Resolution</span>
            <div class="incident-field mttr-highlight">
                <span class="incident-field-label">MTTR</span>
                <span class="incident-field-value mttr-big">1m 42s</span>
            </div>
            <div class="incident-field">
                <span class="incident-field-label">Industry Average</span>
                <span class="incident-field-value" style="color: var(--text-dim)">2.5 hours</span>
            </div>
        </div>
    `;
}

// ============================================================
// Agent State Helpers
// ============================================================

function updateAgentStatus(agentId, status) {
    const agentEl = document.getElementById(`agent-${agentId}`);
    if (!agentEl) return;
    agentEl.className = `agent-node ${status}`;
    agentEl.querySelector(".agent-status-label").textContent = status.toUpperCase();

    // Show or hide thinking dots
    const dots = agentEl.querySelector(".agent-thinking-dots");
    if (dots) {
        dots.style.display = (status === "active") ? "flex" : "none";
    }
}

function updateConnector(index, status) {
    const connector = document.getElementById(`connector-${index}`);
    if (connector) {
        connector.className = `agent-connector ${status}`;
    }
}

// ============================================================
// Timeline Renderer
// ============================================================

function addTimelineEntry(entry) {
    const div = document.createElement("div");
    div.className = `timeline-entry ${entry.type}`;
    div.innerHTML = `
        <span class="timeline-time">${entry.time}</span>
        <span class="timeline-content">${entry.content}</span>
    `;
    agentTimelineEl.appendChild(div);
    agentTimelineEl.scrollTop = agentTimelineEl.scrollHeight;
}

// ============================================================
// Detailed Agent Timeline Animation
// ============================================================

let currentEntryIndex = 0;
let isAnimating = false;
let timelineTimeoutId = null;

function runDemoStep() {
    if (currentEntryIndex >= TIMELINE_ENTRIES.length) {
        isAnimating = false;
        // All agents completed
        AGENTS.forEach(a => updateAgentStatus(a.id, "completed"));
        return;
    }

    const entry = TIMELINE_ENTRIES[currentEntryIndex];

    switch (entry.agent) {
        case "Monitor":
            updateAgentStatus("monitor", currentEntryIndex <= 3 ? "active" : "completed");
            break;
        case "Diagnose":
            updateAgentStatus("monitor", "completed");
            updateConnector(0, "completed");
            updateAgentStatus("diagnose", "active");
            break;
        case "Impact":
            updateAgentStatus("diagnose", "completed");
            updateConnector(1, "completed");
            updateAgentStatus("impact", "active");
            break;
        case "Commander":
            updateAgentStatus("impact", "completed");
            updateConnector(2, "completed");
            if (currentEntryIndex >= TIMELINE_ENTRIES.length - 2) {
                updateAgentStatus("commander", "completed");
            } else {
                updateAgentStatus("commander", "active");
            }
            break;
    }

    addTimelineEntry(entry);
    currentEntryIndex++;

    const nextDelay = entry.delay || 1500;
    timelineTimeoutId = setTimeout(runDemoStep, nextDelay);
}

function startTimelineAnimation() {
    if (isAnimating) return;
    isAnimating = true;
    currentEntryIndex = 0;
    agentTimelineEl.innerHTML = "";

    AGENTS.forEach(a => updateAgentStatus(a.id, "waiting"));
    for (let i = 0; i < 3; i++) updateConnector(i, "");

    timelineTimeoutId = setTimeout(runDemoStep, 300);
}

function stopTimelineAnimation() {
    if (timelineTimeoutId) {
        clearTimeout(timelineTimeoutId);
        timelineTimeoutId = null;
    }
    isAnimating = false;
}

// ============================================================
// Demo Auto-Play Scenario Orchestrator
// ============================================================
// Scenario phases mapped to wall-clock offsets (in milliseconds):
//   0ms   — Phase 0: All systems green, idle state
//   3000ms — Phase 1: payment-service anomaly detected (CPU 92%, pulsing red)
//   5000ms — Phase 2: Incident created, Diagnose Agent analyzing
//   7000ms — Phase 3: Root cause found, business impact shown ($12,450/hr)
//   9000ms — Phase 4: Actions taken (ticket, team notified)
//   10000ms — Phase 5: Incident report complete, MTTR shown as 1m 42s
//
// After 10s the demo holds for a pause, then the 30-second loop restarts.

let autoPlayLoopId   = null;
let scenarioTimeouts = [];

function clearScenarioTimeouts() {
    scenarioTimeouts.forEach(id => clearTimeout(id));
    scenarioTimeouts = [];
}

function scheduleScenario(ms, fn) {
    const id = setTimeout(fn, ms);
    scenarioTimeouts.push(id);
}

/**
 * Reset the entire dashboard to its "all green / idle" state.
 * Called at Phase 0 and at the start of each loop iteration.
 */
function resetDashboardToIdle() {
    stopTimelineAnimation();
    clearScenarioTimeouts();

    // Reset service tiles to all-healthy
    SERVICES = SERVICES_HEALTHY.map(s => ({ ...s }));
    renderServicesGrid();

    // Reset status cards
    document.getElementById("healthyCount").textContent = "8/8";
    document.getElementById("serviceDetail").textContent = "All services nominal";
    document.getElementById("cardServices").setAttribute("data-status", "healthy");

    document.getElementById("incidentCount").textContent = "0";
    document.getElementById("incidentDetail").textContent = "No active incidents";
    document.getElementById("cardIncidents").setAttribute("data-status", "healthy");

    document.getElementById("revenueImpact").textContent = "$0/hr";
    document.getElementById("revenueImpact").style.color = "";
    document.getElementById("revenueDetail").textContent = "No revenue impact";
    document.getElementById("cardRevenue").setAttribute("data-status", "healthy");

    document.getElementById("mttrValue").textContent = "—";
    document.getElementById("mttrDetail").textContent = "Awaiting incident data";

    // Reset system status bar
    systemStatusPulse.className = "status-pulse";
    systemStatusText.textContent = "System Monitoring Active";
    systemStatusText.style.color = "";

    // Reset agent flow
    AGENTS.forEach(a => updateAgentStatus(a.id, "waiting"));
    for (let i = 0; i < 3; i++) updateConnector(i, "");
    agentTimelineEl.innerHTML = "";

    // Reset incident panel to empty
    renderIncidentReportEmpty();
}

/**
 * Run the full 10-second scenario narrative.
 * Schedules all phase transitions from the current moment.
 */
function runScenario() {
    // --- Phase 0 (0s): All green, agents standing by ---
    resetDashboardToIdle();

    // ---- Phase 1 (3s): Anomaly detected ----
    scheduleScenario(3000, () => {
        SERVICES = SERVICES_INCIDENT.map(s => ({ ...s }));
        renderServicesGrid();

        systemStatusPulse.className = "status-pulse warning";
        systemStatusText.textContent = "Anomaly Detected — Agents Responding";
        systemStatusText.style.color = "var(--critical)";

        document.getElementById("healthyCount").textContent = "6/8";
        document.getElementById("serviceDetail").textContent = "1 degraded, 1 warning";
        document.getElementById("cardServices").setAttribute("data-status", "warning");
    });

    // ---- Phase 2 (5s): Incident created, Diagnose Agent kicks off ----
    scheduleScenario(5000, () => {
        document.getElementById("incidentCount").textContent = "1";
        document.getElementById("incidentDetail").textContent = "CRITICAL: payment-service";
        document.getElementById("cardIncidents").setAttribute("data-status", "warning");

        renderIncidentReportPartial("detecting");

        // Start the detailed agent timeline animation (runs independently)
        startTimelineAnimation();
    });

    // ---- Phase 3 (7s): Root cause + business impact revealed ----
    scheduleScenario(7000, () => {
        renderIncidentReportPartial("impact");

        document.getElementById("revenueImpact").textContent = "-$12,450/hr";
        document.getElementById("revenueImpact").style.color = "var(--critical)";
        document.getElementById("revenueDetail").textContent = "Projected 4hr loss: $49,800";
        document.getElementById("cardRevenue").setAttribute("data-status", "impact");
    });

    // ---- Phase 4 (9s): Actions taken ----
    scheduleScenario(9000, () => {
        renderIncidentReportPartial("actions");
        systemStatusText.textContent = "Commander Agent — Executing Response Plan";
    });

    // ---- Phase 5 (10s): Full report, MTTR displayed ----
    scheduleScenario(10000, () => {
        renderIncidentReport();

        document.getElementById("mttrValue").textContent = "1m 42s";
        document.getElementById("mttrDetail").textContent = "vs 2.5hr industry avg";

        systemStatusPulse.className = "status-pulse";
        systemStatusText.textContent = "Incident Resolved — Report Generated";
        systemStatusText.style.color = "var(--elastic-teal)";
    });
}

// ============================================================
// Public: Start / Restart Demo
// ============================================================

/**
 * Start or restart the auto-play scenario.
 * Cancels any running scenario and loop, then begins fresh.
 */
function startDemo() {
    // Cancel existing loop
    if (autoPlayLoopId) {
        clearInterval(autoPlayLoopId);
        autoPlayLoopId = null;
    }
    clearScenarioTimeouts();
    stopTimelineAnimation();

    // Run the scenario immediately
    runScenario();

    // Schedule looping: 30s after page load the whole thing repeats
    // The scenario itself takes ~10s; the remaining 20s is a hold on the final state.
    autoPlayLoopId = setInterval(() => {
        runScenario();
    }, 30000);
}

// ============================================================
// Chart Drawing (Canvas-based, no external dependencies)
// ============================================================

function drawMetricsChart() {
    const canvas = document.getElementById("cpuChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width  * 2;
    canvas.height = rect.height * 2;
    canvas.style.width  = rect.width  + "px";
    canvas.style.height = rect.height + "px";
    ctx.scale(2, 2);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Reproducible data: normal baseline → incident spike after point 38
    const points = 60;
    const normalData   = [];
    const incidentData = [];

    // Seeded pseudo-random for visual consistency across redraws
    let seed = 42;
    function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

    for (let i = 0; i < points; i++) {
        if (i < 38) {
            normalData.push(25 + rand() * 15);
            incidentData.push(40 + rand() * 10);
        } else {
            const severity = (i - 38) / (points - 38);
            normalData.push(25 + rand() * 15 + severity * 65);
            incidentData.push(40 + rand() * 10 + severity * 45);
        }
    }

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = "rgba(136, 153, 170, 0.6)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ["100%", "75%", "50%", "25%", "0%"].forEach((label, i) => {
        const y = padding.top + (chartH / 4) * i;
        ctx.fillText(label, padding.left - 8, y + 3);
    });

    // Incident zone shading
    const incidentStartX = padding.left + (38 / points) * chartW;
    ctx.fillStyle = "rgba(255, 77, 106, 0.06)";
    ctx.fillRect(incidentStartX, padding.top, w - padding.right - incidentStartX, chartH);

    // Incident marker line
    ctx.strokeStyle = "rgba(255, 77, 106, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(incidentStartX, padding.top);
    ctx.lineTo(incidentStartX, padding.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Deployment label
    ctx.fillStyle = "rgba(255, 77, 106, 0.7)";
    ctx.font = "9px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("▼ v2.4.2 deployed", incidentStartX + 4, padding.top + 12);

    // Draw a line + area fill
    function drawLine(data, color, fillColor) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        data.forEach((val, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartW;
            const y = padding.top + chartH - (val / 100) * chartH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        const lastX = padding.left + chartW;
        ctx.lineTo(lastX, padding.top + chartH);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
    }

    // Memory (behind CPU)
    drawLine(incidentData, "rgba(255, 140, 66, 0.8)",  "rgba(255, 140, 66, 0.05)");
    // CPU
    drawLine(normalData,   "rgba(0, 191, 179, 1)",      "rgba(0, 191, 179, 0.08)");

    // Legend
    ctx.font = "10px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0, 191, 179, 1)";
    ctx.fillRect(w - 140, padding.top, 10, 3);
    ctx.fillStyle = "rgba(136, 153, 170, 0.8)";
    ctx.fillText("CPU Usage", w - 126, padding.top + 5);
    ctx.fillStyle = "rgba(255, 140, 66, 0.8)";
    ctx.fillRect(w - 140, padding.top + 16, 10, 3);
    ctx.fillStyle = "rgba(136, 153, 170, 0.8)";
    ctx.fillText("Memory", w - 126, padding.top + 21);

    // X-axis labels
    ctx.fillStyle = "rgba(136, 153, 170, 0.5)";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ["-60m", "-45m", "-30m", "-15m", "now"].forEach((label, i) => {
        const x = padding.left + (i / 4) * chartW;
        ctx.fillText(label, x, h - 8);
    });
}

// ============================================================
// Event Handlers
// ============================================================

document.getElementById("btnScanNow").addEventListener("click", () => {
    startDemo();
});

document.getElementById("btnRefresh").addEventListener("click", () => {
    if (typeof refreshLiveData === "function" && typeof ES_CONFIG !== "undefined" && ES_CONFIG.url) {
        refreshLiveData();
    }
    startDemo();
});

document.querySelectorAll(".time-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        drawMetricsChart();
    });
});

// ============================================================
// Initialize
// ============================================================

function init() {
    renderAgentFlow();
    renderServicesGrid(SERVICES_HEALTHY);
    renderIncidentReportEmpty();
    drawMetricsChart();

    // Try live Elasticsearch first, fall back to demo mode
    if (typeof ES_CONFIG !== "undefined" && ES_CONFIG.url) {
        console.log("Attempting live Elasticsearch connection...");
        refreshLiveData().then(() => {
            console.log("Live data loaded. Demo auto-play will still run for agent flow.");
        });
    } else {
        console.log("Running in demo mode.");
        console.log('  To connect to Elasticsearch: configureES("https://your-url.es.cloud", "your-api-key")');
    }

    // Kick off auto-play scenario after a brief moment so the page
    // has fully painted before animation starts.
    setTimeout(startDemo, 800);
}

// Redraw chart on window resize
window.addEventListener("resize", drawMetricsChart);

// Boot
document.addEventListener("DOMContentLoaded", init);
