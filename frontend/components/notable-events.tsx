"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, Search, Filter, Download, Eye, Clock, ChevronDown, ChevronUp, Briefcase } from "lucide-react"

interface NotableEvent {
  id: string
  timestamp: string
  severity: "critical" | "high" | "medium" | "low" | "info"
  eventName: string
  description: string
  source: string
  destination?: string
  user?: string
  status: "new" | "investigating" | "closed"
  analyst?: string
  relatedAlerts?: number
}

export function NotableEvents() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSeverity, setFilterSeverity] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  const notableEventsData: NotableEvent[] = [
    {
      id: "NE-001",
      timestamp: "2024-05-30 10:15:23",
      severity: "high",
      eventName: "Multiple Failed Logins from Unusual IP",
      description: "User 'admin' experienced 15 failed login attempts from IP 203.0.113.45 (North Korea).",
      source: "Firewall Logs",
      destination: "Auth Server SRV-AUTH-01",
      user: "admin",
      status: "new",
      relatedAlerts: 3,
    },
    {
      id: "NE-002",
      timestamp: "2024-05-30 09:45:10",
      severity: "critical",
      eventName: "Potential Ransomware Activity Detected",
      description: "Endpoint 'WS-MARKETING-05' exhibited behavior consistent with ransomware (mass file encryption).",
      source: "EDR System",
      user: "jane.doe",
      status: "investigating",
      analyst: "John K.",
      relatedAlerts: 5,
    },
    {
      id: "NE-003",
      timestamp: "2024-05-29 17:20:05",
      severity: "medium",
      eventName: "Anomalous Outbound Network Traffic",
      description: "Server 'DB-PROD-02' initiated an unusually large data transfer (2.5GB) to an external IP.",
      source: "Network Monitor",
      destination: "185.220.101.14 (Unknown)",
      status: "new",
    },
    {
      id: "NE-004",
      timestamp: "2024-05-29 14:05:30",
      severity: "low",
      eventName: "Policy Violation: USB Drive Usage",
      description: "User 'mark.p' connected an unauthorized USB drive to 'WS-FINANCE-12'.",
      source: "DLP System",
      user: "mark.p",
      status: "closed",
      analyst: "Sarah L.",
    },
  ]

  const getSeverityColor = (severity: NotableEvent["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 text-white"
      case "high":
        return "bg-orange-500 text-white"
      case "medium":
        return "bg-yellow-500 text-black" // Ensure contrast
      case "low":
        return "bg-blue-500 text-white"
      case "info":
        return "bg-gray-500 text-white"
      default:
        return "bg-gray-400 text-black"
    }
  }

  const getStatusColor = (status: NotableEvent["status"]) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "investigating":
        return "bg-yellow-100 text-yellow-800"
      case "closed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredEvents = notableEventsData.filter((event) => {
    const matchesSearch =
      event.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.user && event.user.toLowerCase().includes(searchTerm.toLowerCase())) ||
      event.source.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSeverity = filterSeverity === "all" || event.severity === filterSeverity
    const matchesStatus = filterStatus === "all" || event.status === filterStatus
    return matchesSearch && matchesSeverity && matchesStatus
  })

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Notable Events
            </h1>
            <p className="text-muted-foreground">Prioritized security events requiring attention.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Events
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notable events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events List ({filteredEvents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Analyst</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <>
                    <TableRow key={event.id} className="hover:bg-accent">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                        >
                          {expandedEvent === event.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {event.timestamp}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{event.eventName}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                      </TableCell>
                      <TableCell>{event.analyst || "Unassigned"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                          {event.status === "new" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Briefcase className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Create Case</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedEvent === event.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-4 bg-muted/50 space-y-3">
                            <p>
                              <span className="font-semibold">Description:</span> {event.description}
                            </p>
                            <p>
                              <span className="font-semibold">Source:</span> {event.source}
                            </p>
                            {event.destination && (
                              <p>
                                <span className="font-semibold">Destination:</span> {event.destination}
                              </p>
                            )}
                            {event.user && (
                              <p>
                                <span className="font-semibold">User:</span> {event.user}
                              </p>
                            )}
                            {event.relatedAlerts && (
                              <p>
                                <span className="font-semibold">Related Alerts:</span> {event.relatedAlerts}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Button size="sm">Investigate</Button>
                              <Button size="sm" variant="outline">
                                Assign to Me
                              </Button>
                              {event.status !== "closed" && (
                                <Button size="sm" variant="outline">
                                  Close Event
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
