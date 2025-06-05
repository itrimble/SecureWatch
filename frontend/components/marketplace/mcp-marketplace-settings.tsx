"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Server, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Globe, 
  Clock,
  Database,
  RefreshCw,
  Save,
  TestTube,
  ExternalLink,
  Info
} from "lucide-react"

interface MCPAggregatorConfig {
  id: string
  name: string
  url: string
  enabled: boolean
  lastDiscovery?: string
  errorCount: number
}

interface MCPSettings {
  defaultAggregatorUrl: string
  discoveryInterval: number // minutes
  autoInstallEnabled: boolean
  verificationRequired: boolean
  maxConnections: number
  connectionTimeout: number // seconds
  retryAttempts: number
  cacheEnabled: boolean
  cacheTTL: number // minutes
  logLevel: 'error' | 'warn' | 'info' | 'debug'
}

export function MCPMarketplaceSettings() {
  const [settings, setSettings] = useState<MCPSettings>({
    defaultAggregatorUrl: 'https://mcpmarket.com/server/rss-buhe',
    discoveryInterval: 30,
    autoInstallEnabled: false,
    verificationRequired: true,
    maxConnections: 10,
    connectionTimeout: 30,
    retryAttempts: 3,
    cacheEnabled: true,
    cacheTTL: 30,
    logLevel: 'info'
  })

  const [aggregators, setAggregators] = useState<MCPAggregatorConfig[]>([
    {
      id: '1',
      name: 'MCP Market RSS (Default)',
      url: 'https://mcpmarket.com/server/rss-buhe',
      enabled: true,
      lastDiscovery: '2025-06-05T10:30:00Z',
      errorCount: 0
    }
  ])

  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSaveSettings = async () => {
    try {
      // TODO: Implement actual save to backend API
      console.log('Saving settings:', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setTestResult(null)
    
    try {
      // TODO: Implement actual connection test
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate test result
      const success = Math.random() > 0.3
      setTestResult({
        success,
        message: success 
          ? 'Successfully connected to MCP aggregator and discovered 15 servers'
          : 'Failed to connect: Connection timeout'
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed: Network error'
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const addCustomAggregator = () => {
    const newAggregator: MCPAggregatorConfig = {
      id: Date.now().toString(),
      name: 'Custom Aggregator',
      url: '',
      enabled: false,
      errorCount: 0
    }
    setAggregators([...aggregators, newAggregator])
  }

  const updateAggregator = (id: string, updates: Partial<MCPAggregatorConfig>) => {
    setAggregators(aggregators.map(agg => 
      agg.id === id ? { ...agg, ...updates } : agg
    ))
  }

  const removeAggregator = (id: string) => {
    setAggregators(aggregators.filter(agg => agg.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">MCP Marketplace Settings</h2>
        <p className="text-muted-foreground">
          Configure Model Context Protocol marketplace discovery, connections, and behavior.
        </p>
      </div>

      {/* MCP Aggregators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            MCP Aggregators
          </CardTitle>
          <CardDescription>
            Configure MCP-RSS aggregators for discovering available Model Context Protocol servers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aggregators.map((aggregator) => (
            <div key={aggregator.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={aggregator.enabled}
                    onCheckedChange={(enabled) => updateAggregator(aggregator.id, { enabled })}
                  />
                  <Label className="font-medium">{aggregator.name}</Label>
                  {aggregator.errorCount > 0 && (
                    <Badge variant="destructive">{aggregator.errorCount} errors</Badge>
                  )}
                </div>
                {aggregator.id !== '1' && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeAggregator(aggregator.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor={`url-${aggregator.id}`}>Aggregator URL</Label>
                  <Input
                    id={`url-${aggregator.id}`}
                    value={aggregator.url}
                    onChange={(e) => updateAggregator(aggregator.id, { url: e.target.value })}
                    placeholder="https://mcpmarket.com/server/rss-buhe"
                    disabled={aggregator.id === '1'}
                  />
                </div>
                
                {aggregator.lastDiscovery && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Last discovery: {new Date(aggregator.lastDiscovery).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <Button variant="outline" onClick={addCustomAggregator} className="w-full">
            Add Custom Aggregator
          </Button>
        </CardContent>
      </Card>

      {/* Discovery Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Discovery Settings
          </CardTitle>
          <CardDescription>
            Configure automatic discovery and connection behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="discovery-interval">Discovery Interval (minutes)</Label>
              <Input
                id="discovery-interval"
                type="number"
                value={settings.discoveryInterval}
                onChange={(e) => setSettings({
                  ...settings,
                  discoveryInterval: parseInt(e.target.value) || 30
                })}
                min="5"
                max="1440"
              />
              <p className="text-sm text-muted-foreground">
                How often to check for new MCP servers (5-1440 minutes)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-connections">Maximum Connections</Label>
              <Input
                id="max-connections"
                type="number"
                value={settings.maxConnections}
                onChange={(e) => setSettings({
                  ...settings,
                  maxConnections: parseInt(e.target.value) || 10
                })}
                min="1"
                max="50"
              />
              <p className="text-sm text-muted-foreground">
                Maximum concurrent MCP server connections
              </p>
            </div>
          </div>

          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Auto-install verified servers</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically install MCP servers that are verified and trusted
                </p>
              </div>
              <Switch
                checked={settings.autoInstallEnabled}
                onCheckedChange={(autoInstallEnabled) => setSettings({
                  ...settings,
                  autoInstallEnabled
                })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Require verification</Label>
                <p className="text-sm text-muted-foreground">
                  Only show verified and trusted MCP servers in marketplace
                </p>
              </div>
              <Switch
                checked={settings.verificationRequired}
                onCheckedChange={(verificationRequired) => setSettings({
                  ...settings,
                  verificationRequired
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Connection Settings
          </CardTitle>
          <CardDescription>
            Configure MCP server connection parameters and retry behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="connection-timeout">Connection Timeout (seconds)</Label>
              <Input
                id="connection-timeout"
                type="number"
                value={settings.connectionTimeout}
                onChange={(e) => setSettings({
                  ...settings,
                  connectionTimeout: parseInt(e.target.value) || 30
                })}
                min="5"
                max="300"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="retry-attempts">Retry Attempts</Label>
              <Input
                id="retry-attempts"
                type="number"
                value={settings.retryAttempts}
                onChange={(e) => setSettings({
                  ...settings,
                  retryAttempts: parseInt(e.target.value) || 3
                })}
                min="0"
                max="10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="log-level">Log Level</Label>
              <Select
                value={settings.logLevel}
                onValueChange={(logLevel: any) => setSettings({ ...settings, logLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Cache Settings
          </CardTitle>
          <CardDescription>
            Configure marketplace data caching for better performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable caching</Label>
              <p className="text-sm text-muted-foreground">
                Cache marketplace data to reduce API calls and improve performance
              </p>
            </div>
            <Switch
              checked={settings.cacheEnabled}
              onCheckedChange={(cacheEnabled) => setSettings({
                ...settings,
                cacheEnabled
              })}
            />
          </div>
          
          {settings.cacheEnabled && (
            <div className="space-y-2">
              <Label htmlFor="cache-ttl">Cache TTL (minutes)</Label>
              <Input
                id="cache-ttl"
                type="number"
                value={settings.cacheTTL}
                onChange={(e) => setSettings({
                  ...settings,
                  cacheTTL: parseInt(e.target.value) || 30
                })}
                min="1"
                max="1440"
              />
              <p className="text-sm text-muted-foreground">
                How long to cache marketplace data before refreshing
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Connection Test
          </CardTitle>
          <CardDescription>
            Test connectivity to the default MCP aggregator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleTestConnection} 
              disabled={testingConnection}
              variant="outline"
            >
              {testingConnection ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
            
            <Button asChild variant="ghost">
              <a 
                href={settings.defaultAggregatorUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Aggregator
              </a>
            </Button>
          </div>
          
          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t pt-6">
        <Alert className="flex-1 mr-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Changes will be applied immediately and affect future marketplace operations.
          </AlertDescription>
        </Alert>
        
        <Button onClick={handleSaveSettings} disabled={saved}>
          {saved ? (
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}