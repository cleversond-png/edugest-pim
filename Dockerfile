# Multi-stage build: Backend
FROM node:20-alpine AS builder-backend
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
COPY schema.prisma ./
COPY apps/api ./apps/api
COPY packages/core ./packages/core

RUN npm ci && npx prisma generate && npm run build --workspace=@edugest-pim/api

# Multi-stage build: Frontend
FROM node:20-alpine AS builder-frontend
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
COPY apps/web ./apps/web
COPY packages/core ./packages/core

RUN npm ci && npm run build --workspace=web

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy built backend
COPY --from=builder-backend /app/apps/api/dist ./apps/api/dist
COPY --from=builder-backend /app/apps/api/package.json ./apps/api/

# Copy built frontend
COPY --from=builder-frontend /app/apps/web/.next ./apps/web/.next
COPY --from=builder-frontend /app/apps/web/public ./apps/web/public
COPY --from=builder-frontend /app/apps/web/package.json ./apps/web/

# Copy packages/core
COPY packages/core ./packages/core

# Copy node_modules from builders
COPY --from=builder-backend /app/node_modules ./node_modules
COPY --from=builder-backend /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder-frontend /app/apps/web/node_modules ./apps/web/node_modules

# Copy production startup script
COPY start.js ./

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "start.js"]
