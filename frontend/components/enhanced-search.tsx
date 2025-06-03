"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  Calendar,
  Play,
  Save,
  Share,
  MoreHorizontal,
  ChevronDown,
  Clock,
  Database,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  Table,
  List,
  ArrowUpDown,
  Eye,
  Brain,
  Zap,
  Code,
  MessageSquare,
  History,
  BookOpen,
} from "lucide-react"

export function EnhancedSearch() {
  const [searchQuery, setSearchQuery] = useState("SecurityEvent | where EventID == 4624 | summarize LoginCount = count() by Account, Computer | order by LoginCount desc")
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("")
  const [timeRange, setTimeRange] = useState("Last 24 hours")
  const [isSearching, setIsSearching] = useState(false)
  const [sortField, setSortField] = useState("TimeGenerated")
  const [sortOrder, setSortOrder] = useState("desc")
  const [searchMode, setSearchMode] = useState("kql") // "kql" or "natural"
  const [isAiGenerating, setIsAiGenerating] = useState(false)

  const runSearch = async () => {
    if (!searchQuery.trim()) {
      return
    }
    
    setIsSearching(true)
    try {
      const response = await fetch('http://localhost:4004/api/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Search results:', data)
      
      // Update search results state if available
      // setSearchResults(data.results || [])
      
    } catch (error) {
      console.error('Search error:', error)
      // Handle error - could show toast notification
    } finally {
      setIsSearching(false)
    }
  }

  const generateKqlFromNaturalLanguage = async () => {
    setIsAiGenerating(true)
    // Simulate AI generation
    setTimeout(() => {
      const mockKqlQueries = {
        "show me failed login attempts": "SecurityEvent | where EventID == 4625 | project TimeGenerated, Account, WorkstationName, IpAddress, LogonType",
        "suspicious network activity": "NetworkTraffic | where Protocol == 'TCP' and BytesOut > 1000000 | summarize TotalBytes = sum(BytesOut) by SourceIP | order by TotalBytes desc",
        "malware detections": "SecurityEvent | where EventID == 1116 | project TimeGenerated, Computer, ThreatName, Path",
        "admin login activities": "SecurityEvent | where EventID == 4624 and LogonType == 2 | where Account has 'admin' | project TimeGenerated, Account, Computer, IpAddress"
      }
      
      const closestMatch = Object.keys(mockKqlQueries).find(key => 
        naturalLanguageQuery.toLowerCase().includes(key.split(' ')[0])
      ) || "show me failed login attempts"
      
      setSearchQuery(mockKqlQueries[closestMatch])
      setIsAiGenerating(false)
    }, 1500)
  }

  const kqlTemplates = [
    {
      name: "Failed Login Attempts",
      query: "SecurityEvent | where EventID == 4625 | project TimeGenerated, Account, WorkstationName, IpAddress, LogonType",
      description: "Shows all failed authentication attempts"
    },
    {
      name: "Process Creation Events",
      query: "SecurityEvent | where EventID == 4688 | project TimeGenerated, Computer, ProcessName, CommandLine, ParentProcessName",
      description: "Shows process creation events with command lines"
    },
    {
      name: "Network Connections",
      query: "NetworkTraffic | where Direction == 'Outbound' | summarize ConnectionCount = count() by DestinationIP, DestinationPort | order by ConnectionCount desc",
      description: "Outbound network connections by destination"
    },
    {
      name: "Privilege Escalation",
      query: "SecurityEvent | where EventID == 4672 | project TimeGenerated, Account, Computer, PrivilegeList",
      description: "Special privileges assigned to new logon"
    }
  ]

  const searchResults = [
    {
      TimeGenerated: "2024-01-15T14:32:15.123Z",
      Computer: "DC-01.contoso.com",
      EventID: 4625,
      Account: "admin@contoso.com",
      WorkstationName: "WORKSTATION-01",
      IpAddress: "192.168.1.100",
      LogonType: 3,
      SubStatus: "0xC000006A",
      severity: "high",
      EventData: 'Failed logon attempt for admin@contoso.com from 192.168.1.100',
    },
    {
      TimeGenerated: "2024-01-15T14:31:45.456Z",
      Computer: "WEB-01.contoso.com",
      EventID: 4688,
      Account: "SYSTEM",
      ProcessName: "powershell.exe",
      CommandLine: "powershell.exe -ExecutionPolicy Bypass -File suspicious.ps1",
      ParentProcessName: "cmd.exe",
      severity: "high",
      EventData: 'Process creation: powershell.exe with suspicious command line',
    },
    {
      TimeGenerated: "2024-01-15T14:30:22.789Z",
      Computer: "SQL-01.contoso.com",
      EventID: 4624,
      Account: "john.doe@contoso.com",
      WorkstationName: "LAPTOP-JOHN",
      IpAddress: "172.16.0.25",
      LogonType: 2,
      severity: "low",
      EventData: 'Successful logon for john.doe@contoso.com from 172.16.0.25',
    },
  ]

  const fieldStats = [
    {
      field: "EventID",
      values: [
        { value: "4624", count: 1247 },
        { value: "4625", count: 89 },
        { value: "4688", count: 456 },
        { value: "4672", count: 23 },
      ],
    },
    {
      field: "LogonType",
      values: [
        { value: "2", count: 1156 },
        { value: "3", count: 187 },
        { value: "10", count: 34 },
        { value: "4", count: 12 },
      ],
    },
    {
      field: "Computer",
      values: [
        { value: "DC-01.contoso.com", count: 678 },
        { value: "WEB-01.contoso.com", count: 456 },
        { value: "SQL-01.contoso.com", count: 234 },
      ],
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
      <div className="flex h-screen flex-col bg-background">
        {/* Enhanced Search Header */}
        <div className="border-b bg-card p-4">
          <div className="space-y-4">
            {/* Search Mode Toggle */}
            <div className="flex items-center gap-2">
              <Tabs value={searchMode} onValueChange={setSearchMode} className="w-auto">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="kql" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    KQL Query
                  </TabsTrigger>
                  <TabsTrigger value="natural" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Natural Language
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Zap className="w-3 h-3 mr-1" />
                AI Enabled
              </Badge>
            </div>

            {/* Search Input Area */}
            {searchMode === "kql" ? (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Code className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter KQL query... (e.g., SecurityEvent | where EventID == 4625 | project TimeGenerated, Account, Computer)"
                    className="font-mono text-sm pl-10 pr-20 min-h-[60px] resize-none"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-6 px-2">
                          <BookOpen className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>KQL Reference</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={runSearch}
                      disabled={isSearching}
                      className="bg-green-600 hover:bg-green-700 h-[60px] px-6"
                    >
                      {isSearching ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {isSearching ? "Searching..." : "Run Query"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Execute KQL Query</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      value={naturalLanguageQuery}
                      onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                      placeholder="Ask in plain English... (e.g., Show me failed login attempts from the last hour)"
                      className="pl-10 pr-20 min-h-[60px] resize-none"
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={generateKqlFromNaturalLanguage}
                        disabled={isAiGenerating || !naturalLanguageQuery.trim()}
                        className="bg-blue-600 hover:bg-blue-700 h-[60px] px-6"
                      >
                        {isAiGenerating ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Brain className="h-4 w-4 mr-2" />
                        )}
                        {isAiGenerating ? "Generating..." : "Generate KQL"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Convert to KQL using AI</TooltipContent>
                  </Tooltip>
                </div>
                
                {searchQuery && (
                  <div className="bg-muted/50 p-3 rounded border">
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Generated KQL Query:</span>
                    </div>
                    <code className="text-sm font-mono block">{searchQuery}</code>
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={runSearch}
                        disabled={isSearching}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSearching ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Play className="h-3 w-3 mr-1" />
                        )}
                        Run Query
                      </Button>
                      <Button
                        onClick={() => setSearchMode("kql")}
                        size="sm"
                        variant="outline"
                      >
                        Edit KQL
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* KQL Templates */}
            {searchMode === "kql" && (
              <div className="bg-muted/30 p-3 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-4 w-4" />
                  <span className="text-sm font-medium">Quick Templates:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {kqlTemplates.map((template, index) => (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery(template.query)}
                          className="text-xs"
                        >
                          {template.name}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs">{template.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Last 15 minutes">Last 15 minutes</SelectItem>
                      <SelectItem value="Last hour">Last hour</SelectItem>
                      <SelectItem value="Last 4 hours">Last 4 hours</SelectItem>
                      <SelectItem value="Last 24 hours">Last 24 hours</SelectItem>
                      <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                      <SelectItem value="Last 30 days">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Search completed in 0.234 seconds</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save Search</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Share className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share Search</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export Results</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Enhanced Left Sidebar - Fields */}
          <Card className="w-80 rounded-none border-r border-l-0 border-t-0 border-b-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Fields</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Filter Fields</TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fieldStats.map((field) => (
                <div key={field.field} className="space-y-2">
                  <div className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 rounded">
                    <span className="font-medium text-sm">{field.field}</span>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                  <div className="space-y-1 pl-2">
                    {field.values.slice(0, 4).map((value) => (
                      <div
                        key={value.value}
                        className="flex items-center justify-between text-xs hover:bg-accent p-1 rounded cursor-pointer"
                      >
                        <span className="text-blue-600 hover:underline">{value.value}</span>
                        <span className="text-muted-foreground">{value.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm mb-2">Selected Fields</h4>
                <div className="space-y-1 text-xs">
                  <Badge variant="outline" className="mr-1 mb-1">
                    TimeGenerated
                  </Badge>
                  <Badge variant="outline" className="mr-1 mb-1">
                    Computer
                  </Badge>
                  <Badge variant="outline" className="mr-1 mb-1">
                    EventID
                  </Badge>
                  <Badge variant="outline" className="mr-1 mb-1">
                    Account
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Main Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Results Header */}
            <div className="border-b p-4 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">1,404 events</span>
                  <Badge variant="outline">
                    <Database className="h-3 w-3 mr-1" />
                    main
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sort by:</span>
                    <Select value={sortField} onValueChange={setSortField}>
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TimeGenerated">TimeGenerated</SelectItem>
                        <SelectItem value="Computer">Computer</SelectItem>
                        <SelectItem value="EventID">EventID</SelectItem>
                        <SelectItem value="Account">Account</SelectItem>
                        <SelectItem value="severity">Severity</SelectItem>
                      </SelectContent>
                    </Select>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Toggle Sort Order</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <Tabs defaultValue="events" className="w-auto">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="events" className="flex items-center gap-1">
                      <List className="h-4 w-4" />
                      Events
                    </TabsTrigger>
                    <TabsTrigger value="patterns" className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      Patterns
                    </TabsTrigger>
                    <TabsTrigger value="statistics" className="flex items-center gap-1">
                      <Table className="h-4 w-4" />
                      Statistics
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Enhanced Results Content */}
            <div className="flex-1 overflow-auto p-4">
              <Tabs defaultValue="events" className="h-full">
                <TabsContent value="events" className="space-y-2 mt-0">
                  {searchResults.map((result, index) => (
                    <Card key={index} className="hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Event Header */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span className="font-mono">{result.TimeGenerated}</span>
                              <span>EventID={result.EventID}</span>
                              <span>Computer={result.Computer}</span>
                              {result.Account && <span>Account={result.Account}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getSeverityColor(result.severity)}>{result.severity}</Badge>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Expand Event</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Event Data */}
                          <div className="font-mono text-sm bg-muted/50 p-3 rounded border-l-4 border-l-primary">
                            {result.EventData}
                          </div>

                          {/* Extracted Fields */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                              EventID={result.EventID}
                            </Badge>
                            {result.LogonType && (
                              <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                                LogonType={result.LogonType}
                              </Badge>
                            )}
                            {result.IpAddress && (
                              <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                                IpAddress={result.IpAddress}
                              </Badge>
                            )}
                            {result.ProcessName && (
                              <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                                ProcessName={result.ProcessName}
                              </Badge>
                            )}
                            {result.WorkstationName && (
                              <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                                WorkstationName={result.WorkstationName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="patterns" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded hover:bg-accent transition-colors cursor-pointer">
                          <div className="flex-1">
                            <div className="font-mono text-sm">EventID == 4625 (Failed Logon)</div>
                            <div className="text-xs text-muted-foreground">Failed authentication attempts</div>
                          </div>
                          <Badge className="bg-red-600 text-white">89 events</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded hover:bg-accent transition-colors cursor-pointer">
                          <div className="flex-1">
                            <div className="font-mono text-sm">EventID == 4688 (Process Creation)</div>
                            <div className="text-xs text-muted-foreground">Suspicious process execution</div>
                          </div>
                          <Badge className="bg-orange-600 text-white">456 events</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded hover:bg-accent transition-colors cursor-pointer">
                          <div className="flex-1">
                            <div className="font-mono text-sm">LogonType == 3 (Network)</div>
                            <div className="text-xs text-muted-foreground">Network logon attempts</div>
                          </div>
                          <Badge className="bg-blue-600 text-white">187 events</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="statistics" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2 cursor-pointer hover:bg-accent">
                                EventID <ArrowUpDown className="inline h-3 w-3 ml-1" />
                              </th>
                              <th className="text-left p-2 cursor-pointer hover:bg-accent">
                                Count <ArrowUpDown className="inline h-3 w-3 ml-1" />
                              </th>
                              <th className="text-left p-2 cursor-pointer hover:bg-accent">
                                Description <ArrowUpDown className="inline h-3 w-3 ml-1" />
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b hover:bg-accent">
                              <td className="p-2">4624</td>
                              <td className="p-2">1,247</td>
                              <td className="p-2 text-sm text-muted-foreground">Successful logon</td>
                            </tr>
                            <tr className="border-b hover:bg-accent">
                              <td className="p-2">4688</td>
                              <td className="p-2">456</td>
                              <td className="p-2 text-sm text-muted-foreground">Process creation</td>
                            </tr>
                            <tr className="border-b hover:bg-accent">
                              <td className="p-2">4625</td>
                              <td className="p-2">89</td>
                              <td className="p-2 text-sm text-muted-foreground">Failed logon</td>
                            </tr>
                            <tr className="border-b hover:bg-accent">
                              <td className="p-2">4672</td>
                              <td className="p-2">23</td>
                              <td className="p-2 text-sm text-muted-foreground">Special privileges assigned</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
