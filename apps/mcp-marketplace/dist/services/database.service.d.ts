import { MCPMarketplaceEntry, MCPConnection, MCPServerInfo } from '@securewatch/mcp-client';
interface StoredConnection {
    id: string;
    entryId: string;
    endpoint: string;
    serverInfo: MCPServerInfo;
    status: string;
    installedAt: Date;
    lastConnected?: Date;
    config?: Record<string, any>;
    enabled: boolean;
}
export declare class DatabaseService {
    private pool;
    constructor();
    /**
     * Initialize database tables for MCP marketplace
     */
    private initializeTables;
    /**
     * Upsert marketplace entries
     */
    upsertMarketplaceEntries(entries: MCPMarketplaceEntry[]): Promise<void>;
    /**
     * Get all marketplace entries
     */
    getMarketplaceEntries(): Promise<MCPMarketplaceEntry[]>;
    /**
     * Upsert connection
     */
    upsertConnection(connection: Omit<StoredConnection, 'created_at' | 'updated_at'>): Promise<void>;
    /**
     * Get all connections
     */
    getConnections(): Promise<MCPConnection[]>;
    /**
     * Remove connection
     */
    removeConnection(connectionId: string): Promise<void>;
    /**
     * Update connection status
     */
    updateConnectionStatus(connectionId: string, status: string, error?: string): Promise<void>;
    /**
     * Close database connection
     */
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=database.service.d.ts.map