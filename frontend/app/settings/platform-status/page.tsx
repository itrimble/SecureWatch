'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Database, 
  Server, 
  Zap, 
  Shield, 
  Globe, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  Network,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw as Refresh,
  Eye,
  Settings
} from "lucide-react";
import { PlatformStatusProvider, usePlatformStatus } from "./platform-status-provider";
import { ServiceStatusPanel } from "./components/service-status-panel";
import { PlatformMetricsPanel } from "./components/platform-metrics-panel";
import { SystemResourcesPanel } from "./components/system-resources-panel";
import { RecentActivityPanel } from "./components/recent-activity-panel";

function PlatformStatusDashboardContent() {
  const { data, isLoading, error, lastUpdated, refreshData } = usePlatformStatus();

  if (error) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Platform Status Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage SecureWatch SIEM platform</p>
          </div>
        </div>
        
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Platform Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={refreshData} className="mt-4">
              <Refresh className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Platform Status Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage SecureWatch SIEM platform</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
          </div>
          
          <Button onClick={refreshData} variant="outline" disabled={isLoading}>
            <Refresh className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Platform Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {data?.overallHealth?.percentage || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Health Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {data?.services?.filter(s => s.status === 'operational').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Services Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {data?.recentAlerts?.filter(a => a.severity === 'critical').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Critical Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {data?.systemResources?.cpu?.percentage?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-muted-foreground">CPU Usage</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Tab - Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ServiceStatusPanel />
            <SystemResourcesPanel />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentActivityPanel />
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View Detailed Logs
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Alerts
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Refresh className="h-4 w-4 mr-2" />
                    Restart Services
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <ServiceStatusPanel expanded />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <PlatformMetricsPanel />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <RecentActivityPanel expanded />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PlatformStatusDashboard() {
  return (
    <PlatformStatusProvider>
      <PlatformStatusDashboardContent />
    </PlatformStatusProvider>
  );
}