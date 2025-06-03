"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Users,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Download,
  Eye,
  Clock,
  MapPin,
  Server,
  FileText,
  Network,
  Smartphone,
  Laptop,
  Shield,
  Target,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
} from "lucide-react"

export function UebaDashboard() {
  const [timeRange, setTimeRange] = useState("24h")
  const [selectedUser, setSelectedUser] = useState("all")
  const [riskCategory, setRiskCategory] = useState("all")

  // UEBA Stats
  const uebaStats = {
    totalUsers: 1247,
    highRiskUsers: 28,
    mediumRiskUsers: 156,
    lowRiskUsers: 1063,
    avgRiskScore: 23.5,
    alertsToday: 45,
    behaviorModels: 12,
    anomaliesDetected: 127,
  }

  // High Risk Users
  const highRiskUsers = [
    {
      id: "usr-001",
      name: "John Anderson",
      email: "john.anderson@company.com",
      department: "Finance",
      riskScore: 89.5,
      trend: "up",
      lastActivity: "2024-01-15T14:32:15Z",
      location: "New York, NY",
      device: "Windows 11 - LAPTOP-JA001",
      topRisks: ["Off-hours access", "Large data downloads", "VPN anomalies"],
      recentAlerts: 7,
      status: "investigating",
    },
    {
      id: "usr-002",
      name: "Sarah Chen",
      email: "sarah.chen@company.com",
      department: "IT Operations",
      riskScore: 85.2,
      trend: "up",
      lastActivity: "2024-01-15T14:28:42Z",
      location: "San Francisco, CA",
      device: "macOS 14.2 - MBP-SC002",
      topRisks: ["Privilege escalation", "External connections", "Suspicious commands"],
      recentAlerts: 5,
      status: "monitoring",
    },
    {
      id: "usr-003",
      name: "Marcus Johnson",
      email: "marcus.johnson@company.com",
      department: "Sales",
      riskScore: 82.7,
      trend: "stable",
      lastActivity: "2024-01-15T14:15:23Z",
      location: "Chicago, IL",
      device: "Windows 11 - DESKTOP-MJ003",
      topRisks: ["Multiple failed logins", "Geo-location anomaly", "File access patterns"],
      recentAlerts: 3,
      status: "resolved",
    },
  ]

  // Behavioral Patterns
  const behaviorPatterns = [
    {
      category: "Authentication Patterns",
      normalBaseline: 85,
      currentScore: 72,
      trend: "down",
      anomalies: ["Multiple failed logins", "Unusual login times", "New device usage"],
      impact: "medium",
    },
    {
      category: "Data Access Patterns",
      normalBaseline: 90,
      currentScore: 67,
      trend: "down",
      anomalies: ["Large file downloads", "Access to restricted folders", "External sharing"],
      impact: "high",
    },
    {
      category: "Network Activity",
      normalBaseline: 88,
      currentScore: 91,
      trend: "up",
      anomalies: ["VPN usage increase", "External API calls"],
      impact: "low",
    },
    {
      category: "Application Usage",
      normalBaseline: 92,
      currentScore: 88,
      trend: "stable",
      anomalies: ["New software installations", "Admin tool usage"],
      impact: "medium",
    },
  ]

  // Risk Trends Over Time
  const riskTrends = [
    { time: "6:00", high: 2, medium: 12, low: 15 },
    { time: "8:00", high: 5, medium: 25, low: 22 },
    { time: "10:00", high: 8, medium: 35, low: 28 },
    { time: "12:00", high: 12, medium: 42, low: 35 },
    { time: "14:00", high: 18, medium: 48, low: 40 },
    { time: "16:00", high: 15, medium: 38, low: 32 },
    { time: "18:00", high: 8, medium: 22, low: 18 },
  ]

  // Recent Behavioral Anomalies
  const recentAnomalies = [
    {
      id: "anom-001",
      timestamp: "2024-01-15T14:32:15Z",
      user: "John Anderson",
      type: "Unusual Data Access",
      riskScore: 89.5,
      description: "User accessed 15GB of financial data outside normal hours",
      location: "New York, NY → London, UK",
      device: "LAPTOP-JA001",
      confidence: 94.2,
      status: "investigating",
    },
    {
      id: "anom-002",
      timestamp: "2024-01-15T14:28:42Z",
      user: "Sarah Chen",
      type: "Privilege Escalation",
      riskScore: 85.2,
      description: "Administrative commands executed on production server",
      location: "San Francisco, CA",
      device: "MBP-SC002",
      confidence: 91.7,
      status: "monitoring",
    },
    {
      id: "anom-003",
      timestamp: "2024-01-15T14:15:23Z",
      user: "Marcus Johnson",
      type: "Geographic Anomaly",
      riskScore: 82.7,
      description: "Login from unusual geographic location",
      location: "Chicago, IL → Tokyo, JP",
      device: "DESKTOP-MJ003",
      confidence: 88.3,
      status: "resolved",
    },
  ]

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600"
    if (score >= 60) return "text-orange-600"
    if (score >= 40) return "text-yellow-600"
    return "text-green-600"
  }

  const getRiskBadgeColor = (score: number) => {
    if (score >= 80) return "bg-red-600 text-white"
    if (score >= 60) return "bg-orange-600 text-white"
    if (score >= 40) return "bg-yellow-600 text-white"
    return "bg-green-600 text-white"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "investigating":
        return "bg-red-600 text-white"
      case "monitoring":
        return "bg-orange-600 text-white"
      case "resolved":
        return "bg-green-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-red-600" />
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600" />
    return <div className="h-4 w-4" />
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              User & Entity Behavior Analytics
            </h1>
            <p className="text-muted-foreground">AI-powered behavioral analysis and risk assessment</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Brain className="w-3 h-3 mr-1" />
                ML-Powered
              </Badge>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                <Activity className="w-3 h-3 mr-1" />
                Real-time Analysis
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Analysis</TooltipContent>
            </Tooltip>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* UEBA Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{uebaStats.totalUsers.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{uebaStats.highRiskUsers}</div>
              <div className="text-sm text-muted-foreground">High Risk</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-red-600" />
                <span className="text-xs text-red-600">+3</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-orange-600">{uebaStats.mediumRiskUsers}</div>
              <div className="text-sm text-muted-foreground">Medium Risk</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-orange-600" />
                <span className="text-xs text-orange-600">+8</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">{uebaStats.lowRiskUsers.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Low Risk</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{uebaStats.avgRiskScore}</div>
              <div className="text-sm text-muted-foreground">Avg Risk Score</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-purple-600" />
                <span className="text-xs text-purple-600">+2.3</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-yellow-600">{uebaStats.alertsToday}</div>
              <div className="text-sm text-muted-foreground">Alerts Today</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-cyan-600">{uebaStats.behaviorModels}</div>
              <div className="text-sm text-muted-foreground">Behavior Models</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-indigo-600">{uebaStats.anomaliesDetected}</div>
              <div className="text-sm text-muted-foreground">Anomalies (24h)</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">High-Risk Users</TabsTrigger>
            <TabsTrigger value="patterns">Behavior Patterns</TabsTrigger>
            <TabsTrigger value="anomalies">Recent Anomalies</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Risk Distribution and Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-600 rounded-full" />
                          High Risk (80-100)
                        </span>
                        <span className="font-medium">{uebaStats.highRiskUsers} users</span>
                      </div>
                      <Progress value={(uebaStats.highRiskUsers / uebaStats.totalUsers) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-600 rounded-full" />
                          Medium Risk (60-79)
                        </span>
                        <span className="font-medium">{uebaStats.mediumRiskUsers} users</span>
                      </div>
                      <Progress value={(uebaStats.mediumRiskUsers / uebaStats.totalUsers) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-600 rounded-full" />
                          Low Risk (0-59)
                        </span>
                        <span className="font-medium">{uebaStats.lowRiskUsers} users</span>
                      </div>
                      <Progress value={(uebaStats.lowRiskUsers / uebaStats.totalUsers) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Risk Trends (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <LineChart className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-lg font-medium">Risk Score Trends</p>
                      <p className="text-sm">Real-time risk evolution visualization</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Risk Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Top Risk Categories Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600 mb-1">45</div>
                    <div className="text-sm text-muted-foreground">Authentication Anomalies</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 mb-1">32</div>
                    <div className="text-sm text-muted-foreground">Data Access Violations</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">28</div>
                    <div className="text-sm text-muted-foreground">Geographic Anomalies</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">22</div>
                    <div className="text-sm text-muted-foreground">Privilege Escalations</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* High Risk Users */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  High-Risk Users
                </CardTitle>
                <Select value={riskCategory} onValueChange={setRiskCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Risk Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                    <SelectItem value="data-access">Data Access</SelectItem>
                    <SelectItem value="privilege">Privilege Escalation</SelectItem>
                    <SelectItem value="geographic">Geographic</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {highRiskUsers.map((user) => (
                    <Card key={user.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                <h4 className="font-semibold">{user.name}</h4>
                              </div>
                              <Badge className={getRiskBadgeColor(user.riskScore)}>
                                Risk: {user.riskScore}
                              </Badge>
                              <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                              {getTrendIcon(user.trend)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{user.email} • {user.department}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(user.lastActivity).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{user.location}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Laptop className="h-3 w-3" />
                                <span>{user.device}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span>{user.recentAlerts} alerts</span>
                              </div>
                            </div>

                            <div>
                              <span className="text-sm font-medium">Top Risk Factors:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {user.topRisks.map((risk, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {risk}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </Button>
                            <Button variant="outline" size="sm">
                              <Shield className="h-4 w-4 mr-2" />
                              Actions
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            {/* Behavior Patterns Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Behavioral Pattern Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {behaviorPatterns.map((pattern, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          {pattern.category}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={pattern.impact === "high" ? "destructive" : pattern.impact === "medium" ? "secondary" : "default"}>
                            {pattern.impact} impact
                          </Badge>
                          {getTrendIcon(pattern.trend)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Normal Baseline</span>
                                <span className="font-medium">{pattern.normalBaseline}</span>
                              </div>
                              <Progress value={pattern.normalBaseline} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Current Score</span>
                                <span className={`font-medium ${getRiskColor(pattern.currentScore)}`}>
                                  {pattern.currentScore}
                                </span>
                              </div>
                              <Progress value={pattern.currentScore} className="h-2" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-sm mb-2">Detected Anomalies:</h5>
                          <div className="space-y-1">
                            {pattern.anomalies.map((anomaly, anomalyIndex) => (
                              <div key={anomalyIndex} className="flex items-center gap-2 text-sm">
                                <AlertTriangle className="h-3 w-3 text-orange-600" />
                                <span>{anomaly}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-6">
            {/* Recent Anomalies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Recent Behavioral Anomalies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentAnomalies.map((anomaly) => (
                    <Card key={anomaly.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold">{anomaly.type}</h4>
                              <Badge className={getRiskBadgeColor(anomaly.riskScore)}>
                                Risk: {anomaly.riskScore}
                              </Badge>
                              <Badge variant="outline">Confidence: {anomaly.confidence}%</Badge>
                              <Badge className={getStatusColor(anomaly.status)}>{anomaly.status}</Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">{anomaly.description}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(anomaly.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{anomaly.user}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{anomaly.location}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Server className="h-3 w-3" />
                                <span>{anomaly.device}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Investigate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}