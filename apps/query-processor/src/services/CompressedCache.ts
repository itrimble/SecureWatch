// Enhanced Caching Service with Compression and Deduplication
// Implements advanced caching strategies for high-performance query processing

import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import { QueryResult } from '../types';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

interface CacheEntry {
  data: QueryResult;
  metadata: CacheMetadata;
  compressed: boolean;
  size: number;
  hash: string;
}

interface CacheMetadata {
  cachedAt: string;
  hitCount: number;
  lastAccessed: string;
  tags: string[];
  ttl: number;
  compressionRatio?: number;
  originalSize?: number;
  queryFingerprint: string;
}

interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  compressionSavings: number;
  hitRate: number;
  deduplicationSavings: number;
  memoryUsage: {
    used: number;
    peak: number;
    overhead: number;
  };
  performance: {
    avgRetrievalTime: number;
    avgCompressionTime: number;
    avgDecompressionTime: number;
  };
}

interface CompressionConfig {
  enabled: boolean;
  threshold: number;        // Minimum size for compression (bytes)
  algorithm: 'gzip' | 'lz4'; // Compression algorithm
  level: number;            // Compression level (1-9)
}

interface DeduplicationConfig {
  enabled: boolean;
  strategy: 'content' | 'structure' | 'semantic';
  similarity_threshold: number; // 0.0 - 1.0
}

export class CompressedCache {
  private redis: RedisClientType;
  private stats: CacheStats;
  private compressionConfig: CompressionConfig;
  private deduplicationConfig: DeduplicationConfig;
  private hashRing: Map<string, string[]> = new Map(); // For content deduplication
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor(redisUrl: string) {
    this.redis = createClient({ url: redisUrl });
    
    this.compressionConfig = {
      enabled: process.env.CACHE_COMPRESSION_ENABLED !== 'false',
      threshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '1024'), // 1KB
      algorithm: (process.env.CACHE_COMPRESSION_ALGORITHM as 'gzip' | 'lz4') || 'gzip',
      level: parseInt(process.env.CACHE_COMPRESSION_LEVEL || '6')
    };

    this.deduplicationConfig = {
      enabled: process.env.CACHE_DEDUPLICATION_ENABLED !== 'false',
      strategy: (process.env.CACHE_DEDUP_STRATEGY as 'content' | 'structure' | 'semantic') || 'content',
      similarity_threshold: parseFloat(process.env.CACHE_DEDUP_THRESHOLD || '0.95')
    };

    this.stats = {
      totalEntries: 0,
      totalSizeBytes: 0,
      compressionSavings: 0,
      hitRate: 0,
      deduplicationSavings: 0,
      memoryUsage: { used: 0, peak: 0, overhead: 0 },
      performance: {
        avgRetrievalTime: 0,
        avgCompressionTime: 0,
        avgDecompressionTime: 0
      }
    };

    this.initializePerformanceTracking();
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    logger.info('Compressed cache connected to Redis', {
      compressionEnabled: this.compressionConfig.enabled,
      deduplicationEnabled: this.deduplicationConfig.enabled,
      threshold: this.compressionConfig.threshold
    });
  }

  async get(
    queryType: string,
    query: string,
    parameters: Record<string, any>
  ): Promise<{ data: QueryResult; metadata: CacheMetadata } | null> {
    const startTime = Date.now();
    
    try {
      const cacheKey = this.generateCacheKey(queryType, query, parameters);
      const fingerprint = this.generateQueryFingerprint(query, parameters);
      
      // First check for exact match
      let cacheData = await this.redis.get(cacheKey);
      
      // If no exact match and deduplication is enabled, check for similar queries
      if (!cacheData && this.deduplicationConfig.enabled) {
        const similarKey = await this.findSimilarQuery(fingerprint);
        if (similarKey) {
          cacheData = await this.redis.get(similarKey);
          this.stats.deduplicationSavings++;
          logger.debug('Cache hit via deduplication', { originalKey: cacheKey, similarKey });
        }
      }

      if (!cacheData) {
        return null;
      }

      const entry: CacheEntry = JSON.parse(cacheData);
      
      // Decompress if needed
      let resultData = entry.data;
      if (entry.compressed) {
        const decompressStart = Date.now();
        const decompressedBuffer = await gunzipAsync(Buffer.from(entry.data as any, 'base64'));
        resultData = JSON.parse(decompressedBuffer.toString());
        
        const decompressionTime = Date.now() - decompressStart;
        this.updatePerformanceMetric('decompression', decompressionTime);
      }

      // Update hit statistics
      entry.metadata.hitCount++;
      entry.metadata.lastAccessed = new Date().toISOString();
      
      // Update cache entry with new metadata
      await this.redis.setEx(cacheKey, entry.metadata.ttl, JSON.stringify(entry));
      
      const retrievalTime = Date.now() - startTime;
      this.updatePerformanceMetric('retrieval', retrievalTime);

      logger.debug('Cache hit', {
        key: cacheKey,
        compressed: entry.compressed,
        hitCount: entry.metadata.hitCount,
        retrievalTime
      });

      return {
        data: resultData,
        metadata: entry.metadata
      };

    } catch (error) {
      logger.error('Cache retrieval failed:', error);
      return null;
    }
  }

  async set(
    queryType: string,
    query: string,
    result: QueryResult,
    options: { ttl: number; tags?: string[] },
    parameters: Record<string, any>,
    executionTime: number
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const cacheKey = this.generateCacheKey(queryType, query, parameters);
      const fingerprint = this.generateQueryFingerprint(query, parameters);
      const originalSize = JSON.stringify(result).length;
      
      // Check if we should deduplicate
      if (this.deduplicationConfig.enabled) {
        const existingSimilar = await this.findSimilarQuery(fingerprint);
        if (existingSimilar) {
          // Reference existing entry instead of storing duplicate
          await this.createReference(cacheKey, existingSimilar, options.ttl);
          return;
        }
      }

      let processedData = result;
      let compressed = false;
      let compressionRatio = 1.0;
      
      // Apply compression if beneficial
      if (this.compressionConfig.enabled && originalSize > this.compressionConfig.threshold) {
        const compressionStart = Date.now();
        
        try {
          const jsonString = JSON.stringify(result);
          const compressedBuffer = await gzipAsync(jsonString);
          const compressedSize = compressedBuffer.length;
          
          // Only use compression if it provides meaningful savings
          if (compressedSize < originalSize * 0.8) {
            processedData = compressedBuffer.toString('base64') as any;
            compressed = true;
            compressionRatio = originalSize / compressedSize;
            this.stats.compressionSavings += (originalSize - compressedSize);
          }
          
          const compressionTime = Date.now() - compressionStart;
          this.updatePerformanceMetric('compression', compressionTime);
          
        } catch (compressionError) {
          logger.warn('Compression failed, storing uncompressed:', compressionError);
        }
      }

      const metadata: CacheMetadata = {
        cachedAt: new Date().toISOString(),
        hitCount: 0,
        lastAccessed: new Date().toISOString(),
        tags: options.tags || [],
        ttl: options.ttl,
        compressionRatio,
        originalSize,
        queryFingerprint: fingerprint
      };

      const entry: CacheEntry = {
        data: processedData,
        metadata,
        compressed,
        size: compressed ? (processedData as string).length : originalSize,
        hash: this.generateContentHash(result)
      };

      // Store in Redis
      await this.redis.setEx(cacheKey, options.ttl, JSON.stringify(entry));
      
      // Update deduplication index
      if (this.deduplicationConfig.enabled) {
        await this.updateDeduplicationIndex(fingerprint, cacheKey);
      }

      // Update statistics
      this.stats.totalEntries++;
      this.stats.totalSizeBytes += entry.size;

      const storageTime = Date.now() - startTime;
      logger.debug('Cache entry stored', {
        key: cacheKey,
        originalSize,
        finalSize: entry.size,
        compressed,
        compressionRatio: compressionRatio.toFixed(2),
        storageTime
      });

    } catch (error) {
      logger.error('Cache storage failed:', error);
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      const keys = await this.redis.keys('cache:*');
      let invalidated = 0;
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const entry: CacheEntry = JSON.parse(data);
          const hasMatchingTag = tags.some(tag => entry.metadata.tags.includes(tag));
          
          if (hasMatchingTag) {
            await this.redis.del(key);
            invalidated++;
            this.stats.totalEntries--;
            this.stats.totalSizeBytes -= entry.size;
          }
        }
      }

      logger.info(`Invalidated ${invalidated} cache entries by tags`, { tags });
      return invalidated;

    } catch (error) {
      logger.error('Cache invalidation by tags failed:', error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys('cache:*');
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      
      // Reset statistics
      this.stats.totalEntries = 0;
      this.stats.totalSizeBytes = 0;
      this.stats.compressionSavings = 0;
      this.stats.deduplicationSavings = 0;
      
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear failed:', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      // Update real-time memory usage
      const memInfo = await this.redis.memory('usage', 'cache:*');
      this.stats.memoryUsage.used = memInfo || 0;
      
      // Calculate hit rate (simplified)
      const totalHits = this.stats.deduplicationSavings;
      const totalRequests = totalHits + this.stats.totalEntries;
      this.stats.hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
      
      // Update performance averages
      this.stats.performance.avgRetrievalTime = this.getAverageMetric('retrieval');
      this.stats.performance.avgCompressionTime = this.getAverageMetric('compression');
      this.stats.performance.avgDecompressionTime = this.getAverageMetric('decompression');

      return { ...this.stats };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return this.stats;
    }
  }

  async warmUp(commonQueries: Array<{ type: string; query: string; params?: any }>): Promise<void> {
    logger.info('Starting cache warm-up', { queries: commonQueries.length });
    
    // This would typically pre-execute common queries
    // For now, we'll just log the intent
    for (const query of commonQueries) {
      logger.debug('Would warm up query', { type: query.type, query: query.query.substring(0, 100) });
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
    logger.info('Compressed cache disconnected');
  }

  // Private helper methods

  private generateCacheKey(queryType: string, query: string, parameters: Record<string, any>): string {
    const paramString = JSON.stringify(parameters, Object.keys(parameters).sort());
    const combinedString = `${queryType}:${query}:${paramString}`;
    return `cache:${createHash('sha256').update(combinedString).digest('hex')}`;
  }

  private generateQueryFingerprint(query: string, parameters: Record<string, any>): string {
    // Create a structural fingerprint for deduplication
    const normalized = query
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/['"`]/g, '')
      .trim();
    
    const structure = this.extractQueryStructure(normalized);
    const paramFingerprint = this.generateParameterFingerprint(parameters);
    
    return createHash('md5').update(`${structure}:${paramFingerprint}`).digest('hex');
  }

  private extractQueryStructure(query: string): string {
    // Extract structural elements (table names, column patterns, etc.)
    // This is a simplified implementation
    return query
      .replace(/\b\d+\b/g, 'NUM') // Replace numbers
      .replace(/'[^']*'/g, 'STR') // Replace string literals
      .replace(/\b\w+\.\w+/g, 'COL') // Replace column references
      .substring(0, 200); // Limit length
  }

  private generateParameterFingerprint(parameters: Record<string, any>): string {
    // Create fingerprint based on parameter types and structure, not values
    const structure = Object.keys(parameters)
      .sort()
      .map(key => `${key}:${typeof parameters[key]}`)
      .join(',');
    
    return createHash('md5').update(structure).digest('hex');
  }

  private generateContentHash(result: QueryResult): string {
    // Generate hash for content-based deduplication
    const contentString = JSON.stringify({
      columns: result.columns,
      total_rows: result.total_rows,
      sample: result.data.slice(0, 10) // Sample first 10 rows for comparison
    });
    
    return createHash('sha256').update(contentString).digest('hex');
  }

  private async findSimilarQuery(fingerprint: string): Promise<string | null> {
    // Simple similarity check - in production, you'd use more sophisticated algorithms
    const candidates = this.hashRing.get(fingerprint.substring(0, 8)) || [];
    
    for (const candidate of candidates) {
      const similarity = this.calculateSimilarity(fingerprint, candidate);
      if (similarity >= this.deduplicationConfig.similarity_threshold) {
        return candidate;
      }
    }
    
    return null;
  }

  private calculateSimilarity(fp1: string, fp2: string): number {
    // Simple Hamming distance-based similarity
    let matches = 0;
    const length = Math.min(fp1.length, fp2.length);
    
    for (let i = 0; i < length; i++) {
      if (fp1[i] === fp2[i]) matches++;
    }
    
    return matches / length;
  }

  private async updateDeduplicationIndex(fingerprint: string, cacheKey: string): Promise<void> {
    const prefix = fingerprint.substring(0, 8);
    const existing = this.hashRing.get(prefix) || [];
    existing.push(cacheKey);
    this.hashRing.set(prefix, existing);
    
    // Maintain reasonable index size
    if (existing.length > 100) {
      this.hashRing.set(prefix, existing.slice(-50));
    }
  }

  private async createReference(newKey: string, existingKey: string, ttl: number): Promise<void> {
    // Create a lightweight reference to existing entry
    const reference = {
      type: 'reference',
      target: existingKey,
      createdAt: new Date().toISOString()
    };
    
    await this.redis.setEx(newKey, ttl, JSON.stringify(reference));
    this.stats.deduplicationSavings++;
  }

  private initializePerformanceTracking(): void {
    this.performanceMetrics.set('retrieval', []);
    this.performanceMetrics.set('compression', []);
    this.performanceMetrics.set('decompression', []);
  }

  private updatePerformanceMetric(metric: string, value: number): void {
    const values = this.performanceMetrics.get(metric) || [];
    values.push(value);
    
    // Keep only recent measurements
    if (values.length > 1000) {
      values.splice(0, values.length - 1000);
    }
    
    this.performanceMetrics.set(metric, values);
  }

  private getAverageMetric(metric: string): number {
    const values = this.performanceMetrics.get(metric) || [];
    if (values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}