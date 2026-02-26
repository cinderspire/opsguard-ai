#!/usr/bin/env python3
"""
OpsGuard AI — Elastic Cloud Serverless Ingester (v2)
Fixes:
  - No number_of_shards/replicas (Serverless doesn't support)
  - Index names use 'opsguard-*' prefix (avoids logs-*/metrics-* data stream)
  - DELETE 404 is silently ignored
  - Proper error handling and chunked bulk ingestion
"""

import os, json, time, sys, urllib.request, urllib.error

ES_URL = os.environ.get("ES_URL", "")
API_KEY = os.environ.get("ES_API_KEY", "")

if not ES_URL:
    ES_URL = input("Enter your Elasticsearch URL (e.g. https://my-project.es.region.gcp.elastic.cloud): ").strip()
if not API_KEY:
    API_KEY = input("Enter your Elastic API Key: ").strip()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "generated-data")
MAPPINGS_DIR = os.path.join(BASE_DIR, "elastic", "index-mappings")

# NEW index names that don't clash with Serverless data streams
INDEX_MAP = {
    "logs-opsguard-incidents": "opsguard-incidents",
    "metrics-opsguard-system": "opsguard-metrics",
    "business-opsguard-metrics": "opsguard-business",
    "incidents-opsguard-history": "opsguard-history",
    "incidents-opsguard-active": "opsguard-active",
    "notifications-opsguard": "opsguard-notifications",
    "audit-opsguard-actions": "opsguard-audit",
}

def es_request(method, endpoint, data=None, content_type="application/json", retries=3):
    url = f"{ES_URL}/{endpoint}"
    headers = {"Authorization": f"ApiKey {API_KEY}", "Content-Type": content_type}
    body = None
    if data:
        body = json.dumps(data).encode('utf-8') if isinstance(data, dict) else data.encode('utf-8') if isinstance(data, str) else data

    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.status, json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            body_text = e.read().decode('utf-8')
            if e.code == 404:
                return 404, {"status": "not_found"}
            if e.code == 400 and "resource_already_exists" in body_text:
                return 200, {"status": "already_exists"}
            if attempt == retries - 1:
                print(f"    ❌ HTTP {e.code}: {body_text[:150]}")
                return e.code, None
        except Exception as e:
            if attempt == retries - 1:
                print(f"    ❌ Error: {str(e)[:100]}")
                return 0, None
        time.sleep(2)

def create_indices():
    print("\n" + "="*50)
    print("📦 STEP 1: Creating Indices (Serverless Compatible)")
    print("="*50)

    mapping_files = {
        "opsguard-incidents": "logs-incidents.json",
        "opsguard-metrics": "metrics-system.json",
        "opsguard-business": "business-metrics.json",
    }

    for idx_name, mapping_file in mapping_files.items():
        print(f"\n  Creating {idx_name}...")
        es_request("DELETE", idx_name)  # ignore 404

        path = os.path.join(MAPPINGS_DIR, mapping_file)
        with open(path) as f:
            mapping = json.load(f)

        # Ensure no shard/replica settings
        mapping.pop("settings", None)

        status, _ = es_request("PUT", idx_name, data=mapping)
        print(f"    {'✅ OK' if status in [200, 201] else '❌ FAILED'}")

    # History index — uses full incidents-history.json mapping (semantic_text for vector search)
    print(f"\n  Creating opsguard-history...")
    es_request("DELETE", "opsguard-history")
    history_path = os.path.join(MAPPINGS_DIR, "incidents-history.json")
    with open(history_path) as f:
        history_mapping = json.load(f)
    history_mapping.pop("settings", None)  # Serverless doesn't support shard settings
    status, _ = es_request("PUT", "opsguard-history", data=history_mapping)
    print(f"    {'✅ OK' if status in [200, 201] else '❌ FAILED'}")

    # Workflow indices (no mapping needed)
    for idx in ["opsguard-active", "opsguard-notifications", "opsguard-audit"]:
        print(f"\n  Creating {idx}...")
        es_request("DELETE", idx)
        status, _ = es_request("PUT", idx)
        print(f"    {'✅ OK' if status in [200, 201] else '❌ FAILED'}")

def ingest_data():
    print("\n" + "="*50)
    print("📊 STEP 2: Ingesting Data via Bulk API")
    print("="*50)

    # Map old bulk file names to new index names
    bulk_tasks = [
        ("logs_bulk.ndjson", "logs-opsguard-incidents", "opsguard-incidents"),
        ("metrics_bulk.ndjson", "metrics-opsguard-system", "opsguard-metrics"),
        ("business_metrics_bulk.ndjson", "business-opsguard-metrics", "opsguard-business"),
        ("incidents_history_bulk.ndjson", "incidents-opsguard-history", "opsguard-history"),
    ]

    total_ok = 0
    total_fail = 0

    for filename, old_index, new_index in bulk_tasks:
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            print(f"\n  ⚠️  {filename} not found, skipping")
            continue

        print(f"\n  📄 {filename} → {new_index}")

        with open(filepath) as f:
            content = f.read()

        # Replace old index name with new
        content = content.replace(f'"_index": "{old_index}"', f'"_index": "{new_index}"')
        # Also replace alternate formats
        content = content.replace(f'"_index":"{old_index}"', f'"_index":"{new_index}"')

        lines = content.strip().split('\n')
        total_docs = len(lines) // 2
        chunk_size = 400  # 200 docs per chunk
        ingested = 0

        for i in range(0, len(lines), chunk_size):
            chunk_lines = lines[i:i + chunk_size]
            chunk = "\n".join(chunk_lines) + "\n"

            status, res = es_request("POST", "_bulk", data=chunk, content_type="application/x-ndjson")

            if status == 200 and res:
                errors = res.get("errors", False)
                items = res.get("items", [])
                ok_count = sum(1 for it in items if list(it.values())[0].get("status", 0) in [200, 201])
                fail_count = len(items) - ok_count
                ingested += ok_count
                total_ok += ok_count
                total_fail += fail_count
                if fail_count > 0:
                    first_err = next((list(it.values())[0].get("error", {}) for it in items if list(it.values())[0].get("status", 0) not in [200, 201]), {})
                    print(f"    ⚠️  {ok_count} ok, {fail_count} failed: {str(first_err)[:120]}")
                else:
                    print(f"    ✅ {ingested}/{total_docs} docs ingested")
            else:
                print(f"    ❌ Chunk failed (status {status})")

    print(f"\n{'='*50}")
    print(f"📊 SUMMARY: {total_ok} docs ingested, {total_fail} failed")
    print(f"{'='*50}")

def verify():
    print("\n" + "="*50)
    print("🔍 STEP 3: Verification")
    print("="*50)

    for idx in ["opsguard-incidents", "opsguard-metrics", "opsguard-business", "opsguard-history"]:
        status, res = es_request("GET", f"{idx}/_count")
        if status == 200 and res:
            print(f"  {idx}: {res.get('count', '?')} documents")
        else:
            print(f"  {idx}: ❌ couldn't verify")

if __name__ == "__main__":
    if not os.path.exists(DATA_DIR):
        print(f"❌ Data not found. Run: python3 data/sample-data-generator.py --output-dir generated-data --bulk")
        sys.exit(1)

    print("🛡️  OpsGuard AI — Elastic Cloud Serverless Ingester v2")
    create_indices()
    ingest_data()
    verify()
    print("\n🎉 Done! Your data is live on Elastic Cloud.")
