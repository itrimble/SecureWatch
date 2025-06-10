import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

interface CachedResult {
  data: any;
  metadata: {
    cachedAt: Date;
    hitCount: number;
    size: number;
    queryDuration?: number;
  };
}

export class QueryCache {
  private client: RedisClientType;
  private readonly defaultTTL = 3600; // 1 hour default
  private readonly maxCacheSize = 100 * 1024 * 1024; // 100MB per cache entry
  private readonly cachePrefix = 'query:cache:';
  private readonly tagPrefix = 'query:tag:';
  private readonly metricsPrefix = 'query:metrics:';

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
    this.setupClient();
  }

  private async setupClient(): Promise<void> {
    this.client.on('error', (err) => {
      logger.error('Redis cache client error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Query cache connected to Redis');
    });

    await this.client.connect();
  }

  /**
   * Generate a cache key from query parameters
   */
  private generateCacheKey(queryType: string, query: string, params?: any): string {
    const hash = createHash('sha256');
    hash.update(queryType);
    hash.update(query);
    if (params) {
      hash.update(JSON.stringify(params));
    }
    return `${this.cachePrefix}${hash.digest('hex')}`;
  }

  /**
   * Get cached query result
   */
  async get(queryType: string, query: string, params?: any): Promise<CachedResult | null> {
    try {
      const key = this.generateCacheKey(queryType, query, params);
      const cached = await this.client.get(key);

      if (!cached) {
        await this.incrementMetric('cache:miss');
        return null;
      }

      const result: CachedResult = JSON.parse(cached);
      
      // Update hit count
      result.metadata.hitCount++;
      await this.client.set(key, JSON.stringify(result), {
        KEEPTTL: true
      });

      await this.incrementMetric('cache:hit');
      await this.recordCacheHit(key);

      logger.info('Cache hit', {
        queryType,
        hitCount: result.metadata.hitCount,
        cachedAt: result.metadata.cachedAt,
        size: result.metadata.size
      });

      return result;
    } catch (error) {
      logger.error('Cache get error:', error);
      await this.incrementMetric('cache:error');
      return null;
    }
  }

  /**
   * Set query result in cache
   */
  async set(
    queryType: string,
    query: string,
    data: any,
    options: CacheOptions = {},
    params?: any,
    queryDuration?: number
  ): Promise<boolean> {
    try {
      const key = this.generateCacheKey(queryType, query, params);
      const serialized = JSON.stringify(data);
      const size = Buffer.byteLength(serialized);

      // Skip caching if too large
      if (size > this.maxCacheSize) {
        logger.warn('Query result too large to cache', {
          size,
          maxSize: this.maxCacheSize,
          queryType
        });
        await this.incrementMetric('cache:skip:size');
        return false;
      }

      const cachedResult: CachedResult = {
        data,
        metadata: {
          cachedAt: new Date(),
          hitCount: 0,
          size,
          queryDuration
        }
      };

      const ttl = options.ttl || this.defaultTTL;
      await this.client.set(key, JSON.stringify(cachedResult), {
        EX: ttl
      });

      // Handle cache tags
      if (options.tags && options.tags.length > 0) {
        await this.addToTags(key, options.tags, ttl);
      }

      await this.incrementMetric('cache:set');
      await this.recordCacheSize(size);

      logger.info('Query result cached', {
        queryType,
        size,
        ttl,
        tags: options.tags
      });

      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      await this.incrementMetric('cache:error');
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      const keysToDelete = new Set<string>();

      for (const tag of tags) {
        const tagKey = `${this.tagPrefix}${tag}`;
        const members = await this.client.sMembers(tagKey);
        members.forEach(key => keysToDelete.add(key));
        
        // Delete the tag set
        await this.client.del(tagKey);
      }

      if (keysToDelete.size > 0) {
        await this.client.del(Array.from(keysToDelete));
      }

      await this.incrementMetric('cache:invalidate', keysToDelete.size);
      logger.info('Cache invalidated by tags', {
        tags,
        keysDeleted: keysToDelete.size
      });

      return keysToDelete.size;
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Clear all cached queries
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.client.keys(`${this.cachePrefix}*`);
      const tagKeys = await this.client.keys(`${this.tagPrefix}*`);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      if (tagKeys.length > 0) {
        await this.client.del(tagKeys);
      }

      await this.incrementMetric('cache:clear', keys.length);
      logger.info('Query cache cleared', { keysDeleted: keys.length });
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const metricsKeys = await this.client.keys(`${this.metricsPrefix}*`);
      const metrics: Record<string, number> = {};

      for (const key of metricsKeys) {
        const value = await this.client.get(key);
        const metricName = key.replace(this.metricsPrefix, '');
        metrics[metricName] = parseInt(value || '0', 10);
      }

      // Calculate hit rate
      const hits = metrics['cache:hit'] || 0;
      const misses = metrics['cache:miss'] || 0;
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      // Get cache size info
      const cacheKeys = await this.client.keys(`${this.cachePrefix}*`);
      const info = await this.client.info('memory');
      const memoryUsed = info.match(/used_memory:(\d+)/)?.[1] || '0';

      return {
        metrics,
        hitRate: hitRate.toFixed(2),
        totalRequests: total,
        cacheEntries: cacheKeys.length,
        memoryUsed: parseInt(memoryUsed, 10),
        uptime: process.uptime()
      };
    } catch (error) {
      logger.error('Get stats error:', error);
      return {};
    }
  }

  /**
   * Warm up cache with predefined queries
   */
  async warmUp(queries: Array<{ type: string; query: string; params?: any }>): Promise<void> {
    logger.info('Starting cache warm-up', { queryCount: queries.length });

    for (const q of queries) {
      try {
        const cached = await this.get(q.type, q.query, q.params);
        if (!cached) {
          logger.info('Cache warm-up: query needs execution', {
            type: q.type,
            query: q.query.substring(0, 100)
          });
        }
      } catch (error) {
        logger.error('Cache warm-up error:', error);
      }
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }

  // Private helper methods

  private async addToTags(key: string, tags: string[], ttl: number): Promise<void> {
    for (const tag of tags) {
      const tagKey = `${this.tagPrefix}${tag}`;
      await this.client.sAdd(tagKey, key);
      await this.client.expire(tagKey, ttl);
    }
  }

  private async incrementMetric(metric: string, amount = 1): Promise<void> {
    const key = `${this.metricsPrefix}${metric}`;
    await this.client.incrBy(key, amount);
  }

  private async recordCacheHit(key: string): Promise<void> {
    const hitKey = `${key}:hits`;
    await this.client.incr(hitKey);
  }

  private async recordCacheSize(size: number): Promise<void> {
    const sizeKey = `${this.metricsPrefix}total:size`;
    await this.client.incrBy(sizeKey, size);
  }
}