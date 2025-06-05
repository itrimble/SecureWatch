'use client'

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  ExternalLink,
  Search,
  BarChart3,
  Table,
  Clock,
  Database,
  Filter,
  ArrowRight,
  Copy,
  Eye,
  X
} from "lucide-react"

interface DrilldownContext {
  clickedValue: any
  clickedField: string
  rowData: Record<string, any>
  panelId: string
  panelTitle: string
  timestamp: string
  dashboardTokens: Record<string, any>
}

interface DrilldownManagerProps {
  isOpen: boolean
  onClose: () => void
  context: DrilldownContext | null
  onNavigateToSearch: (query: string) => void
  onNavigateToDashboard: (dashboardId: string, tokens?: Record<string, any>) => void
  onShowModal: (content: React.ReactNode) => void
}

export function DrilldownManager({ 
  isOpen, 
  onClose, 
  context, 
  onNavigateToSearch,
  onNavigateToDashboard,
  onShowModal 
}: DrilldownManagerProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null)

  // Generate contextual search queries based on clicked data
  const generateSearchQueries = useCallback(() => {
    if (!context) return []

    const { clickedValue, clickedField, rowData } = context
    
    return [
      {
        id: 'exact-match',
        name: 'Exact Match Search',
        description: `Find all events where ${clickedField} equals "${clickedValue}"`,
        icon: Search,
        query: `* | where ${clickedField} == "${clickedValue}" | sort timestamp desc | head 1000`,
        timeRange: 'Last 24 hours'
      },
      {
        id: 'contains-search',
        name: 'Contains Search',
        description: `Find all events containing "${clickedValue}"`,
        icon: Filter,
        query: `* | where ${clickedField} contains "${clickedValue}" | sort timestamp desc | head 1000`,
        timeRange: 'Last 24 hours'
      },
      {
        id: 'related-events',
        name: 'Related Events',
        description: 'Find events from the same source and time window',
        icon: Clock,
        query: `* | where timestamp between (ago(1h)) and (now()) ${rowData.hostname ? `| where hostname == "${rowData.hostname}"` : ''} | sort timestamp desc`,
        timeRange: 'Last hour'
      },
      {
        id: 'statistical-analysis',
        name: 'Statistical Analysis',
        description: `Analyze patterns for ${clickedField}`,
        icon: BarChart3,
        query: `* | where ${clickedField} != "" | stats count, dcount(hostname) as unique_hosts by ${clickedField} | sort count desc`,
        timeRange: 'Last 7 days'
      },
      {
        id: 'timeline-analysis',
        name: 'Timeline Analysis',
        description: `Show activity timeline for ${clickedValue}`,
        icon: Table,
        query: `* | where ${clickedField} == "${clickedValue}" | bin timestamp as time_bucket by 1h | stats count by time_bucket | sort time_bucket`,
        timeRange: 'Last 7 days'
      }
    ]
  }, [context])

  // Generate related dashboard suggestions
  const generateDashboardSuggestions = useCallback(() => {
    if (!context) return []

    const { clickedField, clickedValue } = context

    const suggestions = []

    // Security-focused dashboards
    if (['username', 'user_name', 'user'].includes(clickedField.toLowerCase())) {
      suggestions.push({
        id: 'user-activity-dashboard',
        name: 'User Activity Analysis',
        description: `Comprehensive view of ${clickedValue}'s activity`,
        icon: Database,
        tokens: { username: clickedValue, timerange: '7d' }
      })
    }

    if (['hostname', 'host', 'computer_name'].includes(clickedField.toLowerCase())) {
      suggestions.push({
        id: 'host-security-dashboard',
        name: 'Host Security Overview',
        description: `Security analysis for ${clickedValue}`,
        icon: Database,
        tokens: { hostname: clickedValue, timerange: '24h' }
      })
    }

    if (['source_ip', 'src_ip', 'client_ip'].includes(clickedField.toLowerCase())) {
      suggestions.push({
        id: 'network-analysis-dashboard',
        name: 'Network Traffic Analysis',
        description: `Network activity from ${clickedValue}`,
        icon: Database,
        tokens: { source_ip: clickedValue, timerange: '24h' }
      })
    }

    // Add generic investigation dashboard
    suggestions.push({
      id: 'investigation-dashboard',
      name: 'Investigation Workspace',
      description: 'Multi-faceted analysis workspace',
      icon: Database,
      tokens: { 
        investigation_field: clickedField,
        investigation_value: clickedValue,
        timerange: '24h'
      }
    })

    return suggestions
  }, [context])

  // Copy query to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    // You could show a toast notification here
  }, [])

  const searchQueries = generateSearchQueries()
  const dashboardSuggestions = generateDashboardSuggestions()

  if (!context) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-2 border-b border-gray-700">
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-blue-400" />
            Drilldown Actions
          </DialogTitle>
          <div className="text-sm text-gray-400 mt-2">
            <div className="flex items-center gap-4">
              <span>Panel: <strong>{context.panelTitle}</strong></span>
              <span>Field: <Badge variant="outline" className="font-mono">{context.clickedField}</Badge></span>
              <span>Value: <Badge variant="secondary">{context.clickedValue}</Badge></span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto">
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">Search & Investigate</TabsTrigger>
              <TabsTrigger value="dashboards">Related Dashboards</TabsTrigger>
              <TabsTrigger value="context">Context & Details</TabsTrigger>
            </TabsList>

            {/* Search Actions */}
            <TabsContent value="search" className="space-y-4 mt-6">
              <div>
                <h3 className="text-lg font-medium text-gray-100 mb-3">Investigation Queries</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Choose how you want to investigate this data point
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {searchQueries.map((query) => (
                  <Card 
                    key={query.id}
                    className={`cursor-pointer transition-colors hover:border-blue-500 ${
                      selectedAction === query.id ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700'
                    }`}
                    onClick={() => setSelectedAction(query.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <query.icon className="w-5 h-5 text-blue-400 mt-1" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-100">{query.name}</div>
                            <div className="text-sm text-gray-400 mt-1">{query.description}</div>
                            <div className="bg-gray-900 p-2 rounded mt-2 font-mono text-xs text-gray-300">
                              {query.query.length > 80 
                                ? `${query.query.substring(0, 80)}...`
                                : query.query
                              }
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {query.timeRange}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(query.query)
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onNavigateToSearch(query.query)
                              onClose()
                            }}
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Search
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Dashboard Actions */}
            <TabsContent value="dashboards" className="space-y-4 mt-6">
              <div>
                <h3 className="text-lg font-medium text-gray-100 mb-3">Related Dashboards</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Jump to specialized dashboards with this data pre-filtered
                </p>
              </div>

              {dashboardSuggestions.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {dashboardSuggestions.map((dashboard) => (
                    <Card 
                      key={dashboard.id}
                      className="cursor-pointer transition-colors hover:border-blue-500 border-gray-700"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <dashboard.icon className="w-5 h-5 text-blue-400" />
                            <div>
                              <div className="font-medium text-gray-100">{dashboard.name}</div>
                              <div className="text-sm text-gray-400">{dashboard.description}</div>
                              <div className="flex items-center gap-1 mt-2">
                                {Object.entries(dashboard.tokens).map(([key, value]) => (
                                  <Badge key={key} variant="outline" className="text-xs">
                                    {key}: {value}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              onNavigateToDashboard(dashboard.id, dashboard.tokens)
                              onClose()
                            }}
                          >
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Open
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-3" />
                  <p>No related dashboards available</p>
                  <p className="text-sm">Consider creating a custom dashboard for this data type</p>
                </div>
              )}
            </TabsContent>

            {/* Context Details */}
            <TabsContent value="context" className="space-y-4 mt-6">
              <div>
                <h3 className="text-lg font-medium text-gray-100 mb-3">Interaction Context</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Full details about the clicked data point
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Clicked Data */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Clicked Data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Field</div>
                      <div className="font-mono text-sm text-blue-400">{context.clickedField}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Value</div>
                      <div className="font-mono text-sm text-gray-100">{context.clickedValue}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Panel</div>
                      <div className="text-sm text-gray-100">{context.panelTitle}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Row Data */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Complete Row Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {Object.entries(context.rowData).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start gap-2">
                          <div className="font-mono text-xs text-blue-400 min-w-0 flex-1">
                            {key}
                          </div>
                          <div className="font-mono text-xs text-gray-100 min-w-0 flex-1 text-right">
                            {String(value).length > 30 
                              ? `${String(value).substring(0, 30)}...`
                              : String(value)
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Dashboard Tokens */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Current Dashboard Tokens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(context.dashboardTokens).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            ${key}$
                          </Badge>
                          <div className="text-xs text-gray-100 text-right">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => copyToClipboard(JSON.stringify(context.rowData, null, 2))}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Row Data as JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => copyToClipboard(context.clickedValue)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Value
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => onShowModal(
                        <div className="p-4">
                          <h3 className="text-lg font-medium mb-3">Complete Row Data</h3>
                          <pre className="bg-gray-900 p-3 rounded text-xs overflow-auto">
                            {JSON.stringify(context.rowData, null, 2)}
                          </pre>
                        </div>
                      )}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Full Details
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}