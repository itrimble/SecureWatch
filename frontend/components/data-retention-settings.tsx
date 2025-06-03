"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import {
  Database,
  HardDrive,
  Archive,
  Trash2,
  Shield,
  Clock,
  Settings,
  Save,
  RefreshCw,
  Info,
  AlertTriangle,
  CheckCircle,
  Eye,
  Download,
  Upload,
  Gavel,
  Key,
  Users,
  FileText,
  Calendar,
  BarChart3,
  TrendingUp,
  Server,
} from "lucide-react"

export function DataRetentionSettings() {
  const [selectedTier, setSelectedTier] = useState("hot")
  const [selectedDataType, setSelectedDataType] = useState("all")
  const [autoArchive, setAutoArchive] = useState(true)
  const [autoDelete, setAutoDelete] = useState(false)
  const [complianceMode, setComplianceMode] = useState(true)

  // Storage Tiers Configuration
  const storageTiers = [
    {
      id: "hot",
      name: "Hot Storage",
      description: "High-performance storage for recent, frequently accessed data",
      icon: HardDrive,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      defaultRetention: 7,
      unit: "days",
      costPerTB: 150,
      performance: "Ultra High",
      accessTime: "Instant",
      currentUsage: 2.3,
      maxCapacity: 10,
    },
    {
      id: "warm",
      name: "Warm Storage",
      description: "Balanced storage for moderately accessed data",
      icon: Database,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      defaultRetention: 90,
      unit: "days",
      costPerTB: 75,
      performance: "High",
      accessTime: "< 1 minute",
      currentUsage: 12.7,
      maxCapacity: 50,
    },
    {
      id: "cold",
      name: "Cold Storage",
      description: "Cost-effective storage for infrequently accessed data",
      icon: Archive,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      defaultRetention: 2,
      unit: "years",
      costPerTB: 25,
      performance: "Medium",
      accessTime: "< 15 minutes",
      currentUsage: 156,
      maxCapacity: 500,
    },
    {
      id: "archive",
      name: "Archive Storage",
      description: "Long-term retention for compliance and legal hold",
      icon: Shield,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      defaultRetention: 7,
      unit: "years",
      costPerTB: 5,
      performance: "Low",
      accessTime: "< 4 hours",
      currentUsage: 234,
      maxCapacity: 1000,
    },
  ]

  // Data Types Configuration
  const dataTypes = [
    {
      id: "security-events",
      name: "Security Events",
      description: "Security logs, alerts, and incident data",
      category: "Security",
      hotRetention: 30,
      warmRetention: 365,
      coldRetention: 2555, // 7 years
      complianceRequired: true,
      piiData: false,
      criticalData: true,
      currentVolume: 45.6,
      dailyGrowth: 1.2,
    },
    {
      id: "authentication-logs",
      name: "Authentication Logs",
      description: "Login attempts, MFA events, session data",
      category: "Identity",
      hotRetention: 7,
      warmRetention: 90,
      coldRetention: 1825, // 5 years
      complianceRequired: true,
      piiData: true,
      criticalData: true,
      currentVolume: 23.4,
      dailyGrowth: 0.8,
    },
    {
      id: "network-traffic",
      name: "Network Traffic",
      description: "Network flows, DNS queries, traffic analysis",
      category: "Network",
      hotRetention: 3,
      warmRetention: 30,
      coldRetention: 365,
      complianceRequired: false,
      piiData: false,
      criticalData: false,
      currentVolume: 128.9,
      dailyGrowth: 4.5,
    },
    {
      id: "system-logs",
      name: "System Logs",
      description: "Operating system, application, and infrastructure logs",
      category: "Infrastructure",
      hotRetention: 7,
      warmRetention: 30,
      coldRetention: 365,
      complianceRequired: false,
      piiData: false,
      criticalData: false,
      currentVolume: 67.8,
      dailyGrowth: 2.1,
    },
    {
      id: "audit-trails",
      name: "Audit Trails",
      description: "User activity, data access, administrative actions",
      category: "Compliance",
      hotRetention: 90,
      warmRetention: 365,
      coldRetention: 2555, // 7 years
      complianceRequired: true,
      piiData: true,
      criticalData: true,
      currentVolume: 34.2,
      dailyGrowth: 0.9,
    },
    {
      id: "file-activity",
      name: "File Activity",
      description: "File access, modifications, sharing events",
      category: "Data Protection",
      hotRetention: 14,
      warmRetention: 90,
      coldRetention: 1095, // 3 years
      complianceRequired: true,
      piiData: true,
      criticalData: false,
      currentVolume: 56.1,
      dailyGrowth: 1.7,
    },
  ]

  // Legal Holds
  const legalHolds = [
    {
      id: "hold-001",
      name: "Data Breach Investigation",
      description: "Hold all security-related data for ongoing breach investigation",
      startDate: "2024-01-10",
      endDate: null,
      dataTypes: ["security-events", "authentication-logs", "audit-trails"],
      status: "active",
      estimatedSize: "45.6 TB",
      contact: "legal@company.com",
    },
    {
      id: "hold-002",
      name: "Employment Litigation",
      description: "Employee activity data for HR litigation case",
      startDate: "2023-12-15",
      endDate: "2024-06-15",
      dataTypes: ["audit-trails", "file-activity"],
      status: "active",
      estimatedSize: "12.3 TB",
      contact: "hr-legal@company.com",
    },
    {
      id: "hold-003",
      name: "Regulatory Audit",
      description: "Financial data retention for regulatory compliance audit",
      startDate: "2023-11-01",
      endDate: "2024-02-01",
      status: "completed",
      dataTypes: ["audit-trails", "system-logs"],
      estimatedSize: "8.9 TB",
      contact: "compliance@company.com",
    },
  ]

  // Compliance Frameworks
  const complianceFrameworks = [
    { id: "gdpr", name: "GDPR", minRetention: 1095, maxRetention: 2555, enabled: true },
    { id: "hipaa", name: "HIPAA", minRetention: 2190, maxRetention: 2555, enabled: true },
    { id: "sox", name: "SOX", minRetention: 2555, maxRetention: 2555, enabled: true },
    { id: "pci-dss", name: "PCI DSS", minRetention: 365, maxRetention: 1095, enabled: false },
    { id: "iso27001", name: "ISO 27001", minRetention: 1095, maxRetention: 2190, enabled: true },
  ]

  const getStorageTier = (tierId: string) => {
    return storageTiers.find(t => t.id === tierId) || storageTiers[0]
  }

  const getUsagePercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100)
  }

  const formatDuration = (days: number) => {
    if (days < 30) return `${days} days`
    if (days < 365) return `${Math.round(days / 30)} months`
    return `${Math.round(days / 365)} years`
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8 text-blue-600" />
              Data Retention & Lifecycle Management
            </h1>
            <p className="text-muted-foreground">Configure automated data lifecycle policies and compliance controls</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Archive className="w-3 h-3 mr-1" />
                Tiered Storage
              </Badge>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                <Gavel className="w-3 h-3 mr-1" />
                Compliance-Ready
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Storage Status</TooltipContent>
            </Tooltip>
            <Button className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Save Policies
            </Button>
          </div>
        </div>

        {/* Storage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {storageTiers.map((tier) => (
            <Card key={tier.id} className={`hover:shadow-lg transition-all duration-200 ${selectedTier === tier.id ? 'ring-2 ring-blue-500' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <tier.icon className={`h-5 w-5 ${tier.color}`} />
                  <h3 className="font-semibold">{tier.name}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Usage</span>
                    <span className="font-medium">{tier.currentUsage} TB</span>
                  </div>
                  <Progress value={getUsagePercentage(tier.currentUsage, tier.maxCapacity)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 TB</span>
                    <span>{tier.maxCapacity} TB</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground">Cost: ${tier.costPerTB}/TB/month</div>
                    <div className="text-xs text-muted-foreground">Access: {tier.accessTime}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="policies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="policies">Retention Policies</TabsTrigger>
            <TabsTrigger value="storage">Storage Tiers</TabsTrigger>
            <TabsTrigger value="data-types">Data Types</TabsTrigger>
            <TabsTrigger value="legal-holds">Legal Holds</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="space-y-6">
            {/* Global Policy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Global Policy Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-archive">Automatic Archiving</Label>
                      <Switch id="auto-archive" checked={autoArchive} onCheckedChange={setAutoArchive} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically move data between storage tiers based on age and access patterns
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-delete">Automatic Deletion</Label>
                      <Switch id="auto-delete" checked={autoDelete} onCheckedChange={setAutoDelete} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically delete data that exceeds maximum retention periods
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="compliance-mode">Compliance Mode</Label>
                      <Switch id="compliance-mode" checked={complianceMode} onCheckedChange={setComplianceMode} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enforce regulatory compliance requirements and prevent premature deletion
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Default Retention Periods</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Hot Storage Default</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" defaultValue="7" className="w-20" />
                          <span className="text-sm text-muted-foreground">days</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Warm Storage Default</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" defaultValue="90" className="w-20" />
                          <span className="text-sm text-muted-foreground">days</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Cold Storage Default</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" defaultValue="2" className="w-20" />
                          <span className="text-sm text-muted-foreground">years</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Data Classification</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">PII Data Protection: Enabled</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Data Anonymization: Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Geographic Residency: Enforced</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Data Lineage Tracking: Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Policies Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Active Retention Policies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">15 automated policies active</span>
                    </div>
                    <Badge className="bg-green-600 text-white">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">3 legal holds preventing deletion</span>
                    </div>
                    <Badge className="bg-blue-600 text-white">Protected</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">2 policies require review</span>
                    </div>
                    <Badge className="bg-yellow-600 text-white">Attention</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="storage" className="space-y-6">
            {/* Storage Tier Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {storageTiers.map((tier) => (
                <Card key={tier.id} className={`${tier.bgColor} ${tier.borderColor} border-2`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <tier.icon className={`h-5 w-5 ${tier.color}`} />
                      {tier.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Default Retention</div>
                        <div className="font-medium">{tier.defaultRetention} {tier.unit}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Cost per TB</div>
                        <div className="font-medium">${tier.costPerTB}/month</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Performance</div>
                        <div className="font-medium">{tier.performance}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Access Time</div>
                        <div className="font-medium">{tier.accessTime}</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Storage Usage</span>
                        <span>{tier.currentUsage} TB / {tier.maxCapacity} TB</span>
                      </div>
                      <Progress value={getUsagePercentage(tier.currentUsage, tier.maxCapacity)} className="h-3" />
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="data-types" className="space-y-6">
            {/* Data Types Configuration */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Data Type Retention Policies
                </CardTitle>
                <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Data Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="identity">Identity</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dataTypes.map((dataType) => (
                    <Card key={dataType.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold">{dataType.name}</h4>
                              <Badge variant="outline">{dataType.category}</Badge>
                              {dataType.complianceRequired && (
                                <Badge className="bg-purple-600 text-white">Compliance Required</Badge>
                              )}
                              {dataType.piiData && (
                                <Badge className="bg-red-600 text-white">PII</Badge>
                              )}
                              {dataType.criticalData && (
                                <Badge className="bg-orange-600 text-white">Critical</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{dataType.description}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Hot Retention:</span>
                                <div className="font-medium">{formatDuration(dataType.hotRetention)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Warm Retention:</span>
                                <div className="font-medium">{formatDuration(dataType.warmRetention)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Cold Retention:</span>
                                <div className="font-medium">{formatDuration(dataType.coldRetention)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Current Volume:</span>
                                <div className="font-medium">{dataType.currentVolume} TB</div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                <span>Growth: {dataType.dailyGrowth} TB/day</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Data
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

          <TabsContent value="legal-holds" className="space-y-6">
            {/* Legal Holds Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Legal Holds
                </CardTitle>
                <Button>
                  <Shield className="h-4 w-4 mr-2" />
                  Create New Hold
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {legalHolds.map((hold) => (
                    <Card key={hold.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold">{hold.name}</h4>
                              <Badge className={hold.status === "active" ? "bg-blue-600 text-white" : "bg-green-600 text-white"}>
                                {hold.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{hold.description}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <span className="text-muted-foreground">Start Date:</span>
                                <div className="font-medium">{hold.startDate}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">End Date:</span>
                                <div className="font-medium">{hold.endDate || "Ongoing"}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Data Size:</span>
                                <div className="font-medium">{hold.estimatedSize}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Contact:</span>
                                <div className="font-medium">{hold.contact}</div>
                              </div>
                            </div>

                            <div>
                              <span className="text-sm font-medium">Protected Data Types:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {hold.dataTypes.map((type, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {dataTypes.find(dt => dt.id === type)?.name || type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                            {hold.status === "active" && (
                              <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4 mr-2" />
                                Modify
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            {/* Compliance Framework Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance Framework Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceFrameworks.map((framework) => (
                    <div key={framework.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Switch checked={framework.enabled} />
                          <div>
                            <h4 className="font-semibold">{framework.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Retention: {formatDuration(framework.minRetention)} - {formatDuration(framework.maxRetention)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={framework.enabled ? "default" : "secondary"}>
                          {framework.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data Export and Deletion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Export & Deletion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Data Export Options</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">JSON Export Format</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">CSV Export Format</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">XML Export Format</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Parquet Export Format</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Archive Export Format</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">SIEM Export Format</span>
                      </div>
                    </div>
                    <Button className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Schedule Export
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Secure Deletion</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Multi-pass Overwrite</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Cryptographic Erasure</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Audit Trail Generation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Certificate of Destruction</span>
                      </div>
                    </div>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Request Deletion
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}