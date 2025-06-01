"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Activity,
  Eye,
  Settings,
  BarChart3,
  Clock,
  Download,
  RefreshCw,
} from "lucide-react"

export function InsiderRiskPage() {
  const [timeRange, setTimeRange] = useState("30d")

  const riskMetrics = {
    totalUsers: 1247,
    highRiskUsers: 23,
    activeCases: 8,
    resolvedCases: 45,
    riskTrend: "+12%",
    avgRiskScore: 34,
  }

  const riskCategories = [
    {
      name: "Data Exfiltration",
      count: 12,
      trend: "+15%",
      color: "bg-red-600",
      description: "Unusual data access and transfer patterns",
    },
    {
      name: "Policy Violations",
      count: 8,
      trend: "-5%",
      color: "bg-orange-600",
      description: "Violations of security policies and procedures",
    },
    {
      name: "Privilege Abuse",
      count: 6,
      trend: "+8%",
      color: "bg-yellow-600",
      description: "Misuse of elevated access privileges",
    },
    {
      name: "Sabotage Risk",
      count: 3,
      trend: "0%",
      color: "bg-purple-600",
      description: "Potential malicious activities",
    },
  ]

  const topRiskUsers = [
    {
      name: "Mike Wilson",
      department: "Engineering",
      riskScore: 95,
      indicators: ["Large file downloads", "Off-hours access", "VPN usage"],
      lastActivity: "2 hours ago",
    },
    {
      name: "John Smith",
      department: "Finance",
      riskScore: 87,
      indicators: ["Unusual access patterns", "Failed logins", "External transfers"],
      lastActivity: "4 hours ago",
    },
    {
      name: "Sarah Johnson",
      department: "Sales",
      riskScore: 76,
      indicators: ["Policy violations", "USB usage"],
      lastActivity: "1 day ago",
    },
  ]

  const recentAlerts = [
    {
      id: "IRA-001",
      user: "Mike Wilson",
      type: "Data Exfiltration",
      severity: "critical",
      time: "15 minutes ago",
      description: "Large volume of sensitive files accessed",
    },
    {
      id: "IRA-002",
      user: "John Smith",
      type: "Policy Violation",
      severity: "high",
      time: "1 hour ago",
      description: "Attempted access to restricted systems",
    },
    {
      id: "IRA-003",
      user: "Emily Davis",
      type: "Privilege Abuse",
      severity: "medium",
      time: "3 hours ago",
      description: "Elevated privileges used outside normal scope",
    },
  ]

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

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Insider Risk Management
            </h1>
            <p className="text-muted-foreground">Monitor and analyze insider threats and risky behaviors</p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Data</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Risk Settings</TooltipContent>
            </Tooltip>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{riskMetrics.totalUsers}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{riskMetrics.highRiskUsers}</div>
              <div className="text-sm text-muted-foreground">High Risk Users</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-red-600" />
                <span className="text-xs text-red-600">{riskMetrics.riskTrend}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-yellow-600">{riskMetrics.activeCases}</div>
              <div className="text-sm text-muted-foreground">Active Cases</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">{riskMetrics.resolvedCases}</div>
              <div className="text-sm text-muted-foreground">Resolved Cases</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{riskMetrics.avgRiskScore}</div>
              <div className="text-sm text-muted-foreground">Avg Risk Score</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-orange-600">89%</div>
              <div className="text-sm text-muted-foreground">Detection Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Risk Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {riskCategories.map((category, index) => (
                <Card key={index} className="hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-3 h-3 rounded-full ${category.color}`} />
                      <div className="flex items-center gap-1">
                        {category.trend.startsWith("+") ? (
                          <TrendingUp className="h-3 w-3 text-red-600" />
                        ) : category.trend.startsWith("-") ? (
                          <TrendingDown className="h-3 w-3 text-green-600" />
                        ) : (
                          <div className="h-3 w-3" />
                        )}
                        <span className="text-xs text-muted-foreground">{category.trend}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold mb-1">{category.name}</h3>
                    <div className="text-2xl font-bold mb-2">{category.count}</div>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Risk Users */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Risk Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topRiskUsers.map((user, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-accent transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{user.name}</h4>
                          <Badge variant="outline">{user.department}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">Risk Score:</span>
                          <span className="font-bold text-red-600">{user.riskScore}</span>
                          <div className="w-20">
                            <Progress value={user.riskScore} className="h-1" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Last activity: {user.lastActivity}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Profile</TooltipContent>
                        </Tooltip>
                        <Button size="sm">Investigate</Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.indicators.map((indicator, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-3 hover:bg-accent transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                          <span className="text-sm font-medium">{alert.type}</span>
                        </div>
                        <div className="text-sm font-medium">{alert.user}</div>
                        <div className="text-xs text-muted-foreground">{alert.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{alert.time}</span>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Risk Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">Risk Timeline Visualization</p>
                <p className="text-sm">Interactive timeline showing risk events over time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
