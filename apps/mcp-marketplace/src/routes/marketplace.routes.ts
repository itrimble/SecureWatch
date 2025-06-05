import { Router } from 'express'
import { z } from 'zod'
import { MCPMarketplaceService } from '../services/marketplace.service.js'
import { logger } from '../utils/logger.js'
import { validateRequest } from '../middleware/validation.js'

const router = Router()
const marketplaceService = new MCPMarketplaceService()

// Validation schemas
const discoverSchema = z.object({
  aggregatorUrl: z.string().url().optional()
})

const installSchema = z.object({
  entryId: z.string().min(1)
})

const testConnectionSchema = z.object({
  endpoint: z.string().url()
})

/**
 * GET /api/marketplace/discover
 * Discover MCP servers from aggregator
 */
router.post('/discover', validateRequest(discoverSchema), async (req, res) => {
  try {
    const { aggregatorUrl } = req.body
    const entries = await marketplaceService.discoverAndCache(aggregatorUrl)
    
    res.json({
      success: true,
      data: entries,
      count: entries.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Discovery endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to discover MCP servers',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/marketplace/entries
 * Get all marketplace entries
 */
router.get('/entries', async (req, res) => {
  try {
    const { category, tag, search, limit = '50', offset = '0' } = req.query
    
    let entries = await marketplaceService.getMarketplaceEntries()
    
    // Apply filters
    if (category && typeof category === 'string') {
      entries = entries.filter(e => e.category === category)
    }
    
    if (tag && typeof tag === 'string') {
      entries = entries.filter(e => e.tags.includes(tag))
    }
    
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase()
      entries = entries.filter(e => 
        e.name.toLowerCase().includes(searchLower) ||
        e.description.toLowerCase().includes(searchLower) ||
        e.tags.some(t => t.toLowerCase().includes(searchLower))
      )
    }
    
    // Apply pagination
    const limitNum = parseInt(limit as string, 10)
    const offsetNum = parseInt(offset as string, 10)
    const paginatedEntries = entries.slice(offsetNum, offsetNum + limitNum)
    
    res.json({
      success: true,
      data: paginatedEntries,
      pagination: {
        total: entries.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < entries.length
      }
    })
  } catch (error) {
    logger.error('Get entries endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get marketplace entries'
    })
  }
})

/**
 * GET /api/marketplace/entries/:id
 * Get specific marketplace entry
 */
router.get('/entries/:id', async (req, res) => {
  try {
    const { id } = req.params
    const entries = await marketplaceService.getMarketplaceEntries()
    const entry = entries.find(e => e.id === id)
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Marketplace entry not found'
      })
    }
    
    res.json({
      success: true,
      data: entry
    })
  } catch (error) {
    logger.error('Get entry endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get marketplace entry'
    })
  }
})

/**
 * POST /api/marketplace/install
 * Install/connect to an MCP server
 */
router.post('/install', validateRequest(installSchema), async (req, res) => {
  try {
    const { entryId } = req.body
    const connection = await marketplaceService.installMCPServer(entryId)
    
    res.json({
      success: true,
      data: connection,
      message: `Successfully installed ${connection.serverInfo.name}`
    })
  } catch (error) {
    logger.error('Install endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to install MCP server',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * DELETE /api/marketplace/uninstall/:connectionId
 * Uninstall/disconnect from an MCP server
 */
router.delete('/uninstall/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params
    await marketplaceService.uninstallMCPServer(connectionId)
    
    res.json({
      success: true,
      message: 'Successfully uninstalled MCP server'
    })
  } catch (error) {
    logger.error('Uninstall endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to uninstall MCP server',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/marketplace/test-connection
 * Test connection to an MCP endpoint
 */
router.post('/test-connection', validateRequest(testConnectionSchema), async (req, res) => {
  try {
    const { endpoint } = req.body
    const result = await marketplaceService.testConnection(endpoint)
    
    res.json({
      success: true,
      data: result
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
 * GET /api/marketplace/categories
 * Get available categories and tags
 */
router.get('/categories', async (req, res) => {
  try {
    const entries = await marketplaceService.getMarketplaceEntries()
    
    const categories = [...new Set(entries.map(e => e.category))]
    const tags = [...new Set(entries.flatMap(e => e.tags))]
    const publishers = [...new Set(entries.map(e => e.publisher))]
    
    res.json({
      success: true,
      data: {
        categories: categories.sort(),
        tags: tags.sort(),
        publishers: publishers.sort()
      }
    })
  } catch (error) {
    logger.error('Categories endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    })
  }
})

/**
 * GET /api/marketplace/stats
 * Get marketplace statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const entries = await marketplaceService.getMarketplaceEntries()
    const connections = await marketplaceService.getInstalledConnections()
    
    const stats = {
      totalEntries: entries.length,
      installedCount: connections.length,
      categoryCounts: entries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      featuredCount: entries.filter(e => e.featured).length,
      verifiedCount: entries.filter(e => e.verified).length
    }
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Stats endpoint error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get marketplace stats'
    })
  }
})

export { router as marketplaceRoutes }