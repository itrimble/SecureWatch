"use client"

import { useEffect } from "react" // Added for mount log
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
// Import icons from centralized location
import {
  AlertTriangle,
  Shield,
  Activity,
  Users,
  Server,
  TrendingUp,
  TrendingDown,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Download,
  Filter,
} from "@/lib/icons"
import { debugLog } from "@/lib/debug" // Added for debug logging

export default function DashboardContent() {
  const severityCards = [
    {
      title: "Critical Severity",
      value: "646",
      color: "bg-red-600",
      textColor: "text-white",
      change: "+12%",
      trend: "up",
    },
    {
      title: "High Severity",
      value: "2,411",
      color: "bg-orange-600",
      textColor: "text-white",
      change: "+8%",
      trend: "up",
    },
    {
      title: "Medium Severity",
      value: "5,068",
      color: "bg-yellow-600",
      textColor: "text-white",
      change: "-3%",
      trend: "down",
    },
    {
      title: "Low Severity",
      value: "241",
      color: "bg-green-600",
      textColor: "text-white",
      change: "-15%",
      trend: "down",
    },
    {
      title: "Informational",
      value: "1,452",
      color: "bg-gray-600",
      textColor: "text-white",
      change: "+2%",
      trend: "up",
    },
  ]

  const metrics = [
    { title: "Active Threats", value: "23", change: "+12%", trend: "up", icon: AlertTriangle, color: "text-red-600" },
    { title: "Security Score", value: "87%", change: "+5%", trend: "up", icon: Shield, color: "text-green-600" },
    { title: "Events/Hour", value: "15.2K", change: "-8%", trend: "down", icon: Activity, color: "text-blue-600" },
    { title: "Active Users", value: "1,247", change: "+3%", trend: "up", icon: Users, color: "text-purple-600" },
  ]

  const recentAlerts = [
    {
      id: "ALT-001",
      title: "Suspicious Login Activity",
      severity: "high",
      time: "2 minutes ago",
      source: "192.168.1.100",
    },
    { id: "ALT-002", title: "Malware Detection", severity: "critical", time: "5 minutes ago", source: "WS-045" },
    { id: "ALT-003", title: "Unusual Network Traffic", severity: "medium", time: "8 minutes ago", source: "Gateway" },
  ]

  useEffect(() => {
    debugLog("DashboardContent", "Component Mounted")
    // Example of logging data
    debugLog("DashboardContent", "Initial metrics loaded", { count: metrics.length })
  }, []) // Empty dependency array means this runs once on mount

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

  debugLog("DashboardContent", "Rendering component", {
    severityCardsCount: severityCards.length,
    metricsCount: metrics.length,
    recentAlertsCount: recentAlerts.length,
  })

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Security Dashboard</h1>
            <p className="text-muted-foreground">Real-time security monitoring and analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse" />
              System Healthy
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Dashboard</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Report</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Severity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {severityCards.map((card, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
              <CardContent className={`p-6 ${card.color} ${card.textColor} rounded-lg`}>
                <div className="text-center">
                  <h3 className="text-sm font-medium opacity-90 mb-2">{card.title}</h3>
                  <p className="text-3xl font-bold mb-2">{card.value}</p>
                  <div className="flex items-center justify-center gap-1">
                    {card.trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span className="text-sm">{card.change}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {metric.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                        {metric.change}
                      </span>
                    </div>
                  </div>
                  <metric.icon className={`h-8 w-8 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Alerts */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Alerts
              </CardTitle>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Filter Alerts</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>More Options</TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">Source: {alert.source}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{alert.time}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>CPU Usage</span>
                  <span className="font-medium">67%</span>
                </div>
                <Progress value={67} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Memory Usage</span>
                  <span className="font-medium">84%</span>
                </div>
                <Progress value={84} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Disk Usage</span>
                  <span className="font-medium">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Network I/O</span>
                  <span className="font-medium">23%</span>
                </div>
                <Progress value={23} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
