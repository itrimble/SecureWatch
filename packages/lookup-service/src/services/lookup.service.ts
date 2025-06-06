import { Pool } from 'pg';
import { Redis } from 'redis';
import { 
  LookupTable, 
  LookupQuery, 
  LookupResult, 
  LookupRecord,
  LookupStats,
  APILookupConfig,
  ExternalLookupResult
} from '../types/lookup.types';

export class LookupService {
  private db: Pool;
  private redis: Redis;
  private cachePrefix = 'lookup:';
  private statsKey = 'lookup:stats';

  constructor(dbPool: Pool, redisClient: Redis) {
    this.db = dbPool;
    this.redis = redisClient;
  }

  /**
   * Perform a lookup query with caching
   */
  async lookup(query: LookupQuery): Promise<LookupResult> {
    const startTime = Date.now();
    const cacheKey = `${this.cachePrefix}${query.tableName}:${query.keyField}:${query.keyValue}`;

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        await this.updateStats('cache_hit');
        return {
          ...JSON.parse(cached),
          timestamp: new Date()
        };
      }

      // Query database
      const result = await this.queryDatabase(query);
      
      // Cache result for 5 minutes
      if (result.found) {
        await this.redis.setEx(cacheKey, 300, JSON.stringify(result));
      }

      // Update statistics
      await this.updateStats('query', Date.now() - startTime);
      await this.updateTableUsage(query.tableName);

      return result;

    } catch (error) {
      console.error('Lookup query failed:', error);
      return {
        found: false,
        tableName: query.tableName,
        keyField: query.keyField,
        keyValue: query.keyValue,
        timestamp: new Date()
      };
    }
  }

  /**
   * Perform multiple lookups in batch
   */
  async batchLookup(queries: LookupQuery[]): Promise<LookupResult[]> {
    const results: LookupResult[] = [];
    
    // Process in chunks of 50 for performance
    const chunkSize = 50;
    for (let i = 0; i < queries.length; i += chunkSize) {
      const chunk = queries.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(query => this.lookup(query))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Query database directly
   */
  private async queryDatabase(query: LookupQuery): Promise<LookupResult> {
    const tableName = `lookup_${query.tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    
    let sql: string;
    let params: any[];

    if (query.returnFields && query.returnFields.length > 0) {
      const fields = query.returnFields.map(f => `"${f}"`).join(', ');
      sql = `SELECT ${fields} FROM ${tableName} WHERE "${query.keyField}" = $1 LIMIT 1`;
    } else {
      sql = `SELECT * FROM ${tableName} WHERE "${query.keyField}" = $1 LIMIT 1`;
    }
    
    params = [query.keyValue];

    try {
      const result = await this.db.query(sql, params);
      
      if (result.rows.length > 0) {
        return {
          found: true,
          record: result.rows[0],
          tableName: query.tableName,
          keyField: query.keyField,
          keyValue: query.keyValue,
          timestamp: new Date()
        };
      } else {
        return {
          found: false,
          tableName: query.tableName,
          keyField: query.keyField,
          keyValue: query.keyValue,
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error('Database lookup failed:', error);
      throw error;
    }
  }

  /**
   * Get lookup table information
   */
  async getTableInfo(tableName: string): Promise<LookupTable | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM lookup_tables WHERE name = $1',
        [tableName]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as LookupTable;
    } catch (error) {
      console.error('Failed to get table info:', error);
      return null;
    }
  }

  /**
   * List all lookup tables
   */
  async listTables(): Promise<LookupTable[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM lookup_tables WHERE is_active = true ORDER BY name'
      );
      return result.rows as LookupTable[];
    } catch (error) {
      console.error('Failed to list tables:', error);
      return [];
    }
  }

  /**
   * Get lookup statistics
   */
  async getStats(): Promise<LookupStats> {
    try {
      const stats = await this.redis.hGetAll(this.statsKey);
      const tablesResult = await this.db.query(`
        SELECT 
          name,
          query_count,
          last_used
        FROM lookup_tables 
        WHERE is_active = true 
        ORDER BY query_count DESC 
        LIMIT 10
      `);

      return {
        totalTables: parseInt(stats.total_tables || '0'),
        totalRecords: parseInt(stats.total_records || '0'),
        totalQueries: parseInt(stats.total_queries || '0'),
        cacheHitRate: parseFloat(stats.cache_hit_rate || '0'),
        averageQueryTime: parseFloat(stats.avg_query_time || '0'),
        topTables: tablesResult.rows.map(row => ({
          name: row.name,
          queryCount: row.query_count,
          lastUsed: new Date(row.last_used)
        }))
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalTables: 0,
        totalRecords: 0,
        totalQueries: 0,
        cacheHitRate: 0,
        averageQueryTime: 0,
        topTables: []
      };
    }
  }

  /**
   * Clear cache for a specific table
   */
  async clearCache(tableName?: string): Promise<void> {
    try {
      if (tableName) {
        const pattern = `${this.cachePrefix}${tableName}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } else {
        const pattern = `${this.cachePrefix}*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * External API lookup
   */
  async externalLookup(
    value: string, 
    config: APILookupConfig
  ): Promise<ExternalLookupResult> {
    const startTime = Date.now();
    const cacheKey = `${this.cachePrefix}external:${config.id}:${value}`;

    try {
      // Check cache first
      if (config.cacheTTL > 0) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const result = JSON.parse(cached);
          return {
            ...result,
            cached: true,
            responseTime: Date.now() - startTime
          };
        }
      }

      // Make API request
      const url = new URL(config.baseUrl);
      
      // Add query parameters
      Object.entries(config.queryParams || {}).forEach(([key, val]) => {
        url.searchParams.append(key, val.replace('{value}', value));
      });

      const headers = {
        'Content-Type': 'application/json',
        ...config.headers
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        const result: ExternalLookupResult = {
          found: true,
          data: this.mapFields(data, config.fieldMapping.output),
          source: config.name,
          cached: false,
          responseTime: Date.now() - startTime
        };

        // Cache the result
        if (config.cacheTTL > 0) {
          await this.redis.setEx(cacheKey, config.cacheTTL, JSON.stringify(result));
        }

        return result;

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      return {
        found: false,
        source: config.name,
        cached: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update statistics
   */
  private async updateStats(type: 'query' | 'cache_hit', queryTime?: number): Promise<void> {
    try {
      if (type === 'query') {
        await this.redis.hIncrBy(this.statsKey, 'total_queries', 1);
        if (queryTime) {
          const currentAvg = parseFloat(await this.redis.hGet(this.statsKey, 'avg_query_time') || '0');
          const totalQueries = parseInt(await this.redis.hGet(this.statsKey, 'total_queries') || '1');
          const newAvg = ((currentAvg * (totalQueries - 1)) + queryTime) / totalQueries;
          await this.redis.hSet(this.statsKey, 'avg_query_time', newAvg.toString());
        }
      } else if (type === 'cache_hit') {
        const hits = await this.redis.hIncrBy(this.statsKey, 'cache_hits', 1);
        const total = parseInt(await this.redis.hGet(this.statsKey, 'total_queries') || '1');
        const hitRate = (hits / total) * 100;
        await this.redis.hSet(this.statsKey, 'cache_hit_rate', hitRate.toString());
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  /**
   * Update table usage statistics
   */
  private async updateTableUsage(tableName: string): Promise<void> {
    try {
      await this.db.query(
        'UPDATE lookup_tables SET query_count = query_count + 1, last_used = NOW() WHERE name = $1',
        [tableName]
      );
    } catch (error) {
      console.error('Failed to update table usage:', error);
    }
  }

  /**
   * Map API response fields
   */
  private mapFields(data: any, mapping: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};
    
    Object.entries(mapping).forEach(([outputField, inputPath]) => {
      const value = this.getNestedValue(data, inputPath);
      if (value !== undefined) {
        result[outputField] = value;
      }
    });

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}