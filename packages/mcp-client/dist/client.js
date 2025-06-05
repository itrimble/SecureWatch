"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClient = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * MCP Client for SecureWatch SIEM Marketplace
 * Handles connection to MCP servers and the MCP-RSS aggregator
 */
class MCPClient extends eventemitter3_1.default {
    constructor(config = {}) {
        super();
        this.connections = new Map();
        this.requestId = 0;
        this.config = {
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            userAgent: 'SecureWatch-SIEM/2.0 MCP-Client',
            ...config
        };
    }
    /**
     * Discover available MCP servers from RSS aggregator
     * Connects to https://mcpmarket.com/server/rss-buhe or custom aggregator
     */
    async discoverFromAggregator(aggregatorUrl = 'https://mcpmarket.com/server/rss-buhe') {
        try {
            console.log(`Discovering MCP servers from aggregator: ${aggregatorUrl}`);
            // First, try to get server info from aggregator
            const serverInfo = await this.getServerInfo(aggregatorUrl);
            console.log('Aggregator server info:', serverInfo);
            // Call resources.list to get available MCP servers
            const response = await this.makeRequest(aggregatorUrl, {
                method: 'resources/list',
                params: {}
            });
            if (!response.result?.resources) {
                throw new Error('No resources found in aggregator response');
            }
            // Transform MCP resources into marketplace entries
            const marketplaceEntries = response.result.resources.map((resource, index) => {
                return this.transformResourceToMarketplaceEntry(resource, index);
            });
            console.log(`Discovered ${marketplaceEntries.length} MCP servers from aggregator`);
            this.emit('discovery:complete', marketplaceEntries);
            return marketplaceEntries;
        }
        catch (error) {
            console.error('Failed to discover from aggregator:', error);
            this.emit('discovery:error', error);
            // Return fallback marketplace data if aggregator fails
            return this.getFallbackMarketplaceData();
        }
    }
    /**
     * Get server information from MCP endpoint
     */
    async getServerInfo(endpoint) {
        const response = await this.makeRequest(endpoint, {
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {
                    resources: { subscribe: true },
                    tools: {},
                    prompts: {}
                },
                clientInfo: {
                    name: 'SecureWatch SIEM',
                    version: '2.0.0'
                }
            }
        });
        if (!response.result) {
            throw new Error('Invalid server info response');
        }
        return response.result.serverInfo || {
            name: 'Unknown MCP Server',
            version: '1.0.0',
            description: 'MCP Server discovered via aggregator'
        };
    }
    /**
     * Connect to a specific MCP server
     */
    async connectToServer(id, endpoint) {
        try {
            console.log(`Connecting to MCP server: ${id} at ${endpoint}`);
            const serverInfo = await this.getServerInfo(endpoint);
            const connection = {
                id,
                serverInfo,
                endpoint,
                status: 'connected',
                lastConnected: new Date()
            };
            this.connections.set(id, connection);
            this.emit('connection:established', connection);
            return connection;
        }
        catch (error) {
            const connection = {
                id,
                serverInfo: { name: 'Failed Connection', version: '0.0.0' },
                endpoint,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            this.connections.set(id, connection);
            this.emit('connection:error', connection, error);
            throw error;
        }
    }
    /**
     * List resources from a connected MCP server
     */
    async listResources(serverId) {
        const connection = this.connections.get(serverId);
        if (!connection || connection.status !== 'connected') {
            throw new Error(`Server ${serverId} is not connected`);
        }
        const response = await this.makeRequest(connection.endpoint, {
            method: 'resources/list',
            params: {}
        });
        return response.result?.resources || [];
    }
    /**
     * List tools from a connected MCP server
     */
    async listTools(serverId) {
        const connection = this.connections.get(serverId);
        if (!connection || connection.status !== 'connected') {
            throw new Error(`Server ${serverId} is not connected`);
        }
        const response = await this.makeRequest(connection.endpoint, {
            method: 'tools/list',
            params: {}
        });
        return response.result?.tools || [];
    }
    /**
     * Invoke a tool on a connected MCP server
     */
    async invokeTool(serverId, toolName, arguments_) {
        const connection = this.connections.get(serverId);
        if (!connection || connection.status !== 'connected') {
            throw new Error(`Server ${serverId} is not connected`);
        }
        const response = await this.makeRequest(connection.endpoint, {
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: arguments_
            }
        });
        return response.result;
    }
    /**
     * Disconnect from a MCP server
     */
    async disconnectFromServer(serverId) {
        const connection = this.connections.get(serverId);
        if (connection) {
            connection.status = 'disconnected';
            this.connections.set(serverId, connection);
            this.emit('connection:closed', connection);
        }
    }
    /**
     * Get all connections
     */
    getConnections() {
        return Array.from(this.connections.values());
    }
    /**
     * Make HTTP request to MCP endpoint
     */
    async makeRequest(endpoint, request) {
        const fullRequest = {
            jsonrpc: '2.0',
            id: ++this.requestId,
            ...request
        };
        console.log(`Making MCP request to ${endpoint}:`, fullRequest.method);
        try {
            const response = await (0, node_fetch_1.default)(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': this.config.userAgent
                },
                body: JSON.stringify(fullRequest),
                signal: AbortSignal.timeout(this.config.timeout)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error(`MCP request failed for ${endpoint}:`, error);
            throw error;
        }
    }
    /**
     * Transform MCP resource to marketplace entry format
     */
    transformResourceToMarketplaceEntry(resource, index) {
        // Extract metadata from MCP resource
        const name = resource.name || `MCP Server ${index + 1}`;
        const description = resource.description || 'Model Context Protocol server';
        const uri = resource.uri || '';
        // Parse additional metadata if available
        const metadata = resource.metadata || {};
        return {
            id: `mcp-${index + 1}`,
            name,
            description,
            shortDescription: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
            category: metadata.category || 'integration',
            subcategory: metadata.subcategory,
            publisher: metadata.publisher || metadata.author || 'Community',
            version: metadata.version || '1.0.0',
            mcpEndpoint: uri,
            capabilities: metadata.capabilities || ['MCP Protocol'],
            tags: metadata.tags || ['MCP', 'Integration'],
            rating: metadata.rating,
            downloads: metadata.downloads,
            lastUpdated: metadata.lastUpdated || new Date().toISOString(),
            documentation: metadata.documentation,
            repository: metadata.repository,
            website: metadata.website,
            verified: metadata.verified || false,
            featured: metadata.featured || false,
            compatibility: metadata.compatibility || ['SecureWatch 2.0+'],
            requirements: metadata.requirements || ['MCP Protocol Support']
        };
    }
    /**
     * Fallback marketplace data if aggregator is unavailable
     */
    getFallbackMarketplaceData() {
        return [
            {
                id: 'mcp-fallback-1',
                name: 'Example MCP Server',
                description: 'Fallback example MCP server for demonstration',
                shortDescription: 'Example MCP integration',
                category: 'integration',
                publisher: 'SecureWatch',
                version: '1.0.0',
                mcpEndpoint: 'https://example.com/mcp',
                capabilities: ['MCP Protocol'],
                tags: ['MCP', 'Example'],
                lastUpdated: new Date().toISOString(),
                verified: false,
                featured: false,
                compatibility: ['SecureWatch 2.0+'],
                requirements: ['MCP Protocol Support']
            }
        ];
    }
}
exports.MCPClient = MCPClient;
//# sourceMappingURL=client.js.map