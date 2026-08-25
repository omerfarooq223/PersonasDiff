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

# Make start script executable
RUN chmod +x infra/scripts/start-hf.sh

# Hugging Face Spaces default port
EXPOSE 7860

CMD ["/app/infra/scripts/start-hf.sh"]
