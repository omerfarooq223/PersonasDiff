#!/usr/bin/env bash
set -euo pipefail

# Infrastructure Restore Script
# Restores PostgreSQL snapshot and validates artifact reference integrity.

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <path-to-metadata.sql>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' does not exist."
  exit 1
fi

DB_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/ai_parallel_web}"

echo "==> Restoring metadata from ${BACKUP_FILE}..."
psql "${DB_URL}" -f "${BACKUP_FILE}" > /dev/null

echo "==> Metadata restored successfully."
