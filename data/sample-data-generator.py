#!/usr/bin/env python3
"""
OpsGuard AI — Sample Data Generator
Generates realistic production data for demonstration purposes.

Simulates:
- Normal system operation with baseline metrics
- An incident scenario (deployment-caused API degradation)
- Historical incidents for vector search
- Business metrics tied to service health

Usage:
  python3 sample-data-generator.py --es-url <URL> --api-key <KEY>
  python3 sample-data-generator.py --output-dir ./data  # JSON files only
"""

import json
import random
import argparse
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ============================================================
# Configuration
# ============================================================
SERVICES = [
    {"name": "payment-service", "tier": "critical", "baseline_hourly_rev": 15000},
    {"name": "user-api", "tier": "high", "baseline_hourly_rev": 5000},
    {"name": "product-catalog", "tier": "high", "baseline_hourly_rev": 3000},
    {"name": "notification-service", "tier": "medium", "baseline_hourly_rev": 500},
    {"name": "search-service", "tier": "medium", "baseline_hourly_rev": 2000},
    {"name": "auth-service", "tier": "critical", "baseline_hourly_rev": 8000},
    {"name": "order-processing", "tier": "critical", "baseline_hourly_rev": 12000},
    {"name": "inventory-service", "tier": "high", "baseline_hourly_rev": 4000},
]

HOSTS = [
    {"name": "prod-web-01", "ip": "10.0.1.10", "region": "us-east-1", "lat": 39.0438, "lon": -77.4874},
    {"name": "prod-web-02", "ip": "10.0.1.11", "region": "us-east-1", "lat": 39.0438, "lon": -77.4874},
    {"name": "prod-api-01", "ip": "10.0.2.10", "region": "us-west-2", "lat": 45.8399, "lon": -119.7006},
    {"name": "prod-api-02", "ip": "10.0.2.11", "region": "us-west-2", "lat": 45.8399, "lon": -119.7006},
    {"name": "prod-db-01", "ip": "10.0.3.10", "region": "eu-west-1", "lat": 53.3331, "lon": -6.2489},
    {"name": "prod-worker-01", "ip": "10.0.4.10", "region": "us-east-1", "lat": 39.0438, "lon": -77.4874},
]

DEPLOYMENTS = [
    {"version": "v2.4.1", "timestamp": None, "status": "stable"},
    {"version": "v2.4.2", "timestamp": None, "status": "problematic"},  # The bad deploy
    {"version": "v2.4.0", "timestamp": None, "status": "stable"},
]

ERROR_CODES = [
    "DB_CONN_TIMEOUT", "DB_QUERY_FAILED", "REDIS_UNAVAILABLE",
    "HTTP_502_BAD_GATEWAY", "HTTP_503_SERVICE_UNAVAILABLE",
    "HTTP_504_GATEWAY_TIMEOUT", "OOM_KILLED", "DISK_FULL",
    "SSL_HANDSHAKE_FAILED", "DNS_RESOLUTION_FAILED",
    "CONNECTION_POOL_EXHAUSTED", "RATE_LIMIT_EXCEEDED",
]

# Log message templates
LOG_MESSAGES = {
    "normal": [
        "Request processed successfully in {time}ms",
        "Health check passed for {service}",
        "Connection pool: {active}/{max} active connections",
        "Cache hit ratio: {ratio}%",
        "User {user_id} authenticated successfully",
        "Order {order_id} processed and confirmed",
    ],
    "warning": [
        "Slow query detected: {time}ms (threshold: 500ms)",
        "Connection pool nearing capacity: {active}/{max}",
        "Memory usage elevated: {usage}%",
        "Retry attempt {attempt}/3 for downstream call to {service}",
        "Response time degradation detected for {endpoint}",
    ],
    "error": [
        "Failed to connect to database: {error_code} after {retries} retries",
        "Service {service} returned HTTP {status}: {error_code}",
        "Connection pool exhausted for {service}: {error_code}",
        "Request timeout after {time}ms for {endpoint}: {error_code}",
        "Out of memory: container {container} killed: {error_code}",
        "Disk write failed on {host}: {error_code}",
    ],
    "critical": [
        "CRITICAL: Service {service} is DOWN — {error_code}",
        "CRITICAL: Database primary failover detected: {error_code}",
        "CRITICAL: Payment processing halted: {error_code}",
        "CRITICAL: Authentication service unresponsive: {error_code}",
    ],
}

URL_PATHS = [
    "/api/v1/payments", "/api/v1/users", "/api/v1/orders",
    "/api/v1/products", "/api/v1/auth/login", "/api/v1/search",
    "/api/v1/notifications", "/api/v1/inventory", "/health",
]

# ============================================================
# Data Generation
# ============================================================

def generate_timestamp(base_time, offset_minutes=0, jitter_seconds=30):
    """Generate a timestamp with optional jitter."""
    ts = base_time + timedelta(minutes=offset_minutes)
    ts += timedelta(seconds=random.randint(-jitter_seconds, jitter_seconds))
    return ts.isoformat()


def generate_normal_metrics(timestamp, service, host):
    """Generate normal system metrics."""
    return {
        "@timestamp": timestamp,
        "service.name": service["name"],
        "service.environment": "production",
        "host.name": host["name"],
        "host.ip": host["ip"],
        "system.cpu.usage_percent": round(random.uniform(15, 45), 2),
        "system.memory.usage_percent": round(random.uniform(40, 65), 2),
        "system.memory.used_bytes": random.randint(2_000_000_000, 6_000_000_000),
        "system.memory.total_bytes": 8_000_000_000,
        "system.disk.read_bytes_per_sec": round(random.uniform(1000, 50000), 2),
        "system.disk.write_bytes_per_sec": round(random.uniform(500, 30000), 2),
        "system.disk.usage_percent": round(random.uniform(30, 60), 2),
        "system.load.1m": round(random.uniform(0.5, 2.0), 2),
        "system.load.5m": round(random.uniform(0.5, 1.8), 2),
        "system.load.15m": round(random.uniform(0.5, 1.5), 2),
        "network.bytes_in": random.randint(100_000, 500_000),
        "network.bytes_out": random.randint(200_000, 800_000),
        "network.connections_active": random.randint(50, 200),
        "container.id": f"ctr-{host['name']}-{service['name'][:4]}",
        "container.cpu.usage_percent": round(random.uniform(10, 40), 2),
        "container.memory.usage_percent": round(random.uniform(35, 60), 2),
        "kubernetes.pod.name": f"{service['name']}-{random.choice(['abc12', 'def34', 'ghi56'])}",
        "kubernetes.node.name": host["name"],
        "geo.location": {"lat": host["lat"], "lon": host["lon"]},
        "geo.region": host["region"],
    }


def generate_incident_metrics(timestamp, service, host, severity_factor=1.0):
    """Generate degraded system metrics during an incident."""
    base = generate_normal_metrics(timestamp, service, host)
    base["system.cpu.usage_percent"] = round(min(99, 70 + random.uniform(0, 25) * severity_factor), 2)
    base["system.memory.usage_percent"] = round(min(98, 75 + random.uniform(0, 20) * severity_factor), 2)
    base["system.load.1m"] = round(5.0 + random.uniform(0, 10) * severity_factor, 2)
    base["system.load.5m"] = round(4.0 + random.uniform(0, 8) * severity_factor, 2)
    base["network.connections_active"] = random.randint(400, 900)
    base["container.cpu.usage_percent"] = round(min(99, 65 + random.uniform(0, 30) * severity_factor), 2)
    base["container.memory.usage_percent"] = round(min(98, 70 + random.uniform(0, 25) * severity_factor), 2)
    return base


def generate_normal_log(timestamp, service, host, deployment_version):
    """Generate a normal log entry."""
    return {
        "@timestamp": timestamp,
        "service.name": service["name"],
        "service.environment": "production",
        "log.level": random.choice(["INFO", "INFO", "INFO", "DEBUG"]),
        "message": random.choice(LOG_MESSAGES["normal"]).format(
            time=random.randint(10, 200),
            service=service["name"],
            active=random.randint(10, 50),
            max=100,
            ratio=random.randint(80, 99),
            user_id=f"usr-{random.randint(1000, 9999)}",
            order_id=f"ord-{random.randint(100000, 999999)}",
        ),
        "host.name": host["name"],
        "host.ip": host["ip"],
        "http.response.status_code": 200,
        "http.request.method": random.choice(["GET", "POST", "PUT"]),
        "url.path": random.choice(URL_PATHS),
        "response_time_ms": round(random.uniform(20, 300), 2),
        "trace.id": f"trace-{random.randint(100000, 999999)}",
        "deployment.version": deployment_version,
        "geo.location": {"lat": host["lat"], "lon": host["lon"]},
        "geo.region": host["region"],
        "container.id": f"ctr-{host['name']}-{service['name'][:4]}",
        "kubernetes.pod.name": f"{service['name']}-{random.choice(['abc12', 'def34'])}",
    }


def generate_error_log(timestamp, service, host, deployment_version, severity="ERROR"):
    """Generate an error log entry."""
    error_code = random.choice(ERROR_CODES)
    templates = LOG_MESSAGES["error"] if severity == "ERROR" else LOG_MESSAGES["critical"]
    return {
        "@timestamp": timestamp,
        "service.name": service["name"],
        "service.environment": "production",
        "log.level": severity,
        "message": random.choice(templates).format(
            error_code=error_code,
            service=service["name"],
            status=random.choice([500, 502, 503, 504]),
            retries=random.randint(1, 5),
            time=random.randint(5000, 30000),
            endpoint=random.choice(URL_PATHS),
            container=f"ctr-{host['name']}",
            host=host["name"],
        ),
        "host.name": host["name"],
        "host.ip": host["ip"],
        "error.code": error_code,
        "error.message": f"Service degradation detected: {error_code}",
        "http.response.status_code": random.choice([500, 502, 503, 504]),
        "http.request.method": random.choice(["GET", "POST"]),
        "url.path": random.choice(URL_PATHS),
        "response_time_ms": round(random.uniform(3000, 30000), 2),
        "trace.id": f"trace-{random.randint(100000, 999999)}",
        "deployment.version": deployment_version,
        "deployment.timestamp": timestamp,
        "geo.location": {"lat": host["lat"], "lon": host["lon"]},
        "geo.region": host["region"],
        "container.id": f"ctr-{host['name']}-{service['name'][:4]}",
        "kubernetes.pod.name": f"{service['name']}-{random.choice(['abc12', 'def34'])}",
    }


def generate_business_metrics(timestamp, service, health_factor=1.0):
    """Generate business metrics. health_factor: 1.0=healthy, 0.3=severe incident."""
    baseline = service["baseline_hourly_rev"]
    txn_count = int(random.randint(500, 1500) * health_factor)
    success_count = int(txn_count * min(1.0, random.uniform(0.85, 0.99) * health_factor))
    failure_count = txn_count - success_count
    revenue = round(baseline / 60 * health_factor * random.uniform(0.8, 1.2), 2)

    return {
        "@timestamp": timestamp,
        "service.name": service["name"],
        "service.tier": service["tier"],
        "transactions.count": txn_count,
        "transactions.success_count": success_count,
        "transactions.failure_count": failure_count,
        "transactions.success_rate": round(success_count / max(txn_count, 1) * 100, 2),
        "revenue.amount_usd": revenue,
        "revenue.baseline_hourly_usd": baseline,
        "active_users": int(random.randint(200, 800) * health_factor),
        "active_sessions": int(random.randint(100, 400) * health_factor),
        "error_rate_percent": round((1 - health_factor) * 100 * random.uniform(0.8, 1.2), 2),
        "avg_response_time_ms": round(random.uniform(50, 200) / health_factor, 2),
        "p99_response_time_ms": round(random.uniform(200, 500) / health_factor, 2),
        "sla_compliance": health_factor > 0.7,
    }


def generate_historical_incidents():
    """Generate past incidents for vector search."""
    incidents = [
        {
            "incident_id": "INC-2026-001",
            "title": "Payment Service Database Connection Pool Exhaustion",
            "description": "Payment service experienced connection pool exhaustion causing cascading failures. Error rate spiked to 45% with DB_CONN_TIMEOUT errors. Root cause was a missing connection pool limit after database migration.",
            "root_cause": "Database connection pool configuration was reset during v2.3.5 migration. Max connections dropped from 100 to 10, causing pool exhaustion under normal load.",
            "root_cause_category": "configuration",
            "resolution_steps": "1. Identified connection pool settings in config. 2. Updated max_connections from 10 to 100. 3. Restarted payment-service pods. 4. Verified connection pool metrics normalized.",
            "severity": "CRITICAL",
            "status": "resolved",
            "service_affected": "payment-service",
            "services_impacted": ["payment-service", "order-processing"],
            "resolution_time_minutes": 45,
            "revenue_impact_usd": 25000,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
            "resolved_at": (datetime.now(timezone.utc) - timedelta(days=30) + timedelta(minutes=45)).isoformat(),
            "assigned_to": "sre-team",
            "tags": ["database", "connection-pool", "configuration", "payment"],
            "deployment_version": "v2.3.5",
            "post_mortem": "Connection pool limits should be included in deployment validation checklist. Added automated config drift detection.",
        },
        {
            "incident_id": "INC-2026-002",
            "title": "Auth Service Memory Leak After v2.4.0 Deployment",
            "description": "Authentication service memory usage gradually increased after v2.4.0 deployment, reaching 95% after 6 hours. Users experienced slow logins and intermittent OOM_KILLED errors. JWT token cache was not properly evicting expired tokens.",
            "root_cause": "Memory leak in JWT token validation cache. New caching library introduced in v2.4.0 did not properly evict expired tokens, causing unbounded memory growth.",
            "root_cause_category": "deployment",
            "resolution_steps": "1. Identified memory growth pattern correlating with v2.4.0 deploy. 2. Analyzed heap dump showing JWT cache growing indefinitely. 3. Rolled back to v2.3.9. 4. Fixed cache eviction policy in hotfix v2.4.0a.",
            "severity": "HIGH",
            "status": "resolved",
            "service_affected": "auth-service",
            "services_impacted": ["auth-service", "user-api"],
            "resolution_time_minutes": 120,
            "revenue_impact_usd": 15000,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "resolved_at": (datetime.now(timezone.utc) - timedelta(days=15) + timedelta(minutes=120)).isoformat(),
            "assigned_to": "backend-team",
            "tags": ["memory-leak", "deployment", "jwt", "cache", "auth"],
            "deployment_version": "v2.4.0",
            "post_mortem": "All new caching implementations must include eviction policy tests. Added memory usage alerting at 80% threshold.",
        },
        {
            "incident_id": "INC-2026-003",
            "title": "Product Catalog Search Latency Spike Due to Index Corruption",
            "description": "Product search response times increased from 50ms to 8000ms. Search service was returning HTTP 504 errors. Elasticsearch index for product catalog had segment corruption after a forced cluster restart.",
            "root_cause": "Elasticsearch product index segments were corrupted during emergency cluster restart. Index was not properly closed before restart.",
            "root_cause_category": "infrastructure",
            "resolution_steps": "1. Identified search latency spike in metrics. 2. Found ES cluster red health status. 3. Force-merged corrupted index segments. 4. Reindexed from primary data source. 5. Search latency normalized.",
            "severity": "HIGH",
            "status": "resolved",
            "service_affected": "search-service",
            "services_impacted": ["search-service", "product-catalog"],
            "resolution_time_minutes": 90,
            "revenue_impact_usd": 8500,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=45)).isoformat(),
            "resolved_at": (datetime.now(timezone.utc) - timedelta(days=45) + timedelta(minutes=90)).isoformat(),
            "assigned_to": "infrastructure-team",
            "tags": ["elasticsearch", "index-corruption", "search", "infrastructure"],
            "deployment_version": "v2.3.2",
            "post_mortem": "Added graceful shutdown procedures. Created automated index health checks.",
        },
        {
            "incident_id": "INC-2026-004",
            "title": "Order Processing Queue Backlog During Flash Sale",
            "description": "Order processing service developed a massive queue backlog during flash sale event. Orders timing out after 30 seconds. Auto-scaling was capped at 5 replicas but needed 15. CPU usage hit 98% across all worker nodes.",
            "root_cause": "Horizontal Pod Autoscaler (HPA) max replicas was set to 5 for order-processing, insufficient for flash sale traffic (10x normal). CPU and memory thresholds were too conservative.",
            "root_cause_category": "capacity",
            "resolution_steps": "1. Detected order processing latency spike. 2. Identified HPA at max replicas with pending pods. 3. Manually scaled to 20 replicas. 4. Queue cleared in 15 minutes. 5. Updated HPA limits for future events.",
            "severity": "CRITICAL",
            "status": "resolved",
            "service_affected": "order-processing",
            "services_impacted": ["order-processing", "payment-service", "inventory-service"],
            "resolution_time_minutes": 30,
            "revenue_impact_usd": 50000,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
            "resolved_at": (datetime.now(timezone.utc) - timedelta(days=7) + timedelta(minutes=30)).isoformat(),
            "assigned_to": "platform-team",
            "tags": ["scaling", "capacity", "flash-sale", "hpa", "kubernetes"],
            "deployment_version": "v2.4.1",
            "post_mortem": "Implemented predictive auto-scaling based on scheduled events. Added capacity planning checklist for marketing campaigns.",
        },
        {
            "incident_id": "INC-2026-005",
            "title": "Notification Service SSL Certificate Expiry",
            "description": "Notification service unable to send emails and push notifications. All outbound HTTPS connections failing with SSL_HANDSHAKE_FAILED errors. SSL certificate for notification APIs expired at midnight. Certificate auto-renewal had silently failed 3 days ago.",
            "root_cause": "SSL/TLS certificate expired. Auto-renewal via cert-manager failed due to DNS validation timeout. No alert was configured for certificate renewal failures.",
            "root_cause_category": "configuration",
            "resolution_steps": "1. Identified SSL_HANDSHAKE_FAILED errors in notification-service logs. 2. Checked certificate expiry — confirmed expired. 3. Manually renewed certificate via cert-manager. 4. Restarted notification-service pods. 5. Verified outbound connections restored.",
            "severity": "MEDIUM",
            "status": "resolved",
            "service_affected": "notification-service",
            "services_impacted": ["notification-service"],
            "resolution_time_minutes": 20,
            "revenue_impact_usd": 2000,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=60)).isoformat(),
            "resolved_at": (datetime.now(timezone.utc) - timedelta(days=60) + timedelta(minutes=20)).isoformat(),
            "assigned_to": "sre-team",
            "tags": ["ssl", "certificate", "expiry", "notification", "configuration"],
            "deployment_version": "v2.2.8",
            "post_mortem": "Added certificate expiry monitoring with 30-day, 14-day, and 7-day alerts. Added redundant DNS validation endpoints.",
        },
    ]
    return incidents


def generate_scenario_data(now=None):
    """
    Generate a complete incident scenario:
    - 2 hours of normal data
    - Bad deployment at T-45min
    - Incident escalation over 45 minutes
    - All data types: logs, metrics, business metrics, incidents
    """
    if now is None:
        now = datetime.now(timezone.utc)

    all_logs = []
    all_metrics = []
    all_business = []
    all_incidents = generate_historical_incidents()

    # Affected services for the incident
    incident_service = SERVICES[0]  # payment-service
    cascade_service = SERVICES[6]   # order-processing
    bad_deploy_version = "v2.4.2"
    good_deploy_version = "v2.4.1"

    # --- Phase 1: Normal operation (T-120min to T-45min) ---
    for minutes_ago in range(120, 45, -1):
        ts = generate_timestamp(now, -minutes_ago, jitter_seconds=10)
        service = random.choice(SERVICES)
        host = random.choice(HOSTS)

        # Normal metrics every minute
        all_metrics.append(generate_normal_metrics(ts, service, host))

        # Normal logs (3-5 per minute)
        for _ in range(random.randint(3, 5)):
            log_ts = generate_timestamp(now, -minutes_ago, jitter_seconds=25)
            all_logs.append(generate_normal_log(log_ts, service, host, good_deploy_version))

        # Business metrics every 5 minutes
        if minutes_ago % 5 == 0:
            for svc in SERVICES:
                biz_ts = generate_timestamp(now, -minutes_ago, jitter_seconds=5)
                all_business.append(generate_business_metrics(biz_ts, svc, health_factor=1.0))

    # --- Phase 2: Bad deployment (T-45min) ---
    deploy_ts = generate_timestamp(now, -45, jitter_seconds=0)
    all_logs.append({
        "@timestamp": deploy_ts,
        "service.name": "payment-service",
        "service.environment": "production",
        "log.level": "INFO",
        "message": f"Deployment started: {bad_deploy_version} — Updating payment-service to latest build",
        "host.name": "prod-api-01",
        "host.ip": "10.0.2.10",
        "http.response.status_code": 200,
        "http.request.method": "POST",
        "url.path": "/deploy",
        "response_time_ms": 150,
        "deployment.version": bad_deploy_version,
        "deployment.timestamp": deploy_ts,
        "geo.location": {"lat": 45.8399, "lon": -119.7006},
        "geo.region": "us-west-2",
    })

    # --- Phase 3: Incident escalation (T-40min to T-0) ---
    for minutes_ago in range(40, 0, -1):
        # Severity increases over time
        severity_factor = 1.0 + (40 - minutes_ago) / 20.0  # 1.0 → 3.0

        for host in HOSTS[:3]:  # Affected hosts
            ts = generate_timestamp(now, -minutes_ago, jitter_seconds=10)

            # Degraded metrics for incident services
            if random.random() < 0.7:
                all_metrics.append(generate_incident_metrics(ts, incident_service, host, severity_factor))
            if random.random() < 0.4:
                all_metrics.append(generate_incident_metrics(ts, cascade_service, host, severity_factor * 0.6))

            # Normal metrics for other services
            other_service = random.choice([s for s in SERVICES if s != incident_service and s != cascade_service])
            all_metrics.append(generate_normal_metrics(ts, other_service, host))

            # Error logs (increasing frequency)
            error_count = int(1 + severity_factor * 2)
            for _ in range(error_count):
                err_ts = generate_timestamp(now, -minutes_ago, jitter_seconds=20)
                sev = "CRITICAL" if severity_factor > 2.5 and random.random() < 0.3 else "ERROR"
                all_logs.append(generate_error_log(err_ts, incident_service, host, bad_deploy_version, sev))

            # Some cascading errors in order-processing
            if severity_factor > 1.5 and random.random() < 0.5:
                err_ts = generate_timestamp(now, -minutes_ago, jitter_seconds=20)
                all_logs.append(generate_error_log(err_ts, cascade_service, host, good_deploy_version, "ERROR"))

            # Warning logs
            if random.random() < 0.5:
                warn_ts = generate_timestamp(now, -minutes_ago, jitter_seconds=20)
                all_logs.append({
                    "@timestamp": warn_ts,
                    "service.name": incident_service["name"],
                    "service.environment": "production",
                    "log.level": "WARNING",
                    "message": random.choice(LOG_MESSAGES["warning"]).format(
                        time=random.randint(2000, 15000),
                        active=random.randint(80, 100),
                        max=100,
                        usage=round(75 + severity_factor * 8, 1),
                        attempt=random.randint(1, 3),
                        service="database",
                        endpoint=random.choice(URL_PATHS),
                    ),
                    "host.name": host["name"],
                    "host.ip": host["ip"],
                    "response_time_ms": round(random.uniform(1000, 10000 * severity_factor), 2),
                    "deployment.version": bad_deploy_version,
                    "geo.location": {"lat": host["lat"], "lon": host["lon"]},
                    "geo.region": host["region"],
                })

        # Business metrics every 5 minutes during incident
        if minutes_ago % 5 == 0:
            health_factor = max(0.2, 1.0 - (severity_factor - 1.0) / 3.0)
            for svc in SERVICES:
                biz_ts = generate_timestamp(now, -minutes_ago, jitter_seconds=5)
                hf = health_factor if svc in [incident_service, cascade_service] else random.uniform(0.9, 1.0)
                all_business.append(generate_business_metrics(biz_ts, svc, health_factor=hf))

    return {
        "logs": all_logs,
        "metrics": all_metrics,
        "business_metrics": all_business,
        "incidents_history": all_incidents,
    }


def save_to_files(data, output_dir):
    """Save generated data to JSON files for manual import."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    for data_type, documents in data.items():
        filepath = output_path / f"{data_type}.json"
        with open(filepath, 'w') as f:
            # Write as NDJSON (newline-delimited JSON) for bulk import
            for doc in documents:
                f.write(json.dumps(doc) + '\n')
        print(f"✅ Wrote {len(documents)} documents to {filepath}")


def save_bulk_format(data, output_dir):
    """Save in Elasticsearch bulk API format."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    index_map = {
        "logs": "logs-opsguard-incidents",
        "metrics": "metrics-opsguard-system",
        "business_metrics": "business-opsguard-metrics",
        "incidents_history": "incidents-opsguard-history",
    }

    for data_type, documents in data.items():
        index_name = index_map[data_type]
        filepath = output_path / f"{data_type}_bulk.ndjson"
        with open(filepath, 'w') as f:
            for doc in documents:
                action = {"index": {"_index": index_name}}
                f.write(json.dumps(action) + '\n')
                f.write(json.dumps(doc) + '\n')
        print(f"✅ Wrote {len(documents)} docs (bulk format) to {filepath}")


def print_summary(data):
    """Print generation summary."""
    print("\n" + "=" * 60)
    print("🛡️  OpsGuard AI — Sample Data Generation Summary")
    print("=" * 60)
    print(f"📊 Logs generated:           {len(data['logs']):,}")
    print(f"📈 Metrics generated:        {len(data['metrics']):,}")
    print(f"💰 Business metrics:         {len(data['business_metrics']):,}")
    print(f"📋 Historical incidents:     {len(data['incidents_history']):,}")
    print(f"📦 Total documents:          {sum(len(v) for v in data.values()):,}")
    print("=" * 60)
    print("\n📝 Scenario: payment-service degradation after v2.4.2 deployment")
    print("   - Normal period: T-120min to T-45min")
    print("   - Bad deployment: T-45min (v2.4.2)")
    print("   - Escalating incident: T-40min to T-0")
    print("   - Cascading failure: order-processing affected")
    print()


def main():
    parser = argparse.ArgumentParser(description="OpsGuard AI Sample Data Generator")
    parser.add_argument("--output-dir", default="./generated-data",
                        help="Directory to save generated JSON files (default: ./generated-data)")
    parser.add_argument("--bulk", action="store_true",
                        help="Also generate Elasticsearch bulk API format files")
    args = parser.parse_args()

    print("🛡️  OpsGuard AI — Generating sample data...")
    data = generate_scenario_data()
    print_summary(data)

    save_to_files(data, args.output_dir)

    if args.bulk:
        save_bulk_format(data, args.output_dir)

    print(f"\n🎉 Data generation complete! Files saved to: {args.output_dir}")
    print("\nTo ingest into Elasticsearch:")
    print("  curl -X POST '<ES_URL>/_bulk' \\")
    print("    -H 'Content-Type: application/x-ndjson' \\")
    print("    -H 'Authorization: ApiKey <API_KEY>' \\")
    print(f"    --data-binary @{args.output_dir}/logs_bulk.ndjson")
    print()


if __name__ == "__main__":
    main()
