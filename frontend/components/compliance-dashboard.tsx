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
  Gavel,
  Shield,
  FileText,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Database,
  Key,
  Lock,
  Eye,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Settings,
} from "lucide-react"

export function ComplianceDashboard() {
  const [timeRange, setTimeRange] = useState("current")
  const [framework, setFramework] = useState("all")
  const [reportType, setReportType] = useState("summary")

  // Compliance Framework Status
  const complianceFrameworks = [
    {
      id: "gdpr",
      name: "GDPR",
      fullName: "General Data Protection Regulation",
      score: 98.2,
      status: "compliant",
      controls: 73,
      compliantControls: 72,
      findings: 1,
      lastAssessment: "2024-01-10",
      nextAssessment: "2024-04-10",
      riskLevel: "low",
    },
    {
      id: "hipaa",
      name: "HIPAA",
      fullName: "Health Insurance Portability and Accountability Act",
      score: 95.4,
      status: "compliant",
      controls: 54,
      compliantControls: 51,
      findings: 3,
      lastAssessment: "2024-01-08",
      nextAssessment: "2024-04-08",
      riskLevel: "low",
    },
    {
      id: "sox",
      name: "SOX",
      fullName: "Sarbanes-Oxley Act",
      score: 92.1,
      status: "minor-issues",
      controls: 38,
      compliantControls: 35,
      findings: 3,
      lastAssessment: "2024-01-12",
      nextAssessment: "2024-04-12",
      riskLevel: "medium",
    },
    {
      id: "iso27001",
      name: "ISO 27001",
      fullName: "Information Security Management System",
      score: 89.7,
      status: "minor-issues",
      controls: 114,
      compliantControls: 102,
      findings: 12,
      lastAssessment: "2024-01-05",
      nextAssessment: "2024-04-05",
      riskLevel: "medium",
    },
    {
      id: "pci-dss",
      name: "PCI DSS",
      fullName: "Payment Card Industry Data Security Standard",
      score: 86.3,
      status: "needs-attention",
      controls: 78,
      compliantControls: 67,
      findings: 11,
      lastAssessment: "2024-01-15",
      nextAssessment: "2024-04-15",
      riskLevel: "high",
    },
    {
      id: "nist",
      name: "NIST CSF",
      fullName: "NIST Cybersecurity Framework",
      score: 91.8,
      status: "compliant",
      controls: 98,
      compliantControls: 90,
      findings: 8,
      lastAssessment: "2024-01-07",
      nextAssessment: "2024-04-07",
      riskLevel: "low",
    },
  ]

  // Compliance Metrics
  const complianceMetrics = {
    overallScore: 93.6,
    totalControls: 455,
    compliantControls: 417,
    openFindings: 38,
    criticalFindings: 3,
    activeFrameworks: 6,
    reportsDue: 2,
    auditTrailEvents: 125847,
  }

  // Recent Compliance Events
  const recentEvents = [
    {
      id: "evt-001",
      timestamp: "2024-01-15T14:32:15Z",
      type: "Policy Violation",
      framework: "GDPR",
      severity: "high",
      description: "Personal data accessed without proper authorization",
      user: "john.doe@company.com",
      action: "Data Access",
      details: "User accessed PII data outside of approved business hours",
      status: "investigating",
    },
    {
      id: "evt-002",
      timestamp: "2024-01-15T14:28:42Z",
      type: "Control Failure",
      framework: "SOX",
      severity: "medium",
      description: "Segregation of duties violation in financial system",
      user: "system-auto",
      action: "System Change",
      details: "User granted conflicting permissions in financial application",
      status: "remediated",
    },
    {
      id: "evt-003",
      timestamp: "2024-01-15T14:15:23Z",
      type: "Audit Trail Gap",
      framework: "HIPAA",
      severity: "critical",
      description: "Missing audit logs for patient data access",
      user: "healthcare-app",
      action: "Log Management",
      details: "3-hour gap in audit logging detected",
      status: "open",
    },
  ]

  // Control Categories
  const controlCategories = [
    {
      category: "Access Control",
      total: 145,
      compliant: 138,
      score: 95.2,
      trend: "stable",
      criticalFindings: 0,
    },
    {
      category: "Data Protection",
      total: 89,
      compliant: 82,
      score: 92.1,
      trend: "improving",
      criticalFindings: 1,
    },
    {
      category: "Incident Response",
      total: 67,
      compliant: 63,
      score: 94.0,
      trend: "stable",
      criticalFindings: 0,
    },
    {
      category: "Risk Management",
      total: 78,
      compliant: 71,
      score: 91.0,
      trend: "declining",
      criticalFindings: 1,
    },
    {
      category: "Audit & Monitoring",
      total: 76,
      compliant: 63,
      score: 82.9,
      trend: "improving",
      criticalFindings: 1,
    },
  ]

  const getFrameworkStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-600 text-white"
      case "minor-issues":
        return "bg-yellow-600 text-white"
      case "needs-attention":
        return "bg-orange-600 text-white"
      case "non-compliant":
        return "bg-red-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-600"
      case "medium":
        return "text-yellow-600"
      case "high":
        return "text-red-600"
      default:
        return "text-gray-600"
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "remediated":
        return "bg-green-600 text-white"
      case "investigating":
        return "bg-blue-600 text-white"
      case "open":
        return "bg-red-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-600" />
    return <div className="h-4 w-4" />
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Gavel className="h-8 w-8 text-purple-600" />
              Compliance Dashboard
            </h1>
            <p className="text-muted-foreground">Regulatory compliance monitoring and automated reporting</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                <Shield className="w-3 h-3 mr-1" />
                Multi-Framework
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <FileText className="w-3 h-3 mr-1" />
                Auto-Reporting
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Period</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="historical">Historical</SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Assessment</TooltipContent>
            </Tooltip>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Compliance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{complianceMetrics.overallScore}%</div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">+2.1%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{complianceMetrics.totalControls}</div>
              <div className="text-sm text-muted-foreground">Total Controls</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">{complianceMetrics.compliantControls}</div>
              <div className="text-sm text-muted-foreground">Compliant</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-orange-600">{complianceMetrics.openFindings}</div>
              <div className="text-sm text-muted-foreground">Open Findings</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingDown className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">-5</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{complianceMetrics.criticalFindings}</div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-indigo-600">{complianceMetrics.activeFrameworks}</div>
              <div className="text-sm text-muted-foreground">Frameworks</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-yellow-600">{complianceMetrics.reportsDue}</div>
              <div className="text-sm text-muted-foreground">Reports Due</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-cyan-600">{complianceMetrics.auditTrailEvents.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Audit Events</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
            <TabsTrigger value="controls">Control Categories</TabsTrigger>
            <TabsTrigger value="events">Compliance Events</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Compliance Status Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Framework Compliance Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Compliant</span>
                      </div>
                      <span className="font-medium">3 frameworks (50%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Minor Issues</span>
                      </div>
                      <span className="font-medium">2 frameworks (33%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm">Needs Attention</span>
                      </div>
                      <span className="font-medium">1 framework (17%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Compliance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <LineChart className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-lg font-medium">Compliance Score Trend</p>
                      <p className="text-sm">Historical compliance performance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Priority Actions Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border-l-4 border-l-red-600 bg-red-50 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-600">Critical Findings</span>
                    </div>
                    <p className="text-sm mb-2">3 critical compliance issues require immediate attention</p>
                    <Button size="sm" variant="destructive">Review Issues</Button>
                  </div>
                  <div className="p-4 border-l-4 border-l-yellow-600 bg-yellow-50 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-600">Reports Due</span>
                    </div>
                    <p className="text-sm mb-2">2 compliance reports due within 7 days</p>
                    <Button size="sm" variant="outline">Generate Reports</Button>
                  </div>
                  <div className="p-4 border-l-4 border-l-blue-600 bg-blue-50 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-600">Assessments Due</span>
                    </div>
                    <p className="text-sm mb-2">Next assessments scheduled within 30 days</p>
                    <Button size="sm" variant="outline">Schedule Review</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="frameworks" className="space-y-6">
            {/* Compliance Frameworks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance Frameworks
                </CardTitle>
                <Select value={framework} onValueChange={setFramework}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Frameworks</SelectItem>
                    <SelectItem value="gdpr">GDPR</SelectItem>
                    <SelectItem value="hipaa">HIPAA</SelectItem>
                    <SelectItem value="sox">SOX</SelectItem>
                    <SelectItem value="iso27001">ISO 27001</SelectItem>
                    <SelectItem value="pci-dss">PCI DSS</SelectItem>
                    <SelectItem value="nist">NIST CSF</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceFrameworks.map((fw) => (
                    <Card key={fw.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold">{fw.name}</h4>
                              <Badge className={getFrameworkStatusColor(fw.status)}>
                                {fw.status.replace("-", " ")}
                              </Badge>
                              <Badge variant="outline">Score: {fw.score}%</Badge>
                              <span className={`text-sm font-medium ${getRiskLevelColor(fw.riskLevel)}`}>
                                {fw.riskLevel} risk
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{fw.fullName}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Controls:</span>
                                <div className="font-medium">
                                  {fw.compliantControls}/{fw.controls}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Findings:</span>
                                <div className="font-medium">{fw.findings}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last Assessment:</span>
                                <div className="font-medium">{fw.lastAssessment}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Next Assessment:</span>
                                <div className="font-medium">{fw.nextAssessment}</div>
                              </div>
                            </div>

                            <div className="mt-3">
                              <Progress value={(fw.compliantControls / fw.controls) * 100} className="h-2" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              Report
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

          <TabsContent value="controls" className="space-y-6">
            {/* Control Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Control Categories Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {controlCategories.map((category, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          {index === 0 && <Key className="h-4 w-4" />}
                          {index === 1 && <Lock className="h-4 w-4" />}
                          {index === 2 && <Shield className="h-4 w-4" />}
                          {index === 3 && <Target className="h-4 w-4" />}
                          {index === 4 && <Eye className="h-4 w-4" />}
                          {category.category}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={category.criticalFindings > 0 ? "destructive" : "default"}>
                            {category.criticalFindings} critical
                          </Badge>
                          {getTrendIcon(category.trend)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <div className="text-2xl font-bold mb-1">{category.score}%</div>
                          <div className="text-sm text-muted-foreground">Compliance Score</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold mb-1">
                            {category.compliant}/{category.total}
                          </div>
                          <div className="text-sm text-muted-foreground">Controls Compliant</div>
                        </div>
                        <div>
                          <Progress value={(category.compliant / category.total) * 100} className="h-3" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {Math.round((category.compliant / category.total) * 100)}% compliant
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            {/* Recent Compliance Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Compliance Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentEvents.map((event) => (
                    <Card key={event.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold">{event.type}</h4>
                              <Badge variant="outline">{event.framework}</Badge>
                              <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                              <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                            <p className="text-sm mb-3">{event.details}</p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(event.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{event.user}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Database className="h-3 w-3" />
                                <span>{event.action}</span>
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

          <TabsContent value="reports" className="space-y-6">
            {/* Compliance Reports */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Compliance Reports
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Report Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Executive Summary</SelectItem>
                      <SelectItem value="detailed">Detailed Assessment</SelectItem>
                      <SelectItem value="findings">Findings Report</SelectItem>
                      <SelectItem value="remediation">Remediation Plan</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold">Executive Summary</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        High-level compliance overview for leadership
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Generate PDF
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold">GDPR Assessment</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Detailed GDPR compliance assessment report
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Generate PDF
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-orange-600" />
                        <h4 className="font-semibold">Findings Report</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Summary of all compliance findings and issues
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Generate PDF
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <h4 className="font-semibold">Remediation Plan</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Action plan for addressing compliance gaps
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Generate PDF
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-red-600" />
                        <h4 className="font-semibold">Audit Trail</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Complete audit trail and evidence collection
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Generate PDF
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-cyan-600" />
                        <h4 className="font-semibold">Custom Report</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Build custom compliance report with specific criteria
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Configure Report
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}