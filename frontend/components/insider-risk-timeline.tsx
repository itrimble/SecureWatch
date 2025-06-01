"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Clock,
  User,
  Activity,
  AlertTriangle,
  FileText,
  Download,
  Search,
  Filter,
  MapPin,
  Shield,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

export function InsiderRiskTimeline() {
  const [selectedUser, setSelectedUser] = useState("all")
  const [timeRange, setTimeRange] = useState("24h")
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  const timelineEvents = [
    {
      id: "EVT-001",
      timestamp: "2024-01-15 14:32:15",
      user: "Mike Wilson",
      department: "Engineering",
      type: "file_access",
      severity: "critical",
      title: "Large file download detected",
      description: "Downloaded 2.5GB of sensitive project files",
      location: "Seattle, WA",
      device: "LAPTOP-MW-001",
      riskScore: 95,
      details: {
        files: ["project_specs.zip", "customer_data.xlsx", "source_code.tar.gz"],
        size: "2.5 GB",
        duration: "15 minutes",
        method: "HTTPS Download",
      },
    },
    {
      id: "EVT-002",
      timestamp: "2024-01-15 14:15:22",
      user: "Mike Wilson",
      department: "Engineering",
      type: "vpn_access",
      severity: "high",
      title: "VPN connection from unusual location",
      description: "Connected via VPN from Miami, FL (unusual location)",
      location: "Miami, FL",
      device: "LAPTOP-MW-001",
      riskScore: 78,
      details: {
        vpnServer: "vpn-east-02.company.com",
        duration: "2 hours 15 minutes",
        dataTransfer: "1.2 GB",
        protocol: "OpenVPN",
      },
    },
    {
      id: "EVT-003",
      timestamp: "2024-01-15 13:45:18",
      user: "John Smith",
      department: "Finance",
      type: "login_failure",
      severity: "medium",
      title: "Multiple failed login attempts",
      description: "5 consecutive failed login attempts",
      location: "New York, NY",
      device: "DESKTOP-JS-001",
      riskScore: 65,
      details: {
        attempts: 5,
        timespan: "10 minutes",
        accounts: ["john.smith", "j.smith", "jsmith"],
        source: "192.168.1.45",
      },
    },
    {
      id: "EVT-004",
      timestamp: "2024-01-15 13:30:45",
      user: "Sarah Johnson",
      department: "Sales",
      type: "policy_violation",
      severity: "medium",
      title: "USB device usage detected",
      description: "Connected unauthorized USB storage device",
      location: "Chicago, IL",
      device: "LAPTOP-SJ-001",
      riskScore: 55,
      details: {
        deviceType: "USB Storage",
        capacity: "64 GB",
        vendor: "SanDisk",
        filesTransferred: 12,
      },
    },
    {
      id: "EVT-005",
      timestamp: "2024-01-15 12:20:33",
      user: "Emily Davis",
      department: "Marketing",
      type: "email_anomaly",
      severity: "low",
      title: "Large email attachment sent",
      description: "Sent email with 25MB attachment to external recipient",
      location: "Austin, TX",
      device: "LAPTOP-ED-001",
      riskScore: 35,
      details: {
        recipient: "external@competitor.com",
        attachmentSize: "25 MB",
        fileName: "marketing_strategy.pdf",
        scanResult: "Clean",
      },
    },
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "file_access":
        return FileText
      case "vpn_access":
        return Shield
      case "login_failure":
        return AlertTriangle
      case "policy_violation":
        return AlertTriangle
      case "email_anomaly":
        return FileText
      default:
        return Activity
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 text-white"
      case "high":
        return "bg-orange-600 text-white"
      case "medium":
        return "bg-yellow-600 text-white"
      case "low":
        return "bg-green-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const filteredEvents = timelineEvents.filter((event) => {
    if (selectedUser !== "all" && event.user !== selectedUser) return false
    return true
  })

  const uniqueUsers = Array.from(new Set(timelineEvents.map((e) => e.user)))

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Clock className="h-8 w-8" />
              Insider Risk Timeline
            </h1>
            <p className="text-muted-foreground">Chronological view of user activities and risk events</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Timeline
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search timeline events..." className="pl-10" />
                </div>
              </div>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline ({filteredEvents.length} events)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-6">
                {filteredEvents.map((event, index) => {
                  const TypeIcon = getTypeIcon(event.type)
                  const isExpanded = expandedEvent === event.id

                  return (
                    <div key={event.id} className="relative flex gap-6">
                      {/* Timeline Dot */}
                      <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-background border-2 border-primary rounded-full">
                        <TypeIcon className="h-6 w-6 text-primary" />
                      </div>

                      {/* Event Content */}
                      <div className="flex-1 min-w-0">
                        <Card className="hover:shadow-md transition-all duration-200">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              {/* Event Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                                    <span className="text-sm text-muted-foreground">{event.timestamp}</span>
                                  </div>
                                  <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
                                  <p className="text-muted-foreground mb-3">{event.description}</p>

                                  {/* User and Location Info */}
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <User className="h-4 w-4" />
                                      <span>
                                        {event.user} ({event.department})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4" />
                                      <span>{event.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Activity className="h-4 w-4" />
                                      <span>{event.device}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-red-600">{event.riskScore}</div>
                                    <div className="text-xs text-muted-foreground">Risk Score</div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View Details</TooltipContent>
                                    </Tooltip>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && (
                                <div className="border-t pt-4 space-y-3">
                                  <h4 className="font-semibold">Event Details</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    {Object.entries(event.details).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-muted-foreground capitalize">
                                          {key.replace(/([A-Z])/g, " $1").toLowerCase()}:
                                        </span>
                                        <span className="font-medium">
                                          {Array.isArray(value) ? value.join(", ") : value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
