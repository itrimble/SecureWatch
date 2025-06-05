import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
export class DatabaseService {
    pool;
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'securewatch',
            user: process.env.DB_USER || 'securewatch',
            password: process.env.DB_PASSWORD || 'securewatch123',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.initializeTables();
    }
    /**
     * Initialize database tables for MCP marketplace
     */
    async initializeTables() {
        try {
            await this.pool.query(`
        CREATE TABLE IF NOT EXISTS mcp_marketplace_entries (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(500) NOT NULL,
          description TEXT,
          short_description VARCHAR(500),
          category VARCHAR(100),
          subcategory VARCHAR(100),
          publisher VARCHAR(255),
          version VARCHAR(50),
          mcp_endpoint TEXT,
          capabilities JSONB DEFAULT '[]',
          tags JSONB DEFAULT '[]',
          rating DECIMAL(3,2),
          downloads INTEGER DEFAULT 0,
          last_updated TIMESTAMP WITH TIME ZONE,
          documentation TEXT,
          repository TEXT,
          website TEXT,
          verified BOOLEAN DEFAULT FALSE,
          featured BOOLEAN DEFAULT FALSE,
          compatibility JSONB DEFAULT '[]',
          requirements JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
            await this.pool.query(`
        CREATE TABLE IF NOT EXISTS mcp_connections (
          id VARCHAR(255) PRIMARY KEY,
          entry_id VARCHAR(255) REFERENCES mcp_marketplace_entries(id),
          endpoint TEXT NOT NULL,
          server_info JSONB NOT NULL,
          status VARCHAR(50) DEFAULT 'disconnected',
          installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_connected TIMESTAMP WITH TIME ZONE,
          config JSONB DEFAULT '{}',
          enabled BOOLEAN DEFAULT TRUE,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
            await this.pool.query(`
        CREATE TABLE IF NOT EXISTS mcp_aggregator_config (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          url TEXT NOT NULL UNIQUE,
          enabled BOOLEAN DEFAULT TRUE,
          last_discovery TIMESTAMP WITH TIME ZONE,
          error_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
            // Insert default aggregator if not exists
            await this.pool.query(`
        INSERT INTO mcp_aggregator_config (name, url) 
        VALUES ('MCP Market RSS', 'https://mcpmarket.com/server/rss-buhe')
        ON CONFLICT (url) DO NOTHING
      `);
            logger.info('MCP marketplace database tables initialized');
        }
        catch (error) {
            logger.error('Failed to initialize database tables:', error);
            throw error;
        }
    }
    /**
     * Upsert marketplace entries
     */
    async upsertMarketplaceEntries(entries) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            for (const entry of entries) {
                await client.query(`
          INSERT INTO mcp_marketplace_entries (
            id, name, description, short_description, category, subcategory,
            publisher, version, mcp_endpoint, capabilities, tags, rating,
            downloads, last_updated, documentation, repository, website,
            verified, featured, compatibility, requirements, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            short_description = EXCLUDED.short_description,
            category = EXCLUDED.category,
            subcategory = EXCLUDED.subcategory,
            publisher = EXCLUDED.publisher,
            version = EXCLUDED.version,
            mcp_endpoint = EXCLUDED.mcp_endpoint,
            capabilities = EXCLUDED.capabilities,
            tags = EXCLUDED.tags,
            rating = EXCLUDED.rating,
            downloads = EXCLUDED.downloads,
            last_updated = EXCLUDED.last_updated,
            documentation = EXCLUDED.documentation,
            repository = EXCLUDED.repository,
            website = EXCLUDED.website,
            verified = EXCLUDED.verified,
            featured = EXCLUDED.featured,
            compatibility = EXCLUDED.compatibility,
            requirements = EXCLUDED.requirements,
            updated_at = NOW()
        `, [
                    entry.id, entry.name, entry.description, entry.shortDescription,
                    entry.category, entry.subcategory, entry.publisher, entry.version,
                    entry.mcpEndpoint, JSON.stringify(entry.capabilities), JSON.stringify(entry.tags),
                    entry.rating, entry.downloads, entry.lastUpdated, entry.documentation,
                    entry.repository, entry.website, entry.verified, entry.featured,
                    JSON.stringify(entry.compatibility), JSON.stringify(entry.requirements)
                ]);
            }
            await client.query('COMMIT');
            logger.info(`Upserted ${entries.length} marketplace entries`);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to upsert marketplace entries:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get all marketplace entries
     */
    async getMarketplaceEntries() {
        try {
            const result = await this.pool.query(`
        SELECT * FROM mcp_marketplace_entries 
        ORDER BY featured DESC, rating DESC, downloads DESC
      `);
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description,
                shortDescription: row.short_description,
                category: row.category,
                subcategory: row.subcategory,
                publisher: row.publisher,
                version: row.version,
                mcpEndpoint: row.mcp_endpoint,
                capabilities: row.capabilities || [],
                tags: row.tags || [],
                rating: parseFloat(row.rating) || 0,
                downloads: row.downloads || 0,
                lastUpdated: row.last_updated,
                documentation: row.documentation,
                repository: row.repository,
                website: row.website,
                verified: row.verified,
                featured: row.featured,
                compatibility: row.compatibility || [],
                requirements: row.requirements || []
            }));
        }
        catch (error) {
            logger.error('Failed to get marketplace entries:', error);
            throw error;
        }
    }
    /**
     * Upsert connection
     */
    async upsertConnection(connection) {
        try {
            await this.pool.query(`
        INSERT INTO mcp_connections (
          id, entry_id, endpoint, server_info, status, installed_at, 
          last_connected, config, enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          endpoint = EXCLUDED.endpoint,
          server_info = EXCLUDED.server_info,
          status = EXCLUDED.status,
          last_connected = EXCLUDED.last_connected,
          config = EXCLUDED.config,
          enabled = EXCLUDED.enabled,
          updated_at = NOW()
      `, [
                connection.id,
                connection.entryId,
                connection.endpoint,
                JSON.stringify(connection.serverInfo),
                connection.status,
                connection.installedAt,
                connection.lastConnected,
                JSON.stringify(connection.config || {}),
                connection.enabled
            ]);
            logger.info(`Upserted connection: ${connection.id}`);
        }
        catch (error) {
            logger.error('Failed to upsert connection:', error);
            throw error;
        }
    }
    /**
     * Get all connections
     */
    async getConnections() {
        try {
            const result = await this.pool.query(`
        SELECT c.*, e.name as entry_name FROM mcp_connections c
        LEFT JOIN mcp_marketplace_entries e ON c.entry_id = e.id
        WHERE c.enabled = TRUE
        ORDER BY c.installed_at DESC
      `);
            return result.rows.map(row => ({
                id: row.id,
                serverInfo: row.server_info,
                endpoint: row.endpoint,
                status: row.status,
                lastConnected: row.last_connected ? new Date(row.last_connected) : undefined,
                error: row.error_message
            }));
        }
        catch (error) {
            logger.error('Failed to get connections:', error);
            throw error;
        }
    }
    /**
     * Remove connection
     */
    async removeConnection(connectionId) {
        try {
            await this.pool.query('UPDATE mcp_connections SET enabled = FALSE, updated_at = NOW() WHERE id = $1', [connectionId]);
            logger.info(`Removed connection: ${connectionId}`);
        }
        catch (error) {
            logger.error('Failed to remove connection:', error);
            throw error;
        }
    }
    /**
     * Update connection status
     */
    async updateConnectionStatus(connectionId, status, error) {
        try {
            await this.pool.query(`
        UPDATE mcp_connections 
        SET status = $1, error_message = $2, updated_at = NOW()
        WHERE id = $3
      `, [status, error, connectionId]);
        }
        catch (error) {
            logger.error('Failed to update connection status:', error);
            throw error;
        }
    }
    /**
     * Close database connection
     */
    async close() {
        await this.pool.end();
    }
}
//# sourceMappingURL=database.service.js.map