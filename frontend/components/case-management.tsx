"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Briefcase,
  User,
  Clock,
  Search,
  Plus,
  Eye,
  Edit,
  FileText,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  MessageSquare,
  Paperclip,
  Download,
} from "lucide-react"

export function CaseManagement() {
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")

  const handleExportCases = () => {
    console.log('Exporting cases...')
    // TODO: Implement export functionality
  }

  const handleCreateCase = () => {
    console.log('Creating new case...')
    // TODO: Implement create case functionality
  }

  const handleCaseAction = (action: string, caseId: string) => {
    console.log(`${action} case ${caseId}`)
    // TODO: Implement case action handlers
  }

  const cases = [
    {
      id: "CASE-2024-001",
      title: "Unusual Data Access Pattern - John Smith",
      description: "Employee accessing sensitive files outside normal working hours",
      assignee: "Sarah Johnson",
      status: "investigating",
      priority: "high",
      riskScore: 85,
      created: "2024-01-15 09:30:00",
      lastUpdate: "2024-01-15 14:15:00",
      dueDate: "2024-01-20",
      subject: "John Smith",
      department: "Finance",
      indicators: ["Unusual access times", "Large file downloads", "VPN usage"],
      evidence: 12,
      notes: 8,
    },
    {
      id: "CASE-2024-002",
      title: "Potential Data Exfiltration - Mike Wilson",
      description: "Large volume of data transferred to external storage",
      assignee: "Alex Rodriguez",
      status: "escalated",
      priority: "critical",
      riskScore: 95,
      created: "2024-01-14 16:20:00",
      lastUpdate: "2024-01-15 11:30:00",
      dueDate: "2024-01-18",
      subject: "Mike Wilson",
      department: "Engineering",
      indicators: ["External transfers", "USB usage", "Email attachments"],
      evidence: 18,
      notes: 15,
    },
    {
      id: "CASE-2024-003",
      title: "Policy Violation - Emily Davis",
      description: "Repeated attempts to access restricted systems",
      assignee: "David Brown",
      status: "resolved",
      priority: "medium",
      riskScore: 65,
      created: "2024-01-12 11:45:00",
      lastUpdate: "2024-01-14 16:00:00",
      dueDate: "2024-01-19",
      subject: "Emily Davis",
      department: "Marketing",
      indicators: ["Access violations", "Failed authentications"],
      evidence: 6,
      notes: 4,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "investigating":
        return "bg-yellow-600 text-white"
      case "escalated":
        return "bg-red-600 text-white"
      case "resolved":
        return "bg-green-600 text-white"
      case "closed":
        return "bg-gray-600 text-white"
      default:
        return "bg-blue-600 text-white"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const filteredCases = cases.filter((case_) => {
    const matchesSearch =
      case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || case_.status === filterStatus
    const matchesPriority = filterPriority === "all" || case_.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const caseStats = {
    total: cases.length,
    investigating: cases.filter((c) => c.status === "investigating").length,
    escalated: cases.filter((c) => c.status === "escalated").length,
    resolved: cases.filter((c) => c.status === "resolved").length,
    overdue: cases.filter((c) => new Date(c.dueDate) < new Date()).length,
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="h-8 w-8" />
              Case Management
            </h1>
            <p className="text-muted-foreground">Investigate and manage insider risk cases</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportCases} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Cases
            </Button>
            <Button onClick={handleCreateCase}>
              <Plus className="h-4 w-4 mr-2" />
              Create Case
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{caseStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Cases</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-yellow-600">{caseStats.investigating}</div>
              <div className="text-sm text-muted-foreground">Investigating</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{caseStats.escalated}</div>
              <div className="text-sm text-muted-foreground">Escalated</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">{caseStats.resolved}</div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-orange-600">{caseStats.overdue}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
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
                  <Input
                    placeholder="Search cases by title, subject, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cases Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cases List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredCases.map((case_) => (
              <Card
                key={case_.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedCase === case_.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedCase(case_.id)}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Case Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{case_.title}</h3>
                          <Badge className={getStatusColor(case_.status)}>{case_.status}</Badge>
                          <Badge className={getPriorityColor(case_.priority)}>{case_.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{case_.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>ID: {case_.id}</span>
                          <span>Created: {case_.created}</span>
                          <span>Due: {case_.dueDate}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">{case_.riskScore}</div>
                        <div className="text-xs text-muted-foreground">Risk Score</div>
                      </div>
                    </div>

                    {/* Subject Info */}
                    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{case_.subject}</div>
                        <div className="text-sm text-muted-foreground">{case_.department}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">Assignee: {case_.assignee}</div>
                    </div>

                    {/* Indicators */}
                    <div className="flex flex-wrap gap-1">
                      {case_.indicators.map((indicator, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {indicator}
                        </Badge>
                      ))}
                    </div>

                    {/* Case Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{case_.evidence} evidence</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span>{case_.notes} notes</span>
                        </div>
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Case</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Case Details Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCase ? (
                <div className="space-y-6">
                  {(() => {
                    const case_ = cases.find((c) => c.id === selectedCase)
                    if (!case_) return null

                    return (
                      <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="evidence">Evidence</TabsTrigger>
                          <TabsTrigger value="notes">Notes</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Risk Assessment</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Risk Score</span>
                                <span className="font-medium text-red-600">{case_.riskScore}/100</span>
                              </div>
                              <Progress value={case_.riskScore} className="h-2" />
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Case Actions</h4>
                            <div className="space-y-2">
                              <Button onClick={() => handleCaseAction('resume', selectedCase || '')} size="sm" className="w-full">
                                <Play className="h-4 w-4 mr-2" />
                                Resume Investigation
                              </Button>
                              <Button onClick={() => handleCaseAction('pause', selectedCase || '')} size="sm" variant="outline" className="w-full">
                                <Pause className="h-4 w-4 mr-2" />
                                Pause Case
                              </Button>
                              <Button onClick={() => handleCaseAction('resolve', selectedCase || '')} size="sm" variant="outline" className="w-full">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Resolved
                              </Button>
                              <Button onClick={() => handleCaseAction('close', selectedCase || '')} size="sm" variant="outline" className="w-full">
                                <XCircle className="h-4 w-4 mr-2" />
                                Close Case
                              </Button>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Timeline</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>Case created: {case_.created}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                <span>Last updated: {case_.lastUpdate}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>Due date: {case_.dueDate}</span>
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="evidence" className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Evidence Items ({case_.evidence})</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Login_logs_2024-01-15.csv</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">File_access_audit.xlsx</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Network_traffic_analysis.pdf</span>
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="notes" className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Investigation Notes</h4>
                            <Textarea
                              placeholder="Add investigation notes..."
                              className="min-h-[100px]"
                              defaultValue="Initial investigation shows unusual access patterns during off-hours. Need to correlate with badge access logs."
                            />
                            <Button size="sm" className="mt-2">
                              Add Note
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Select a case to view details</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
