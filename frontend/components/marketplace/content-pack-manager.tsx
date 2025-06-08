"use client"

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Package, 
  Trash2, 
  Settings, 
  RotateCw,
  ExternalLink,
  Shield,
  Zap,
  Activity,
  Database,
  Eye,
  Pause,
  Play,
  RefreshCw
} from "lucide-react"

export interface InstalledPack {
  id: string
  name: string
  version: string
  status: 'active' | 'inactive' | 'updating' | 'error'
  installedDate: string
  lastUpdate: string
  size: string
  type: 'dashboard' | 'query' | 'alert' | 'integration' | 'ai_model'
  dependencies: string[]
  description: string
  mcpIntegrations?: string[]
  kqlQueries?: number
  dashboards?: number
  alertRules?: number
}

const installedPacks: InstalledPack[] = [
  {
    id: "enterprise-threat-hunting",
    name: "Enterprise Threat Hunting Pack",
    version: "2.4.1",
    status: "active",
    installedDate: "2025-05-28",
    lastUpdate: "2025-06-01",
    size: "15.2 MB",
    type: "query",
    dependencies: ["MCP Server", "VirusTotal MCP", "MISP MCP"],
    description: "Comprehensive threat hunting toolkit with 50+ KQL queries and AI-powered analysis",
    mcpIntegrations: ["virustotal-mcp", "misp-mcp", "mcp-server"],
    kqlQueries: 52,
    dashboards: 8,
    alertRules: 15
  },
  {
    id: "ai-security-analyst",
    name: "AI Security Analyst Assistant",
    version: "1.8.3",
    status: "active",
    installedDate: "2025-05-25",
    lastUpdate: "2025-06-01",
    size: "8.7 MB",
    type: "ai_model",
    dependencies: ["MCP Server", "Local LLM"],
    description: "AI-powered security analysis using local LLM models",
    mcpIntegrations: ["mcp-server", "ollama-integration"],
    kqlQueries: 0,
    dashboards: 2,
    alertRules: 3
  },
  {
    id: "threat-intel-aggregator",
    name: "Threat Intelligence Aggregator",
    version: "2.2.5", 
    status: "updating",
    installedDate: "2025-05-20",
    lastUpdate: "2025-05-30",
    size: "12.8 MB",
    type: "integration",
    dependencies: ["MISP MCP", "VirusTotal MCP", "Shodan MCP"],
    description: "Unified threat intelligence from multiple sources",
    mcpIntegrations: ["misp-mcp", "virustotal-mcp", "shodan-mcp"],
    kqlQueries: 23,
    dashboards: 5,
    alertRules: 8
  },
  {
    id: "network-discovery-pack",
    name: "Network Discovery & Asset Management",
    version: "1.6.7",
    status: "error",
    installedDate: "2025-05-15",
    lastUpdate: "2025-05-25",
    size: "9.3 MB",
    type: "dashboard",
    dependencies: ["Nmap MCP"],
    description: "Network discovery and asset inventory management",
    mcpIntegrations: ["nmap-mcp"],
    kqlQueries: 12,
    dashboards: 4,
    alertRules: 6
  }
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
    case 'inactive':
      return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" />Inactive</Badge>
    case 'updating':
      return <Badge variant="default" className="bg-blue-600"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Updating</Badge>
    case 'error':
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>
    default:
      return <Badge variant="outline">Unknown</Badge>
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'dashboard':
      return <Activity className="w-4 h-4 text-blue-600" />
    case 'query':
      return <Database className="w-4 h-4 text-green-600" />
    case 'alert':
      return <AlertTriangle className="w-4 h-4 text-orange-600" />
    case 'integration':
      return <Zap className="w-4 h-4 text-purple-600" />
    case 'ai_model':
      return <Shield className="w-4 h-4 text-indigo-600" />
    default:
      return <Package className="w-4 h-4 text-gray-600" />
  }
}

export function ContentPackManager() {
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const handleUninstall = async (packId: string) => {
    const pack = contentPacks.find(p => p.id === packId)
    if (!pack) return

    if (confirm(`Are you sure you want to uninstall "${pack.name}"? This action cannot be undone.`)) {
      setIsLoading(true)
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))
        toast.success(`Successfully uninstalled ${pack.name}`)
        // In real implementation, would update local state or refetch data
      } catch (error) {
        toast.error(`Failed to uninstall ${pack.name}`)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleToggleStatus = async (packId: string) => {
    const pack = contentPacks.find(p => p.id === packId)
    if (!pack) return

    const newStatus = pack.status === 'enabled' ? 'disabled' : 'enabled'
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success(`${pack.name} has been ${newStatus}`)
      // In real implementation, would update the pack status in state
    } catch (error) {
      toast.error(`Failed to ${newStatus === 'enabled' ? 'enable' : 'disable'} ${pack.name}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (packId: string) => {
    const pack = contentPacks.find(p => p.id === packId)
    if (!pack) return

    setIsLoading(true)
    setUpdateProgress(0)
    
    try {
      // Simulate update progress
      for (let i = 0; i <= 100; i += 10) {
        setUpdateProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      toast.success(`Successfully updated ${pack.name} to the latest version`)
      // In real implementation, would update the pack version in state
    } catch (error) {
      toast.error(`Failed to update ${pack.name}`)
    } finally {
      setIsLoading(false)
      setUpdateProgress(0)
    }
  }

  const activePacks = installedPacks.filter(pack => pack.status === 'active')
  const errorPacks = installedPacks.filter(pack => pack.status === 'error')
  const totalKQLQueries = installedPacks.reduce((sum, pack) => sum + (pack.kqlQueries || 0), 0)
  const totalDashboards = installedPacks.reduce((sum, pack) => sum + (pack.dashboards || 0), 0)
  const totalAlertRules = installedPacks.reduce((sum, pack) => sum + (pack.alertRules || 0), 0)

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{installedPacks.length}</div>
                <div className="text-sm text-muted-foreground">Content Packs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{totalKQLQueries}</div>
                <div className="text-sm text-muted-foreground">KQL Queries</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{totalDashboards}</div>
                <div className="text-sm text-muted-foreground">Dashboards</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{totalAlertRules}</div>
                <div className="text-sm text-muted-foreground">Alert Rules</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alerts */}
      {errorPacks.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errorPacks.length} content pack(s) have errors and need attention: {errorPacks.map(p => p.name).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="installed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="installed">Installed Packs ({installedPacks.length})</TabsTrigger>
          <TabsTrigger value="updates">Updates Available</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="space-y-4">
          <div className="space-y-4">
            {installedPacks.map((pack) => (
              <Card key={pack.id} className={`${selectedPack === pack.id ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getTypeIcon(pack.type)}
                      <div>
                        <CardTitle className="text-lg">{pack.name}</CardTitle>
                        <CardDescription className="mt-1">{pack.description}</CardDescription>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <span>v{pack.version}</span>
                          <span>{pack.size}</span>
                          <span>Installed {new Date(pack.installedDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(pack.status)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Pack Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {pack.kqlQueries && pack.kqlQueries > 0 && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Database className="w-4 h-4 text-green-600" />
                        <span>{pack.kqlQueries} KQL Queries</span>
                      </div>
                    )}
                    {pack.dashboards && pack.dashboards > 0 && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span>{pack.dashboards} Dashboards</span>
                      </div>
                    )}
                    {pack.alertRules && pack.alertRules > 0 && (
                      <div className="flex items-center space-x-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span>{pack.alertRules} Alert Rules</span>
                      </div>
                    )}
                  </div>

                  {/* MCP Integrations */}
                  {pack.mcpIntegrations && pack.mcpIntegrations.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-2">MCP Integrations:</div>
                      <div className="flex flex-wrap gap-2">
                        {pack.mcpIntegrations.map((integration) => (
                          <Badge key={integration} variant="secondary" className="text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            {integration}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dependencies */}
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">Dependencies:</div>
                    <div className="flex flex-wrap gap-2">
                      {pack.dependencies.map((dep) => (
                        <Badge key={dep} variant="outline" className="text-xs">{dep}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Update Progress */}
                  {pack.status === 'updating' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Updating to latest version...</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                  )}

                  {/* Error Details */}
                  {pack.status === 'error' && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Pack failed to load: Missing dependency &quot;Nmap MCP&quot;. Please install required MCP integration.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(pack.id)}
                        disabled={pack.status === 'updating'}
                      >
                        {pack.status === 'active' ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Enable
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdate(pack.id)}
                        disabled={pack.status === 'updating'}
                      >
                        <RotateCw className="w-4 h-4 mr-2" />
                        Update
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Configure
                      </Button>
                      
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUninstall(pack.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Uninstall
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Updates</CardTitle>
              <CardDescription>Keep your content packs up to date with the latest features and security improvements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                <p>All content packs are up to date!</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check for Updates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP Integration Dependencies</CardTitle>
              <CardDescription>View and manage MCP dependencies for your installed content packs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Required MCPs</h4>
                    <div className="space-y-2">
                      {["MCP Server", "VirusTotal MCP", "MISP MCP", "Ollama Integration"].map((mcp) => (
                        <div key={mcp} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{mcp}</span>
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Installed
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Optional MCPs</h4>
                    <div className="space-y-2">
                      {["Shodan MCP", "Nmap MCP", "AWS Security MCP"].map((mcp) => (
                        <div key={mcp} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{mcp}</span>
                          <Badge variant="outline">
                            <Download className="w-3 h-3 mr-1" />
                            Available
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Manage MCP Integrations
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}