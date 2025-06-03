"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Shield, Activity, Users, Server, TrendingUp, TrendingDown, Brain, Zap, Database, Eye, FileText, Gavel } from "lucide-react"
import { SecurityMetricsChart } from "@/components/security-metrics-chart"
import { ThreatMapWidget } from "@/components/threat-map-widget"
import { RecentAlertsWidget } from "@/components/recent-alerts-widget"

export function SiemDashboard() {
  const metrics = [
    {
      title: "Active Threats",
      value: "23",
      change: "+12%",
      trend: "up",
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      title: "AI Anomalies",
      value: "7",
      change: "+2%",
      trend: "up",
      icon: Brain,
      color: "text-orange-600",
    },
    {
      title: "Security Score",
      value: "87%",
      change: "+5%",
      trend: "up",
      icon: Shield,
      color: "text-green-600",
    },
    {
      title: "Events/Hour",
      value: "15.2K",
      change: "-8%",
      trend: "down",
      icon: Activity,
      color: "text-blue-600",
    },
    {
      title: "Active Users",
      value: "1,247",
      change: "+3%",
      trend: "up",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Compliance Score",
      value: "94%",
      change: "+1%",
      trend: "up",
      icon: Gavel,
      color: "text-indigo-600",
    },
  ]

  const aiFeatures = [
    {
      title: "Natural Language Queries",
      description: "Ask questions in plain English and get KQL results",
      icon: Brain,
      status: "active",
    },
    {
      title: "ML Anomaly Detection",
      description: "AI identifies unusual patterns in real-time",
      icon: Zap,
      status: "active",
    },
    {
      title: "Automated Threat Hunting",
      description: "AI-powered hunting templates and correlation",
      icon: Eye,
      status: "active",
    },
    {
      title: "Intelligent Alert Enrichment",
      description: "Context-aware alert analysis and response",
      icon: FileText,
      status: "active",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SecureWatch SIEM Platform</h1>
          <p className="text-gray-600 mt-1">AI-Enhanced Security Operations Center</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            <Brain className="w-3 h-3 mr-1" />
            AI Enabled
          </Badge>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
            System Healthy
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {metric.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <metric.icon className={`h-8 w-8 ${metric.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI-Enhanced Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI-Enhanced Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiFeatures.map((feature, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <feature.icon className="h-6 w-6 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                    <Badge variant="outline" className="text-green-600 border-green-600 mt-2 text-xs">
                      {feature.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full">
              <Brain className="h-4 w-4 mr-2" />
              Ask AI Assistant
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SecurityMetricsChart />
        <ThreatMapWidget />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentAlertsWidget />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>GDPR</span>
                  <span>98%</span>
                </div>
                <Progress value={98} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>HIPAA</span>
                  <span>95%</span>
                </div>
                <Progress value={95} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>SOX</span>
                  <span>92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>ISO 27001</span>
                  <span>89%</span>
                </div>
                <Progress value={89} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Retention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Hot Storage (7d)</span>
                  <span>2.3TB</span>
                </div>
                <Progress value={76} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Warm Storage (90d)</span>
                  <span>12.7TB</span>
                </div>
                <Progress value={43} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Cold Storage (2y)</span>
                  <span>156TB</span>
                </div>
                <Progress value={62} className="h-2" />
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-600">Automated policies: 15 active</p>
                <p className="text-xs text-gray-600">Legal holds: 3 active</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>CPU Usage</span>
                  <span>67%</span>
                </div>
                <Progress value={67} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Memory Usage</span>
                  <span>84%</span>
                </div>
                <Progress value={84} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Kafka Throughput</span>
                  <span>23K/s</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
