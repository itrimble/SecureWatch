import EventEmitter from 'eventemitter3';
import { MCPServerInfo, MCPResource, MCPTool, MCPConnection, MCPClientConfig, MCPMarketplaceEntry } from './types';
/**
 * MCP Client for SecureWatch SIEM Marketplace
 * Handles connection to MCP servers and the MCP-RSS aggregator
 */
export declare class MCPClient extends EventEmitter {
    private connections;
    private config;
    private requestId;
    constructor(config?: Partial<MCPClientConfig>);
    /**
     * Discover available MCP servers from RSS aggregator
     * Connects to https://mcpmarket.com/server/rss-buhe or custom aggregator
     */
    discoverFromAggregator(aggregatorUrl?: string): Promise<MCPMarketplaceEntry[]>;
    /**
     * Get server information from MCP endpoint
     */
    getServerInfo(endpoint: string): Promise<MCPServerInfo>;
    /**
     * Connect to a specific MCP server
     */
    connectToServer(id: string, endpoint: string): Promise<MCPConnection>;
    /**
     * List resources from a connected MCP server
     */
    listResources(serverId: string): Promise<MCPResource[]>;
    /**
     * List tools from a connected MCP server
     */
    listTools(serverId: string): Promise<MCPTool[]>;
    /**
     * Invoke a tool on a connected MCP server
     */
    invokeTool(serverId: string, toolName: string, arguments_: Record<string, any>): Promise<any>;
    /**
     * Disconnect from a MCP server
     */
    disconnectFromServer(serverId: string): Promise<void>;
    /**
     * Get all connections
     */
    getConnections(): MCPConnection[];
    /**
     * Make HTTP request to MCP endpoint
     */
    private makeRequest;
    /**
     * Transform MCP resource to marketplace entry format
     */
    private transformResourceToMarketplaceEntry;
    /**
     * Fallback marketplace data if aggregator is unavailable
     */
    private getFallbackMarketplaceData;
}
//# sourceMappingURL=client.d.ts.map