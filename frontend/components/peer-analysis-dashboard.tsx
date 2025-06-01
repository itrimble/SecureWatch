"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Users,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  AlertTriangle,
  Download,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import {
  ChartContainer,
  ChartTooltip as ShadcnChartTooltip,
  ChartTooltipContent as ShadcnChartTooltipContent,
} from "@/components/ui/chart"

export function PeerAnalysisDashboard() {
  const [selectedUser, setSelectedUser] = useState("all")
  const [selectedPeerGroup, setSelectedPeerGroup] = useState("all")
  const [timeRange, setTimeRange] = useState("30d")

  const peerAnalysisStats = {
    totalUsersAnalyzed: 850,
    outliersDetected: 42,
    highRiskPeers: 15,
    averageDeviation: "18%",
  }

  const usersData = [
    {
      id: "USR-001",
      name: "John Smith",
      department: "Finance",
      peerGroup: "Finance Analysts",
      riskScore: 78,
      deviation: "+25%",
      logins: 35,
      dataAccess: 120,
      networkActivity: 85,
      anomalies: 3,
      status: "high_risk",
    },
    {
      id: "USR-002",
      name: "Sarah Johnson",
      department: "Sales",
      peerGroup: "Sales Managers",
      riskScore: 45,
      deviation: "-10%",
      logins: 28,
      dataAccess: 90,
      networkActivity: 60,
      anomalies: 0,
      status: "normal",
    },
    {
      id: "USR-003",
      name: "Mike Wilson",
      department: "Engineering",
      peerGroup: "Senior Developers",
      riskScore: 85,
      deviation: "+30%",
      logins: 42,
      dataAccess: 150,
      networkActivity: 110,
      anomalies: 5,
      status: "critical_risk",
    },
    {
      id: "USR-004",
      name: "Emily Davis",
      department: "Marketing",
      peerGroup: "Marketing Specialists",
      riskScore: 30,
      deviation: "-5%",
      logins: 25,
      dataAccess: 70,
      networkActivity: 50,
      anomalies: 0,
      status: "normal",
    },
    {
      id: "USR-005",
      name: "David Brown",
      department: "Engineering",
      peerGroup: "Junior Developers",
      riskScore: 65,
      deviation: "+15%",
      logins: 30,
      dataAccess: 100,
      networkActivity: 75,
      anomalies: 1,
      status: "medium_risk",
    },
  ]

  const peerGroupData = [
    { name: "Finance Analysts", avgLogins: 28, avgDataAccess: 95, avgNetwork: 70, avgAnomalies: 0.5 },
    { name: "Sales Managers", avgLogins: 30, avgDataAccess: 100, avgNetwork: 65, avgAnomalies: 0.2 },
    { name: "Senior Developers", avgLogins: 32, avgDataAccess: 115, avgNetwork: 80, avgAnomalies: 1.0 },
    { name: "Marketing Specialists", avgLogins: 26, avgDataAccess: 75, avgNetwork: 55, avgAnomalies: 0.1 },
    { name: "Junior Developers", avgLogins: 29, avgDataAccess: 85, avgNetwork: 60, avgAnomalies: 0.3 },
  ]

  const userBehaviorChartData = [
    { date: "2024-05-01", user: 30, peerAvg: 28 },
    { date: "2024-05-08", user: 32, peerAvg: 29 },
    { date: "2024-05-15", user: 45, peerAvg: 30 }, // John Smith's spike
    { date: "2024-05-22", user: 33, peerAvg: 31 },
    { date: "2024-05-29", user: 35, peerAvg: 30 },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical_risk":
        return "bg-red-600 text-white"
      case "high_risk":
        return "bg-orange-600 text-white"
      case "medium_risk":
        return "bg-yellow-600 text-black" // Ensure contrast
      case "normal":
        return "bg-green-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const getDeviationColor = (deviation: string) => {
    const value = Number.parseFloat(deviation)
    if (value > 20) return "text-red-600"
    if (value > 10) return "text-orange-600"
    if (value < -10) return "text-blue-600" // Negative deviation might also be notable
    return "text-green-600"
  }

  const filteredUsers = usersData.filter(
    (user) =>
      (selectedUser === "all" || user.name === selectedUser) &&
      (selectedPeerGroup === "all" || user.peerGroup === selectedPeerGroup),
  )

  const uniqueUserNames = Array.from(new Set(usersData.map((u) => u.name)))
  const uniquePeerGroups = Array.from(new Set(usersData.map((u) => u.peerGroup)))

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Peer Group Analysis
            </h1>
            <p className="text-muted-foreground">Compare user behavior against their peers to identify anomalies.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Data</TooltipContent>
            </Tooltip>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{peerAnalysisStats.totalUsersAnalyzed}</div>
              <div className="text-sm text-muted-foreground">Users Analyzed</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-orange-600">{peerAnalysisStats.outliersDetected}</div>
              <div className="text-sm text-muted-foreground">Outliers Detected</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{peerAnalysisStats.highRiskPeers}</div>
              <div className="text-sm text-muted-foreground">High-Risk Peers</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{peerAnalysisStats.averageDeviation}</div>
              <div className="text-sm text-muted-foreground">Avg. Deviation</div>
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
                  <Input placeholder="Search users..." className="pl-10" />
                </div>
              </div>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUserNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPeerGroup} onValueChange={setSelectedPeerGroup}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Peer Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Peer Groups</SelectItem>
                  {uniquePeerGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Behavior vs Peer Group Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              User Behavior vs. Peer Group Average (Logins)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                user: { label: "User Logins", color: "hsl(var(--chart-1))" },
                peerAvg: { label: "Peer Group Average", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userBehaviorChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ShadcnChartTooltip cursor={false} content={<ShadcnChartTooltipContent indicator="line" />} />
                  <Legend />
                  <Line type="monotone" dataKey="user" stroke="var(--color-user)" strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="peerAvg"
                    stroke="var(--color-peerAvg)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Peer Analysis Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Peer Comparison ({filteredUsers.length} users)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Peer Group</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Deviation from Peers</TableHead>
                  <TableHead>Logins</TableHead>
                  <TableHead>Data Access</TableHead>
                  <TableHead>Network Activity</TableHead>
                  <TableHead>Anomalies</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-accent">
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.department}</div>
                    </TableCell>
                    <TableCell>{user.peerGroup}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${user.riskScore > 70 ? "text-red-600" : user.riskScore > 50 ? "text-orange-600" : "text-green-600"}`}
                        >
                          {user.riskScore}
                        </span>
                        <Progress value={user.riskScore} className="h-1 w-12" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getDeviationColor(user.deviation)}`}>
                        {user.deviation.startsWith("+") ? (
                          <TrendingUp className="inline h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="inline h-4 w-4 mr-1" />
                        )}
                        {user.deviation}
                      </span>
                    </TableCell>
                    <TableCell>{user.logins}</TableCell>
                    <TableCell>{user.dataAccess}</TableCell>
                    <TableCell>{user.networkActivity}</TableCell>
                    <TableCell>
                      {user.anomalies > 0 ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {user.anomalies}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status)}>
                        {user.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
