"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target, Globe, TrendingUp, AlertTriangle, Eye, Download } from "lucide-react"

export function ThreatIntelligence() {
  const threatFeeds = [
    {
      name: "MITRE ATT&CK",
      status: "active",
      lastUpdate: "2 hours ago",
      indicators: 1247,
      severity: "high",
    },
    {
      name: "Emerging Threats",
      status: "active",
      lastUpdate: "15 minutes ago",
      indicators: 892,
      severity: "medium",
    },
    {
      name: "AlienVault OTX",
      status: "active",
      lastUpdate: "1 hour ago",
      indicators: 2156,
      severity: "high",
    },
    {
      name: "Custom IOCs",
      status: "active",
      lastUpdate: "30 minutes ago",
      indicators: 156,
      severity: "critical",
    },
  ]

  const iocs = [
    {
      type: "IP Address",
      value: "192.168.1.100",
      threat: "Malicious C2 Server",
      confidence: "High",
      firstSeen: "2024-01-15 10:30:00",
      source: "MITRE ATT&CK",
    },
    {
      type: "Domain",
      value: "malicious-site.com",
      threat: "Phishing Campaign",
      confidence: "Medium",
      firstSeen: "2024-01-15 09:15:00",
      source: "Emerging Threats",
    },
    {
      type: "File Hash",
      value: "a1b2c3d4e5f6...",
      threat: "Ransomware",
      confidence: "High",
      firstSeen: "2024-01-15 08:45:00",
      source: "Custom IOCs",
    },
    {
      type: "URL",
      value: "http://suspicious-url.net/payload",
      threat: "Malware Distribution",
      confidence: "High",
      firstSeen: "2024-01-15 07:20:00",
      source: "AlienVault OTX",
    },
  ]

  const campaigns = [
    {
      name: "APT29 Campaign",
      description: "Advanced persistent threat targeting government entities",
      severity: "critical",
      tactics: ["Initial Access", "Persistence", "Lateral Movement"],
      indicators: 45,
      lastActivity: "2024-01-15 12:00:00",
    },
    {
      name: "Emotet Botnet",
      description: "Banking trojan spreading via email attachments",
      severity: "high",
      tactics: ["Initial Access", "Execution", "Command and Control"],
      indicators: 128,
      lastActivity: "2024-01-15 11:30:00",
    },
    {
      name: "Ransomware-as-a-Service",
      description: "Multiple ransomware families targeting healthcare",
      severity: "high",
      tactics: ["Initial Access", "Impact", "Exfiltration"],
      indicators: 67,
      lastActivity: "2024-01-15 10:15:00",
    },
  ]

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case "high":
        return "bg-red-500 text-white"
      case "medium":
        return "bg-yellow-500 text-white"
      case "low":
        return "bg-green-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 text-white"
      case "high":
        return "bg-red-500 text-white"
      case "medium":
        return "bg-yellow-500 text-white"
      case "low":
        return "bg-green-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Threat Intelligence</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export IOCs
          </Button>
          <Button>Update Feeds</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="iocs">Indicators</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="feeds">Threat Feeds</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Threat Intelligence Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active IOCs</p>
                    <p className="text-2xl font-bold">4,451</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">+12%</span>
                    </div>
                  </div>
                  <Target className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Threat Campaigns</p>
                    <p className="text-2xl font-bold">23</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-600">+3</span>
                    </div>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Feed Sources</p>
                    <p className="text-2xl font-bold">8</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm text-green-600">All Active</span>
                    </div>
                  </div>
                  <Globe className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Confidence Score</p>
                    <p className="text-2xl font-bold">89%</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm text-green-600">High</span>
                    </div>
                  </div>
                  <Eye className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Active Threat Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.slice(0, 3).map((campaign, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{campaign.name}</h4>
                          <Badge className={getSeverityColor(campaign.severity)}>{campaign.severity}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{campaign.indicators} indicators</span>
                          <span>Last activity: {campaign.lastActivity}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {campaign.tactics.map((tactic, tacticIndex) => (
                        <Badge key={tacticIndex} variant="outline" className="text-xs">
                          {tactic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iocs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Indicators of Compromise (IOCs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {iocs.map((ioc, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{ioc.type}</Badge>
                          <Badge className={getConfidenceColor(ioc.confidence)}>{ioc.confidence}</Badge>
                        </div>
                        <p className="font-mono text-sm mb-1">{ioc.value}</p>
                        <p className="text-sm text-gray-600 mb-2">{ioc.threat}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Source: {ioc.source}</span>
                          <span>First seen: {ioc.firstSeen}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Block
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="space-y-4">
            {campaigns.map((campaign, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{campaign.name}</h3>
                        <Badge className={getSeverityColor(campaign.severity)}>{campaign.severity}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{campaign.indicators} indicators</span>
                        <span>Last activity: {campaign.lastActivity}</span>
                      </div>
                    </div>
                    <Button size="sm">View Campaign</Button>
                  </div>
                  <div className="flex gap-1 mt-4">
                    {campaign.tactics.map((tactic, tacticIndex) => (
                      <Badge key={tacticIndex} variant="outline" className="text-xs">
                        {tactic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="feeds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Threat Intelligence Feeds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {threatFeeds.map((feed, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{feed.name}</h4>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            {feed.status}
                          </Badge>
                          <Badge className={getSeverityColor(feed.severity)}>{feed.severity}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{feed.indicators} indicators</span>
                          <span>Last update: {feed.lastUpdate}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Configure
                        </Button>
                        <Button size="sm" variant="outline">
                          Refresh
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
