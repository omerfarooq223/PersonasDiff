#!/usr/bin/env bash
set -euo pipefail

# Day 7 Infrastructure Backup Script
# Creates PostgreSQL pg_dump snapshot and artifact checksum manifest.

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_DIR="${BACKUP_DIR:-./infra/backups}/${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

DB_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/ai_parallel_web}"

echo "==> Starting metadata backup to ${BACKUP_DIR}/metadata.sql..."
pg_dump "${DB_URL}" --clean --if-exists --format=plain > "${BACKUP_DIR}/metadata.sql"

echo "==> Generating checksum manifest..."
if command -v sha256sum &> /dev/null; then
  sha256sum "${BACKUP_DIR}/metadata.sql" > "${BACKUP_DIR}/manifest.sha256"
else
  shasum -a 256 "${BACKUP_DIR}/metadata.sql" > "${BACKUP_DIR}/manifest.sha256"
fi

echo "==> Backup complete: ${BACKUP_DIR}"
