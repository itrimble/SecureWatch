"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Activity,
  FileText,
  Download,
  Upload,
  Shield,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  BarChart3,
  Clock,
  MapPin,
  Laptop,
  RefreshCw,
} from "lucide-react"

export function InsiderRiskActivity() {
  const [selectedUser, setSelectedUser] = useState("all")
  const [activityType, setActivityType] = useState("all")
  const [timeRange, setTimeRange] = useState("24h")

  const activities = [
    {
      id: "ACT-001",
      user: "Mike Wilson",
      department: "Engineering",
      type: "file_download",
      description: "Downloaded sensitive project files",
      timestamp: "2024-01-15 14:32:15",
      riskScore: 95,
      location: "Seattle, WA",
      device: "LAPTOP-MW-001",
      size: "2.5 GB",
      files: 15,
      status: "flagged",
    },
    {
      id: "ACT-002",
      user: "John Smith",
      department: "Finance",
      type: "login_attempt",
      description: "Multiple failed login attempts",
      timestamp: "2024-01-15 13:45:18",
      riskScore: 75,
      location: "New York, NY",
      device: "DESKTOP-JS-001",
      attempts: 5,
      status: "investigating",
    },
    {
      id: "ACT-003",
      user: "Sarah Johnson",
      department: "Sales",
      type: "usb_usage",
      description: "Connected unauthorized USB device",
      timestamp: "2024-01-15 13:30:45",
      riskScore: 65,
      location: "Chicago, IL",
      device: "LAPTOP-SJ-001",
      deviceType: "USB Storage",
      capacity: "64 GB",
      status: "reviewed",
    },
    {
      id: "ACT-004",
      user: "Emily Davis",
      department: "Marketing",
      type: "email_send",
      description: "Sent large attachment to external recipient",
      timestamp: "2024-01-15 12:20:33",
      riskScore: 45,
      location: "Austin, TX",
      device: "LAPTOP-ED-001",
      recipient: "external@competitor.com",
      attachmentSize: "25 MB",
      status: "cleared",
    },
    {
      id: "ACT-005",
      user: "David Brown",
      department: "Engineering",
      type: "vpn_access",
      description: "VPN access from unusual location",
      timestamp: "2024-01-15 11:15:22",
      riskScore: 55,
      location: "Miami, FL",
      device: "LAPTOP-DB-001",
      vpnDuration: "3 hours",
      dataTransfer: "1.8 GB",
      status: "monitoring",
    },
  ]

  const activityStats = {
    totalActivities: activities.length,
    flaggedActivities: activities.filter((a) => a.status === "flagged").length,
    highRiskActivities: activities.filter((a) => a.riskScore >= 70).length,
    uniqueUsers: new Set(activities.map((a) => a.user)).size,
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "file_download":
        return Download
      case "file_upload":
        return Upload
      case "login_attempt":
        return Shield
      case "usb_usage":
        return Laptop
      case "email_send":
        return FileText
      case "vpn_access":
        return Shield
      default:
        return Activity
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "flagged":
        return "bg-red-600 text-white"
      case "investigating":
        return "bg-orange-600 text-white"
      case "monitoring":
        return "bg-yellow-600 text-white"
      case "reviewed":
        return "bg-blue-600 text-white"
      case "cleared":
        return "bg-green-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600"
    if (score >= 60) return "text-orange-600"
    if (score >= 40) return "text-yellow-600"
    return "text-green-600"
  }

  const filteredActivities = activities.filter((activity) => {
    if (selectedUser !== "all" && activity.user !== selectedUser) return false
    if (activityType !== "all" && activity.type !== activityType) return false
    return true
  })

  const uniqueUsers = Array.from(new Set(activities.map((a) => a.user)))
  const activityTypes = Array.from(new Set(activities.map((a) => a.type)))

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Insider Risk Activity Monitor
            </h1>
            <p className="text-muted-foreground">Real-time monitoring of user activities and risk behaviors</p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Activities</TooltipContent>
            </Tooltip>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Activities
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{activityStats.totalActivities}</div>
              <div className="text-sm text-muted-foreground">Total Activities</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{activityStats.flaggedActivities}</div>
              <div className="text-sm text-muted-foreground">Flagged Activities</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-orange-600">{activityStats.highRiskActivities}</div>
              <div className="text-sm text-muted-foreground">High Risk Activities</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{activityStats.uniqueUsers}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search activities..." className="pl-10" />
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
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Activity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {activityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
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

        {/* Activities Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Activity Log ({filteredActivities.length} activities)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => {
                  const TypeIcon = getTypeIcon(activity.type)
                  return (
                    <TableRow key={activity.id} className="hover:bg-accent">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{activity.description}</div>
                            <div className="text-sm text-muted-foreground">{activity.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{activity.user}</div>
                          <div className="text-sm text-muted-foreground">{activity.department}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {activity.type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${getRiskColor(activity.riskScore)}`}>{activity.riskScore}</span>
                          <div className="w-16">
                            <Progress value={activity.riskScore} className="h-1" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{activity.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Laptop className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{activity.device}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(activity.status)}>{activity.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{activity.timestamp}</span>
                        </div>
                      </TableCell>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Create Alert</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
