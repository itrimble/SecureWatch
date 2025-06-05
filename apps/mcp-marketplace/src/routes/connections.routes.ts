import { Router } from 'express'
import { z } from 'zod'
import { MCPMarketplaceService } from '../services/marketplace.service.js'
import { logger } from '../utils/logger.js'
import { validateRequest } from '../middleware/validation.js'

const router = Router()
const marketplaceService = new MCPMarketplaceService()

// Validation schemas
const invokeToolSchema = z.object({
  toolName: z.string().min(1),
  arguments: z.record(z.any()).optional().default({})
})

/**
 * GET /api/connections
 * Get all installed MCP connections
 */
router.get('/', async (req, res) => {
  try {
    const connections = await marketplaceService.getInstalledConnections()
    
    res.json({
      success: true,
      data: connections,
      count: connections.length
    })
  } catch (error) {
    logger.error('Get connections endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get connections'
    })
  }
})

/**
 * GET /api/connections/:id
 * Get specific connection details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const connections = await marketplaceService.getInstalledConnections()
    const connection = connections.find(c => c.id === id)
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      })
    }
    
    res.json({
      success: true,
      data: connection
    })
  } catch (error) {
    logger.error('Get connection endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get connection'
    })
  }
})

/**
 * GET /api/connections/:id/resources
 * List resources from a connected MCP server
 */
router.get('/:id/resources', async (req, res) => {
  try {
    const { id } = req.params
    const resources = await marketplaceService.listResources(id)
    
    res.json({
      success: true,
      data: resources,
      count: resources.length
    })
  } catch (error) {
    logger.error('List resources endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list resources',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/connections/:id/tools
 * List tools from a connected MCP server
 */
router.get('/:id/tools', async (req, res) => {
  try {
    const { id } = req.params
    const tools = await marketplaceService.listTools(id)
    
    res.json({
      success: true,
      data: tools,
      count: tools.length
    })
  } catch (error) {
    logger.error('List tools endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list tools',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/connections/:id/invoke
 * Invoke a tool on a connected MCP server
 */
router.post('/:id/invoke', validateRequest(invokeToolSchema), async (req, res) => {
  try {
    const { id } = req.params
    const { toolName, arguments: args } = req.body
    
    const result = await marketplaceService.invokeTool(id, toolName, args)
    
    res.json({
      success: true,
      data: result,
      metadata: {
        connectionId: id,
        toolName,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('Invoke tool endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to invoke tool',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/connections/:id/test
 * Test connection health
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params
    
    // Get connection details
    const connections = await marketplaceService.getInstalledConnections()
    const connection = connections.find(c => c.id === id)
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      })
    }
    
    // Test the connection
    const testResult = await marketplaceService.testConnection(connection.endpoint)
    
    res.json({
      success: true,
      data: {
        connectionId: id,
        endpoint: connection.endpoint,
        ...testResult
      }
    })
  } catch (error) {
    logger.error('Test connection endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to test connection'
    })
  }
})

/**
 * PUT /api/connections/:id/status
 * Update connection status (enable/disable)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { enabled } = req.body
    
    // TODO: Implement connection enable/disable logic
    // This would update the database and potentially disconnect/reconnect
    
    res.json({
      success: true,
      message: `Connection ${enabled ? 'enabled' : 'disabled'}`,
      data: { id, enabled }
    })
  } catch (error) {
    logger.error('Update connection status endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update connection status'
    })
  }
})

/**
 * GET /api/connections/stats
 * Get connection statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const connections = await marketplaceService.getInstalledConnections()
    
    const stats = {
      total: connections.length,
      connected: connections.filter(c => c.status === 'connected').length,
      disconnected: connections.filter(c => c.status === 'disconnected').length,
      errors: connections.filter(c => c.status === 'error').length,
      byServer: connections.reduce((acc, conn) => {
        const serverName = conn.serverInfo.name
        acc[serverName] = (acc[serverName] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Connection stats endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get connection stats'
    })
  }
})

export { router as connectionsRoutes }