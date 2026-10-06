#!/usr/bin/env bash
# EduFlow Production Deployment Script (OCI VM)
# Usage: ./deploy.sh <artifact_tarball>

set -euo pipefail

ARTIFACT_TAR="${1:-backend-release.tar.gz}"
DEPLOY_DIR="/var/www/eduflow"
CURRENT_DIR="${DEPLOY_DIR}/backend"
BACKUP_DIR="${DEPLOY_DIR}/backend_previous"
TEMP_DIR="${DEPLOY_DIR}/backend_temp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "EduFlow Production Backend Deployment"
echo "========================================="

if [ ! -f "$ARTIFACT_TAR" ]; then
    echo "ERROR: Artifact file $ARTIFACT_TAR not found!"
    exit 1
fi

echo "Step 1: Extracting build artifact to temporary directory..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
tar -xzf "$ARTIFACT_TAR" -C "$TEMP_DIR"

echo "Step 2: Backing up current deployment..."
if [ -d "$CURRENT_DIR" ]; then
    rm -rf "$BACKUP_DIR"
    cp -r "$CURRENT_DIR" "$BACKUP_DIR"
fi

echo "Step 3: Promoting new build artifact..."
rm -rf "$CURRENT_DIR"
mkdir -p "$CURRENT_DIR"
cp -r "$TEMP_DIR"/* "$CURRENT_DIR"/
rm -rf "$TEMP_DIR"

echo "Step 4: Ensuring correct file permissions..."
SERVICE_USER="www-data"
if id "nginx" &>/dev/null; then
    SERVICE_USER="nginx"
elif id "opc" &>/dev/null; then
    SERVICE_USER="opc"
fi
sudo chown -R ${SERVICE_USER}:${SERVICE_USER} "$CURRENT_DIR" || sudo chown -R $(id -un):$(id -gn) "$CURRENT_DIR"
sudo chmod -R 755 "$CURRENT_DIR"

echo "Step 5: Restarting EduFlow systemd service..."
sudo systemctl restart eduflow

echo "Step 6: Running Automated Health Check..."
if "${SCRIPT_DIR}/health-check.sh" 5000 localhost; then
    echo "========================================="
    echo "DEPLOYMENT SUCCESSFUL!"
    echo "========================================="
    # Remove old backup after successful check
    rm -rf "$BACKUP_DIR"
    exit 0
else
    echo "========================================="
    echo "HEALTH CHECK FAILED! Triggering Rollback..."
    echo "========================================="
    "${SCRIPT_DIR}/rollback.sh"
    exit 1
fi
