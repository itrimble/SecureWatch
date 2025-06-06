# Query Processor Service Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Create directories for logs and results
RUN mkdir -p /app/logs /app/results

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S queryprocessor -u 1001 -G nodejs

# Change ownership
RUN chown -R queryprocessor:nodejs /app

# Switch to non-root user
USER queryprocessor

# Expose ports
EXPOSE 4008 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4008/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => { process.exit(1) })"

# Start the application
CMD ["npm", "start"]