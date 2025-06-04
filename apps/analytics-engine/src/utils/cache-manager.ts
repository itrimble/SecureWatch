/**
 * Cache Manager for KQL Analytics Engine
 * Redis-based caching with TTL, compression, and intelligent cache strategies
 */

import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { QueryResult, CacheEntry, CacheStats } from '../types/kql.types';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface CacheConfig {
  defaultTTL: number; // seconds
  maxMemoryUsage: number; // MB
  compressionThreshold: number; // bytes
  enableCompression: boolean;
  keyPrefix: string;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

export class CacheManager {
  private redis: Redis;
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    evictions: number;
    totalMemoryUsed: number;
  };
  
  constructor(redis: Redis, config?: Partial<CacheConfig>) {
    this.redis = redis;
    this.config = {
      defaultTTL: 300, // 5 minutes
      maxMemoryUsage: 1024, // 1GB
      compressionThreshold: 10240, // 10KB
      enableCompression: true,
      keyPrefix: 'kql_cache:',
      evictionPolicy: 'lru',
      ...config
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalMemoryUsed: 0
    };
    
    this.setupEvictionPolicy();
  }
  
  /**
   * Generate cache key from query parameters
   */
  public generateCacheKey(
    query: string, 
    timeRange?: any, 
    parameters?: Record<string, any>
  ): string {
    const keyComponents = {
      query: query.trim(),
      timeRange: timeRange || {},
      parameters: parameters || {}
    };
    
    const keyString = JSON.stringify(keyComponents);
    const hash = createHash('sha256').update(keyString).digest('hex');
    
    return `${this.config.keyPrefix}query:${hash}`;
  }
  
  /**
   * Get cached result
   */
  public async get(key: string): Promise<QueryResult | null> {
    try {
      const cachedData = await this.redis.get(key);
      
      if (!cachedData) {
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      
      // Parse cached entry
      const cacheEntry: CacheEntry = JSON.parse(cachedData);
      
      // Check if entry has expired
      if (new Date() > cacheEntry.expiresAt) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }
      
      // Update access statistics
      cacheEntry.accessCount++;
      cacheEntry.lastAccessed = new Date();
      
      // Decompress if needed
      let result = cacheEntry.result;
      if (this.config.enableCompression && cacheEntry.size > this.config.compressionThreshold) {
        const compressed = Buffer.from(result.data, 'base64');
        const decompressed = await gunzipAsync(compressed);
        result.data = JSON.parse(decompressed.toString());
      }
      
      // Update cache entry with new access stats
      await this.redis.setex(key, this.config.defaultTTL, JSON.stringify(cacheEntry));
      
      return {
        ...result,
        cached: true,
        cacheHit: true
      };
      
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }
  
  /**
   * Set cache entry
   */
  public async set(
    key: string, 
    result: QueryResult, 
    ttl?: number
  ): Promise<boolean> {
    try {
      const expirationTime = ttl || this.config.defaultTTL;
      
      // Check memory limits before caching
      if (!(await this.checkMemoryLimits(result))) {
        return false;
      }
      
      let dataToCache = result;
      let isCompressed = false;
      
      // Compress large results
      if (this.config.enableCompression) {
        const resultSize = JSON.stringify(result.data).length;
        
        if (resultSize > this.config.compressionThreshold) {
          const compressed = await gzipAsync(JSON.stringify(result.data));
          dataToCache = {
            ...result,
            data: compressed.toString('base64')
          };
          isCompressed = true;
        }
      }
      
      const cacheEntry: CacheEntry = {
        key,
        query: result.query,
        result: dataToCache,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (expirationTime * 1000)),
        accessCount: 0,
        lastAccessed: new Date(),
        size: JSON.stringify(dataToCache).length
      };
      
      // Store in Redis with TTL
      await this.redis.setex(key, expirationTime, JSON.stringify(cacheEntry));
      
      this.stats.sets++;
      this.stats.totalMemoryUsed += cacheEntry.size;
      
      // Track for eviction policy
      await this.trackForEviction(key, cacheEntry);
      
      return true;
      
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
  
  /**
   * Delete cache entry
   */
  public async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      
      if (result > 0) {
        this.stats.deletes++;
        await this.removeFromEvictionTracking(key);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
  
  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.config.keyPrefix}*`);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.deletes += keys.length;
      }
      
      // Reset memory tracking
      this.stats.totalMemoryUsed = 0;
      
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  public async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('memory');
      const memoryUsed = this.parseRedisMemoryInfo(info);
      
      const totalKeys = await this.redis.dbsize();
      const cacheKeys = await this.redis.keys(`${this.config.keyPrefix}*`);
      
      const hitRate = this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
        : 0;
      
      return {
        totalEntries: cacheKeys.length,
        totalSize: this.stats.totalMemoryUsed,
        hitRate,
        evictions: this.stats.evictions,
        averageQueryTime: 0, // Would be calculated from historical data
        cacheEnabled: true
      };
      
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        evictions: 0,
        averageQueryTime: 0,
        cacheEnabled: false
      };
    }
  }
  
  /**
   * Get detailed cache entry information
   */
  public async getCacheEntry(key: string): Promise<CacheEntry | null> {
    try {
      const cachedData = await this.redis.get(key);
      
      if (!cachedData) {
        return null;
      }
      
      return JSON.parse(cachedData);
      
    } catch (error) {
      console.error('Get cache entry error:', error);
      return null;
    }
  }
  
  /**
   * Warm cache with frequently used queries
   */
  public async warmCache(queries: Array<{ key: string; result: QueryResult; ttl?: number }>): Promise<number> {
    let warmed = 0;
    
    for (const { key, result, ttl } of queries) {
      if (await this.set(key, result, ttl)) {
        warmed++;
      }
    }
    
    return warmed;
  }
  
  /**
   * Get cache keys matching pattern
   */
  public async getKeysMatchingPattern(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(`${this.config.keyPrefix}${pattern}`);
    } catch (error) {
      console.error('Get keys matching pattern error:', error);
      return [];
    }
  }
  
  /**
   * Extend TTL for a cache entry
   */
  public async extendTTL(key: string, additionalSeconds: number): Promise<boolean> {
    try {
      const currentTTL = await this.redis.ttl(key);
      
      if (currentTTL > 0) {
        await this.redis.expire(key, currentTTL + additionalSeconds);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Extend TTL error:', error);
      return false;
    }
  }
  
  /**
   * Check memory limits before caching
   */
  private async checkMemoryLimits(result: QueryResult): Promise<boolean> {
    const resultSize = JSON.stringify(result).length;
    const maxBytes = this.config.maxMemoryUsage * 1024 * 1024; // Convert MB to bytes
    
    if (this.stats.totalMemoryUsed + resultSize > maxBytes) {
      // Try to evict some entries
      const evicted = await this.evictEntries(resultSize);
      
      if (!evicted) {
        console.warn('Cache memory limit reached, skipping cache for this result');
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Setup eviction policy
   */
  private setupEvictionPolicy(): void {
    switch (this.config.evictionPolicy) {
      case 'lru':
        this.setupLRUEviction();
        break;
      case 'lfu':
        this.setupLFUEviction();
        break;
      case 'ttl':
        this.setupTTLEviction();
        break;
    }
  }
  
  /**
   * Setup LRU (Least Recently Used) eviction
   */
  private setupLRUEviction(): void {
    // Redis sorted set to track access times
    // Implementation would use ZADD with timestamp as score
  }
  
  /**
   * Setup LFU (Least Frequently Used) eviction
   */
  private setupLFUEviction(): void {
    // Redis sorted set to track access frequency
    // Implementation would use ZADD with access count as score
  }
  
  /**
   * Setup TTL-based eviction
   */
  private setupTTLEviction(): void {
    // Redis sorted set to track expiration times
    // Implementation would use ZADD with expiration timestamp as score
  }
  
  /**
   * Track entry for eviction policy
   */
  private async trackForEviction(key: string, entry: CacheEntry): Promise<void> {
    const trackingKey = `${this.config.keyPrefix}eviction:${this.config.evictionPolicy}`;
    
    switch (this.config.evictionPolicy) {
      case 'lru':
        await this.redis.zadd(trackingKey, Date.now(), key);
        break;
      case 'lfu':
        await this.redis.zadd(trackingKey, entry.accessCount, key);
        break;
      case 'ttl':
        await this.redis.zadd(trackingKey, entry.expiresAt.getTime(), key);
        break;
    }
  }
  
  /**
   * Remove entry from eviction tracking
   */
  private async removeFromEvictionTracking(key: string): Promise<void> {
    const trackingKey = `${this.config.keyPrefix}eviction:${this.config.evictionPolicy}`;
    await this.redis.zrem(trackingKey, key);
  }
  
  /**
   * Evict entries to free up memory
   */
  private async evictEntries(neededBytes: number): Promise<boolean> {
    const trackingKey = `${this.config.keyPrefix}eviction:${this.config.evictionPolicy}`;
    
    try {
      // Get candidates for eviction (lowest scores first)
      const candidates = await this.redis.zrange(trackingKey, 0, 10);
      
      let freedBytes = 0;
      let evicted = 0;
      
      for (const candidate of candidates) {
        if (freedBytes >= neededBytes) {
          break;
        }
        
        const entry = await this.getCacheEntry(candidate);
        if (entry) {
          await this.delete(candidate);
          freedBytes += entry.size;
          evicted++;
        }
      }
      
      this.stats.evictions += evicted;
      this.stats.totalMemoryUsed -= freedBytes;
      
      return freedBytes >= neededBytes;
      
    } catch (error) {
      console.error('Eviction error:', error);
      return false;
    }
  }
  
  /**
   * Parse Redis memory info
   */
  private parseRedisMemoryInfo(info: string): number {
    const lines = info.split('\r\n');
    const memoryLine = lines.find(line => line.startsWith('used_memory:'));
    
    if (memoryLine) {
      return parseInt(memoryLine.split(':')[1], 10);
    }
    
    return 0;
  }
  
  /**
   * Cleanup expired entries (called periodically)
   */
  public async cleanupExpiredEntries(): Promise<number> {
    try {
      const keys = await this.redis.keys(`${this.config.keyPrefix}*`);
      let cleaned = 0;
      
      for (const key of keys) {
        const entry = await this.getCacheEntry(key);
        
        if (entry && new Date() > entry.expiresAt) {
          await this.delete(key);
          cleaned++;
        }
      }
      
      return cleaned;
      
    } catch (error) {
      console.error('Cleanup expired entries error:', error);
      return 0;
    }
  }
  
  /**
   * Get cache health status
   */
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const stats = await this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Check hit rate
    if (stats.hitRate < 50) {
      issues.push(`Low cache hit rate: ${stats.hitRate.toFixed(1)}%`);
      recommendations.push('Consider increasing cache TTL or reviewing query patterns');
      status = 'warning';
    }
    
    // Check memory usage
    const memoryUsagePercent = (stats.totalSize / (this.config.maxMemoryUsage * 1024 * 1024)) * 100;
    if (memoryUsagePercent > 90) {
      issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
      recommendations.push('Consider increasing memory limits or reviewing eviction policies');
      status = 'critical';
    } else if (memoryUsagePercent > 75) {
      issues.push(`Moderate memory usage: ${memoryUsagePercent.toFixed(1)}%`);
      recommendations.push('Monitor memory usage trends');
      status = status === 'critical' ? 'critical' : 'warning';
    }
    
    // Check eviction rate
    if (stats.evictions > 100) {
      issues.push(`High eviction count: ${stats.evictions}`);
      recommendations.push('Consider increasing cache memory or adjusting eviction policy');
      status = status === 'critical' ? 'critical' : 'warning';
    }
    
    return { status, issues, recommendations };
  }
}

export { CacheManager };