/**
 * MCP Marketplace API Client
 * Connects to the live MCP marketplace service
 */

const MCP_API_BASE = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:4010/api'

export interface MCPApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  count?: number
  pagination?: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface MCPMarketplaceEntry {
  id: string
  name: string
  description: string
  shortDescription: string
  category: string
  subcategory?: string
  publisher: string
  version: string
  mcpEndpoint: string
  capabilities: string[]
  tags: string[]
  rating?: number
  downloads?: number
  lastUpdated: string
  documentation?: string
  repository?: string
  website?: string
  verified: boolean
  featured: boolean
  compatibility: string[]
  requirements: string[]
}

export interface MCPConnection {
  id: string
  serverInfo: {
    name: string
    version: string
    description?: string
    author?: string
    capabilities?: any
  }
  endpoint: string
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  lastConnected?: Date
  error?: string
}

export interface MCPMarketplaceStats {
  totalEntries: number
  installedCount: number
  categoryCounts: Record<string, number>
  featuredCount: number
  verifiedCount: number
}

class MCPMarketplaceAPI {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<MCPApiResponse<T>> {
    try {
      const url = `${MCP_API_BASE}${endpoint}`
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      return data
    } catch (error) {
      console.error(`MCP API Error (${endpoint}):`, error)
      throw error
    }
  }

  // Marketplace Discovery
  async discoverFromAggregator(aggregatorUrl?: string): Promise<MCPApiResponse<MCPMarketplaceEntry[]>> {
    return this.request('/marketplace/discover', {
      method: 'POST',
      body: JSON.stringify({ aggregatorUrl })
    })
  }

  async getMarketplaceEntries(filters?: {
    category?: string
    tag?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<MCPApiResponse<MCPMarketplaceEntry[]>> {
    const searchParams = new URLSearchParams()
    
    if (filters?.category) searchParams.set('category', filters.category)
    if (filters?.tag) searchParams.set('tag', filters.tag)
    if (filters?.search) searchParams.set('search', filters.search)
    if (filters?.limit) searchParams.set('limit', filters.limit.toString())
    if (filters?.offset) searchParams.set('offset', filters.offset.toString())

    return this.request(`/marketplace/entries?${searchParams}`)
  }

  async getMarketplaceEntry(id: string): Promise<MCPApiResponse<MCPMarketplaceEntry>> {
    return this.request(`/marketplace/entries/${id}`)
  }

  async getMarketplaceStats(): Promise<MCPApiResponse<MCPMarketplaceStats>> {
    return this.request('/marketplace/stats')
  }

  async getMarketplaceCategories(): Promise<MCPApiResponse<{
    categories: string[]
    tags: string[]
    publishers: string[]
  }>> {
    return this.request('/marketplace/categories')
  }

  // Installation Management
  async installMCPServer(entryId: string): Promise<MCPApiResponse<MCPConnection>> {
    return this.request('/marketplace/install', {
      method: 'POST',
      body: JSON.stringify({ entryId })
    })
  }

  async uninstallMCPServer(connectionId: string): Promise<MCPApiResponse<void>> {
    return this.request(`/marketplace/uninstall/${connectionId}`, {
      method: 'DELETE'
    })
  }

  async testConnection(endpoint: string): Promise<MCPApiResponse<{
    success: boolean
    serverInfo?: any
    error?: string
  }>> {
    return this.request('/marketplace/test-connection', {
      method: 'POST',
      body: JSON.stringify({ endpoint })
    })
  }

  // Connection Management
  async getConnections(): Promise<MCPApiResponse<MCPConnection[]>> {
    return this.request('/connections')
  }

  async getConnection(id: string): Promise<MCPApiResponse<MCPConnection>> {
    return this.request(`/connections/${id}`)
  }

  async listResources(connectionId: string): Promise<MCPApiResponse<any[]>> {
    return this.request(`/connections/${connectionId}/resources`)
  }

  async listTools(connectionId: string): Promise<MCPApiResponse<any[]>> {
    return this.request(`/connections/${connectionId}/tools`)
  }

  async invokeTool(
    connectionId: string, 
    toolName: string, 
    arguments_: Record<string, any>
  ): Promise<MCPApiResponse<any>> {
    return this.request(`/connections/${connectionId}/invoke`, {
      method: 'POST',
      body: JSON.stringify({ toolName, arguments: arguments_ })
    })
  }

  async testConnectionHealth(connectionId: string): Promise<MCPApiResponse<any>> {
    return this.request(`/connections/${connectionId}/test`, {
      method: 'POST'
    })
  }

  async getConnectionStats(): Promise<MCPApiResponse<{
    total: number
    connected: number
    disconnected: number
    errors: number
    byServer: Record<string, number>
  }>> {
    return this.request('/connections/stats')
  }
}

export const mcpMarketplaceAPI = new MCPMarketplaceAPI()
export default mcpMarketplaceAPI