#!/bin/bash
# ============================================================
# OpsGuard AI — Elasticsearch Setup Script
# Creates indices, generates sample data, and ingests into ES
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════╗"
echo "║          🛡️  OpsGuard AI — Setup                ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check required env vars
if [ -z "$ES_URL" ]; then
    echo -e "${YELLOW}ES_URL not set. Enter your Elasticsearch URL:${NC}"
    read -r ES_URL
fi

if [ -z "$ES_API_KEY" ]; then
    echo -e "${YELLOW}ES_API_KEY not set. Enter your API Key:${NC}"
    read -r ES_API_KEY
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MAPPINGS_DIR="$PROJECT_DIR/elastic/index-mappings"
DATA_DIR="$PROJECT_DIR/generated-data"

# ============================================================
# Step 1: Create Indices
# ============================================================
echo -e "\n${BLUE}📦 Step 1: Creating Elasticsearch indices...${NC}"

declare -A INDEX_MAP=(
    ["logs-opsguard-incidents"]="$MAPPINGS_DIR/logs-incidents.json"
    ["metrics-opsguard-system"]="$MAPPINGS_DIR/metrics-system.json"
    ["incidents-opsguard-history"]="$MAPPINGS_DIR/incidents-history.json"
    ["business-opsguard-metrics"]="$MAPPINGS_DIR/business-metrics.json"
)

for index_name in "${!INDEX_MAP[@]}"; do
    mapping_file="${INDEX_MAP[$index_name]}"
    echo -e "  Creating ${GREEN}$index_name${NC}..."

    # Delete if exists
    curl -s -X DELETE "$ES_URL/$index_name" \
        -H "Authorization: ApiKey $ES_API_KEY" \
        > /dev/null 2>&1 || true

    # Create with mapping
    response=$(curl -s -w "\n%{http_code}" -X PUT "$ES_URL/$index_name" \
        -H "Authorization: ApiKey $ES_API_KEY" \
        -H "Content-Type: application/json" \
        -d @"$mapping_file")

    http_code=$(echo "$response" | tail -1)
    if [ "$http_code" = "200" ]; then
        echo -e "  ${GREEN}✅ $index_name created${NC}"
    else
        echo -e "  ${RED}❌ Failed to create $index_name (HTTP $http_code)${NC}"
        echo "$response" | head -1
    fi
done

# Create additional indices for workflows
for extra_index in "incidents-opsguard-active" "notifications-opsguard" "audit-opsguard-actions"; do
    echo -e "  Creating ${GREEN}$extra_index${NC}..."
    curl -s -X PUT "$ES_URL/$extra_index" \
        -H "Authorization: ApiKey $ES_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"settings": {"number_of_shards": 1, "number_of_replicas": 0}}' \
        > /dev/null 2>&1
    echo -e "  ${GREEN}✅ $extra_index created${NC}"
done

# ============================================================
# Step 2: Generate Sample Data
# ============================================================
echo -e "\n${BLUE}📊 Step 2: Generating sample data...${NC}"

cd "$PROJECT_DIR/data"
python3 sample-data-generator.py --output-dir "$DATA_DIR" --bulk

# ============================================================
# Step 3: Ingest Data
# ============================================================
echo -e "\n${BLUE}📥 Step 3: Ingesting data into Elasticsearch...${NC}"

for bulk_file in "$DATA_DIR"/*_bulk.ndjson; do
    filename=$(basename "$bulk_file")
    echo -e "  Ingesting ${GREEN}$filename${NC}..."

    response=$(curl -s -w "\n%{http_code}" -X POST "$ES_URL/_bulk" \
        -H "Authorization: ApiKey $ES_API_KEY" \
        -H "Content-Type: application/x-ndjson" \
        --data-binary @"$bulk_file")

    http_code=$(echo "$response" | tail -1)
    if [ "$http_code" = "200" ]; then
        echo -e "  ${GREEN}✅ $filename ingested${NC}"
    else
        echo -e "  ${RED}❌ Failed to ingest $filename (HTTP $http_code)${NC}"
    fi
done

# ============================================================
# Step 4: Verify
# ============================================================
echo -e "\n${BLUE}🔍 Step 4: Verifying data...${NC}"

for index_name in "${!INDEX_MAP[@]}"; do
    count=$(curl -s "$ES_URL/$index_name/_count" \
        -H "Authorization: ApiKey $ES_API_KEY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count', 0))" 2>/dev/null || echo "?")
    echo -e "  ${GREEN}$index_name${NC}: $count documents"
done

echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║          🎉 Setup Complete!                     ║"
echo "║                                                  ║"
echo "║  Next steps:                                     ║"
echo "║  1. Open Kibana → Agent Builder                  ║"
echo "║  2. Create custom tools (see elastic/tools/)     ║"
echo "║  3. Create custom agents (see elastic/agents/)   ║"
echo "║  4. Test: 'Check system health for anomalies'    ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"
