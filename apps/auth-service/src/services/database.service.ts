import { Pool, PoolClient } from 'pg';
import logger from '../utils/logger';

export class DatabaseService {
  private static pool: Pool | null = null;

  /**
   * Initialize database connection pool
   */
  static async initialize(): Promise<void> {
    try {
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'securewatch',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        max: parseInt(process.env.DB_POOL_SIZE || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      this.pool.on('connect', () => {
        logger.info('Database connection established');
      });

      this.pool.on('error', (error) => {
        logger.error('Database connection error:', error);
      });

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      logger.info('Database connection pool initialized successfully');
      logger.info('Database timestamp:', result.rows[0].now);
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get database pool instance
   */
  private static getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  /**
   * Execute a query
   */
  static async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.getPool().query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query failed', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  static async getClient(): Promise<PoolClient> {
    try {
      return await this.getPool().connect();
    } catch (error) {
      logger.error('Failed to get database client:', error);
      throw error;
    }
  }

  /**
   * Execute queries within a transaction
   */
  static async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<void> {
    try {
      const result = await this.query('SELECT 1 as health_check');
      if (result.rows[0].health_check !== 1) {
        throw new Error('Health check query returned unexpected result');
      }
    } catch (error) {
      logger.error('Database health check failed:', error);
      throw new Error('Database is not healthy');
    }
  }

  /**
   * Close database connection pool
   */
  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Database connection pool closed');
    }
  }

  /**
   * Get pool status
   */
  static getPoolStatus() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Execute multiple queries in a batch
   */
  static async batch(queries: Array<{ text: string; params?: any[] }>): Promise<any[]> {
    const results: any[] = [];
    
    for (const query of queries) {
      const result = await this.query(query.text, query.params);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Check if table exists
   */
  static async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );
      return result.rows[0].exists;
    } catch (error) {
      logger.error(`Failed to check if table ${tableName} exists:`, error);
      throw error;
    }
  }

  /**
   * Get table row count
   */
  static async getTableRowCount(tableName: string): Promise<number> {
    try {
      const result = await this.query(`SELECT COUNT(*) FROM ${tableName}`);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error(`Failed to get row count for table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Validate API key
   */
  static async validateApiKey(apiKey: string): Promise<any | null> {
    try {
      // Hash the API key for lookup (in production, use proper hashing)
      const result = await this.query(
        `SELECT ak.id, ak.organization_id, ak.name, ak.permissions, ak.expires_at, ak.is_active,
                u.id as user_id
         FROM api_keys ak
         LEFT JOIN users u ON ak.created_by = u.id
         WHERE ak.key_hash = $1 AND ak.is_active = true`,
        [apiKey] // In production, this should be hashed
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        organizationId: row.organization_id,
        userId: row.user_id,
        name: row.name,
        permissions: row.permissions ? JSON.parse(row.permissions) : [],
        roles: [], // API keys don't have roles directly
        expiresAt: row.expires_at,
        isActive: row.is_active,
      };
    } catch (error) {
      logger.error('Failed to validate API key:', error);
      return null;
    }
  }

  /**
   * Update API key last used timestamp
   */
  static async updateApiKeyLastUsed(apiKeyId: string, ipAddress?: string): Promise<void> {
    try {
      await this.query(
        'UPDATE api_keys SET last_used_at = NOW(), last_used_ip = $1 WHERE id = $2',
        [ipAddress, apiKeyId]
      );
    } catch (error) {
      logger.error('Failed to update API key last used:', error);
    }
  }
}