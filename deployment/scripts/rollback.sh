#!/usr/bin/env bash
# EduFlow Automated Rollback Script
# Usage: ./rollback.sh

set -euo pipefail

DEPLOY_DIR="/var/www/eduflow"
CURRENT_DIR="${DEPLOY_DIR}/backend"
BACKUP_DIR="${DEPLOY_DIR}/backend_previous"

echo "========================================="
echo "EduFlow Deployment Rollback Initiated"
echo "========================================="

if [ ! -d "$BACKUP_DIR" ]; then
    echo "CRITICAL ERROR: No backup directory ($BACKUP_DIR) found to rollback to!"
    exit 1
fi

echo "Step 1: Stopping current systemd service..."
sudo systemctl stop eduflow || true

echo "Step 2: Reverting current backend release to previous release..."
rm -rf "${DEPLOY_DIR}/backend_failed"
mv "$CURRENT_DIR" "${DEPLOY_DIR}/backend_failed"
mv "$BACKUP_DIR" "$CURRENT_DIR"

echo "Step 3: Restarting systemd service with previous release..."
sudo systemctl start eduflow

echo "Step 4: Executing health check on rolled back release..."
if ./health-check.sh 5000 localhost; then
    echo "SUCCESS: Rollback executed cleanly. System restored to previous healthy release."
    exit 0
else
    echo "CRITICAL ERROR: Rollback failed health check! Manual intervention required."
    exit 1
fi
