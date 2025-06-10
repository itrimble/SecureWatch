import Redis from 'ioredis';
import logger from '../utils/logger';

export class RedisService {
  private static client: Redis | null = null;

  /**
   * Initialize Redis connection
   */
  static async initialize(): Promise<void> {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      this.client.on('connect', () => {
        logger.info('Redis connection established');
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis connection ready');
      });

      // Test connection
      await this.client.ping();
      logger.info('Redis connection successful');
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  /**
   * Get Redis client instance
   */
  private static getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Set a key-value pair
   */
  static async set(key: string, value: string): Promise<void> {
    try {
      await this.getClient().set(key, value);
    } catch (error) {
      logger.error(`Failed to set Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set a key-value pair with expiration
   */
  static async setex(key: string, seconds: number, value: string): Promise<void> {
    try {
      await this.getClient().setex(key, seconds, value);
    } catch (error) {
      logger.error(`Failed to setex Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get value by key
   */
  static async get(key: string): Promise<string | null> {
    try {
      return await this.getClient().get(key);
    } catch (error) {
      logger.error(`Failed to get Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete one or more keys
   */
  static async delete(...keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;
      return await this.getClient().del(...keys);
    } catch (error) {
      logger.error(`Failed to delete Redis keys:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await this.getClient().exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to check Redis key existence ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get keys matching pattern
   */
  static async keys(pattern: string): Promise<string[]> {
    try {
      return await this.getClient().keys(pattern);
    } catch (error) {
      logger.error(`Failed to get Redis keys with pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Increment a key's value
   */
  static async incr(key: string): Promise<number> {
    try {
      return await this.getClient().incr(key);
    } catch (error) {
      logger.error(`Failed to increment Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set expiration on a key
   */
  static async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.getClient().expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to set expiration on Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get time to live for a key
   */
  static async ttl(key: string): Promise<number> {
    try {
      return await this.getClient().ttl(key);
    } catch (error) {
      logger.error(`Failed to get TTL for Redis key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Add to set
   */
  static async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.getClient().sadd(key, ...members);
    } catch (error) {
      logger.error(`Failed to add to Redis set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if member exists in set
   */
  static async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.getClient().sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to check Redis set membership ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all members of a set
   */
  static async smembers(key: string): Promise<string[]> {
    try {
      return await this.getClient().smembers(key);
    } catch (error) {
      logger.error(`Failed to get Redis set members ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove from set
   */
  static async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.getClient().srem(key, ...members);
    } catch (error) {
      logger.error(`Failed to remove from Redis set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<void> {
    try {
      await this.getClient().ping();
    } catch (error) {
      logger.error('Redis health check failed:', error);
      throw new Error('Redis is not healthy');
    }
  }

  /**
   * Close Redis connection
   */
  static async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis connection closed');
    }
  }

  /**
   * Flush all data (use with caution)
   */
  static async flushall(): Promise<void> {
    try {
      await this.getClient().flushall();
      logger.warn('Redis: All data flushed');
    } catch (error) {
      logger.error('Failed to flush Redis data:', error);
      throw error;
    }
  }
}