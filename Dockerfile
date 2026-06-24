# Multi-stage build: Backend + Frontend (static export)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
COPY schema.prisma ./
COPY seed.ts ./
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY packages/core ./packages/core

RUN npm ci && \
    npx prisma generate --schema=./schema.prisma && \
    node -e "const {Prisma}=require('@prisma/client'); const fields=Prisma.dmmf.datamodel.models.find(m=>m.name==='Product').fields.map(f=>f.name); if (fields.includes('name') || !fields.includes('nomeComercial')) throw new Error('Invalid Prisma Product model generated');" && \
    npm run build --workspace=@edugest-pim/core && \
    npm run build --workspace=@edugest-pim/api

# Precompile seed to CommonJS JS (avoids ts-node ESM issues at runtime)
RUN npx tsc seed.ts --module commonjs --target es2020 --esModuleInterop --skipLibCheck --outDir ./seed-dist || true

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install OpenSSL required by Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package.json package-lock.json ./

# Copy built backend
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy packages/core
COPY packages/core ./packages/core

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/schema.prisma ./schema.prisma

# Copy precompiled seed (used for idempotent first-boot seeding)
COPY --from=builder /app/seed-dist ./seed-dist

# Copy production startup script
COPY start.js ./

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Debug: List files at startup
RUN echo "=== Docker Build Complete ===" && \
    ls -la ./apps/api/dist/ && \
    ls -la ./start.js

CMD ["node", "start.js"]
