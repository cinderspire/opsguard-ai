/**
 * OpsGuard AI — Elasticsearch Configuration
 * 
 * IMPORTANT: Update these values with your Elastic Cloud details.
 * Run setup: Open index.html, press F12 console, type: configureES('YOUR_URL', 'YOUR_KEY')
 */
const ES_CONFIG = {
    // Your Elasticsearch endpoint URL
    // Format: https://your-project.es.region.aws.elastic.cloud
    url: localStorage.getItem('opsguard_es_url') || '',

    // Your API Key
    apiKey: localStorage.getItem('opsguard_api_key') || '',

    // Index names
    indices: {
        logs: 'logs-opsguard-incidents',
        metrics: 'metrics-opsguard-system',
        incidents: 'incidents-opsguard-history',
        business: 'business-opsguard-metrics',
    }
};

/**
 * Configure Elasticsearch connection (call from browser console)
 * Usage: configureES('https://your-url.es.cloud', 'your-api-key')
 */
function configureES(url, apiKey) {
    localStorage.setItem('opsguard_es_url', url);
    localStorage.setItem('opsguard_api_key', apiKey);
    ES_CONFIG.url = url;
    ES_CONFIG.apiKey = apiKey;
    console.log('✅ Elasticsearch configured:', url);
    console.log('🔄 Refreshing data...');
    refreshLiveData();
}

/**
 * Make authenticated request to Elasticsearch
 */
async function esQuery(path, body = null) {
    if (!ES_CONFIG.url || !ES_CONFIG.apiKey) {
        console.warn('⚠️ ES not configured. Run: configureES(url, apiKey)');
        return null;
    }

    const options = {
        method: body ? 'POST' : 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${ES_CONFIG.apiKey}`,
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${ES_CONFIG.url}${path}`, options);
        if (!response.ok) {
            console.error(`ES Error ${response.status}:`, await response.text());
            return null;
        }
        return await response.json();
    } catch (err) {
        console.error('ES Connection Error:', err.message);
        return null;
    }
}

/**
 * Run ES|QL query
 */
async function esqlQuery(query) {
    return esQuery('/_query', {
        query: query,
        format: 'json'
    });
}

/**
 * Fetch live data from Elasticsearch and update dashboard
 */
async function refreshLiveData() {
    if (!ES_CONFIG.url) return;

    const statusEl = document.getElementById('dataSourceBadge');
    if (statusEl) {
        statusEl.textContent = 'LOADING...';
        statusEl.className = 'badge badge-loading';
    }

    try {
        // 1. Get document counts per index
        const counts = await esQuery('/_cat/indices/opsguard*?format=json&h=index,docs.count,store.size');
        if (counts) {
            console.log('📊 Index counts:', counts);
            updateIndexCounts(counts);
        }

        // 2. Get service health via ES|QL
        const healthData = await esqlQuery(`
            FROM metrics-opsguard-system
            | STATS avg_cpu = AVG(system.cpu.usage_percent), 
                    avg_memory = AVG(system.memory.usage_percent),
                    max_cpu = MAX(system.cpu.usage_percent)
              BY service.name
            | SORT max_cpu DESC
        `);
        if (healthData) {
            console.log('🖥️ Service health:', healthData);
            updateServiceHealth(healthData);
        }

        // 3. Get error distribution
        const errorData = await esqlQuery(`
            FROM logs-opsguard-incidents
            | WHERE log.level IN ("ERROR", "CRITICAL")
            | STATS error_count = COUNT(*), 
                    unique_codes = COUNT_DISTINCT(error.code)
              BY service.name
            | SORT error_count DESC
        `);
        if (errorData) {
            console.log('🔴 Error distribution:', errorData);
            updateErrorCounts(errorData);
        }

        // 4. Get business impact
        const bizData = await esqlQuery(`
            FROM business-opsguard-metrics
            | STATS total_revenue = SUM(revenue.amount_usd),
                    avg_baseline = AVG(revenue.baseline_hourly_usd),
                    total_failures = SUM(transactions.failure_count),
                    total_txns = SUM(transactions.count),
                    avg_users = AVG(active_users)
              BY service.name
            | SORT total_failures DESC
        `);
        if (bizData) {
            console.log('💰 Business metrics:', bizData);
            updateBusinessMetrics(bizData);
        }

        if (statusEl) {
            statusEl.textContent = 'LIVE DATA';
            statusEl.className = 'badge badge-live';
        }

        console.log('✅ Dashboard updated with live Elasticsearch data');

    } catch (error) {
        console.error('❌ Failed to refresh data:', error);
        if (statusEl) {
            statusEl.textContent = 'DEMO MODE';
            statusEl.className = 'badge badge-demo';
        }
    }
}

/**
 * Update dashboard with real index counts
 */
function updateIndexCounts(counts) {
    let totalDocs = 0;
    counts.forEach(idx => {
        totalDocs += parseInt(idx['docs.count'] || 0);
    });

    const countEl = document.getElementById('totalDocs');
    if (countEl) countEl.textContent = totalDocs.toLocaleString();
}

/**
 * Update service health grid with real ES|QL data
 */
function updateServiceHealth(data) {
    if (!data || !data.values) return;

    const grid = document.getElementById('servicesGrid');
    if (!grid) return;

    grid.innerHTML = '';

    data.values.forEach(row => {
        const serviceName = row[0];
        const avgCpu = Math.round(row[1]);
        const avgMemory = Math.round(row[2]);
        const maxCpu = Math.round(row[3]);

        let status = 'healthy';
        if (maxCpu > 85) status = 'degraded';
        else if (maxCpu > 65) status = 'warning';

        const tile = document.createElement('div');
        tile.className = `service-tile ${status}`;
        tile.innerHTML = `
            <div class="service-dot"></div>
            <span class="service-name">${serviceName}</span>
            <span class="service-cpu">CPU ${avgCpu}% | Mem ${avgMemory}%</span>
        `;
        grid.appendChild(tile);
    });
}

/**
 * Update error counts from real data
 */
function updateErrorCounts(data) {
    if (!data || !data.values) return;

    let totalErrors = 0;
    let criticalService = '';
    let maxErrors = 0;

    data.values.forEach(row => {
        const count = row[1];
        totalErrors += count;
        if (count > maxErrors) {
            maxErrors = count;
            criticalService = row[0];
        }
    });

    const incidentDetailEl = document.getElementById('incidentDetail');
    if (incidentDetailEl && criticalService) {
        incidentDetailEl.textContent = `CRITICAL: ${criticalService} (${maxErrors} errors)`;
    }
}

/**
 * Update business metrics from real data
 */
function updateBusinessMetrics(data) {
    if (!data || !data.values) return;

    let totalRevenue = 0;
    let totalBaseline = 0;
    let totalFailures = 0;
    let totalTxns = 0;

    data.values.forEach(row => {
        totalRevenue += row[1] || 0;
        totalBaseline += row[2] || 0;
        totalFailures += row[3] || 0;
        totalTxns += row[4] || 0;
    });

    const hourlyLoss = Math.round(totalBaseline - (totalRevenue * 60 / data.values.length));
    const failureRate = totalTxns > 0 ? Math.round(totalFailures * 100 / totalTxns) : 0;

    const revenueEl = document.getElementById('revenueImpact');
    if (revenueEl && hourlyLoss > 0) {
        revenueEl.textContent = `-$${hourlyLoss.toLocaleString()}/hr`;
    }

    const revenueDetailEl = document.getElementById('revenueDetail');
    if (revenueDetailEl && hourlyLoss > 0) {
        revenueDetailEl.textContent = `Projected 4hr loss: $${(hourlyLoss * 4).toLocaleString()}`;
    }
}

// Auto-refresh every 30 seconds when connected
setInterval(() => {
    if (ES_CONFIG.url) refreshLiveData();
}, 30000);
