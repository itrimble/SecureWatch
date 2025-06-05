# Multi-stage build for MCP Marketplace service
FROM node:20-alpine AS base

# Install dependencies
RUN apk add --no-cache curl

FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/mcp-client/package.json ./packages/mcp-client/
COPY apps/mcp-marketplace/package.json ./apps/mcp-marketplace/

# Install pnpm and dependencies
RUN corepack enable
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

# Copy deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Build the packages and app
RUN corepack enable
RUN pnpm --filter @securewatch/mcp-client build
RUN pnpm --filter @securewatch/mcp-marketplace build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcpuser

# Copy built application
COPY --from=builder --chown=mcpuser:nodejs /app/packages/mcp-client/dist ./packages/mcp-client/dist
COPY --from=builder --chown=mcpuser:nodejs /app/packages/mcp-client/package.json ./packages/mcp-client/
COPY --from=builder --chown=mcpuser:nodejs /app/apps/mcp-marketplace/dist ./apps/mcp-marketplace/dist
COPY --from=builder --chown=mcpuser:nodejs /app/apps/mcp-marketplace/package.json ./apps/mcp-marketplace/
COPY --from=builder --chown=mcpuser:nodejs /app/node_modules ./node_modules

USER mcpuser

EXPOSE 4006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4006/health || exit 1

CMD ["node", "apps/mcp-marketplace/dist/index.js"]