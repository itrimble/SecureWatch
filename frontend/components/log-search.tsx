"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Filter,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Save,
  Share,
  ArrowUpDown,
  Clock,
} from "lucide-react"

export function LogSearch() {
  const [searchQuery, setSearchQuery] = useState("index=main sourcetype=access_combined | stats count by status")
  const [timeRange, setTimeRange] = useState("Last 24 hours")
  const [expandedFields, setExpandedFields] = useState<string[]>(["status", "method", "host"])
  const [selectedView, setSelectedView] = useState("Events")

  const fieldData = {
    status: [
      { value: "200", count: 1247 },
      { value: "404", count: 89 },
      { value: "401", count: 45 },
      { value: "403", count: 23 },
    ],
    method: [
      { value: "GET", count: 1156 },
      { value: "POST", count: 187 },
      { value: "PUT", count: 34 },
      { value: "DELETE", count: 12 },
    ],
    host: [
      { value: "web-server-01", count: 678 },
      { value: "web-server-02", count: 456 },
      { value: "web-server-03", count: 234 },
    ],
  }

  const logEvents = [
    {
      timestamp: "2024-01-15 14:32:15.123",
      host: "web-server-01",
      source: "/var/log/access.log",
      sourcetype: "access_combined",
      severity: "high",
      rawLog: '192.168.1.100 - admin [15/Jan/2024:14:32:15 +0000] "POST /login HTTP/1.1" 401 1234 "-" "Mozilla/5.0"',
      fields: {
        status: "401",
        method: "POST",
        clientip: "192.168.1.100",
        user: "admin",
      },
    },
    {
      timestamp: "2024-01-15 14:31:46.456",
      host: "web-server-01",
      source: "/var/log/access.log",
      sourcetype: "access_combined",
      severity: "medium",
      rawLog: '10.0.0.50 - - [15/Jan/2024:14:31:45 +0000] "GET /admin HTTP/1.1" 403 567 "-" "curl/7.68.0"',
      fields: {
        status: "403",
        method: "GET",
        clientip: "10.0.0.50",
      },
    },
    {
      timestamp: "2024-01-15 14:30:22.789",
      host: "web-server-02",
      source: "/var/log/access.log",
      sourcetype: "access_combined",
      severity: "low",
      rawLog:
        '172.16.0.25 - john.doe [15/Jan/2024:14:30:22 +0000] "GET /dashboard HTTP/1.1" 200 2048 "-" "Mozilla/5.0"',
      fields: {
        status: "200",
        method: "GET",
        clientip: "172.16.0.25",
        user: "john.doe",
      },
    },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500 text-white"
      case "medium":
        return "bg-orange-500 text-white"
      case "low":
        return "bg-green-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const toggleFieldExpansion = (field: string) => {
    setExpandedFields((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]))
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Search Header */}
        <div className="bg-white border-b p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="font-mono text-sm pr-20"
                placeholder="Enter your KQL search..."
              />
              <Button className="absolute right-1 top-1 bg-green-600 hover:bg-green-700" size="sm">
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Last hour">Last hour</SelectItem>
                  <SelectItem value="Last 24 hours">Last 24 hours</SelectItem>
                  <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                  <SelectItem value="Last 30 days">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">
                <Clock className="h-4 w-4 inline mr-1" />
                Search completed in 0.234 seconds
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 flex">
          {/* Fields Panel */}
          <div className="w-80 bg-white border-r overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Fields</h3>
                <Filter className="h-4 w-4 text-gray-500" />
              </div>
            </div>

            <div className="p-2">
              {Object.entries(fieldData).map(([fieldName, values]) => (
                <div key={fieldName} className="mb-2">
                  <button
                    onClick={() => toggleFieldExpansion(fieldName)}
                    className="flex items-center justify-between w-full p-2 text-left hover:bg-gray-50 rounded"
                  >
                    <span className="font-medium">{fieldName}</span>
                    {expandedFields.includes(fieldName) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {expandedFields.includes(fieldName) && (
                    <div className="ml-4 space-y-1">
                      {values.map((item) => (
                        <div key={item.value} className="flex items-center justify-between text-sm py-1">
                          <button className="text-blue-600 hover:underline">{item.value}</button>
                          <span className="text-gray-500">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Selected Fields */}
            <div className="border-t p-4">
              <h4 className="font-semibold mb-2">Selected Fields</h4>
              <div className="flex flex-wrap gap-1">
                {["_time", "host", "source", "sourcetype"].map((field) => (
                  <Badge key={field} variant="secondary" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="flex-1 flex flex-col">
            {/* Results Header */}
            <div className="bg-white border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-semibold">1,404 events</span>
                  <Badge variant="outline">main</Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Sort by:</span>
                    <Select defaultValue="Time">
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Time">Time</SelectItem>
                        <SelectItem value="Relevance">Relevance</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Tabs value={selectedView} onValueChange={setSelectedView}>
                  <TabsList>
                    <TabsTrigger value="Events">Events</TabsTrigger>
                    <TabsTrigger value="Patterns">Patterns</TabsTrigger>
                    <TabsTrigger value="Statistics">Statistics</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="Events" className="m-0">
                <div className="space-y-2 p-4">
                  {logEvents.map((event, index) => (
                    <Card key={index} className="border-l-4 border-l-gray-300">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{event.timestamp}</span>
                            <span>host={event.host}</span>
                            <span>source={event.source}</span>
                            <span>sourcetype={event.sourcetype}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="font-mono text-sm bg-gray-50 p-3 rounded border">{event.rawLog}</div>

                        <div className="mt-2 flex flex-wrap gap-4 text-sm">
                          {Object.entries(event.fields).map(([key, value]) => (
                            <span key={key}>
                              <span className="font-medium">{key}=</span>
                              <span className="text-blue-600">{value}</span>
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="Patterns" className="m-0 p-4">
                <div className="text-center text-gray-500 py-8">Pattern analysis view - Coming soon</div>
              </TabsContent>

              <TabsContent value="Statistics" className="m-0 p-4">
                <div className="text-center text-gray-500 py-8">Statistical analysis view - Coming soon</div>
              </TabsContent>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
