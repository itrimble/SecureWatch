'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Play,
  Code,
  Eye,
  Settings,
  Zap,
  Clock,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  TrendingUp,
  Map,
  Activity,
  Target,
  ExternalLink,
  Search,
  Filter,
  Save,
  Copy
} from "lucide-react"

interface PanelEditorProps {
  panel: {
    id: string
    title: string
    type: 'chart' | 'table' | 'single-value' | 'map' | 'custom'
    visualization: string
    query: string
    refreshInterval: number
    timespan: string
    config: {
      drilldown?: {
        enabled: boolean
        target: string
        query?: string
      }
      formatting?: Record<string, any>
      colors?: Record<string, string>
    }
  }
  onSave: (updatedPanel: any) => void
  onCancel: () => void
  onTestQuery: (query: string) => Promise<any>
}

// KQL query templates for different visualizations
const KQL_TEMPLATES = {
  'events-over-time': `* 
| where timestamp > ago(24h)
| bin timestamp as _time by 1h 
| stats count by _time 
| sort _time`,
  
  'top-sources': `* 
| where timestamp > ago(24h)
| stats count by source_type 
| sort count desc 
| head 10`,
  
  'security-events': `event_type:security 
| where timestamp > ago(24h)
| project timestamp, hostname, event_id, message, severity
| sort timestamp desc
| head 100`,
  
  'error-analysis': `severity in ("error", "critical")
| where timestamp > ago(24h)
| stats count by hostname, error_code
| sort count desc`,
  
  'user-activity': `event_type:authentication
| where timestamp > ago(24h)
| stats login_count=count() by user_name
| sort login_count desc
| head 20`,
  
  'network-traffic': `event_type:network
| where timestamp > ago(24h)
| stats bytes_total=sum(bytes) by source_ip, destination_ip
| sort bytes_total desc
| head 50`
}

// Visualization type configurations
const VISUALIZATION_TYPES = [
  {
    id: 'line',
    name: 'Line Chart',
    description: 'Time series data visualization',
    icon: LineChart,
    bestFor: 'Trends over time, metrics progression',
    queryRequirements: 'Time field and numeric values'
  },
  {
    id: 'bar',
    name: 'Bar Chart',
    description: 'Categorical data comparison',
    icon: BarChart3,
    bestFor: 'Comparing categories, top N analysis',
    queryRequirements: 'Category field and count/sum values'
  },
  {
    id: 'pie',
    name: 'Pie Chart',
    description: 'Proportional data display',
    icon: PieChart,
    bestFor: 'Distribution analysis, percentages',
    queryRequirements: 'Category field and numeric values'
  },
  {
    id: 'table',
    name: 'Table',
    description: 'Detailed data listing',
    icon: Table,
    bestFor: 'Raw data viewing, detailed analysis',
    queryRequirements: 'Any fields you want to display'
  },
  {
    id: 'single',
    name: 'Single Value',
    description: 'Key metric display',
    icon: Target,
    bestFor: 'KPIs, counters, single metrics',
    queryRequirements: 'Single numeric result (count, sum, avg)'
  },
  {
    id: 'heatmap',
    name: 'Heatmap',
    description: 'Intensity visualization',
    icon: Activity,
    bestFor: 'Time-based activity patterns, correlations',
    queryRequirements: 'Two dimensions and intensity values'
  },
  {
    id: 'geo',
    name: 'Geographic Map',
    description: 'Location-based visualization',
    icon: Map,
    bestFor: 'Geographic data analysis, threat mapping',
    queryRequirements: 'Geographic coordinates or location fields'
  }
]

export function PanelEditor({ panel, onSave, onCancel, onTestQuery }: PanelEditorProps) {
  const [editedPanel, setEditedPanel] = useState(panel)
  const [isTestingQuery, setIsTestingQuery] = useState(false)
  const [queryResult, setQueryResult] = useState<any>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const updateField = useCallback((field: string, value: any) => {
    setEditedPanel(prev => ({ ...prev, [field]: value }))
  }, [])

  const updateConfig = useCallback((configPath: string, value: any) => {
    setEditedPanel(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [configPath]: value
      }
    }))
  }, [])

  const updateDrilldown = useCallback((drilldownField: string, value: any) => {
    setEditedPanel(prev => ({
      ...prev,
      config: {
        ...prev.config,
        drilldown: {
          ...prev.config.drilldown,
          [drilldownField]: value
        }
      }
    }))
  }, [])

  const handleTestQuery = useCallback(async () => {
    if (!editedPanel.query.trim()) return

    setIsTestingQuery(true)
    try {
      const result = await onTestQuery(editedPanel.query)
      setQueryResult(result)
    } catch (error) {
      console.error('Query test failed:', error)
      setQueryResult({ error: 'Query execution failed' })
    } finally {
      setIsTestingQuery(false)
    }
  }, [editedPanel.query, onTestQuery])

  const handleLoadTemplate = useCallback((templateKey: string) => {
    const template = KQL_TEMPLATES[templateKey as keyof typeof KQL_TEMPLATES]
    if (template) {
      updateField('query', template)
    }
  }, [updateField])

  const getVisualizationInfo = useCallback((vizType: string) => {
    return VISUALIZATION_TYPES.find(v => v.id === vizType)
  }, [])

  return (
    <div className="w-full max-w-6xl max-h-[80vh] overflow-y-auto">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="query">Query</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
          <TabsTrigger value="formatting">Formatting</TabsTrigger>
          <TabsTrigger value="drilldown">Drilldown</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Panel Title</Label>
              <Input
                value={editedPanel.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="bg-gray-800 border-gray-600 text-gray-100"
                placeholder="Enter panel title..."
              />
            </div>
            <div>
              <Label className="text-gray-300">Panel Type</Label>
              <Select
                value={editedPanel.type}
                onValueChange={(value) => updateField('type', value)}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="single-value">Single Value</SelectItem>
                  <SelectItem value="map">Map</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Refresh Interval (seconds)</Label>
              <Input
                type="number"
                value={editedPanel.refreshInterval}
                onChange={(e) => updateField('refreshInterval', parseInt(e.target.value) || 30)}
                className="bg-gray-800 border-gray-600 text-gray-100"
                min="5"
                max="3600"
              />
            </div>
            <div>
              <Label className="text-gray-300">Time Span</Label>
              <Select
                value={editedPanel.timespan}
                onValueChange={(value) => updateField('timespan', value)}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">Last 15 minutes</SelectItem>
                  <SelectItem value="1h">Last hour</SelectItem>
                  <SelectItem value="4h">Last 4 hours</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        {/* Query Builder */}
        <TabsContent value="query" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-gray-300 text-lg font-medium">KQL Query</Label>
            <div className="flex items-center gap-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-48 bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue placeholder="Load template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="events-over-time">Events Over Time</SelectItem>
                  <SelectItem value="top-sources">Top Sources</SelectItem>
                  <SelectItem value="security-events">Security Events</SelectItem>
                  <SelectItem value="error-analysis">Error Analysis</SelectItem>
                  <SelectItem value="user-activity">User Activity</SelectItem>
                  <SelectItem value="network-traffic">Network Traffic</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedTemplate && handleLoadTemplate(selectedTemplate)}
                disabled={!selectedTemplate}
              >
                <Code className="w-4 h-4 mr-2" />
                Load
              </Button>
            </div>
          </div>

          <Textarea
            value={editedPanel.query}
            onChange={(e) => updateField('query', e.target.value)}
            className="bg-gray-800 border-gray-600 text-gray-100 font-mono h-40 resize-none"
            placeholder="Enter your KQL query..."
          />

          <div className="flex items-center gap-2">
            <Button
              onClick={handleTestQuery}
              disabled={isTestingQuery || !editedPanel.query.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isTestingQuery ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Test Query
            </Button>
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4 mr-2" />
              Query Builder
            </Button>
            <Button variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copy Query
            </Button>
          </div>

          {/* Query Result Preview */}
          {queryResult && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Query Result Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queryResult.error ? (
                  <div className="text-red-400 text-sm">
                    Error: {queryResult.error}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{queryResult.rows?.length || 0} rows returned</span>
                      <span>Execution time: {queryResult.metadata?.executionTime || 0}ms</span>
                    </div>
                    <div className="max-h-40 overflow-auto bg-gray-900 p-3 rounded text-xs font-mono">
                      <pre>{JSON.stringify(queryResult.rows?.slice(0, 5) || [], null, 2)}</pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Visualization Settings */}
        <TabsContent value="visualization" className="space-y-4">
          <div>
            <Label className="text-gray-300 text-lg font-medium">Visualization Type</Label>
            <p className="text-sm text-gray-400 mb-4">
              Choose how your data should be displayed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VISUALIZATION_TYPES.map((viz) => (
              <Card
                key={viz.id}
                className={`cursor-pointer transition-colors ${
                  editedPanel.visualization === viz.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => updateField('visualization', viz.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <viz.icon className={`w-8 h-8 mt-1 ${
                      editedPanel.visualization === viz.id ? 'text-blue-400' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-100">{viz.name}</div>
                      <div className="text-sm text-gray-400 mt-1">{viz.description}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        <strong>Best for:</strong> {viz.bestFor}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <strong>Query needs:</strong> {viz.queryRequirements}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Visualization-specific settings */}
          {editedPanel.visualization && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-sm">
                  {getVisualizationInfo(editedPanel.visualization)?.name} Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editedPanel.visualization === 'line' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-300 text-sm">Line Style</Label>
                      <Select defaultValue="smooth">
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="smooth">Smooth</SelectItem>
                          <SelectItem value="linear">Linear</SelectItem>
                          <SelectItem value="step">Step</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm">Show Points</Label>
                      <Select defaultValue="auto">
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="always">Always</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {editedPanel.visualization === 'table' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-300 text-sm">Rows per page</Label>
                      <Select defaultValue="50">
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded"
                      />
                      <Label className="text-gray-300 text-sm">Enable sorting</Label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Formatting Settings */}
        <TabsContent value="formatting" className="space-y-4">
          <div>
            <Label className="text-gray-300 text-lg font-medium">Color & Formatting</Label>
            <p className="text-sm text-gray-400 mb-4">
              Customize the appearance of your visualization
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Color Scheme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {['blue', 'green', 'orange', 'red', 'purple', 'teal', 'indigo', 'pink'].map((color) => (
                    <div
                      key={color}
                      className={`w-8 h-8 rounded cursor-pointer border-2 bg-${color}-500 hover:scale-110 transition-transform`}
                      style={{ backgroundColor: `var(--${color}-500)` }}
                    />
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <Label className="text-gray-300 text-sm">Auto color by category</Label>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Number Formatting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-gray-300 text-sm">Format</Label>
                  <Select defaultValue="auto">
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="percent">Percentage</SelectItem>
                      <SelectItem value="currency">Currency</SelectItem>
                      <SelectItem value="bytes">Bytes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Decimal Places</Label>
                  <Input
                    type="number"
                    defaultValue="2"
                    min="0"
                    max="10"
                    className="bg-gray-700 border-gray-600 text-gray-100"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Drilldown Settings */}
        <TabsContent value="drilldown" className="space-y-4">
          <div>
            <Label className="text-gray-300 text-lg font-medium">Interactive Drilldown</Label>
            <p className="text-sm text-gray-400 mb-4">
              Configure what happens when users click on panel elements
            </p>
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              checked={editedPanel.config.drilldown?.enabled || false}
              onChange={(e) => updateDrilldown('enabled', e.target.checked)}
              className="rounded"
            />
            <Label className="text-gray-300">Enable Drilldown</Label>
          </div>

          {editedPanel.config.drilldown?.enabled && (
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Drilldown Action</Label>
                <Select
                  value={editedPanel.config.drilldown.target || 'search'}
                  onValueChange={(value) => updateDrilldown('target', value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="search">Open in Search</SelectItem>
                    <SelectItem value="dashboard">Navigate to Dashboard</SelectItem>
                    <SelectItem value="url">Open External URL</SelectItem>
                    <SelectItem value="modal">Show in Modal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Drilldown Query</Label>
                <Textarea
                  value={editedPanel.config.drilldown.query || ''}
                  onChange={(e) => updateDrilldown('query', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-gray-100 font-mono h-24"
                  placeholder="Enter drilldown query with tokens like $clicked_value$..."
                />
                <div className="text-xs text-gray-500 mt-1">
                  Use tokens like $clicked_value$, $row.field_name$ to pass clicked data to the drilldown
                </div>
              </div>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Available Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">$clicked_value$</Badge>
                      <span className="text-gray-400">The value that was clicked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">$row.field_name$</Badge>
                      <span className="text-gray-400">Any field from the clicked row</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">$panel.timerange$</Badge>
                      <span className="text-gray-400">Current panel time range</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-700">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          onClick={() => onSave(editedPanel)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Panel
        </Button>
      </div>
    </div>
  )
}