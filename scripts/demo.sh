#!/usr/bin/env bash
set -euo pipefail

echo "Demo script (mock) — runs a simple quote, lock, and execute against the local gateway"
GATEWAY_URL=${GATEWAY_URL:-http://localhost:8080}

# 1. Quote
echo "POST /v1/jobs/quote"
quote=$(curl -s -X POST "$GATEWAY_URL/v1/jobs/quote" -H 'Content-Type: application/json' -d '{"plan":[{"endpoint_id":"llm.chat.v1","est_units":12000}],"tenant_id":"0x01"}')
echo "Quote response: $quote"

# 2. Lock
echo "POST /v1/jobs/lock"
job_id="job-demo-$(date +%s)"
lock=$(curl -s -i -X POST "$GATEWAY_URL/v1/jobs/lock" -H 'Content-Type: application/json' -d "{\"job_id\": \"$job_id\", \"estimated_credits\": 600}")
echo "Lock response headers:\n$lock"

# 3. Execute
echo "POST /v1/execute"
execresp=$(curl -s -X POST "$GATEWAY_URL/v1/execute" -H 'Content-Type: application/json' -d "{\"job_id\": \"$job_id\", \"tool\": \"llm.chat.v1\", \"args\": {\"messages\": [{\"role\":\"user\",\"content\":\"Hi\"}]}, \"budget\": 600}")
echo "Execute response: $execresp"

# Done
echo "Demo complete. Note: this is a mock flow; extend services per Doc E for full acceptance tests."
