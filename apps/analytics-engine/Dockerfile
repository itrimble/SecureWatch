# KQL Analytics Engine Dockerfile
# Multi-stage build for production optimization

FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ 

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S analytics && \
    adduser -S analytics -u 1001 -G analytics

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy configuration files
COPY --from=builder /app/tsconfig.json ./

# Create necessary directories
RUN mkdir -p /tmp/logs && \
    chown -R analytics:analytics /app /tmp/logs

# Switch to non-root user
USER analytics

# Expose port
EXPOSE 4006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4006/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=4006
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "dist/index.js"]

# Metadata
LABEL maintainer="SecureWatch Team <team@securewatch.com>"
LABEL description="KQL Analytics Engine for SecureWatch SIEM"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/itrimble/SecureWatch"