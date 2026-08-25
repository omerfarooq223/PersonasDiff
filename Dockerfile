FROM node:24-bookworm

# Install PostgreSQL, Redis, Caddy, sudo
RUN apt-get update && apt-get install -y \
    postgresql postgresql-contrib \
    redis-server \
    caddy \
    netcat-openbsd \
    sudo \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy repository contents
COPY . .

# Install dependencies and Playwright Chromium with browser dependencies
RUN npm install
RUN npx playwright install chromium --with-deps

# Pre-build workspaces during image build
RUN npm run build

# Make start script executable
RUN chmod +x infra/scripts/start-hf.sh

# Default ports (7860 for Hugging Face, 10000 for Render)
EXPOSE 7860 10000 3000

CMD ["/app/infra/scripts/start-hf.sh"]
