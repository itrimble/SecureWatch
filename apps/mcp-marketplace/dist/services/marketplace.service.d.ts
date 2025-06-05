import { MCPMarketplaceEntry, MCPConnection } from '@securewatch/mcp-client';
export declare class MCPMarketplaceService {
    private mcpClient;
    private dbService;
    private cacheService;
    private readonly CACHE_KEY_MARKETPLACE;
    private readonly CACHE_KEY_CONNECTIONS;
    private readonly CACHE_TTL;
    constructor();
    /**
     * Discover MCP servers from aggregator and cache results
     */
    discoverAndCache(aggregatorUrl?: string): Promise<MCPMarketplaceEntry[]>;
    /**
     * Get marketplace entries (from cache first, then database, then fresh discovery)
     */
    getMarketplaceEntries(): Promise<MCPMarketplaceEntry[]>;
    /**
     * Install/connect to an MCP server
     */
    installMCPServer(entryId: string): Promise<MCPConnection>;
    /**
     * Uninstall/disconnect from an MCP server
     */
    uninstallMCPServer(connectionId: string): Promise<void>;
    /**
     * Get installed MCP connections
     */
    getInstalledConnections(): Promise<MCPConnection[]>;
    /**
     * Test connection to an MCP server
     */
    testConnection(endpoint: string): Promise<{
        success: boolean;
        serverInfo?: any;
        error?: string;
    }>;
    /**
     * Invoke a tool on a connected MCP server
     */
    invokeTool(connectionId: string, toolName: string, arguments_: Record<string, any>): Promise<any>;
    /**
     * List resources from a connected MCP server
     */
    listResources(connectionId: string): Promise<import("@securewatch/mcp-client").MCPResource[]>;
    /**
     * List tools from a connected MCP server
     */
    listTools(connectionId: string): Promise<import("@securewatch/mcp-client").MCPTool[]>;
    private getCachedMarketplaceEntries;
    private updateConnectionsCache;
    private onDiscoveryComplete;
    private onDiscoveryError;
    private onConnectionEstablished;
    private onConnectionError;
}
//# sourceMappingURL=marketplace.service.d.ts.map