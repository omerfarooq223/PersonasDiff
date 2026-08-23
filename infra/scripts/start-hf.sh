#!/bin/bash
set -e

echo "=== 1. Starting PostgreSQL ==="
service postgresql start

echo "=== 2. Configuring Database ==="
sudo -u postgres psql -c "CREATE USER parallelweb WITH PASSWORD 'parallelweb';" || true
sudo -u postgres psql -c "CREATE DATABASE parallelweb OWNER parallelweb;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE parallelweb TO parallelweb;" || true

echo "=== 3. Running DB Migrations ==="
for f in infra/migrations/*.sql; do
    echo "Applying $f..."
    PGPASSWORD=parallelweb psql -h localhost -U parallelweb -d parallelweb -f "$f" || true
done

echo "=== 4. Starting Redis ==="
service redis-server start

echo "=== 5. Building Workspaces ==="
npm run build

echo "=== 6. Launching Backend Services ==="
APP_ENV=production \
API_HOST=0.0.0.0 \
API_PORT=3000 \
DATABASE_URL=postgresql://parallelweb:parallelweb@localhost:5432/parallelweb \
REDIS_URL=redis://localhost:6379 \
S3_ENDPOINT=http://localhost:9000 \
APPROVED_SURFACE_ORIGIN=http://localhost:4300 \
APPROVED_PATH_PREFIXES=/fixture,/robots.txt \
npm run start --workspace=@ai-parallel-web/api &

echo "=== 7. Launching Local Target Fixture Service ==="
FIXTURE_PORT=4300 npm run start --workspace=@ai-parallel-web/fixture &

echo "=== 8. Launching Web UI ==="
npm run dev --workspace=@ai-parallel-web/web -- --host 0.0.0.0 --port 5173 &

echo "=== 9. Starting Caddy Reverse Proxy on Port 7860 ==="
cat << 'EOF' > /tmp/Caddyfile
:7860 {
    reverse_proxy /v1/* localhost:3000
    reverse_proxy /health/* localhost:3000
    reverse_proxy * localhost:5173
}
EOF

exec caddy run --config /tmp/Caddyfile --adapter caddyfile
