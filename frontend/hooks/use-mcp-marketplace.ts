import { useState, useEffect, useCallback } from 'react'
import { mcpMarketplaceAPI, MCPMarketplaceEntry, MCPConnection, MCPMarketplaceStats } from '@/lib/api/mcp-marketplace.api'
import { useToast } from '@/hooks/use-toast'

interface MCPMarketplaceFilters {
  category?: string
  tag?: string
  search?: string
  limit?: number
  offset?: number
}

export function useMCPMarketplace() {
  const [entries, setEntries] = useState<MCPMarketplaceEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<MCPMarketplaceStats | null>(null)
  const [categories, setCategories] = useState<{
    categories: string[]
    tags: string[]
    publishers: string[]
  }>({ categories: [], tags: [], publishers: [] })
  
  const { toast } = useToast()

  const fetchEntries = useCallback(async (filters?: MCPMarketplaceFilters) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await mcpMarketplaceAPI.getMarketplaceEntries(filters)
      if (response.success) {
        setEntries(response.data || [])
      } else {
        throw new Error(response.error || 'Failed to fetch marketplace entries')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Failed to fetch marketplace entries:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const discoverFromAggregator = useCallback(async (aggregatorUrl?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await mcpMarketplaceAPI.discoverFromAggregator(aggregatorUrl)
      if (response.success) {
        setEntries(response.data || [])
        toast({
          title: "Discovery Complete",
          description: `Found ${response.data?.length || 0} MCP servers from aggregator`,
          variant: "default"
        })
      } else {
        throw new Error(response.error || 'Failed to discover from aggregator')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Discovery failed'
      setError(errorMessage)
      toast({
        title: "Discovery Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchStats = useCallback(async () => {
    try {
      const response = await mcpMarketplaceAPI.getMarketplaceStats()
      if (response.success) {
        setStats(response.data || null)
      }
    } catch (err) {
      console.error('Failed to fetch marketplace stats:', err)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await mcpMarketplaceAPI.getMarketplaceCategories()
      if (response.success) {
        setCategories(response.data || { categories: [], tags: [], publishers: [] })
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [])

  const installServer = useCallback(async (entryId: string) => {
    try {
      const response = await mcpMarketplaceAPI.installMCPServer(entryId)
      if (response.success) {
        toast({
          title: "Installation Success",
          description: response.message || `Successfully installed ${response.data?.serverInfo.name}`,
          variant: "default"
        })
        // Refresh entries to update installation status
        await fetchEntries()
        return response.data
      } else {
        throw new Error(response.error || 'Installation failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Installation failed'
      toast({
        title: "Installation Failed",
        description: errorMessage,
        variant: "destructive"
      })
      throw err
    }
  }, [toast, fetchEntries])

  const testConnection = useCallback(async (endpoint: string) => {
    try {
      const response = await mcpMarketplaceAPI.testConnection(endpoint)
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed'
      toast({
        title: "Connection Test Failed",
        description: errorMessage,
        variant: "destructive"
      })
      throw err
    }
  }, [toast])

  // Initialize data on mount
  useEffect(() => {
    fetchEntries()
    fetchStats()
    fetchCategories()
  }, [fetchEntries, fetchStats, fetchCategories])

  return {
    // Data
    entries,
    stats,
    categories,
    loading,
    error,
    
    // Actions
    fetchEntries,
    discoverFromAggregator,
    installServer,
    testConnection,
    refreshStats: fetchStats,
    refreshCategories: fetchCategories
  }
}

export function useMCPConnections() {
  const [connections, setConnections] = useState<MCPConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStats, setConnectionStats] = useState<any>(null)
  
  const { toast } = useToast()

  const fetchConnections = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await mcpMarketplaceAPI.getConnections()
      if (response.success) {
        setConnections(response.data || [])
      } else {
        throw new Error(response.error || 'Failed to fetch connections')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchConnectionStats = useCallback(async () => {
    try {
      const response = await mcpMarketplaceAPI.getConnectionStats()
      if (response.success) {
        setConnectionStats(response.data)
      }
    } catch (err) {
      console.error('Failed to fetch connection stats:', err)
    }
  }, [])

  const uninstallServer = useCallback(async (connectionId: string) => {
    try {
      const response = await mcpMarketplaceAPI.uninstallMCPServer(connectionId)
      if (response.success) {
        toast({
          title: "Uninstallation Success",
          description: response.message || "Successfully uninstalled MCP server",
          variant: "default"
        })
        // Refresh connections
        await fetchConnections()
      } else {
        throw new Error(response.error || 'Uninstallation failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Uninstallation failed'
      toast({
        title: "Uninstallation Failed",
        description: errorMessage,
        variant: "destructive"
      })
      throw err
    }
  }, [toast, fetchConnections])

  const testConnectionHealth = useCallback(async (connectionId: string) => {
    try {
      const response = await mcpMarketplaceAPI.testConnectionHealth(connectionId)
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Health check failed'
      toast({
        title: "Health Check Failed",
        description: errorMessage,
        variant: "destructive"
      })
      throw err
    }
  }, [toast])

  const invokeTool = useCallback(async (
    connectionId: string, 
    toolName: string, 
    arguments_: Record<string, any>
  ) => {
    try {
      const response = await mcpMarketplaceAPI.invokeTool(connectionId, toolName, arguments_)
      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || 'Tool invocation failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Tool invocation failed'
      toast({
        title: "Tool Invocation Failed",
        description: errorMessage,
        variant: "destructive"
      })
      throw err
    }
  }, [toast])

  // Initialize on mount
  useEffect(() => {
    fetchConnections()
    fetchConnectionStats()
  }, [fetchConnections, fetchConnectionStats])

  return {
    // Data
    connections,
    connectionStats,
    loading,
    error,
    
    // Actions
    fetchConnections,
    uninstallServer,
    testConnectionHealth,
    invokeTool,
    refreshStats: fetchConnectionStats
  }
}