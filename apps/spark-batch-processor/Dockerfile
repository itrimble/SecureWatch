# Multi-stage build for Apache Spark + Node.js
FROM apache/spark:3.5.0-scala2.12-java11-python3-ubuntu as spark-base

# Install Node.js
USER root
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

FROM spark-base as app-base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/

# Create non-root user for security
RUN useradd -m -u 1001 sparkuser && \
    chown -R sparkuser:sparkuser /app

USER sparkuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]