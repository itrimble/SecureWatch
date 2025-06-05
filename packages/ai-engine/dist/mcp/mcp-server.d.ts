import { EventEmitter } from 'events';
import { z } from 'zod';
import { MCPResource, MCPTool, MCPCapabilities } from '../types/ai.types';
declare const MCPResponseSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    method: z.ZodOptional<z.ZodString>;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    result: z.ZodOptional<z.ZodAny>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodNumber;
        message: z.ZodString;
        data: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        code: number;
        message: string;
        data?: any;
    }, {
        code: number;
        message: string;
        data?: any;
    }>>;
}, "strip", z.ZodTypeAny, {
    jsonrpc: "2.0";
    params?: Record<string, any> | undefined;
    id?: string | number | undefined;
    error?: {
        code: number;
        message: string;
        data?: any;
    } | undefined;
    method?: string | undefined;
    result?: any;
}, {
    jsonrpc: "2.0";
    params?: Record<string, any> | undefined;
    id?: string | number | undefined;
    error?: {
        code: number;
        message: string;
        data?: any;
    } | undefined;
    method?: string | undefined;
    result?: any;
}>;
type MCPResponse = z.infer<typeof MCPResponseSchema>;
interface MCPHandler {
    (params: any): Promise<any>;
}
/**
 * Model Context Protocol (MCP) Server Implementation
 * Provides a standardized interface for AI model interaction
 */
export declare class MCPServer extends EventEmitter {
    private handlers;
    private resources;
    private tools;
    private capabilities;
    private isRunning;
    constructor();
    /**
     * Start the MCP server
     */
    start(): void;
    /**
     * Stop the MCP server
     */
    stop(): void;
    /**
     * Handle incoming MCP request
     */
    handleRequest(message: any): Promise<MCPResponse>;
    /**
     * Register a method handler
     */
    registerHandler(method: string, handler: MCPHandler): void;
    /**
     * Register a resource
     */
    registerResource(resource: MCPResource): void;
    /**
     * Register a tool
     */
    registerTool(tool: MCPTool): void;
    /**
     * Get server capabilities
     */
    getCapabilities(): MCPCapabilities;
    /**
     * Update server capabilities
     */
    updateCapabilities(capabilities: Partial<MCPCapabilities>): void;
    private setupDefaultHandlers;
    private readResourceContent;
    private executeTool;
    private createSuccessResponse;
    private createErrorResponse;
}
/**
 * MCP Client for connecting to external MCP servers
 */
export declare class MCPClient extends EventEmitter {
    private endpoint;
    private serverCapabilities?;
    private requestId;
    constructor(endpoint: string);
    /**
     * Initialize connection with MCP server
     */
    initialize(): Promise<void>;
    /**
     * List available resources
     */
    listResources(): Promise<MCPResource[]>;
    /**
     * Read resource content
     */
    readResource(uri: string): Promise<string>;
    /**
     * List available tools
     */
    listTools(): Promise<MCPTool[]>;
    /**
     * Call a tool
     */
    callTool(name: string, arguments: any): Promise<any>;
    /**
     * Send request to MCP server
     */
    private sendRequest;
    /**
     * Get server capabilities
     */
    getServerCapabilities(): MCPCapabilities | undefined;
}
declare const _default: {
    MCPServer: typeof MCPServer;
    MCPClient: typeof MCPClient;
};
export default _default;
//# sourceMappingURL=mcp-server.d.ts.map