import { MCPClient, MCPMarketplaceEntry, MCPConnection } from '@securewatch/mcp-client'
import { DatabaseService } from './database.service.js'
import { CacheService } from './cache.service.js'
import { logger } from '../utils/logger.js'

export class MCPMarketplaceService {
  private mcpClient: MCPClient
  private dbService: DatabaseService
  private cacheService: CacheService
  
  private readonly CACHE_KEY_MARKETPLACE = 'mcp:marketplace:entries'
  private readonly CACHE_KEY_CONNECTIONS = 'mcp:connections'
  private readonly CACHE_TTL = 1800 // 30 minutes

  constructor() {
    this.mcpClient = new MCPClient({
      timeout: 30000,
      retryAttempts: 3,
      userAgent: 'SecureWatch-SIEM/2.0 MCP-Marketplace'
    })
    this.dbService = new DatabaseService()
    this.cacheService = new CacheService()

    // Listen to MCP client events
    this.mcpClient.on('discovery:complete', this.onDiscoveryComplete.bind(this))
    this.mcpClient.on('discovery:error', this.onDiscoveryError.bind(this))
    this.mcpClient.on('connection:established', this.onConnectionEstablished.bind(this))
    this.mcpClient.on('connection:error', this.onConnectionError.bind(this))
  }

  /**
   * Discover MCP servers from aggregator and cache results
   */
  async discoverAndCache(aggregatorUrl?: string): Promise<MCPMarketplaceEntry[]> {
    try {
      logger.info('Starting MCP discovery from aggregator')
      
      const aggregator = aggregatorUrl || process.env.MCP_AGGREGATOR_URL || 'https://mcpmarket.com/server/rss-buhe'
      const entries = await this.mcpClient.discoverFromAggregator(aggregator)
      
      // Cache the results
      await this.cacheService.set(this.CACHE_KEY_MARKETPLACE, entries, this.CACHE_TTL)
      
      // Store in database for persistence
      await this.dbService.upsertMarketplaceEntries(entries)
      
      logger.info(`Successfully discovered and cached ${entries.length} MCP entries`)
      return entries

    } catch (error) {
      logger.error('Failed to discover and cache MCP entries:', error)
      
      // Try to return cached data as fallback
      const cached = await this.getCachedMarketplaceEntries()
      if (cached.length > 0) {
        logger.info(`Returning ${cached.length} cached entries as fallback`)
        return cached
      }
      
      throw error
    }
  }

  /**
   * Get marketplace entries (from cache first, then database, then fresh discovery)
   */
  async getMarketplaceEntries(): Promise<MCPMarketplaceEntry[]> {
    try {
      // Try cache first
      const cached = await this.getCachedMarketplaceEntries()
      if (cached.length > 0) {
        logger.debug(`Returning ${cached.length} entries from cache`)
        return cached
      }

      // Try database
      const fromDb = await this.dbService.getMarketplaceEntries()
      if (fromDb.length > 0) {
        logger.debug(`Returning ${fromDb.length} entries from database`)
        // Update cache
        await this.cacheService.set(this.CACHE_KEY_MARKETPLACE, fromDb, this.CACHE_TTL)
        return fromDb
      }

      // Fresh discovery as last resort
      logger.info('No cached data found, performing fresh discovery')
      return await this.discoverAndCache()

    } catch (error) {
      logger.error('Failed to get marketplace entries:', error)
      throw error
    }
  }

  /**
   * Install/connect to an MCP server
   */
  async installMCPServer(entryId: string): Promise<MCPConnection> {
    try {
      logger.info(`Installing MCP server: ${entryId}`)
      
      // Get the marketplace entry
      const entries = await this.getMarketplaceEntries()
      const entry = entries.find(e => e.id === entryId)
      
      if (!entry) {
        throw new Error(`MCP server entry not found: ${entryId}`)
      }

      if (!entry.mcpEndpoint) {
        throw new Error(`No MCP endpoint specified for: ${entry.name}`)
      }

      // Connect to the MCP server
      const connection = await this.mcpClient.connectToServer(entryId, entry.mcpEndpoint)
      
      // Store connection in database
      await this.dbService.upsertConnection({
        id: connection.id,
        entryId: entryId,
        endpoint: connection.endpoint,
        serverInfo: connection.serverInfo,
        status: connection.status,
        installedAt: new Date(),
        lastConnected: connection.lastConnected,
        enabled: true
      })

      // Update cache
      await this.updateConnectionsCache()
      
      logger.info(`Successfully installed MCP server: ${entry.name}`)
      return connection

    } catch (error) {
      logger.error(`Failed to install MCP server ${entryId}:`, error)
      throw error
    }
  }

  /**
   * Uninstall/disconnect from an MCP server
   */
  async uninstallMCPServer(connectionId: string): Promise<void> {
    try {
      logger.info(`Uninstalling MCP server: ${connectionId}`)
      
      // Disconnect from MCP server
      await this.mcpClient.disconnectFromServer(connectionId)
      
      // Remove from database
      await this.dbService.removeConnection(connectionId)
      
      // Update cache
      await this.updateConnectionsCache()
      
      logger.info(`Successfully uninstalled MCP server: ${connectionId}`)

    } catch (error) {
      logger.error(`Failed to uninstall MCP server ${connectionId}:`, error)
      throw error
    }
  }

  /**
   * Get installed MCP connections
   */
  async getInstalledConnections(): Promise<MCPConnection[]> {
    try {
      // Try cache first
      const cached = await this.cacheService.get(this.CACHE_KEY_CONNECTIONS)
      if (cached) {
        return cached
      }

      // Get from database
      const connections = await this.dbService.getConnections()
      
      // Update cache
      await this.cacheService.set(this.CACHE_KEY_CONNECTIONS, connections, this.CACHE_TTL)
      
      return connections

    } catch (error) {
      logger.error('Failed to get installed connections:', error)
      throw error
    }
  }

  /**
   * Test connection to an MCP server
   */
  async testConnection(endpoint: string): Promise<{ success: boolean; serverInfo?: any; error?: string }> {
    try {
      const serverInfo = await this.mcpClient.getServerInfo(endpoint)
      return { success: true, serverInfo }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Invoke a tool on a connected MCP server
   */
  async invokeTool(connectionId: string, toolName: string, arguments_: Record<string, any>): Promise<any> {
    try {
      return await this.mcpClient.invokeTool(connectionId, toolName, arguments_)
    } catch (error) {
      logger.error(`Failed to invoke tool ${toolName} on ${connectionId}:`, error)
      throw error
    }
  }

  /**
   * List resources from a connected MCP server
   */
  async listResources(connectionId: string) {
    try {
      return await this.mcpClient.listResources(connectionId)
    } catch (error) {
      logger.error(`Failed to list resources from ${connectionId}:`, error)
      throw error
    }
  }

  /**
   * List tools from a connected MCP server
   */
  async listTools(connectionId: string) {
    try {
      return await this.mcpClient.listTools(connectionId)
    } catch (error) {
      logger.error(`Failed to list tools from ${connectionId}:`, error)
      throw error
    }
  }

  // Private helper methods

  private async getCachedMarketplaceEntries(): Promise<MCPMarketplaceEntry[]> {
    const cached = await this.cacheService.get(this.CACHE_KEY_MARKETPLACE)
    return cached || []
  }

  private async updateConnectionsCache(): Promise<void> {
    const connections = await this.dbService.getConnections()
    await this.cacheService.set(this.CACHE_KEY_CONNECTIONS, connections, this.CACHE_TTL)
  }

  // Event handlers

  private onDiscoveryComplete(entries: MCPMarketplaceEntry[]): void {
    logger.info(`MCP discovery completed: ${entries.length} entries found`)
  }

  private onDiscoveryError(error: Error): void {
    logger.error('MCP discovery failed:', error)
  }

  private onConnectionEstablished(connection: MCPConnection): void {
    logger.info(`MCP connection established: ${connection.serverInfo.name}`)
  }

  private onConnectionError(connection: MCPConnection, error: Error): void {
    logger.error(`MCP connection failed for ${connection.serverInfo.name}:`, error)
  }
}