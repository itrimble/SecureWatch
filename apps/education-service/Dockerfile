# Education Service Dockerfile
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY turbo.json ./

# Install pnpm
RUN npm install -g pnpm

# Copy workspace packages
COPY packages/ ./packages/
COPY apps/education-service/package*.json ./apps/education-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/education-service/src ./apps/education-service/src
COPY apps/education-service/tsconfig.json ./apps/education-service/

# Build the application
RUN pnpm --filter @securewatch/education-service build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S educationservice -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=educationservice:nodejs /app/apps/education-service/dist ./dist
COPY --from=builder --chown=educationservice:nodejs /app/apps/education-service/package*.json ./
COPY --from=builder --chown=educationservice:nodejs /app/node_modules ./node_modules

# Create data directory for SQLite
RUN mkdir -p /app/data && chown educationservice:nodejs /app/data

# Create logs directory
RUN mkdir -p /app/logs && chown educationservice:nodejs /app/logs

# Switch to non-root user
USER educationservice

# Expose port
EXPOSE 4011

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4011/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]