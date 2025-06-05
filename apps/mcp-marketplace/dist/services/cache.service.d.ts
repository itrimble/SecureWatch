export declare class CacheService {
    private client;
    private connected;
    constructor();
    private connect;
    /**
     * Set a value in cache with TTL
     */
    set(key: string, value: any, ttlSeconds: number): Promise<void>;
    /**
     * Get a value from cache
     */
    get<T = any>(key: string): Promise<T | null>;
    /**
     * Delete a value from cache
     */
    delete(key: string): Promise<void>;
    /**
     * Delete multiple keys matching a pattern
     */
    deletePattern(pattern: string): Promise<void>;
    /**
     * Check if a key exists in cache
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get TTL of a key
     */
    ttl(key: string): Promise<number>;
    /**
     * Flush all cache
     */
    flush(): Promise<void>;
    /**
     * Close Redis connection
     */
    close(): Promise<void>;
}
//# sourceMappingURL=cache.service.d.ts.map