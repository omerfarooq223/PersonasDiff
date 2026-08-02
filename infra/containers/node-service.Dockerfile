FROM node:24-bookworm-slim AS build

ARG SERVICE_WORKSPACE
ENV SERVICE_WORKSPACE=${SERVICE_WORKSPACE}
WORKDIR /app

COPY . .
RUN npm install --ignore-scripts
RUN npm run build --workspace=${SERVICE_WORKSPACE}

FROM node:24-bookworm-slim AS runtime

ARG SERVICE_WORKSPACE
ENV NODE_ENV=production
ENV SERVICE_WORKSPACE=${SERVICE_WORKSPACE}
WORKDIR /app

COPY --from=build /app /app
USER node
CMD ["sh", "-c", "npm run start --workspace=${SERVICE_WORKSPACE}"]
