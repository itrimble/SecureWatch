const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 4006

app.use(cors())
app.use(express.json())

// Mock MCP marketplace data
const mockMarketplaceEntries = [
  {
    id: "mcp-rss-buhe-1",
    name: "VirusTotal Security Scanner",
    description: "Real MCP server discovered from RSS aggregator for VirusTotal file/URL scanning and threat intelligence",
    shortDescription: "VirusTotal integration for malware detection",
    category: "security",
    subcategory: "threat_detection",
    publisher: "VirusTotal Community",
    version: "2.1.0",
    mcpEndpoint: "https://api.virustotal.com/mcp",
    capabilities: ["File Scanning", "URL Analysis", "Threat Intel"],
    tags: ["MCP", "VirusTotal", "Malware", "Security"],
    rating: 4.8,
    downloads: 15420,
    lastUpdated: "2025-06-04T10:30:00Z",
    documentation: "https://docs.virustotal.com/mcp",
    repository: "https://github.com/virustotal/mcp-server",
    verified: true,
    featured: true,
    compatibility: ["SecureWatch 2.0+", "MCP Protocol"],
    requirements: ["VirusTotal API Key", "MCP Client"]
  },
  {
    id: "mcp-rss-buhe-2", 
    name: "MISP Threat Intelligence",
    description: "Real MCP server for MISP (Malware Information Sharing Platform) integration discovered via RSS aggregator",
    shortDescription: "MISP threat intelligence and IOC sharing",
    category: "threat_intelligence",
    publisher: "MISP Project",
    version: "3.2.1",
    mcpEndpoint: "https://misp-project.org/mcp",
    capabilities: ["IOC Management", "Threat Sharing", "Event Correlation"],
    tags: ["MCP", "MISP", "Threat Intelligence", "IOC"],
    rating: 4.6,
    downloads: 8950,
    lastUpdated: "2025-06-03T14:20:00Z",
    verified: true,
    featured: true,
    compatibility: ["MISP 2.4+", "MCP Protocol"],
    requirements: ["MISP Instance", "API Access"]
  },
  {
    id: "mcp-rss-buhe-3",
    name: "Shodan Internet Scanner", 
    description: "Real MCP server for Shodan integration discovered from RSS - search for internet-connected devices and vulnerabilities",
    shortDescription: "Shodan device and vulnerability scanning",
    category: "network",
    publisher: "Shodan",
    version: "1.8.5",
    mcpEndpoint: "https://api.shodan.io/mcp",
    capabilities: ["Device Discovery", "Port Scanning", "Vulnerability Detection"],
    tags: ["MCP", "Shodan", "Network", "IoT", "Vulnerabilities"],
    rating: 4.4,
    downloads: 6780,
    lastUpdated: "2025-06-02T09:15:00Z",
    verified: false,
    featured: false,
    compatibility: ["Shodan API", "MCP Protocol"],
    requirements: ["Shodan API Key"]
  },
  {
    id: "mcp-rss-buhe-4",
    name: "AI Security Assistant",
    description: "Real MCP server providing AI-powered security analysis and KQL query generation discovered via RSS aggregator", 
    shortDescription: "AI assistant for security analysis",
    category: "ai_tools",
    publisher: "SecurityAI Labs",
    version: "2.0.3",
    mcpEndpoint: "https://securityai.com/mcp",
    capabilities: ["KQL Generation", "Threat Analysis", "Natural Language Processing"],
    tags: ["MCP", "AI", "Machine Learning", "Security", "KQL"],
    rating: 4.9,
    downloads: 12300,
    lastUpdated: "2025-06-05T08:00:00Z",
    verified: true,
    featured: true,
    compatibility: ["OpenAI API", "Local LLM", "MCP Protocol"],
    requirements: ["AI Model Access", "MCP Client"]
  }
]

const mockStats = {
  totalEntries: mockMarketplaceEntries.length,
  installedCount: 0,
  categoryCounts: {
    security: 1,
    threat_intelligence: 1, 
    network: 1,
    ai_tools: 1
  },
  featuredCount: mockMarketplaceEntries.filter(e => e.featured).length,
  verifiedCount: mockMarketplaceEntries.filter(e => e.verified).length
}

const mockCategories = {
  categories: ['security', 'threat_intelligence', 'network', 'ai_tools'],
  tags: ['MCP', 'VirusTotal', 'MISP', 'Shodan', 'AI', 'Security'],
  publishers: ['VirusTotal Community', 'MISP Project', 'Shodan', 'SecurityAI Labs']
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'mock-mcp-marketplace',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    message: 'Mock MCP marketplace API running - simulating real MCP-RSS discovery'
  })
})

// Marketplace routes
app.post('/api/marketplace/discover', (req, res) => {
  const { aggregatorUrl } = req.body
  console.log(`Mock discovery from aggregator: ${aggregatorUrl || 'https://mcpmarket.com/server/rss-buhe'}`)
  
  // Simulate discovery delay
  setTimeout(() => {
    res.json({
      success: true,
      data: mockMarketplaceEntries,
      count: mockMarketplaceEntries.length,
      timestamp: new Date().toISOString(),
      message: `Discovered ${mockMarketplaceEntries.length} MCP servers from RSS aggregator`
    })
  }, 1000)
})

app.get('/api/marketplace/entries', (req, res) => {
  const { category, tag, search, limit = '50', offset = '0' } = req.query
  
  let entries = [...mockMarketplaceEntries]
  
  // Apply filters
  if (category && category !== 'all') {
    entries = entries.filter(e => e.category === category)
  }
  
  if (tag) {
    entries = entries.filter(e => e.tags.includes(tag))
  }
  
  if (search) {
    const searchLower = search.toLowerCase()
    entries = entries.filter(e => 
      e.name.toLowerCase().includes(searchLower) ||
      e.description.toLowerCase().includes(searchLower) ||
      e.tags.some(t => t.toLowerCase().includes(searchLower))
    )
  }
  
  // Apply pagination
  const limitNum = parseInt(limit, 10)
  const offsetNum = parseInt(offset, 10)
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
})

app.get('/api/marketplace/stats', (req, res) => {
  res.json({
    success: true,
    data: mockStats
  })
})

app.get('/api/marketplace/categories', (req, res) => {
  res.json({
    success: true,
    data: mockCategories
  })
})

app.post('/api/marketplace/install', (req, res) => {
  const { entryId } = req.body
  const entry = mockMarketplaceEntries.find(e => e.id === entryId)
  
  if (!entry) {
    return res.status(404).json({
      success: false,
      error: 'MCP server not found'
    })
  }
  
  // Simulate installation delay
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        id: entryId,
        serverInfo: {
          name: entry.name,
          version: entry.version,
          description: entry.description
        },
        endpoint: entry.mcpEndpoint,
        status: 'connected',
        lastConnected: new Date()
      },
      message: `Successfully connected to ${entry.name} MCP server`
    })
  }, 2000)
})

app.get('/api/connections', (req, res) => {
  res.json({
    success: true,
    data: [],
    count: 0
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock MCP Marketplace API running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔍 Simulating real MCP-RSS aggregator discovery`)
  console.log(`📦 Available endpoints:`)
  console.log(`   POST /api/marketplace/discover - Discover MCP servers`)
  console.log(`   GET  /api/marketplace/entries - Get marketplace entries`)
  console.log(`   GET  /api/marketplace/stats - Get statistics`)
  console.log(`   POST /api/marketplace/install - Install MCP server`)
})