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
  Globe,
  AlertTriangle,
  Shield,
  Target,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Filter,
  BarChart3,
  Clock,
  Brain,
  Zap,
  Database,
  Network,
  Users,
  FileText,
} from "lucide-react"

export function ThreatIntelligenceDashboard() {
  const [timeRange, setTimeRange] = useState("7d")
  const [expandedThreat, setExpandedThreat] = useState<string | null>(null)
  const [selectedFeed, setSelectedFeed] = useState("all")

  // Mock data for the threat intelligence dashboard
  const threatStats = {
    totalIndicators: 12458,
    newIndicators: 345,
    criticalThreats: 28,
    activeFeeds: 12,
    detectionRate: 94,
    falsePositiveRate: 5,
    aiCorrelations: 127,
    autoHunts: 18,
  }

  const threatTrends = [
    { name: "Ransomware", count: 156, trend: "+12%", change: "up" },
    { name: "Phishing", count: 243, trend: "+8%", change: "up" },
    { name: "Zero-Day Exploits", count: 18, trend: "+25%", change: "up" },
    { name: "DDoS", count: 87, trend: "-5%", change: "down" },
    { name: "Supply Chain", count: 42, trend: "+15%", change: "up" },
  ]

  const topThreats = [
    {
      id: "THR-001",
      name: "BlackCat Ransomware",
      type: "Ransomware",
      severity: "critical",
      firstSeen: "2024-01-10",
      lastSeen: "2024-01-15",
      targets: ["Financial Services", "Healthcare", "Manufacturing"],
      indicators: 45,
      description:
        "BlackCat (ALPHV) is a ransomware-as-a-service (RaaS) operation that emerged in November 2021. It's written in Rust and targets Windows and Linux systems.",
      tactics: ["Initial Access", "Execution", "Persistence", "Privilege Escalation", "Data Exfiltration"],
      mitigations: [
        "Keep systems and software updated",
        "Implement multi-factor authentication",
        "Segment networks to limit lateral movement",
        "Maintain offline backups",
      ],
    },
    {
      id: "THR-002",
      name: "APT29 Campaign",
      type: "Advanced Persistent Threat",
      severity: "critical",
      firstSeen: "2024-01-05",
      lastSeen: "2024-01-15",
      targets: ["Government", "Defense", "Critical Infrastructure"],
      indicators: 67,
      description:
        "APT29 (Cozy Bear) is a Russian state-sponsored threat actor known for sophisticated attacks targeting government entities and critical infrastructure.",
      tactics: ["Spear Phishing", "Supply Chain Compromise", "Credential Theft", "Lateral Movement"],
      mitigations: [
        "Enhance email security with advanced filtering",
        "Deploy EDR solutions",
        "Implement zero trust architecture",
        "Conduct regular threat hunting exercises",
      ],
    },
    {
      id: "THR-003",
      name: "Log4Shell Exploitation",
      type: "Vulnerability Exploitation",
      severity: "high",
      firstSeen: "2023-12-10",
      lastSeen: "2024-01-14",
      targets: ["All Industries"],
      indicators: 89,
      description:
        "Continued exploitation of Log4j vulnerabilities (CVE-2021-44228, CVE-2021-45046) across multiple industries, allowing remote code execution.",
      tactics: ["Initial Access", "Execution", "Persistence"],
      mitigations: [
        "Update Log4j to latest version",
        "Implement web application firewall rules",
        "Monitor for suspicious Java process activity",
        "Apply virtual patching where updates aren't possible",
      ],
    },
  ]

  const threatFeeds = [
    {
      name: "MISP Platform",
      type: "Framework",
      indicators: 1876,
      lastUpdate: "5 minutes ago",
      status: "active",
      reliability: "high",
      aiEnhanced: true,
    },
    {
      name: "VirusTotal",
      type: "Commercial",
      indicators: 4523,
      lastUpdate: "2 minutes ago",
      status: "active",
      reliability: "high",
      aiEnhanced: true,
    },
    {
      name: "AlienVault OTX",
      type: "Open Source",
      indicators: 3456,
      lastUpdate: "30 minutes ago",
      status: "active",
      reliability: "medium",
      aiEnhanced: false,
    },
    {
      name: "MITRE ATT&CK",
      type: "Framework",
      indicators: 1247,
      lastUpdate: "2 hours ago",
      status: "active",
      reliability: "high",
      aiEnhanced: true,
    },
    {
      name: "CISA Known Exploited",
      type: "Government",
      indicators: 342,
      lastUpdate: "1 day ago",
      status: "active",
      reliability: "high",
      aiEnhanced: false,
    },
    {
      name: "Threat Intel API",
      type: "Commercial",
      indicators: 2891,
      lastUpdate: "10 minutes ago",
      status: "active",
      reliability: "high",
      aiEnhanced: true,
    },
    {
      name: "Custom IOC Feed",
      type: "Internal",
      indicators: 567,
      lastUpdate: "1 hour ago",
      status: "active",
      reliability: "high",
      aiEnhanced: true,
    },
    {
      name: "Open CTI",
      type: "Open Source",
      indicators: 1234,
      lastUpdate: "45 minutes ago",
      status: "active",
      reliability: "medium",
      aiEnhanced: false,
    },
  ]

  const threatMap = [
    { country: "United States", attacks: 1245, trend: "+5%" },
    { country: "Russia", attacks: 876, trend: "+12%" },
    { country: "China", attacks: 945, trend: "+8%" },
    { country: "North Korea", attacks: 234, trend: "+15%" },
    { country: "Iran", attacks: 567, trend: "+10%" },
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

  const getReliabilityColor = (reliability: string) => {
    switch (reliability) {
      case "high":
        return "bg-green-600 text-white"
      case "medium":
        return "bg-yellow-600 text-white"
      case "low":
        return "bg-red-600 text-white"
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
              <Globe className="h-8 w-8" />
              Threat Intelligence Dashboard
            </h1>
            <p className="text-muted-foreground">AI-Enhanced Global Threat Intelligence & IOC Correlation</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Brain className="w-3 h-3 mr-1" />
                AI Correlation
              </Badge>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                <Network className="w-3 h-3 mr-1" />
                Multi-Source Feeds
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
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
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{threatStats.totalIndicators.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total IOCs</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{threatStats.newIndicators.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">New (24h)</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-purple-600" />
                <span className="text-xs text-purple-600">+8%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">{threatStats.criticalThreats}</div>
              <div className="text-sm text-muted-foreground">Critical Threats</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-red-600" />
                <span className="text-xs text-red-600">+12%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-indigo-600">{threatStats.activeFeeds}</div>
              <div className="text-sm text-muted-foreground">Active Feeds</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">{threatStats.detectionRate}%</div>
              <div className="text-sm text-muted-foreground">Detection Rate</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">+2%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-yellow-600">{threatStats.falsePositiveRate}%</div>
              <div className="text-sm text-muted-foreground">False Positive</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingDown className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">-2%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-cyan-600">{threatStats.aiCorrelations}</div>
              <div className="text-sm text-muted-foreground">AI Correlations</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Brain className="h-3 w-3 text-cyan-600" />
                <span className="text-xs text-cyan-600">Active</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-orange-600">{threatStats.autoHunts}</div>
              <div className="text-sm text-muted-foreground">Auto Hunts</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Zap className="h-3 w-3 text-orange-600" />
                <span className="text-xs text-orange-600">Running</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="threats">Active Threats</TabsTrigger>
            <TabsTrigger value="feeds">Intelligence Feeds</TabsTrigger>
            <TabsTrigger value="map">Threat Map</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Threat Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Threat Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {threatTrends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded hover:bg-accent">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              index === 0
                                ? "bg-red-600"
                                : index === 1
                                  ? "bg-orange-600"
                                  : index === 2
                                    ? "bg-yellow-600"
                                    : index === 3
                                      ? "bg-blue-600"
                                      : "bg-purple-600"
                            }`}
                          />
                          <span className="font-medium">{trend.name}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className="text-lg font-bold">{trend.count}</span>
                          <div className="flex items-center gap-1">
                            {trend.change === "up" ? (
                              <TrendingUp className="h-4 w-4 text-red-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-600" />
                            )}
                            <span className={`text-sm ${trend.change === "up" ? "text-red-600" : "text-green-600"}`}>
                              {trend.trend}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Top Targeted Industries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Financial Services</span>
                        <span className="font-medium">28%</span>
                      </div>
                      <Progress value={28} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Healthcare</span>
                        <span className="font-medium">22%</span>
                      </div>
                      <Progress value={22} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Government</span>
                        <span className="font-medium">18%</span>
                      </div>
                      <Progress value={18} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Manufacturing</span>
                        <span className="font-medium">15%</span>
                      </div>
                      <Progress value={15} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Energy</span>
                        <span className="font-medium">12%</span>
                      </div>
                      <Progress value={12} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Other</span>
                        <span className="font-medium">5%</span>
                      </div>
                      <Progress value={5} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Threat Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Threat Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">Threat Activity Timeline</p>
                    <p className="text-sm">Interactive timeline showing threat activity over time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="threats" className="space-y-6">
            {/* Active Threats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Active Threats
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Threat Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="ransomware">Ransomware</SelectItem>
                      <SelectItem value="apt">APT</SelectItem>
                      <SelectItem value="vulnerability">Vulnerability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topThreats.map((threat) => (
                    <Card key={threat.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {/* Threat Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">{threat.name}</h3>
                                <Badge className={getSeverityColor(threat.severity)}>{threat.severity}</Badge>
                                <Badge variant="outline">{threat.type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{threat.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>First seen: {threat.firstSeen}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Last seen: {threat.lastSeen}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  <span>Indicators: {threat.indicators}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpandedThreat(expandedThreat === threat.id ? null : threat.id)}
                              >
                                {expandedThreat === threat.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Targeted Industries */}
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground mr-1">Targets:</span>
                            {threat.targets.map((target, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {target}
                              </Badge>
                            ))}
                          </div>

                          {/* Expanded Details */}
                          {expandedThreat === threat.id && (
                            <div className="border-t pt-4 space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">Tactics & Techniques</h4>
                                <div className="flex flex-wrap gap-1">
                                  {threat.tactics.map((tactic, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tactic}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold mb-2">Recommended Mitigations</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  {threat.mitigations.map((mitigation, index) => (
                                    <li key={index}>{mitigation}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="flex justify-end">
                                <Button size="sm" variant="outline" className="flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  <span>View Full Analysis</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feeds" className="space-y-6">
            {/* Intelligence Feeds */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Intelligence Feeds
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={selectedFeed} onValueChange={setSelectedFeed}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Feed Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Feeds</SelectItem>
                      <SelectItem value="framework">Framework</SelectItem>
                      <SelectItem value="opensource">Open Source</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update Feeds
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {threatFeeds.map((feed, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded hover:bg-accent">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{feed.name}</h4>
                          <Badge variant="outline">{feed.type}</Badge>
                          <Badge className="bg-green-600 text-white">{feed.status}</Badge>
                          {feed.aiEnhanced && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              <Brain className="w-3 h-3 mr-1" />
                              AI Enhanced
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>IOCs: {feed.indicators.toLocaleString()}</span>
                          <span>Last update: {feed.lastUpdate}</span>
                          {feed.aiEnhanced && (
                            <span className="text-blue-600">Auto-correlation enabled</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getReliabilityColor(feed.reliability)}>{feed.reliability} reliability</Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            {/* Global Threat Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Global Threat Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 flex items-center justify-center bg-muted/50 rounded-lg mb-6">
                  <div className="text-center text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">Interactive Global Threat Map</p>
                    <p className="text-sm">Visualization of global threat origins and targets</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Top Threat Origins</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {threatMap.map((country, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{country.country}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold">{country.attacks.toLocaleString()}</span>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-600">{country.trend}</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
