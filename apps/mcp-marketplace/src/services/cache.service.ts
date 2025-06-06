import * as Redis from 'redis'
import { logger } from '../utils/logger.js'

export class CacheService {
  private client: Redis.RedisClientType
  private connected = false

  constructor() {
    this.client = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    })

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err)
      this.connected = false
    })

    this.client.on('connect', () => {
      logger.info('Redis Client Connected')
      this.connected = true
    })

    this.client.on('disconnect', () => {
      logger.warn('Redis Client Disconnected')
      this.connected = false
    })

    this.connect()
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect()
    } catch (error) {
      logger.error('Failed to connect to Redis:', error)
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.connected) {
      logger.warn('Redis not connected, skipping cache set')
      return
    }

    try {
      const serialized = JSON.stringify(value)
      await this.client.setEx(key, ttlSeconds, serialized)
      logger.debug(`Cached ${key} for ${ttlSeconds} seconds`)
    } catch (error) {
      logger.error(`Failed to cache ${key}:`, error)
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.connected) {
      logger.warn('Redis not connected, skipping cache get')
      return null
    }

    try {
      const cached = await this.client.get(key)
      if (cached) {
        logger.debug(`Cache hit for ${key}`)
        return JSON.parse(cached) as T
      }
      logger.debug(`Cache miss for ${key}`)
      return null
    } catch (error) {
      logger.error(`Failed to get cached ${key}:`, error)
      return null
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.connected) {
      return
    }

    try {
      await this.client.del(key)
      logger.debug(`Deleted cache key: ${key}`)
    } catch (error) {
      logger.error(`Failed to delete cache key ${key}:`, error)
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.connected) {
      return
    }

    try {
      const keys = await this.client.keys(pattern)
      if (keys.length > 0) {
        await this.client.del(keys)
        logger.debug(`Deleted ${keys.length} cache keys matching pattern: ${pattern}`)
      }
    } catch (error) {
      logger.error(`Failed to delete cache pattern ${pattern}:`, error)
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      return false
    }

    try {
      const exists = await this.client.exists(key)
      return exists === 1
    } catch (error) {
      logger.error(`Failed to check existence of cache key ${key}:`, error)
      return false
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.connected) {
      return -1
    }

    try {
      return await this.client.ttl(key)
    } catch (error) {
      logger.error(`Failed to get TTL for cache key ${key}:`, error)
      return -1
    }
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    if (!this.connected) {
      return
    }

    try {
      await this.client.flushAll()
      logger.info('Flushed all cache')
    } catch (error) {
      logger.error('Failed to flush cache:', error)
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.connected) {
      await this.client.quit()
      this.connected = false
    }
  }
}