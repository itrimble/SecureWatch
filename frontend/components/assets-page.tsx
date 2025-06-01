"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Server,
  Laptop,
  Smartphone,
  Router,
  Shield,
  AlertTriangle,
  CheckCircle,
  Search,
  Download,
  RefreshCw,
  Eye,
  Edit,
  MoreHorizontal,
} from "lucide-react"

export function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")

  const assets = [
    {
      id: "AST-001",
      name: "DC-PRIMARY-01",
      type: "server",
      ip: "192.168.1.10",
      os: "Windows Server 2019",
      status: "online",
      risk: "low",
      lastSeen: "2 minutes ago",
      vulnerabilities: 2,
      owner: "IT Team",
    },
    {
      id: "AST-002",
      name: "WS-FINANCE-15",
      type: "workstation",
      ip: "192.168.1.45",
      os: "Windows 11 Pro",
      status: "online",
      risk: "medium",
      lastSeen: "5 minutes ago",
      vulnerabilities: 5,
      owner: "John Smith",
    },
    {
      id: "AST-003",
      name: "FW-PERIMETER",
      type: "network",
      ip: "192.168.1.1",
      os: "FortiOS 7.2",
      status: "online",
      risk: "high",
      lastSeen: "1 minute ago",
      vulnerabilities: 8,
      owner: "Security Team",
    },
    {
      id: "AST-004",
      name: "MOBILE-SALES-03",
      type: "mobile",
      ip: "10.0.0.23",
      os: "iOS 17.1",
      status: "offline",
      risk: "low",
      lastSeen: "2 hours ago",
      vulnerabilities: 1,
      owner: "Sarah Johnson",
    },
    {
      id: "AST-005",
      name: "DB-PROD-02",
      type: "server",
      ip: "192.168.1.20",
      os: "Ubuntu 22.04 LTS",
      status: "online",
      risk: "critical",
      lastSeen: "30 seconds ago",
      vulnerabilities: 12,
      owner: "Database Team",
    },
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "server":
        return Server
      case "workstation":
        return Laptop
      case "mobile":
        return Smartphone
      case "network":
        return Router
      default:
        return Server
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-600 text-white"
      case "offline":
        return "bg-red-600 text-white"
      case "maintenance":
        return "bg-yellow-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
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

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.ip.includes(searchTerm) ||
      asset.owner.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || asset.status === filterStatus
    const matchesType = filterType === "all" || asset.type === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const assetStats = {
    total: assets.length,
    online: assets.filter((a) => a.status === "online").length,
    offline: assets.filter((a) => a.status === "offline").length,
    critical: assets.filter((a) => a.risk === "critical").length,
    vulnerabilities: assets.reduce((sum, a) => sum + a.vulnerabilities, 0),
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Server className="h-8 w-8" />
              Asset Management
            </h1>
            <p className="text-muted-foreground">Monitor and manage your IT infrastructure assets</p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Assets</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Assets</TooltipContent>
            </Tooltip>
            <Button>Add Asset</Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{assetStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Assets</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">{assetStats.online}</div>
              <div className="text-sm text-muted-foreground">Online</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{assetStats.offline}</div>
              <div className="text-sm text-muted-foreground">Offline</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-orange-600">{assetStats.critical}</div>
              <div className="text-sm text-muted-foreground">Critical Risk</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{assetStats.vulnerabilities}</div>
              <div className="text-sm text-muted-foreground">Vulnerabilities</div>
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
                    placeholder="Search assets by name, IP, or owner..."
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
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="server">Servers</SelectItem>
                  <SelectItem value="workstation">Workstations</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Asset Inventory ({filteredAssets.length} assets)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Operating System</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Vulnerabilities</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => {
                  const TypeIcon = getTypeIcon(asset.type)
                  return (
                    <TableRow key={asset.id} className="hover:bg-accent">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-sm text-muted-foreground">{asset.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {asset.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{asset.ip}</TableCell>
                      <TableCell>{asset.os}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(asset.risk)}>{asset.risk}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {asset.vulnerabilities > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          <span className={asset.vulnerabilities > 0 ? "text-red-600" : "text-green-600"}>
                            {asset.vulnerabilities}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{asset.owner}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{asset.lastSeen}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
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
                            <TooltipContent>Edit Asset</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>More Actions</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
