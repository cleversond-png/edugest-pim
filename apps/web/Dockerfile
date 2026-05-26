# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json tsconfig.json ./
COPY apps/web/package.json ./apps/web/

# Copy all source code
COPY apps/web ./apps/web
COPY packages/core ./packages/core

# Install dependencies
RUN npm ci

# Build Next.js app
RUN npm run build --workspace=web

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built app and dependencies from builder
COPY --from=builder /app/apps/web/.next/standalone /app
# Copy static assets - standalone expects them at .next/static
COPY --from=builder /app/apps/web/.next/static /app/.next/static
# Copy public files
COPY --from=builder /app/apps/web/public /app/public

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    HOSTNAME=0.0.0.0

# Start Next.js server
CMD ["node", "server.js"]
