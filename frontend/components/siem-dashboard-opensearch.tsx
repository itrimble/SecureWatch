"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Shield, Activity, Users, Server, TrendingUp, TrendingDown, Brain, Zap, Database, Eye, FileText, Gavel } from "lucide-react"
import { SecurityMetricsChart } from "@/components/security-metrics-chart"
import { ThreatMapWidget } from "@/components/threat-map-widget"
import { RecentAlertsWidget } from "@/components/recent-alerts-widget"
import { OpenSearchWidget, OpenSearchPresets } from "@/components/OpenSearchWidget"

// Configuration
const OPENSEARCH_DASHBOARDS_URL = process.env.NEXT_PUBLIC_OPENSEARCH_DASHBOARDS_URL || 'http://localhost:5601';
const INDEX_PATTERN = 'securewatch-logs';

export function SiemDashboardWithOpenSearch() {
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
      title: "Systems Monitored",
      value: "342",
      change: "0%",
      trend: "neutral",
      icon: Server,
      color: "text-gray-600",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.trend === "up" && <TrendingUp className="inline h-3 w-3 text-green-600" />}
                {metric.trend === "down" && <TrendingDown className="inline h-3 w-3 text-red-600" />}
                <span className={metric.trend === "up" ? "text-green-600" : metric.trend === "down" ? "text-red-600" : ""}>
                  {" "}{metric.change} from last hour
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Dashboard Content with Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="opensearch">OpenSearch Analytics</TabsTrigger>
          <TabsTrigger value="traditional">Traditional View</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Mixed Content */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Security Events Timeline from OpenSearch */}
            <div className="col-span-2">
              <OpenSearchWidget 
                {...OpenSearchPresets.SecurityTimeline(OPENSEARCH_DASHBOARDS_URL, INDEX_PATTERN)}
              />
            </div>

            {/* Traditional Recent Alerts */}
            <div className="col-span-1">
              <RecentAlertsWidget />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Traditional Security Metrics */}
            <SecurityMetricsChart />
            
            {/* Top Attack Techniques from OpenSearch */}
            <OpenSearchWidget 
              {...OpenSearchPresets.TopAttackTechniques(OPENSEARCH_DASHBOARDS_URL, INDEX_PATTERN)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Traditional Threat Map */}
            <div className="col-span-2">
              <ThreatMapWidget />
            </div>

            {/* User Activity Heatmap from OpenSearch */}
            <div className="col-span-1">
              <OpenSearchWidget 
                {...OpenSearchPresets.UserActivityHeatmap(OPENSEARCH_DASHBOARDS_URL, INDEX_PATTERN)}
              />
            </div>
          </div>
        </TabsContent>

        {/* OpenSearch Analytics Tab */}
        <TabsContent value="opensearch" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Real-time Event Stream */}
            <OpenSearchWidget 
              {...OpenSearchPresets.EventStream(OPENSEARCH_DASHBOARDS_URL, INDEX_PATTERN)}
              className="col-span-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Custom OpenSearch Visualizations */}
            <OpenSearchWidget
              visualizationUrl={`${OPENSEARCH_DASHBOARDS_URL}/app/visualize#/edit/risk-score-distribution?embed=true`}
              title="Risk Score Distribution"
              height={300}
            />
            
            <OpenSearchWidget
              visualizationUrl={`${OPENSEARCH_DASHBOARDS_URL}/app/visualize#/edit/network-traffic-analysis?embed=true`}
              title="Network Traffic Analysis"
              height={300}
            />
            
            <OpenSearchWidget
              visualizationUrl={`${OPENSEARCH_DASHBOARDS_URL}/app/visualize#/edit/process-anomalies?embed=true`}
              title="Process Anomalies"
              height={300}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <OpenSearchWidget
              visualizationUrl={`${OPENSEARCH_DASHBOARDS_URL}/app/dashboard#/view/security-operations-center?embed=true`}
              title="SOC Dashboard"
              height={600}
              allowFullscreen={true}
            />
            
            <OpenSearchWidget
              visualizationUrl={`${OPENSEARCH_DASHBOARDS_URL}/app/dashboard#/view/compliance-overview?embed=true`}
              title="Compliance Overview"
              height={600}
              allowFullscreen={true}
            />
          </div>
        </TabsContent>

        {/* Traditional View Tab */}
        <TabsContent value="traditional" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="col-span-2">
              <SecurityMetricsChart />
            </div>
            <RecentAlertsWidget />
          </div>

          <ThreatMapWidget />

          {/* AI-Powered Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Security Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Anomaly Detection Confidence</span>
                  <span className="text-sm text-muted-foreground">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">Unusual login pattern detected from marketing department</span>
                  </div>
                  <Badge variant="outline" className="text-orange-600">Medium</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Potential data exfiltration attempt blocked</span>
                  </div>
                  <Badge variant="outline" className="text-red-600">High</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View All Alerts
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Security Scan
            </Button>
            <Button variant="outline" size="sm">
              <Database className="h-4 w-4 mr-2" />
              Backup Logs
            </Button>
            <Button variant="outline" size="sm">
              <Gavel className="h-4 w-4 mr-2" />
              Compliance Check
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(OPENSEARCH_DASHBOARDS_URL, '_blank')}
            >
              <Activity className="h-4 w-4 mr-2" />
              Open OpenSearch Dashboards
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}