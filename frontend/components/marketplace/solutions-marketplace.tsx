"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMCPMarketplace } from '@/hooks/use-mcp-marketplace'
import { MCPMarketplaceEntry } from '@/lib/api/mcp-marketplace.api'
import { 
  Search, 
  Star, 
  Download, 
  ShieldCheck, 
  TrendingUp, 
  Award,
  Filter,
  Package,
  Zap,
  Brain,
  Shield,
  Activity,
  Eye,
  Settings,
  CheckCircle,
  Clock,
  ExternalLink,
  Github,
  Heart,
  Share2,
  AlertTriangle,
  Crown,
  Sparkles,
  BookOpen,
  RefreshCw,
  Loader2
} from "lucide-react"

// Legacy interface - now using MCPMarketplaceEntry from API
export interface ContentPack extends MCPMarketplaceEntry {
  price?: string
  size?: string
  screenshots?: string[]
  kqlQueries?: string[]
  dashboards?: string[]
  mcpIntegrations?: string[]
  alertTemplates?: string[]
  github?: string
  status?: 'installed' | 'available' | 'updating'
}

// Now using live data from MCP marketplace API

// Category icons mapping
const categoryIcons: Record<string, any> = {
  security: Shield,
  ai_tools: Brain,
  threat_intelligence: Activity,
  cloud: TrendingUp,
  network: Activity,
  identity: ShieldCheck,
  devsecops: Zap,
  investigation: Eye,
  education: BookOpen,
  integration: Package
}

const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Highest Rated" },
  { value: "name", label: "Name A-Z" }
]

export function SolutionsMarketplace() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPack, setSelectedPack] = useState<ContentPack | null>(null)
  const [isInstalling, setIsInstalling] = useState<string | null>(null)

  // Use live MCP marketplace data
  const { 
    entries, 
    stats, 
    categories: mcpCategories, 
    loading, 
    error, 
    discoverFromAggregator,
    installServer,
    fetchEntries 
  } = useMCPMarketplace()

  // Transform MCP entries to ContentPack format
  const contentPacks: ContentPack[] = entries.map(entry => ({
    ...entry,
    price: 'Free', // Default for MCP servers
    size: '~5MB', // Estimated
    screenshots: [],
    kqlQueries: [],
    dashboards: [],
    mcpIntegrations: entry.capabilities,
    alertTemplates: [],
    github: entry.repository,
    status: 'available' as const,
    rating: entry.rating || 4.5,
    downloads: entry.downloads || 0
  }))

  const filteredPacks = contentPacks
    .filter(pack => {
      const matchesSearch = searchQuery === '' || 
        pack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pack.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pack.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesCategory = selectedCategory === 'all' || pack.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular': return (b.downloads || 0) - (a.downloads || 0)
        case 'newest': return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        case 'rating': return (b.rating || 0) - (a.rating || 0)
        case 'name': return a.name.localeCompare(b.name)
        default: return 0
      }
    })

  const featuredPacks = contentPacks.filter(pack => pack.featured)

  const handleInstall = async (pack: ContentPack) => {
    setIsInstalling(pack.id)
    try {
      await installServer(pack.id)
      // Refresh data after installation
      await fetchEntries()
    } catch (error) {
      console.error('Installation failed:', error)
    } finally {
      setIsInstalling(null)
    }
  }

  const handleDiscover = async () => {
    try {
      await discoverFromAggregator()
    } catch (error) {
      console.error('Discovery failed:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'installed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Installed</Badge>
      case 'updating':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Updating</Badge>
      default:
        return <Badge variant="outline">Available</Badge>
    }
  }

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleDiscover} 
            disabled={loading}
            variant="default"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Discover from MCP-RSS
          </Button>
          <Button 
            onClick={() => fetchEntries()} 
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Submit App
          </Button>
          <Button>
            <Package className="w-4 h-4 mr-2" />
            My Apps
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            {entries.length === 0 ? 'Loading MCP marketplace...' : 'Refreshing marketplace data...'}
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load marketplace: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Display */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalEntries}</div>
              <div className="text-sm text-muted-foreground">Total MCP Servers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.installedCount}</div>
              <div className="text-sm text-muted-foreground">Installed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.featuredCount}</div>
              <div className="text-sm text-muted-foreground">Featured</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.verifiedCount}</div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Featured Content Packs */}
      <section>
        <div className="flex items-center space-x-2 mb-4">
          <Crown className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">Featured Solutions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredPacks.map((pack) => (
            <Card key={pack.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {pack.verified && <Badge variant="default" className="bg-blue-600"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>}
                    {pack.featured && <Badge variant="secondary"><Sparkles className="w-3 h-3 mr-1" />Featured</Badge>}
                  </div>
                  <div className="flex items-center space-x-1">
                    {getRatingStars(pack.rating)}
                    <span className="text-sm text-muted-foreground ml-1">({pack.rating})</span>
                  </div>
                </div>
                <CardTitle className="text-lg">{pack.name}</CardTitle>
                <CardDescription>{pack.shortDescription}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-wrap gap-1 mb-3">
                  {pack.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span>{pack.downloads.toLocaleString()} downloads</span>
                  <span>{pack.price}</span>
                </div>
                <div className="flex items-center justify-between">
                  {getStatusBadge(pack.status)}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setSelectedPack(pack)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Search and Filters */}
      <section>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search solutions, MCP integrations, dashboards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {mcpCategories?.categories?.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
            <TabsTrigger value="all" className="text-xs">
              <Package className="w-4 h-4 mr-1" />
              All
            </TabsTrigger>
            {mcpCategories?.categories?.slice(0, 9).map((category) => {
              const Icon = categoryIcons[category] || Package
              return (
                <TabsTrigger key={category} value={category} className="text-xs">
                  <Icon className="w-4 h-4 mr-1" />
                  {category.replace(/_/g, ' ').split(' ')[0]}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </section>

      {/* Content Packs Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            All Solutions ({filteredPacks.length})
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPacks.map((pack) => (
            <Card key={pack.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1">
                    {pack.verified && <CheckCircle className="w-4 h-4 text-blue-600" />}
                    {pack.featured && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <div className="flex items-center space-x-1">
                    {getRatingStars(pack.rating)}
                  </div>
                </div>
                <CardTitle className="text-sm font-medium leading-tight">{pack.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">{pack.shortDescription}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1 mb-2">
                  {pack.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs px-1 py-0">{tag}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{pack.downloads.toLocaleString()}</span>
                  <span className="font-medium">{pack.price}</span>
                </div>
                <div className="flex items-center justify-between">
                  {getStatusBadge(pack.status)}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedPack(pack)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Detail Modal */}
      {selectedPack && (
        <Dialog open={!!selectedPack} onOpenChange={() => setSelectedPack(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl">{selectedPack.name}</DialogTitle>
                  <p className="text-muted-foreground mt-1">by {selectedPack.publisher}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedPack.verified && <Badge variant="default" className="bg-blue-600">Verified Publisher</Badge>}
                  {selectedPack.featured && <Badge variant="secondary">Featured</Badge>}
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Rating and Stats */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  {getRatingStars(selectedPack.rating)}
                  <span className="font-medium">{selectedPack.rating}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedPack.downloads.toLocaleString()} downloads
                </div>
                <div className="text-sm font-medium text-green-600">
                  {selectedPack.price}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedPack.size}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{selectedPack.description}</p>
              </div>

              {/* Tags */}
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPack.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* MCP Integrations */}
              {selectedPack.mcpIntegrations && selectedPack.mcpIntegrations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">MCP Integrations</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPack.mcpIntegrations.map((integration) => (
                      <Badge key={integration} variant="secondary" className="justify-start">
                        <Zap className="w-3 h-3 mr-1" />
                        {integration}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample KQL Queries */}
              {selectedPack.kqlQueries && selectedPack.kqlQueries.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Sample KQL Queries</h3>
                  <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                    {selectedPack.kqlQueries.map((query, index) => (
                      <div key={index} className="mb-2 last:mb-0">
                        {query}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dashboards */}
              {selectedPack.dashboards && selectedPack.dashboards.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Included Dashboards</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPack.dashboards.map((dashboard) => (
                      <div key={dashboard} className="flex items-center space-x-2 text-sm">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span>{dashboard}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <div className="space-y-1">
                  {selectedPack.requirements.map((req) => (
                    <div key={req} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compatibility */}
              <div>
                <h3 className="font-semibold mb-2">Compatibility</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPack.compatibility.map((comp) => (
                    <Badge key={comp} variant="outline">{comp}</Badge>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div className="flex items-center space-x-4">
                {selectedPack.documentation && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedPack.documentation} target="_blank" rel="noopener noreferrer">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Documentation
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                )}
                {selectedPack.github && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedPack.github} target="_blank" rel="noopener noreferrer">
                      <Github className="w-4 h-4 mr-2" />
                      Source Code
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                )}
              </div>

              {/* Install/Action Buttons */}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedPack.status)}
                  <span className="text-sm text-muted-foreground">
                    Updated {new Date(selectedPack.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Heart className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button 
                    onClick={() => handleInstall(selectedPack)} 
                    disabled={isInstalling === selectedPack.id}
                  >
                    {isInstalling === selectedPack.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isInstalling === selectedPack.id ? 'Installing...' : (selectedPack.status === 'installed' ? 'Update' : 'Install')}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}