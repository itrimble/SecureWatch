FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck and system dependencies
RUN apk add --no-cache curl python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Create directories for buffers and logs
RUN mkdir -p /var/lib/securewatch/buffers logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S loguser -u 1001 -G nodejs

# Change ownership of app and data directories
RUN chown -R loguser:nodejs /app /var/lib/securewatch
USER loguser

# Expose ports
EXPOSE 4002
# Syslog ports (will be mapped by Docker)
EXPOSE 514/udp 514/tcp 601/tcp 6514/tcp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4002/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]