/**
 * Model Context Protocol (MCP) Types
 * Based on MCP specification for JSON-RPC communication
 */
export interface MCPMessage {
    jsonrpc: '2.0';
    id?: string | number;
}
export interface MCPRequest extends MCPMessage {
    method: string;
    params?: Record<string, any>;
}
export interface MCPResponse extends MCPMessage {
    result?: any;
    error?: MCPError;
}
export interface MCPError {
    code: number;
    message: string;
    data?: any;
}
export interface MCPNotification extends MCPMessage {
    method: string;
    params?: Record<string, any>;
}
export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
}
export interface MCPServerInfo {
    name: string;
    version: string;
    description?: string;
    author?: string;
    license?: string;
    homepage?: string;
    repository?: string;
    capabilities?: MCPCapabilities;
}
export interface MCPCapabilities {
    resources?: {
        subscribe?: boolean;
        listChanged?: boolean;
    };
    tools?: {
        listChanged?: boolean;
    };
    prompts?: {
        listChanged?: boolean;
    };
    sampling?: boolean;
}
export interface MCPMarketplaceEntry {
    id: string;
    name: string;
    description: string;
    shortDescription: string;
    category: string;
    subcategory?: string;
    publisher: string;
    version: string;
    mcpEndpoint: string;
    capabilities: string[];
    tags: string[];
    rating?: number;
    downloads?: number;
    lastUpdated: string;
    documentation?: string;
    repository?: string;
    website?: string;
    verified: boolean;
    featured: boolean;
    compatibility: string[];
    requirements: string[];
}
export interface MCPConnection {
    id: string;
    serverInfo: MCPServerInfo;
    endpoint: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    lastConnected?: Date;
    error?: string;
}
export interface MCPClientConfig {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    userAgent: string;
}
//# sourceMappingURL=types.d.ts.map