# Multi-stage build: Backend + Frontend (static export)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
COPY schema.prisma ./
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY packages/core ./packages/core

RUN npm ci && npx prisma generate && npm run build --workspace=@edugest-pim/core && npm run build --workspace=@edugest-pim/api && npm run build --workspace=web

# Debug: Check if out folder was created
RUN echo "=== Checking web build output ===" && \
    ls -la apps/web/ && \
    echo "---" && \
    [ -d apps/web/out ] && echo "✓ out folder EXISTS" || echo "✗ out folder MISSING" && \
    [ -d apps/web/out ] && ls -la apps/web/out/ | head -20 || echo "Cannot list out"

# Copy frontend static export to API public folder
RUN mkdir -p apps/api/public && \
    if [ -d apps/web/out ]; then \
        echo "Copying frontend files to api/public..."; \
        cp -rv apps/web/out/* apps/api/public/; \
        echo "Copy successful"; \
    else \
        echo "ERROR: apps/web/out does not exist!"; \
        exit 1; \
    fi

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install OpenSSL required by Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package.json package-lock.json ./

# Copy built backend with static files embedded
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/public ./apps/api/public
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy packages/core
COPY packages/core ./packages/core

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy production startup script
COPY start.js ./

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Debug: List files at startup
RUN echo "=== Docker Build Complete ===" && \
    ls -la ./apps/api/dist/ && \
    ls -la ./apps/api/public/ || echo "Frontend folder not found" && \
    ls -la ./start.js

CMD ["node", "start.js"]
