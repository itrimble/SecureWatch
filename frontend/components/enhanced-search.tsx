"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
} from "lucide-react"

export function EnhancedSearch() {
  const [searchQuery, setSearchQuery] = useState("index=main sourcetype=access_combined | stats count by status")
  const [timeRange, setTimeRange] = useState("Last 24 hours")
  const [isSearching, setIsSearching] = useState(false)
  const [sortField, setSortField] = useState("_time")
  const [sortOrder, setSortOrder] = useState("desc")

  const runSearch = () => {
    setIsSearching(true)
    setTimeout(() => setIsSearching(false), 2000)
  }

  const searchResults = [
    {
      _time: "2024-01-15 14:32:15.123",
      host: "web-server-01",
      source: "/var/log/access.log",
      sourcetype: "access_combined",
      index: "main",
      _raw: '192.168.1.100 - admin [15/Jan/2024:14:32:15 +0000] "POST /login HTTP/1.1" 401 1234 "-" "Mozilla/5.0"',
      status: "401",
      method: "POST",
      uri: "/login",
      clientip: "192.168.1.100",
      user: "admin",
      severity: "high",
    },
    {
      _time: "2024-01-15 14:31:45.456",
      host: "web-server-01",
      source: "/var/log/access.log",
      sourcetype: "access_combined",
      index: "main",
      _raw: '10.0.0.50 - - [15/Jan/2024:14:31:45 +0000] "GET /admin HTTP/1.1" 403 567 "-" "curl/7.68.0"',
      status: "403",
      method: "GET",
      uri: "/admin",
      clientip: "10.0.0.50",
      user: "-",
      severity: "medium",
    },
    {
      _time: "2024-01-15 14:30:22.789",
      host: "web-server-02",
      source: "/var/log/access.log",
      sourcetype: "access_combined",
      index: "main",
      _raw: '172.16.0.25 - john.doe [15/Jan/2024:14:30:22 +0000] "GET /dashboard HTTP/1.1" 200 2048 "-" "Mozilla/5.0"',
      status: "200",
      method: "GET",
      uri: "/dashboard",
      clientip: "172.16.0.25",
      user: "john.doe",
      severity: "low",
    },
  ]

  const fieldStats = [
    {
      field: "status",
      values: [
        { value: "200", count: 1247 },
        { value: "404", count: 89 },
        { value: "401", count: 45 },
        { value: "403", count: 23 },
      ],
    },
    {
      field: "method",
      values: [
        { value: "GET", count: 1156 },
        { value: "POST", count: 187 },
        { value: "PUT", count: 34 },
        { value: "DELETE", count: 12 },
      ],
    },
    {
      field: "host",
      values: [
        { value: "web-server-01", count: 678 },
        { value: "web-server-02", count: 456 },
        { value: "web-server-03", count: 234 },
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
            {/* Main Search Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter search query... (e.g., index=main error | stats count by host)"
                  className="font-mono text-sm pl-10 pr-20 h-12"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-6 px-2">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Search Options</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={runSearch}
                    disabled={isSearching}
                    className="bg-green-600 hover:bg-green-700 h-12 px-6"
                  >
                    {isSearching ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Run Search Query</TooltipContent>
              </Tooltip>
            </div>

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
                    _time
                  </Badge>
                  <Badge variant="outline" className="mr-1 mb-1">
                    host
                  </Badge>
                  <Badge variant="outline" className="mr-1 mb-1">
                    source
                  </Badge>
                  <Badge variant="outline" className="mr-1 mb-1">
                    sourcetype
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
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_time">Time</SelectItem>
                        <SelectItem value="host">Host</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
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
                              <span className="font-mono">{result._time}</span>
                              <span>host={result.host}</span>
                              <span>source={result.source}</span>
                              <span>sourcetype={result.sourcetype}</span>
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

                          {/* Raw Event */}
                          <div className="font-mono text-sm bg-muted/50 p-3 rounded border-l-4 border-l-primary">
                            {result._raw}
                          </div>

                          {/* Extracted Fields */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                              status={result.status}
                            </Badge>
                            <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                              method={result.method}
                            </Badge>
                            <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                              clientip={result.clientip}
                            </Badge>
                            {result.user !== "-" && (
                              <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                                user={result.user}
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
                            <div className="font-mono text-sm">POST /login HTTP/1.1" 401</div>
                            <div className="text-xs text-muted-foreground">Failed login attempts</div>
                          </div>
                          <Badge className="bg-red-600 text-white">45 events</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded hover:bg-accent transition-colors cursor-pointer">
                          <div className="flex-1">
                            <div className="font-mono text-sm">GET /admin HTTP/1.1" 403</div>
                            <div className="text-xs text-muted-foreground">Unauthorized access attempts</div>
                          </div>
                          <Badge className="bg-orange-600 text-white">23 events</Badge>
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
                                status <ArrowUpDown className="inline h-3 w-3 ml-1" />
                              </th>
                              <th className="text-left p-2 cursor-pointer hover:bg-accent">
                                count <ArrowUpDown className="inline h-3 w-3 ml-1" />
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b hover:bg-accent">
                              <td className="p-2">200</td>
                              <td className="p-2">1,247</td>
                            </tr>
                            <tr className="border-b hover:bg-accent">
                              <td className="p-2">404</td>
                              <td className="p-2">89</td>
                            </tr>
                            <tr className="border-b hover:bg-accent">
                              <td className="p-2">401</td>
                              <td className="p-2">45</td>
                            </tr>
                            <tr className="border-b hover:bg-accent">
                              <td className="p-2">403</td>
                              <td className="p-2">23</td>
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
