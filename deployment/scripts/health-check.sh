#!/usr/bin/env bash
# EduFlow Automated Deployment Health Check Script
# Usage: ./health-check.sh [port] [domain]

set -euo pipefail

PORT="${1:-5000}"
DOMAIN="${2:-localhost}"
MAX_RETRIES=10
RETRY_INTERVAL=3

echo "========================================="
echo "EduFlow Health Check Initiated"
echo "Target Port: ${PORT}"
echo "Target Domain: ${DOMAIN}"
echo "========================================="

# 1. Local Process / Kestrel Health Check
echo "[1/3] Testing local ASP.NET Core service (http://127.0.0.1:${PORT}/health)..."
LOCAL_PASSED=false

for i in $(seq 1 $MAX_RETRIES); do
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/health" || echo "000")
    if [ "$STATUS_CODE" -eq 200 ]; then
        echo "SUCCESS: Local service responded with HTTP 200 OK on attempt $i."
        LOCAL_PASSED=true
        break
    else
        echo "Attempt $i/$MAX_RETRIES failed (HTTP $STATUS_CODE). Retrying in ${RETRY_INTERVAL}s..."
        sleep $RETRY_INTERVAL
    fi
done

if [ "$LOCAL_PASSED" = false ]; then
    echo "ERROR: Local service health check failed after $MAX_RETRIES attempts!"
    exit 1
fi

# 2. Memory Usage Check (1 GB RAM Safeguard)
echo "[2/3] Verifying Memory Pressure on OCI VM..."
FREE_MEM_MB=$(free -m | awk '/^Mem:/{print $7}')
echo "Available memory: ${FREE_MEM_MB} MB"
if [ "$FREE_MEM_MB" -lt 50 ]; then
    echo "WARNING: Low available memory detected (< 50MB free)."
fi

# 3. Public Domain Health Check (if domain is provided and not localhost)
if [ "$DOMAIN" != "localhost" ]; then
    echo "[3/3] Testing public Nginx proxy endpoint (https://${DOMAIN}/health)..."
    PUBLIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/health" || echo "000")
    if [ "$PUBLIC_STATUS" -eq 200 ]; then
        echo "SUCCESS: Public domain responded with HTTP 200 OK."
    else
        echo "WARNING: Public domain returned HTTP $PUBLIC_STATUS. Verify DNS and SSL certificates."
    fi
else
    echo "[3/3] Skipping public domain check (localhost)."
fi

echo "========================================="
echo "HEALTH CHECK PASSED SAFELY!"
echo "========================================="
exit 0
