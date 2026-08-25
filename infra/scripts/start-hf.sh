#!/bin/bash
set -e

echo "=== 1. Starting PostgreSQL ==="
service postgresql start

echo "=== 2. Configuring Database ==="
sudo -u postgres psql -c "CREATE USER parallelweb WITH PASSWORD 'parallelweb';" || true
sudo -u postgres psql -c "CREATE DATABASE parallelweb OWNER parallelweb;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE parallelweb TO parallelweb;" || true

echo "=== 3. Starting Redis ==="
service redis-server start

echo "=== 4. Launching Backend Services ==="
SEED_ON_STARTUP=true \
APP_ENV=production \
API_HOST=0.0.0.0 \
API_PORT=3000 \
DATABASE_URL=postgresql://parallelweb:parallelweb@localhost:5432/parallelweb \
REDIS_URL=redis://localhost:6379 \
S3_ENDPOINT=http://localhost:9000 \
APPROVED_SURFACE_ORIGIN=http://localhost:4300 \
APPROVED_PATH_PREFIXES=/fixture,/robots.txt \
npm run start --workspace=@ai-parallel-web/api &

echo "=== 5. Launching Local Target Fixture Service ==="
FIXTURE_PORT=4300 npm run start --workspace=@ai-parallel-web/fixture &

LISTEN_PORT="${PORT:-7860}"
echo "=== 6. Starting Caddy Web Server & Reverse Proxy on Port ${LISTEN_PORT} ==="
cat << EOF > /tmp/Caddyfile
:${LISTEN_PORT} {
    @cors_preflight method OPTIONS
    handle @cors_preflight {
        header Access-Control-Allow-Origin *
        header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
        header Access-Control-Allow-Headers "Authorization, Content-Type, Idempotency-Key, X-Correlation-ID, X-Request-ID"
        header Access-Control-Max-Age "86400"
        respond "" 204
    }

    handle /v1/* {
        header Access-Control-Allow-Origin *
        header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
        header Access-Control-Allow-Headers "Authorization, Content-Type, Idempotency-Key, X-Correlation-ID, X-Request-ID"
        reverse_proxy localhost:3000
    }
    handle /health/* {
        header Access-Control-Allow-Origin *
        reverse_proxy localhost:3000
    }
    handle {
        root * /app/apps/web/dist
        try_files {path} /index.html
        file_server
    }
}
EOF

exec caddy run --config /tmp/Caddyfile --adapter caddyfile
