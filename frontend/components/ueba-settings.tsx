"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Settings, TrendingUp, AlertTriangle, Users, Activity, BarChart3, Save, RefreshCw, Info } from "lucide-react"

export function UebaSettings() {
  const [riskThreshold, setRiskThreshold] = useState([75])
  const [sensitivityLevel, setSensitivityLevel] = useState([60])
  const [alertThreshold, setAlertThreshold] = useState([80])

  const riskFactors = [
    {
      name: "Unusual Login Times",
      enabled: true,
      weight: 0.8,
      description: "Detect logins outside normal working hours",
    },
    {
      name: "Large File Downloads",
      enabled: true,
      weight: 0.9,
      description: "Monitor excessive data access patterns",
    },
    {
      name: "Failed Authentication",
      enabled: true,
      weight: 0.7,
      description: "Track repeated login failures",
    },
    {
      name: "VPN Usage Anomalies",
      enabled: true,
      weight: 0.6,
      description: "Unusual VPN connection patterns",
    },
    {
      name: "Privilege Escalation",
      enabled: true,
      weight: 0.95,
      description: "Unauthorized privilege usage",
    },
    {
      name: "External Data Transfers",
      enabled: true,
      weight: 0.85,
      description: "Data sent to external destinations",
    },
  ]

  const alertRules = [
    {
      name: "High Risk Score Alert",
      condition: "Risk Score > 80",
      enabled: true,
      severity: "critical",
    },
    {
      name: "Multiple Failed Logins",
      condition: "Failed Logins > 5 in 1 hour",
      enabled: true,
      severity: "high",
    },
    {
      name: "Off-Hours Access",
      condition: "Login between 10 PM - 6 AM",
      enabled: true,
      severity: "medium",
    },
    {
      name: "Large Data Download",
      condition: "Download > 1 GB in 1 hour",
      enabled: true,
      severity: "high",
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
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              UEBA Threshold Settings
            </h1>
            <p className="text-muted-foreground">Configure risk detection thresholds and sensitivity analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to Defaults</TooltipContent>
            </Tooltip>
            <Button className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>

        <Tabs defaultValue="thresholds" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="thresholds">Risk Thresholds</TabsTrigger>
            <TabsTrigger value="factors">Risk Factors</TabsTrigger>
            <TabsTrigger value="alerts">Alert Rules</TabsTrigger>
            <TabsTrigger value="analysis">Sensitivity Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="thresholds" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Threshold Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Risk Score Thresholds
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Critical Risk Threshold</Label>
                        <span className="text-sm font-medium text-red-600">{riskThreshold[0]}</span>
                      </div>
                      <Slider
                        value={riskThreshold}
                        onValueChange={setRiskThreshold}
                        max={100}
                        min={50}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>50</span>
                        <span>100</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Alert Threshold</Label>
                        <span className="text-sm font-medium text-orange-600">{alertThreshold[0]}</span>
                      </div>
                      <Slider
                        value={alertThreshold}
                        onValueChange={setAlertThreshold}
                        max={100}
                        min={40}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>40</span>
                        <span>100</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Sensitivity Level</Label>
                        <span className="text-sm font-medium text-blue-600">{sensitivityLevel[0]}</span>
                      </div>
                      <Slider
                        value={sensitivityLevel}
                        onValueChange={setSensitivityLevel}
                        max={100}
                        min={20}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Low (20)</span>
                        <span>High (100)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Threshold Impact Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Threshold Impact Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4 h-48 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-lg font-medium">Sensitivity Analysis Graph</p>
                        <p className="text-sm">Visual representation of threshold impact</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Expected Alerts/Day</span>
                        <Badge className="bg-blue-600 text-white">~15</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">False Positive Rate</span>
                        <Badge className="bg-yellow-600 text-white">~8%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Detection Accuracy</span>
                        <Badge className="bg-green-600 text-white">~92%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="factors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Risk Factor Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskFactors.map((factor, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Switch checked={factor.enabled} />
                            <h4 className="font-semibold">{factor.name}</h4>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{factor.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{factor.description}</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Weight Factor</Label>
                              <span className="text-sm font-medium">{factor.weight}</span>
                            </div>
                            <Slider value={[factor.weight * 100]} max={100} min={10} step={5} className="w-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alert Rule Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alertRules.map((rule, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Switch checked={rule.enabled} />
                          <div>
                            <h4 className="font-semibold">{rule.name}</h4>
                            <p className="text-sm text-muted-foreground">{rule.condition}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(rule.severity)}>{rule.severity}</Badge>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button className="w-full" variant="outline">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Add New Alert Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sensitivity Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4 h-64 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-lg font-medium">Sensitivity Curve</p>
                        <p className="text-sm">Threshold vs Detection Rate Analysis</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Impact Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <span className="font-medium">Users Monitored</span>
                      <span className="text-lg font-bold text-blue-600">1,247</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <span className="font-medium">Daily Alerts</span>
                      <span className="text-lg font-bold text-yellow-600">~15</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <span className="font-medium">False Positives</span>
                      <span className="text-lg font-bold text-red-600">8%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <span className="font-medium">Detection Rate</span>
                      <span className="text-lg font-bold text-green-600">92%</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Recommendations</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Current thresholds are well-balanced</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span>Consider increasing VPN anomaly weight</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span>Monitor false positive trends</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
