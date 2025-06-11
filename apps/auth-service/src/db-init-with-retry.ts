/**
 * Database Initialization with Retry Logic for Auth Service
 * Example implementation using the shared retry utilities
 */

import {
  initializeServiceDependencies,
  gracefulShutdown,
  waitForService,
  PostgreSQLConnection,
  RedisConnection
} from '@securewatch/shared-utils/src/db-connection-retry';

let connections: {
  postgresql?: PostgreSQLConnection;
  redis?: RedisConnection;
} = {};

/**
 * Initialize Auth Service with proper dependency management
 */
export async function initializeAuthService(): Promise<{
  postgresql: PostgreSQLConnection;
  redis: RedisConnection;
}> {
  try {
    // Initialize all dependencies with retry logic
    const deps = await initializeServiceDependencies('Auth Service');
    
    connections = {
      postgresql: deps.postgresql,
      redis: deps.redis
    };
    
    // Wait for dependent services to be healthy
    console.log('🔍 Checking dependent service health...');
    
    // These would be other microservices that auth-service depends on
    // await waitForService('Log Ingestion', 'http://localhost:4002/health');
    // await waitForService('Search API', 'http://localhost:4004/health');
    
    console.log('✅ Auth Service initialization complete');
    
    return {
      postgresql: deps.postgresql,
      redis: deps.redis
    };
    
  } catch (error) {
    console.error('❌ Auth Service initialization failed:', error);
    throw error;
  }
}

/**
 * Health check endpoint logic with dependency verification
 */
export async function checkAuthServiceHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  dependencies: {
    postgresql: boolean;
    redis: boolean;
  };
  timestamp: string;
}> {
  const healthStatus = {
    status: 'healthy' as const,
    dependencies: {
      postgresql: false,
      redis: false
    },
    timestamp: new Date().toISOString()
  };
  
  try {
    // Check PostgreSQL
    if (connections.postgresql) {
      await connections.postgresql.query('SELECT 1');
      healthStatus.dependencies.postgresql = true;
    }
    
    // Check Redis
    if (connections.redis) {
      const client = await connections.redis.connect();
      await client.ping();
      healthStatus.dependencies.redis = true;
    }
    
    // Overall health check
    const allDependenciesHealthy = Object.values(healthStatus.dependencies).every(dep => dep);
    if (!allDependenciesHealthy) {
      healthStatus.status = 'unhealthy';
    }
    
  } catch (error) {
    console.error('Health check failed:', error);
    healthStatus.status = 'unhealthy';
  }
  
  return healthStatus;
}

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
    
    await gracefulShutdown('Auth Service', connections);
    
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
}

/**
 * Example usage in main application file
 */
export async function startAuthServiceWithRetry() {
  try {
    // Setup graceful shutdown
    setupGracefulShutdown();
    
    // Initialize with retry logic
    const { postgresql, redis } = await initializeAuthService();
    
    // Start the HTTP server after dependencies are ready
    const express = await import('express');
    const app = express.default();
    
    // Health check endpoint
    app.get('/health', async (req, res) => {
      const health = await checkAuthServiceHealth();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });
    
    // Other routes...
    app.get('/api/auth/status', (req, res) => {
      res.json({ 
        service: 'Auth Service',
        status: 'running',
        dependencies: 'connected'
      });
    });
    
    const PORT = process.env.PORT || 4006;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Auth Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
    
    // Graceful server shutdown
    const originalShutdown = process.exit;
    process.exit = ((code?: number) => {
      server.close(() => {
        originalShutdown(code);
      });
    }) as any;
    
    return { app, server, postgresql, redis };
    
  } catch (error) {
    console.error('❌ Failed to start Auth Service:', error);
    process.exit(1);
  }
}

// If this file is run directly, start the service
if (require.main === module) {
  startAuthServiceWithRetry().catch(error => {
    console.error('❌ Auth Service startup failed:', error);
    process.exit(1);
  });
}