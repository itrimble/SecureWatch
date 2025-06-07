import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cron from 'node-cron'

import { marketplaceRoutes } from './routes/marketplace.routes.js'
import { connectionsRoutes } from './routes/connections.routes.js'
import { MCPMarketplaceService } from './services/marketplace.service.js'
import { logger } from './utils/logger.js'

const app: express.Application = express()
const PORT = process.env.MCP_MARKETPLACE_PORT || 4010

// Middleware
app.use(helmet())
app.use(cors())
app.use(compression())
app.use(morgan('combined') as express.RequestHandler)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'mcp-marketplace',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// API Routes
app.use('/api/marketplace', marketplaceRoutes)
app.use('/api/connections', connectionsRoutes)

// Initialize marketplace service
const marketplaceService = new MCPMarketplaceService()

// Schedule periodic discovery from MCP-RSS aggregator
cron.schedule('*/30 * * * *', async () => {
  logger.info('Running scheduled MCP discovery from aggregator')
  try {
    await marketplaceService.discoverAndCache()
    logger.info('Scheduled MCP discovery completed successfully')
  } catch (error) {
    logger.error('Scheduled MCP discovery failed:', error)
  }
})

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong',
    timestamp: new Date().toISOString(),
    // Note: Error details are logged but not exposed to clients for security
  })
})

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 MCP Marketplace API running on port ${PORT}`)
  logger.info(`📊 Health check: http://localhost:${PORT}/health`)
  logger.info(`🔍 API endpoints: http://localhost:${PORT}/api`)
  
  // Initial discovery
  marketplaceService.discoverAndCache().catch((error) => {
    logger.error('Initial MCP discovery failed:', error)
  })
})

export default app