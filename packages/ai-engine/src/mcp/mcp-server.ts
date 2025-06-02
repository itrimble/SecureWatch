import { EventEmitter } from 'events';
import { z } from 'zod';
import { MCPResource, MCPTool, MCPCapabilities } from '../types/ai.types';
import { logger } from '../utils/logger';

// MCP Protocol Messages
const MCPMessageSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z.record(z.any()).optional(),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
});

const MCPRequestSchema = MCPMessageSchema.extend({
  method: z.string(),
  params: z.record(z.any()).optional()
});

const MCPResponseSchema = MCPMessageSchema.extend({
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
});

type MCPMessage = z.infer<typeof MCPMessageSchema>;
type MCPRequest = z.infer<typeof MCPRequestSchema>;
type MCPResponse = z.infer<typeof MCPResponseSchema>;

interface MCPHandler {
  (params: any): Promise<any>;
}

/**
 * Model Context Protocol (MCP) Server Implementation
 * Provides a standardized interface for AI model interaction
 */
export class MCPServer extends EventEmitter {
  private handlers: Map<string, MCPHandler> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private capabilities: MCPCapabilities;
  private isRunning = false;

  constructor() {
    super();
    this.capabilities = {
      resources: {
        subscribe: true,
        listChanged: true
      },
      tools: {},
      prompts: {},
      logging: {}
    };
    
    this.setupDefaultHandlers();
  }

  /**
   * Start the MCP server
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('MCP server is already running');
      return;
    }

    this.isRunning = true;
    this.emit('server:started');
    logger.info('MCP server started');
  }

  /**
   * Stop the MCP server
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('MCP server is not running');
      return;
    }

    this.isRunning = false;
    this.emit('server:stopped');
    logger.info('MCP server stopped');
  }

  /**
   * Handle incoming MCP request
   */
  async handleRequest(message: any): Promise<MCPResponse> {
    try {
      const request = MCPRequestSchema.parse(message);
      
      if (!this.isRunning) {
        return this.createErrorResponse(request.id, -32000, 'Server not running');
      }

      const handler = this.handlers.get(request.method);
      if (!handler) {
        return this.createErrorResponse(request.id, -32601, `Method not found: ${request.method}`);
      }

      const result = await handler(request.params || {});
      return this.createSuccessResponse(request.id, result);

    } catch (error) {
      logger.error('Error handling MCP request:', error);
      
      if (error instanceof z.ZodError) {
        return this.createErrorResponse(
          undefined,
          -32602,
          'Invalid params',
          error.errors
        );
      }

      return this.createErrorResponse(
        undefined,
        -32603,
        'Internal error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Register a method handler
   */
  registerHandler(method: string, handler: MCPHandler): void {
    this.handlers.set(method, handler);
    logger.debug(`Registered MCP handler for method: ${method}`);
  }

  /**
   * Register a resource
   */
  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
    this.emit('resource:registered', resource);
    logger.debug(`Registered MCP resource: ${resource.uri}`);
  }

  /**
   * Register a tool
   */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    this.emit('tool:registered', tool);
    logger.debug(`Registered MCP tool: ${tool.name}`);
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): MCPCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Update server capabilities
   */
  updateCapabilities(capabilities: Partial<MCPCapabilities>): void {
    this.capabilities = { ...this.capabilities, ...capabilities };
    this.emit('capabilities:updated', this.capabilities);
  }

  private setupDefaultHandlers(): void {
    // Initialize method
    this.registerHandler('initialize', async (params) => {
      return {
        protocolVersion: '2024-11-05',
        capabilities: this.capabilities,
        serverInfo: {
          name: 'SecureWatch AI Engine',
          version: '1.0.0'
        }
      };
    });

    // List resources
    this.registerHandler('resources/list', async () => {
      return {
        resources: Array.from(this.resources.values())
      };
    });

    // Read resource
    this.registerHandler('resources/read', async (params) => {
      const { uri } = params;
      const resource = this.resources.get(uri);
      
      if (!resource) {
        throw new Error(`Resource not found: ${uri}`);
      }

      // Read resource content based on type
      const contents = await this.readResourceContent(resource);
      
      return {
        contents: [{
          uri: resource.uri,
          mimeType: resource.mimeType || 'text/plain',
          text: contents
        }]
      };
    });

    // Subscribe to resource changes
    this.registerHandler('resources/subscribe', async (params) => {
      const { uri } = params;
      
      // Set up subscription for resource changes
      this.emit('resource:subscribe', uri);
      
      return { success: true };
    });

    // Unsubscribe from resource changes
    this.registerHandler('resources/unsubscribe', async (params) => {
      const { uri } = params;
      
      this.emit('resource:unsubscribe', uri);
      
      return { success: true };
    });

    // List tools
    this.registerHandler('tools/list', async () => {
      return {
        tools: Array.from(this.tools.values())
      };
    });

    // Call tool
    this.registerHandler('tools/call', async (params) => {
      const { name, arguments: args } = params;
      const tool = this.tools.get(name);
      
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      // Execute tool
      const result = await this.executeTool(tool, args);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // Ping/health check
    this.registerHandler('ping', async () => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
    });

    // Get server info
    this.registerHandler('server/info', async () => {
      return {
        name: 'SecureWatch AI Engine MCP Server',
        version: '1.0.0',
        description: 'Model Context Protocol server for AI-enhanced security analytics',
        capabilities: this.capabilities,
        resources: this.resources.size,
        tools: this.tools.size,
        uptime: process.uptime()
      };
    });
  }

  private async readResourceContent(resource: MCPResource): Promise<string> {
    // This would be implemented based on the resource type and URI scheme
    // For now, return a placeholder
    return `Content of resource: ${resource.name}\nURI: ${resource.uri}\nDescription: ${resource.description || 'No description'}`;
  }

  private async executeTool(tool: MCPTool, args: any): Promise<any> {
    // This would be implemented to actually execute the tool
    // For now, return a mock result
    return {
      tool: tool.name,
      arguments: args,
      result: `Executed tool ${tool.name} with arguments`,
      timestamp: new Date().toISOString()
    };
  }

  private createSuccessResponse(id: any, result: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  private createErrorResponse(id: any, code: number, message: string, data?: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };
  }
}

/**
 * MCP Client for connecting to external MCP servers
 */
export class MCPClient extends EventEmitter {
  private serverCapabilities?: MCPCapabilities;
  private requestId = 0;

  constructor(private endpoint: string) {
    super();
  }

  /**
   * Initialize connection with MCP server
   */
  async initialize(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        resources: { subscribe: true },
        tools: {}
      },
      clientInfo: {
        name: 'SecureWatch AI Engine Client',
        version: '1.0.0'
      }
    });

    this.serverCapabilities = response.capabilities;
    this.emit('initialized', response);
    logger.info('MCP client initialized with server capabilities:', this.serverCapabilities);
  }

  /**
   * List available resources
   */
  async listResources(): Promise<MCPResource[]> {
    const response = await this.sendRequest('resources/list', {});
    return response.resources || [];
  }

  /**
   * Read resource content
   */
  async readResource(uri: string): Promise<string> {
    const response = await this.sendRequest('resources/read', { uri });
    return response.contents?.[0]?.text || '';
  }

  /**
   * List available tools
   */
  async listTools(): Promise<MCPTool[]> {
    const response = await this.sendRequest('tools/list', {});
    return response.tools || [];
  }

  /**
   * Call a tool
   */
  async callTool(name: string, arguments: any): Promise<any> {
    const response = await this.sendRequest('tools/call', { name, arguments });
    return response;
  }

  /**
   * Send request to MCP server
   */
  private async sendRequest(method: string, params: any): Promise<any> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params
    };

    // This would implement actual communication with the server
    // For now, simulate a response
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return { success: true, ...params };
  }

  /**
   * Get server capabilities
   */
  getServerCapabilities(): MCPCapabilities | undefined {
    return this.serverCapabilities;
  }
}

export default { MCPServer, MCPClient };