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
  Brain,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Download,
  Settings,
  Eye,
  Users,
  Server,
  Network,
  FileText,
  Clock,
  Target,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
} from "lucide-react"

export function MlAnomalyDetection() {
  const [timeRange, setTimeRange] = useState("24h")
  const [modelType, setModelType] = useState("all")
  const [anomalyType, setAnomalyType] = useState("all")

  // ML Model Performance Stats
  const mlStats = {
    totalModels: 8,
    activeModels: 6,
    accuracy: 94.2,
    precision: 89.7,
    recall: 91.3,
    f1Score: 90.5,
    detectedAnomalies: 127,
    falsePositives: 8,
  }

  // Active ML Models
  const mlModels = [
    {
      id: "user-behavior",
      name: "User Behavior Analytics",
      type: "UEBA",
      algorithm: "Isolation Forest",
      accuracy: 92.3,
      status: "active",
      lastTrained: "2 hours ago",
      anomaliesDetected: 23,
      riskLevel: "medium",
    },
    {
      id: "network-traffic",
      name: "Network Traffic Anomaly",
      type: "Network",
      algorithm: "LSTM Autoencoder",
      accuracy: 96.1,
      status: "active",
      lastTrained: "30 minutes ago",
      anomaliesDetected: 45,
      riskLevel: "high",
    },
    {
      id: "authentication",
      name: "Authentication Patterns",
      type: "Authentication",
      algorithm: "One-Class SVM",
      accuracy: 88.7,
      status: "active",
      lastTrained: "1 hour ago",
      anomaliesDetected: 12,
      riskLevel: "low",
    },
    {
      id: "file-access",
      name: "File Access Patterns",
      type: "Data Access",
      algorithm: "Random Forest",
      accuracy: 94.5,
      status: "active",
      lastTrained: "45 minutes ago",
      anomaliesDetected: 18,
      riskLevel: "medium",
    },
    {
      id: "process-execution",
      name: "Process Execution",
      type: "Endpoint",
      algorithm: "Deep Learning",
      accuracy: 97.2,
      status: "active",
      lastTrained: "15 minutes ago",
      anomaliesDetected: 29,
      riskLevel: "high",
    },
    {
      id: "email-patterns",
      name: "Email Communication",
      type: "Communication",
      algorithm: "Clustering",
      accuracy: 85.9,
      status: "training",
      lastTrained: "2 days ago",
      anomaliesDetected: 0,
      riskLevel: "low",
    },
  ]

  // Recent Anomalies
  const recentAnomalies = [
    {
      id: "ANO-001",
      timestamp: "2024-01-15T14:32:15Z",
      type: "Unusual Login Pattern",
      source: "User Behavior Analytics",
      severity: "high",
      confidence: 94.5,
      user: "john.doe@company.com",
      description: "User accessed system from 3 different countries within 2 hours",
      indicators: ["Geographical impossibility", "Multiple IP addresses", "Off-hours access"],
      mitigation: "Account temporarily locked, MFA required",
      status: "investigating",
    },
    {
      id: "ANO-002",
      timestamp: "2024-01-15T14:28:42Z",
      type: "Network Traffic Spike",
      source: "Network Traffic Anomaly",
      severity: "critical",
      confidence: 98.2,
      user: "system",
      description: "Unusual data exfiltration pattern detected from server DB-01",
      indicators: ["Data volume 10x normal", "External IP communication", "Compressed data transfer"],
      mitigation: "Network connection blocked, incident escalated",
      status: "contained",
    },
    {
      id: "ANO-003",
      timestamp: "2024-01-15T14:15:23Z",
      type: "Privilege Escalation",
      source: "Process Execution",
      severity: "high",
      confidence: 91.7,
      user: "service-account-web",
      description: "Service account attempting to access admin-level resources",
      indicators: ["Unexpected privilege use", "Process injection detected", "Registry modification"],
      mitigation: "Process terminated, account permissions reviewed",
      status: "resolved",
    },
  ]

  // Anomaly Trends
  const anomalyTrends = [
    { time: "00:00", behavioral: 12, network: 8, authentication: 5, endpoint: 15 },
    { time: "04:00", behavioral: 8, network: 12, authentication: 3, endpoint: 10 },
    { time: "08:00", behavioral: 25, network: 18, authentication: 12, endpoint: 22 },
    { time: "12:00", behavioral: 32, network: 28, authentication: 15, endpoint: 35 },
    { time: "16:00", behavioral: 28, network: 22, authentication: 18, endpoint: 30 },
    { time: "20:00", behavioral: 18, network: 15, authentication: 8, endpoint: 20 },
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-600 text-white"
      case "training":
        return "bg-blue-600 text-white"
      case "inactive":
        return "bg-gray-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-red-600 text-white"
      case "medium":
        return "bg-orange-600 text-white"
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
              <Brain className="h-8 w-8 text-blue-600" />
              ML Anomaly Detection
            </h1>
            <p className="text-muted-foreground">Machine Learning-powered anomaly detection and behavioral analysis</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Zap className="w-3 h-3 mr-1" />
                Real-time ML
              </Badge>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                <Activity className="w-3 h-3 mr-1" />
                Multi-Model
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
              <TooltipContent>Refresh Models</TooltipContent>
            </Tooltip>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* ML Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{mlStats.totalModels}</div>
              <div className="text-sm text-muted-foreground">Total Models</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">{mlStats.activeModels}</div>
              <div className="text-sm text-muted-foreground">Active Models</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{mlStats.accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">+2.1%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-indigo-600">{mlStats.precision}%</div>
              <div className="text-sm text-muted-foreground">Precision</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-cyan-600">{mlStats.recall}%</div>
              <div className="text-sm text-muted-foreground">Recall</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-teal-600">{mlStats.f1Score}%</div>
              <div className="text-sm text-muted-foreground">F1-Score</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-orange-600">{mlStats.detectedAnomalies}</div>
              <div className="text-sm text-muted-foreground">Anomalies (24h)</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-orange-600" />
                <span className="text-xs text-orange-600">+15%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{mlStats.falsePositives}</div>
              <div className="text-sm text-muted-foreground">False Positives</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingDown className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">-12%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="models">ML Models</TabsTrigger>
            <TabsTrigger value="anomalies">Recent Anomalies</TabsTrigger>
            <TabsTrigger value="trends">Trends & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Model Performance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Model Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Overall Accuracy</span>
                        <span className="font-medium">{mlStats.accuracy}%</span>
                      </div>
                      <Progress value={mlStats.accuracy} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Precision</span>
                        <span className="font-medium">{mlStats.precision}%</span>
                      </div>
                      <Progress value={mlStats.precision} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Recall</span>
                        <span className="font-medium">{mlStats.recall}%</span>
                      </div>
                      <Progress value={mlStats.recall} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>F1-Score</span>
                        <span className="font-medium">{mlStats.f1Score}%</span>
                      </div>
                      <Progress value={mlStats.f1Score} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Anomaly Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-600 rounded-full" />
                        <span className="text-sm">Critical</span>
                      </div>
                      <span className="font-medium">15 (12%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-600 rounded-full" />
                        <span className="text-sm">High</span>
                      </div>
                      <span className="font-medium">42 (33%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-600 rounded-full" />
                        <span className="text-sm">Medium</span>
                      </div>
                      <span className="font-medium">53 (42%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-600 rounded-full" />
                        <span className="text-sm">Low</span>
                      </div>
                      <span className="font-medium">17 (13%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Anomaly Timeline Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Anomaly Detection Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <LineChart className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">Real-time Anomaly Timeline</p>
                    <p className="text-sm">Interactive visualization of anomaly detection over time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            {/* ML Models Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Active ML Models
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={modelType} onValueChange={setModelType}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Model Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="ueba">UEBA</SelectItem>
                      <SelectItem value="network">Network</SelectItem>
                      <SelectItem value="endpoint">Endpoint</SelectItem>
                      <SelectItem value="authentication">Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mlModels.map((model) => (
                    <Card key={model.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{model.name}</h4>
                              <Badge variant="outline">{model.type}</Badge>
                              <Badge className={getStatusColor(model.status)}>{model.status}</Badge>
                              <Badge className={getRiskColor(model.riskLevel)}>{model.riskLevel} risk</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Algorithm:</span>
                                <div className="font-medium">{model.algorithm}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Accuracy:</span>
                                <div className="font-medium">{model.accuracy}%</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last Trained:</span>
                                <div className="font-medium">{model.lastTrained}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Anomalies (24h):</span>
                                <div className="font-medium">{model.anomaliesDetected}</div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
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

          <TabsContent value="anomalies" className="space-y-6">
            {/* Recent Anomalies */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Anomalies
                </CardTitle>
                <Select value={anomalyType} onValueChange={setAnomalyType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Anomaly Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                    <SelectItem value="data-access">Data Access</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentAnomalies.map((anomaly) => (
                    <Card key={anomaly.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{anomaly.type}</h4>
                                <Badge className={getSeverityColor(anomaly.severity)}>{anomaly.severity}</Badge>
                                <Badge variant="outline">Confidence: {anomaly.confidence}%</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{anomaly.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{new Date(anomaly.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span>{anomaly.user}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Brain className="h-3 w-3" />
                                  <span>{anomaly.source}</span>
                                </div>
                              </div>
                            </div>
                            <Badge variant={anomaly.status === "resolved" ? "default" : "destructive"}>
                              {anomaly.status}
                            </Badge>
                          </div>

                          <div>
                            <h5 className="font-medium text-sm mb-1">Indicators:</h5>
                            <div className="flex flex-wrap gap-1">
                              {anomaly.indicators.map((indicator, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {indicator}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium text-sm mb-1">Mitigation:</h5>
                            <p className="text-sm">{anomaly.mitigation}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Anomaly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Anomaly Trends by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">Anomaly Trends Visualization</p>
                    <p className="text-sm">Interactive chart showing anomaly patterns over time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Behavioral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600 mb-2">42</div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">+18% this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Network
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600 mb-2">28</div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">+25% this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600 mb-2">15</div>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">-8% this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Endpoint
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 mb-2">35</div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">+12% this week</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}