"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle, Clock, Eye, Play } from "lucide-react"

export function AlertsPanel() {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)

  const alerts = [
    {
      id: "ALT-001",
      title: "Suspicious Login Activity",
      description: "Multiple failed login attempts detected from IP 192.168.1.100",
      severity: "high",
      status: "open",
      created: "2024-01-15 14:32:15",
      source: "Authentication System",
      affectedAssets: ["Web Server", "Database"],
      riskScore: 85,
    },
    {
      id: "ALT-002",
      title: "Malware Detection",
      description: "Trojan.Win32.Agent detected on workstation WS-045",
      severity: "critical",
      status: "investigating",
      created: "2024-01-15 14:30:22",
      source: "Endpoint Protection",
      affectedAssets: ["Workstation WS-045"],
      riskScore: 95,
    },
    {
      id: "ALT-003",
      title: "Unusual Network Traffic",
      description: "High volume of outbound traffic to external IP 203.0.113.5",
      severity: "medium",
      status: "open",
      created: "2024-01-15 14:25:18",
      source: "Network Monitor",
      affectedAssets: ["Network Gateway"],
      riskScore: 65,
    },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 text-white"
      case "high":
        return "bg-red-500 text-white"
      case "medium":
        return "bg-yellow-500 text-white"
      case "low":
        return "bg-green-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800"
      case "investigating":
        return "bg-yellow-100 text-yellow-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Security Alerts</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Auto-Refresh
          </Button>
          <Button>Create Alert Rule</Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Alerts</TabsTrigger>
          <TabsTrigger value="investigating">Investigating</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className={selectedAlert === alert.id ? "ring-2 ring-blue-500" : ""}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{alert.title}</h3>
                          <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                          <Badge variant="outline" className={getStatusColor(alert.status)}>
                            {alert.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>ID: {alert.id}</span>
                          <span>Created: {alert.created}</span>
                          <span>Risk Score: {alert.riskScore}/100</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedAlert(alert.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button size="sm">Investigate</Button>
                        <Button size="sm" variant="outline">
                          Assign
                        </Button>
                        <Button size="sm" variant="outline">
                          Escalate
                        </Button>
                      </div>
                      <span className="text-sm text-gray-600">Source: {alert.source}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Alert Details Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Alert Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedAlert ? (
                  <div className="space-y-4">
                    {(() => {
                      const alert = alerts.find((a) => a.id === selectedAlert)
                      if (!alert) return null

                      return (
                        <>
                          <div>
                            <h4 className="font-semibold mb-2">Affected Assets</h4>
                            <div className="space-y-1">
                              {alert.affectedAssets.map((asset, index) => (
                                <Badge key={index} variant="outline">
                                  {asset}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Timeline</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>Alert created: {alert.created}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Status: {alert.status}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Recommended Actions</h4>
                            <div className="space-y-2">
                              <Button size="sm" className="w-full">
                                Block IP Address
                              </Button>
                              <Button size="sm" variant="outline" className="w-full">
                                Isolate Asset
                              </Button>
                              <Button size="sm" variant="outline" className="w-full">
                                Run Forensics
                              </Button>
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Select an alert to view details</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="investigating">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500 py-8">No alerts currently under investigation</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500 py-8">No resolved alerts in the current time range</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                Alert rules management interface would be implemented here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
