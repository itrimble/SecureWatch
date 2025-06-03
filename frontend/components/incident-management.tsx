"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, Clock, User, Plus, Search } from "lucide-react"

export function IncidentManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false)

  const handleCreateIncident = () => {
    console.log('Creating new incident...')
    // TODO: Implement incident creation
    setShowCreateForm(false)
  }

  const handleSearchIncidents = () => {
    console.log('Searching incidents...')
    // TODO: Implement incident search
  }

  const handleViewDetails = (incidentId: string) => {
    console.log('Viewing incident details:', incidentId)
    // TODO: Implement view details
  }

  const handleUpdateIncident = (incidentId: string) => {
    console.log('Updating incident:', incidentId)
    // TODO: Implement update incident
  }

  const incidents = [
    {
      id: "INC-2024-001",
      title: "Data Breach Investigation",
      description: "Potential unauthorized access to customer database",
      severity: "critical",
      status: "active",
      assignee: "Sarah Johnson",
      created: "2024-01-15 09:30:00",
      lastUpdate: "2024-01-15 14:15:00",
      affectedSystems: ["Customer DB", "Web Portal"],
      estimatedImpact: "High",
    },
    {
      id: "INC-2024-002",
      title: "Malware Outbreak",
      description: "Multiple workstations infected with ransomware",
      severity: "high",
      status: "investigating",
      assignee: "Mike Chen",
      created: "2024-01-15 11:45:00",
      lastUpdate: "2024-01-15 13:30:00",
      affectedSystems: ["Workstations", "File Server"],
      estimatedImpact: "Medium",
    },
    {
      id: "INC-2024-003",
      title: "Phishing Campaign",
      description: "Employees receiving suspicious emails",
      severity: "medium",
      status: "contained",
      assignee: "Alex Rodriguez",
      created: "2024-01-14 16:20:00",
      lastUpdate: "2024-01-15 10:00:00",
      affectedSystems: ["Email System"],
      estimatedImpact: "Low",
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
      case "active":
        return "bg-red-100 text-red-800"
      case "investigating":
        return "bg-yellow-100 text-yellow-800"
      case "contained":
        return "bg-blue-100 text-blue-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Incident Management</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Incident
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Incident</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input placeholder="Incident title" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Severity</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea placeholder="Describe the incident..." rows={3} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Assignee</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sarah">Sarah Johnson</SelectItem>
                    <SelectItem value="mike">Mike Chen</SelectItem>
                    <SelectItem value="alex">Alex Rodriguez</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Affected Systems</label>
                <Input placeholder="e.g., Web Server, Database" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateIncident}>Create Incident</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Incidents</TabsTrigger>
          <TabsTrigger value="investigating">Investigating</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input placeholder="Search incidents..." className="w-full" />
            </div>
            <Button onClick={handleSearchIncidents} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          <div className="space-y-4">
            {incidents.map((incident) => (
              <Card key={incident.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{incident.title}</h3>
                        <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                        <Badge variant="outline" className={getStatusColor(incident.status)}>
                          {incident.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{incident.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">ID:</span> {incident.id}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{incident.assignee}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Created: {incident.created}</span>
                        </div>
                        <div>
                          <span className="font-medium">Impact:</span> {incident.estimatedImpact}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleViewDetails(incident.id)} size="sm">View Details</Button>
                      <Button onClick={() => handleUpdateIncident(incident.id)} size="sm" variant="outline">
                        Update
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">Affected Systems: </span>
                        {incident.affectedSystems.map((system, index) => (
                          <Badge key={index} variant="outline" className="mr-1">
                            {system}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">Last updated: {incident.lastUpdate}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="investigating">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500 py-8">No incidents currently under investigation</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500 py-8">No resolved incidents in the current time range</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Response Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Avg Response Time</span>
                      <span className="font-medium">15 minutes</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Avg Resolution Time</span>
                      <span className="font-medium">4.2 hours</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>SLA Compliance</span>
                      <span className="font-medium text-green-600">94%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Incident Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>This Month</span>
                      <span className="font-medium">23</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Last Month</span>
                      <span className="font-medium">18</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Trend</span>
                      <span className="font-medium text-red-600">+28%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Critical</span>
                    <Badge className="bg-red-600 text-white">2</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">High</span>
                    <Badge className="bg-red-500 text-white">5</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Medium</span>
                    <Badge className="bg-yellow-500 text-white">12</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Low</span>
                    <Badge className="bg-green-500 text-white">4</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
