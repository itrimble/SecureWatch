"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  User,
  Shield,
  AlertTriangle,
  Search,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Lock,
  Unlock,
  Activity,
  Clock,
  MapPin,
} from "lucide-react"

export function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterRisk, setFilterRisk] = useState("all")

  const users = [
    {
      id: "USR-001",
      name: "John Smith",
      email: "john.smith@company.com",
      role: "Administrator",
      department: "IT",
      status: "active",
      riskScore: 85,
      lastLogin: "2 hours ago",
      location: "New York, NY",
      failedLogins: 0,
      privilegedAccess: true,
      anomalies: 2,
    },
    {
      id: "USR-002",
      name: "Sarah Johnson",
      email: "sarah.johnson@company.com",
      role: "Analyst",
      department: "Finance",
      status: "active",
      riskScore: 45,
      lastLogin: "30 minutes ago",
      location: "Chicago, IL",
      failedLogins: 1,
      privilegedAccess: false,
      anomalies: 0,
    },
    {
      id: "USR-003",
      name: "Mike Wilson",
      email: "mike.wilson@company.com",
      role: "Manager",
      department: "Sales",
      status: "locked",
      riskScore: 92,
      lastLogin: "3 days ago",
      location: "Los Angeles, CA",
      failedLogins: 5,
      privilegedAccess: true,
      anomalies: 8,
    },
    {
      id: "USR-004",
      name: "Emily Davis",
      email: "emily.davis@company.com",
      role: "User",
      department: "Marketing",
      status: "active",
      riskScore: 25,
      lastLogin: "1 hour ago",
      location: "Austin, TX",
      failedLogins: 0,
      privilegedAccess: false,
      anomalies: 0,
    },
    {
      id: "USR-005",
      name: "David Brown",
      email: "david.brown@company.com",
      role: "Developer",
      department: "Engineering",
      status: "inactive",
      riskScore: 68,
      lastLogin: "1 week ago",
      location: "Seattle, WA",
      failedLogins: 2,
      privilegedAccess: true,
      anomalies: 3,
    },
  ]

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600"
    if (score >= 60) return "text-orange-600"
    if (score >= 40) return "text-yellow-600"
    return "text-green-600"
  }

  const getRiskLevel = (score: number) => {
    if (score >= 80) return "Critical"
    if (score >= 60) return "High"
    if (score >= 40) return "Medium"
    return "Low"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-600 text-white"
      case "inactive":
        return "bg-gray-600 text-white"
      case "locked":
        return "bg-red-600 text-white"
      case "suspended":
        return "bg-yellow-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === "all" || user.role.toLowerCase() === filterRole
    const matchesRisk = filterRisk === "all" || getRiskLevel(user.riskScore).toLowerCase() === filterRisk
    return matchesSearch && matchesRole && matchesRisk
  })

  const userStats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    locked: users.filter((u) => u.status === "locked").length,
    highRisk: users.filter((u) => u.riskScore >= 80).length,
    privileged: users.filter((u) => u.privilegedAccess).length,
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              User Behavior Analytics (UEBA)
            </h1>
            <p className="text-muted-foreground">Monitor user activities and detect behavioral anomalies</p>
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
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Report</TooltipContent>
            </Tooltip>
            <Button>Add User</Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{userStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.active}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{userStats.locked}</div>
              <div className="text-sm text-muted-foreground">Locked Accounts</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-orange-600">{userStats.highRisk}</div>
              <div className="text-sm text-muted-foreground">High Risk Users</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{userStats.privileged}</div>
              <div className="text-sm text-muted-foreground">Privileged Access</div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                User Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Critical Risk (80-100)</span>
                  <span className="text-sm text-red-600">2 users</span>
                </div>
                <Progress value={40} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">High Risk (60-79)</span>
                  <span className="text-sm text-orange-600">1 user</span>
                </div>
                <Progress value={20} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Medium Risk (40-59)</span>
                  <span className="text-sm text-yellow-600">1 user</span>
                </div>
                <Progress value={20} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Low Risk (0-39)</span>
                  <span className="text-sm text-green-600">1 user</span>
                </div>
                <Progress value={20} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Anomalies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 border rounded">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Unusual login time</div>
                    <div className="text-xs text-muted-foreground">Mike Wilson - 3:00 AM</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Multiple failed logins</div>
                    <div className="text-xs text-muted-foreground">John Smith - 5 attempts</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">New location access</div>
                    <div className="text-xs text-muted-foreground">David Brown - Miami, FL</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, email, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="administrator">Administrator</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Directory ({filteredUsers.length} users)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Anomalies</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-accent">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{user.role}</Badge>
                        {user.privilegedAccess && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Shield className="h-4 w-4 text-orange-600" />
                            </TooltipTrigger>
                            <TooltipContent>Privileged Access</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getRiskColor(user.riskScore)}`}>{user.riskScore}</span>
                        <div className="w-16">
                          <Progress value={user.riskScore} className="h-1" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {user.anomalies > 0 ? (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                        <span className={user.anomalies > 0 ? "text-red-600" : "text-green-600"}>{user.anomalies}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.lastLogin}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Profile</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit User</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              {user.status === "locked" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {user.status === "locked" ? "Unlock Account" : "Lock Account"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
