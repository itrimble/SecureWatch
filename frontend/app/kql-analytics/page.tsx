"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Play, 
  Save, 
  BookOpen, 
  Search, 
  Filter, 
  Download, 
  Settings,
  Clock,
  Database,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Code,
  Table,
  PieChart,
  Activity,
  Zap
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface QueryResult {
  id: string
  query: string
  executionTime: number
  totalRows: number
  columns: Array<{ name: string; type: string; displayName?: string }>
  data: Array<Record<string, any>>
  cached?: boolean
  cacheHit?: boolean
}

interface SavedQuery {
  id: string
  name: string
  description?: string
  query: string
  category: string
  severity: string
  tags: string[]
  executionCount: number
  avgExecutionTime: number
}

interface QueryLibraryStats {
  totalQueries: number
  queriesByCategory: Record<string, number>
  queriesBySeverity: Record<string, number>
  mostUsedTags: string[]
}

export default function KQLAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('editor')
  const [query, setQuery] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [queryLibrary, setQueryLibrary] = useState<SavedQuery[]>([])
  const [libraryStats, setLibraryStats] = useState<QueryLibraryStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  
  // Load initial data
  useEffect(() => {
    loadQueryLibrary()
    loadLibraryStats()
    loadSavedQueries()
  }, [])

  const loadQueryLibrary = async () => {
    try {
      const response = await fetch('/api/v1/analytics/library')
      if (response.ok) {
        const data = await response.json()
        setQueryLibrary(data)
      }
    } catch (error) {
      console.error('Failed to load query library:', error)
    }
  }

  const loadLibraryStats = async () => {
    try {
      const response = await fetch('/api/v1/analytics/library/stats')
      if (response.ok) {
        const data = await response.json()
        setLibraryStats(data)
      }
    } catch (error) {
      console.error('Failed to load library stats:', error)
    }
  }

  const loadSavedQueries = async () => {
    try {
      const response = await fetch('/api/v1/analytics/saved-queries')
      if (response.ok) {
        const data = await response.json()
        setSavedQueries(data.queries || [])
      }
    } catch (error) {
      console.error('Failed to load saved queries:', error)
    }
  }

  const executeQuery = async () => {
    if (!query.trim()) return

    setIsExecuting(true)
    setQueryError(null)
    setQueryResult(null)

    try {
      const response = await fetch('/api/v1/analytics/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kql_query: query,
          options: {
            priority: 'normal',
            timeout: 30000,
            cache: true
          }
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setQueryResult(data)
      } else {
        setQueryError(data.error || 'Query execution failed')
      }
    } catch (error) {
      setQueryError('Network error: Failed to execute query')
    } finally {
      setIsExecuting(false)
    }
  }

  const loadTemplateQuery = (templateQuery: SavedQuery) => {
    setQuery(templateQuery.query)
    setActiveTab('editor')
  }

  const validateQuery = async () => {
    if (!query.trim()) return

    try {
      const response = await fetch('/api/v1/analytics/query/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kql_query: query
        }),
      })

      const data = await response.json()
      
      if (data.valid) {
        setQueryError(null)
      } else {
        setQueryError(`Validation errors: ${data.errors.map((e: any) => e.message).join(', ')}`)
      }
    } catch (error) {
      setQueryError('Failed to validate query')
    }
  }

  const filteredQueries = queryLibrary.filter(q => {
    const matchesSearch = !searchTerm || 
      q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || q.category === selectedCategory
    const matchesSeverity = selectedSeverity === 'all' || q.severity === selectedSeverity
    
    return matchesSearch && matchesCategory && matchesSeverity
  })

  const categories = ['all', ...Object.keys(libraryStats?.queriesByCategory || {})]
  const severityLevels = ['all', ...Object.keys(libraryStats?.queriesBySeverity || {})]

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">KQL Analytics Engine</h1>
            <p className="text-muted-foreground mt-2">
              Advanced analytics with Microsoft Sentinel-compatible KQL queries for threat hunting and security analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-green-400 border-green-400">
              <Activity className="w-3 h-3 mr-1" />
              Analytics Active
            </Badge>
            <Badge variant="secondary">
              <Database className="w-3 h-3 mr-1" />
              {libraryStats?.totalQueries || 0} Templates
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Query Editor
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Query Library
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Saved Queries
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Query Editor Tab */}
          <TabsContent value="editor" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
              {/* Query Input */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    KQL Query Editor
                  </CardTitle>
                  <CardDescription>
                    Write KQL queries to analyze security data. Supports Microsoft Sentinel syntax.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 mb-4">
                    <Textarea
                      placeholder={`// Example KQL Query:
normalized_events
| where TimeGenerated >= ago(24h)
| where event_type == "authentication_failure"
| summarize FailureCount = count() by source_ip, user_name
| where FailureCount >= 5
| order by FailureCount desc`}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="min-h-[300px] font-mono text-sm resize-none"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={executeQuery} 
                      disabled={isExecuting || !query.trim()}
                      className="flex items-center gap-2"
                    >
                      {isExecuting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {isExecuting ? 'Executing...' : 'Execute Query'}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={validateQuery}
                      disabled={!query.trim()}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Validate
                    </Button>
                    
                    <Button variant="outline">
                      <Save className="w-4 h-4 mr-2" />
                      Save Query
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Results */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Table className="w-5 h-5" />
                    Query Results
                    {queryResult && (
                      <Badge variant="secondary" className="ml-auto">
                        {queryResult.totalRows} rows
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden">
                  {queryError && (
                    <Alert className="mb-4 border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {queryError}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {isExecuting && (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">Executing query...</p>
                        <Progress value={33} className="w-48 mx-auto mt-2" />
                      </div>
                    </div>
                  )}
                  
                  {queryResult && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {queryResult.executionTime}ms
                          </span>
                          {queryResult.cached && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              Cached
                            </Badge>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                      
                      <div className="flex-1 overflow-auto border rounded-lg">
                        <table className="w-full">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              {queryResult.columns.map((col) => (
                                <th key={col.name} className="p-3 text-left font-medium text-sm">
                                  {col.displayName || col.name}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({col.type})
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResult.data.slice(0, 100).map((row, idx) => (
                              <tr key={idx} className="border-t">
                                {queryResult.columns.map((col) => (
                                  <td key={col.name} className="p-3 text-sm">
                                    {String(row[col.name] || '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {queryResult.totalRows > 100 && (
                        <div className="text-center mt-4 text-sm text-muted-foreground">
                          Showing first 100 of {queryResult.totalRows} results
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Query Library Tab */}
          <TabsContent value="library" className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col p-6">
              {/* Library Filters */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Query Library - Security Analytics Templates</CardTitle>
                  <CardDescription>
                    Pre-built KQL queries for common security use cases and threat hunting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="search">Search Queries</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="search"
                          placeholder="Search by name, description, or tags..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category === 'all' ? 'All Categories' : category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="severity">Severity</Label>
                      <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                        <SelectTrigger>
                          <SelectValue placeholder="All severities" />
                        </SelectTrigger>
                        <SelectContent>
                          {severityLevels.map((severity) => (
                            <SelectItem key={severity} value={severity}>
                              {severity === 'all' ? 'All Severities' : severity.charAt(0).toUpperCase() + severity.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end">
                      <Button variant="outline" className="w-full">
                        <Filter className="w-4 h-4 mr-2" />
                        Reset Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Query Templates */}
              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredQueries.map((queryTemplate) => (
                    <Card key={queryTemplate.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg leading-tight">
                              {queryTemplate.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                variant={
                                  queryTemplate.severity === 'critical' ? 'destructive' :
                                  queryTemplate.severity === 'high' ? 'secondary' :
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {queryTemplate.severity}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {queryTemplate.category.replace('-', ' ')}
                              </Badge>
                            </div>
                          </div>
                          {queryTemplate.severity === 'critical' && (
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {queryTemplate.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-1 mb-4">
                          {queryTemplate.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {queryTemplate.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{queryTemplate.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <span>Used {queryTemplate.executionCount} times</span>
                          <span>~{queryTemplate.avgExecutionTime}ms avg</span>
                        </div>
                        
                        <Button 
                          onClick={() => loadTemplateQuery(queryTemplate)}
                          className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                          variant="outline"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Load Query
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {filteredQueries.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No queries found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search criteria or browse all categories
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Saved Queries Tab */}
          <TabsContent value="saved" className="flex-1 p-6">
            <Card>
              <CardHeader>
                <CardTitle>My Saved Queries</CardTitle>
                <CardDescription>
                  Queries you&apos;ve saved for future use
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Save className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No saved queries yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Save queries from the editor to access them quickly later
                  </p>
                  <Button onClick={() => setActiveTab('editor')}>
                    <Code className="w-4 h-4 mr-2" />
                    Go to Editor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="flex-1 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Query Library Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {libraryStats && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {libraryStats.totalQueries}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Queries</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {Object.keys(libraryStats.queriesByCategory).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Categories</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Most Used Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {libraryStats.mostUsedTags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Engine Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Analytics Engine</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Online
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Query Cache</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Resource Manager</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Healthy
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}