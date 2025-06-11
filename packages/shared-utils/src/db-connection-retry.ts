/**
 * Database Connection Retry Utility
 * Implements VisionCraft's recommended retry logic for infrastructure dependencies
 */

import { Pool, PoolConfig } from 'pg';
import { createClient, RedisClientType } from 'redis';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  onRetry?: (attempt: number, error: Error) => void;
  onSuccess?: (attempt: number) => void;
  onFailure?: (finalError: Error, attempts: number) => void;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 10,
  initialDelay: 1000, // 1 second
  maxDelay: 30000,    // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  onRetry: (attempt, error) => {
    console.log(`🔄 Database connection attempt ${attempt} failed: ${error.message}. Retrying...`);
  },
  onSuccess: (attempt) => {
    console.log(`✅ Database connection established after ${attempt} attempts`);
  },
  onFailure: (error, attempts) => {
    console.error(`❌ Database connection failed after ${attempts} attempts: ${error.message}`);
  }
};

/**
 * Calculate retry delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  let delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  );

  if (config.jitter) {
    // Add ±25% jitter to prevent thundering herd
    const jitterRange = delay * 0.25;
    delay += (Math.random() * 2 - 1) * jitterRange;
  }

  return Math.max(delay, 0);
}

/**
 * Generic retry wrapper for any async operation
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await operation();
      finalConfig.onSuccess?.(attempt);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === finalConfig.maxRetries) {
        finalConfig.onFailure?.(lastError, attempt);
        throw lastError;
      }

      finalConfig.onRetry?.(attempt, lastError);
      
      const delay = calculateDelay(attempt, finalConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * PostgreSQL connection with retry logic
 */
export class PostgreSQLConnection {
  private pool: Pool | null = null;
  private config: PoolConfig;
  private retryConfig: RetryConfig;

  constructor(config: PoolConfig, retryConfig: Partial<RetryConfig> = {}) {
    this.config = config;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  async connect(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    this.pool = await retryOperation(async () => {
      const pool = new Pool(this.config);
      
      // Test the connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      return pool;
    }, {
      ...this.retryConfig,
      onRetry: (attempt, error) => {
        console.log(`🔄 PostgreSQL connection attempt ${attempt}/${this.retryConfig.maxRetries} failed: ${error.message}`);
      },
      onSuccess: (attempt) => {
        console.log(`✅ PostgreSQL connected successfully after ${attempt} attempts`);
      }
    });

    return this.pool;
  }

  async query(text: string, params?: any[]) {
    const pool = await this.connect();
    return pool.query(text, params);
  }

  async end() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

/**
 * Redis connection with retry logic
 */
export class RedisConnection {
  private client: RedisClientType | null = null;
  private config: any;
  private retryConfig: RetryConfig;

  constructor(config: any, retryConfig: Partial<RetryConfig> = {}) {
    this.config = config;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  async connect(): Promise<RedisClientType> {
    if (this.client && this.client.isOpen) {
      return this.client;
    }

    this.client = await retryOperation(async () => {
      const client = createClient(this.config);
      
      await client.connect();
      
      // Test the connection
      await client.ping();
      
      return client;
    }, {
      ...this.retryConfig,
      onRetry: (attempt, error) => {
        console.log(`🔄 Redis connection attempt ${attempt}/${this.retryConfig.maxRetries} failed: ${error.message}`);
      },
      onSuccess: (attempt) => {
        console.log(`✅ Redis connected successfully after ${attempt} attempts`);
      }
    });

    return this.client;
  }

  async get(key: string) {
    const client = await this.connect();
    return client.get(key);
  }

  async set(key: string, value: string, options?: any) {
    const client = await this.connect();
    return client.set(key, value, options);
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }
}

/**
 * HTTP service connection with retry logic
 */
export async function retryHttpRequest(
  url: string,
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<Response> {
  return retryOperation(async () => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, {
    ...retryConfig,
    onRetry: (attempt, error) => {
      console.log(`🔄 HTTP request to ${url} attempt ${attempt} failed: ${error.message}`);
    }
  });
}

/**
 * Service health check with retry logic
 */
export async function waitForService(
  serviceName: string,
  healthCheckUrl: string,
  retryConfig: Partial<RetryConfig> = {}
): Promise<void> {
  await retryOperation(async () => {
    const response = await fetch(healthCheckUrl);
    
    if (!response.ok) {
      throw new Error(`Service ${serviceName} health check failed: HTTP ${response.status}`);
    }
    
    console.log(`✅ Service ${serviceName} is healthy`);
  }, {
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig,
    onRetry: (attempt, error) => {
      console.log(`🕐 Waiting for ${serviceName} to be ready (attempt ${attempt}): ${error.message}`);
    },
    onSuccess: (attempt) => {
      console.log(`✅ ${serviceName} is ready after ${attempt} attempts`);
    }
  });
}

/**
 * Environment-specific configuration helpers
 */
export function getPostgreSQLConfig(): PoolConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'securewatch',
    user: process.env.DB_USER || 'securewatch',
    password: process.env.DB_PASSWORD || 'securewatch_dev',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

export function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL || 'redis://:securewatch_dev@localhost:6379';
  return {
    url: redisUrl,
    socket: {
      connectTimeout: 10000,
      commandTimeout: 5000,
    },
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  };
}

/**
 * Startup initialization helper for services
 */
export async function initializeServiceDependencies(serviceName: string) {
  console.log(`🚀 Initializing ${serviceName} dependencies...`);
  
  // Initialize PostgreSQL
  const pgConnection = new PostgreSQLConnection(getPostgreSQLConfig(), {
    maxRetries: 15,
    initialDelay: 2000,
    onRetry: (attempt, error) => {
      console.log(`🔄 [${serviceName}] PostgreSQL connection attempt ${attempt}: ${error.message}`);
    }
  });
  
  // Initialize Redis
  const redisConnection = new RedisConnection(getRedisConfig(), {
    maxRetries: 15,
    initialDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`🔄 [${serviceName}] Redis connection attempt ${attempt}: ${error.message}`);
    }
  });
  
  // Connect to dependencies
  const [pgPool, redisClient] = await Promise.all([
    pgConnection.connect(),
    redisConnection.connect()
  ]);
  
  console.log(`✅ ${serviceName} dependencies initialized successfully`);
  
  return {
    postgresql: pgConnection,
    redis: redisConnection,
    pgPool,
    redisClient
  };
}

/**
 * Graceful shutdown helper
 */
export async function gracefulShutdown(
  serviceName: string,
  connections: {
    postgresql?: PostgreSQLConnection;
    redis?: RedisConnection;
  }
) {
  console.log(`🛑 Gracefully shutting down ${serviceName}...`);
  
  const shutdownPromises = [];
  
  if (connections.postgresql) {
    shutdownPromises.push(connections.postgresql.end());
  }
  
  if (connections.redis) {
    shutdownPromises.push(connections.redis.disconnect());
  }
  
  await Promise.all(shutdownPromises);
  console.log(`✅ ${serviceName} shutdown complete`);
}