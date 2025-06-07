/**
 * Cache Manager for KQL Analytics Engine
 * Redis-based caching with TTL, compression, and intelligent cache strategies
 */
import { Redis } from 'ioredis';
import { QueryResult, CacheEntry, CacheStats } from '../types/kql.types';
export interface CacheConfig {
    defaultTTL: number;
    maxMemoryUsage: number;
    compressionThreshold: number;
    enableCompression: boolean;
    keyPrefix: string;
    evictionPolicy: 'lru' | 'lfu' | 'ttl';
}
export declare class CacheManager {
    private redis;
    private config;
    private stats;
    constructor(redis: Redis, config?: Partial<CacheConfig>);
    /**
     * Generate cache key from query parameters
     */
    generateCacheKey(query: string, timeRange?: any, parameters?: Record<string, any>): string;
    /**
     * Get cached result
     */
    get(key: string): Promise<QueryResult | null>;
    /**
     * Set cache entry
     */
    set(key: string, result: QueryResult, ttl?: number): Promise<boolean>;
    /**
     * Delete cache entry
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all cache entries
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<CacheStats>;
    /**
     * Get detailed cache entry information
     */
    getCacheEntry(key: string): Promise<CacheEntry | null>;
    /**
     * Warm cache with frequently used queries
     */
    warmCache(queries: Array<{
        key: string;
        result: QueryResult;
        ttl?: number;
    }>): Promise<number>;
    /**
     * Get cache keys matching pattern
     */
    getKeysMatchingPattern(pattern: string): Promise<string[]>;
    /**
     * Extend TTL for a cache entry
     */
    extendTTL(key: string, additionalSeconds: number): Promise<boolean>;
    /**
     * Check memory limits before caching
     */
    private checkMemoryLimits;
    /**
     * Setup eviction policy
     */
    private setupEvictionPolicy;
    /**
     * Setup LRU (Least Recently Used) eviction
     */
    private setupLRUEviction;
    /**
     * Setup LFU (Least Frequently Used) eviction
     */
    private setupLFUEviction;
    /**
     * Setup TTL-based eviction
     */
    private setupTTLEviction;
    /**
     * Track entry for eviction policy
     */
    private trackForEviction;
    /**
     * Remove entry from eviction tracking
     */
    private removeFromEvictionTracking;
    /**
     * Evict entries to free up memory
     */
    private evictEntries;
    /**
     * Parse Redis memory info
     */
    private parseRedisMemoryInfo;
    /**
     * Cleanup expired entries (called periodically)
     */
    cleanupExpiredEntries(): Promise<number>;
    /**
     * Get cache health status
     */
    getHealthStatus(): Promise<{
        status: 'healthy' | 'warning' | 'critical';
        issues: string[];
        recommendations: string[];
    }>;
}
export { CacheManager };
//# sourceMappingURL=cache-manager.d.ts.map