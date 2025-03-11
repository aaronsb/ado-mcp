# Build stage
FROM node:20.11-bullseye AS builder

# Install build dependencies
ENV NODE_ENV=development
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Copy all files first since we need them for the prepare script
COPY . .
# Install dependencies and build
RUN npm ci && npm run build

# Production stage
FROM node:20.11-bullseye
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/config ./config
RUN npm ci --only=production

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
