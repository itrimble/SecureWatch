'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Database, 
  Zap, 
  Search, 
  BarChart3,
  Clock,
  TrendingUp,
  AlertCircle,
  FileText,
  Users,
  Gauge
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePlatformStatus } from "../platform-status-provider";

function PlatformMetricsPanel() {
  const { data } = usePlatformStatus();

  if (!data?.platformMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Platform Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading metrics...</div>
        </CardContent>
      </Card>
    );
  }

  const { platformMetrics } = data;

  // Generate mock time series data for charts
  const generateTimeSeriesData = (baseValue: number, points: number = 20) => {
    return Array.from({ length: points }, (_, i) => ({
      time: new Date(Date.now() - (points - i - 1) * 60000).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      value: Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.3)
    }));
  };

  const eventsPerSecondData = generateTimeSeriesData(platformMetrics.logIngestion.eventsPerSecond);
  const alertsData = generateTimeSeriesData(platformMetrics.correlationEngine.alertsGenerated);
  const queryTimeData = generateTimeSeriesData(platformMetrics.searchApi.avgQueryTime);
  const dbConnectionsData = generateTimeSeriesData(platformMetrics.database.connections);

  const MetricCard = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    trend, 
    description,
    color = "blue" 
  }: {
    title: string;
    value: number;
    unit?: string;
    icon: React.ElementType;
    trend?: 'up' | 'down' | 'stable';
    description?: string;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 text-${color}-500`} />
            <span className="text-sm font-medium">{title}</span>
          </div>
          {trend && (
            <Badge variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend}
            </Badge>
          )}
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
          </div>
          {description && (
            <div className="text-xs text-muted-foreground mt-1">{description}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const GaugeChart = ({ value, max, title, color = "#3b82f6" }: { 
    value: number; 
    max: number; 
    title: string; 
    color?: string; 
  }) => {
    const percentage = (value / max) * 100;
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              className="text-muted opacity-20"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke={color}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold">{Math.round(percentage)}%</span>
          </div>
        </div>
        <div className="text-sm text-center mt-2">
          <div className="font-medium">{title}</div>
          <div className="text-muted-foreground">{value.toLocaleString()}/{max.toLocaleString()}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Platform Overview
          </CardTitle>
          <CardDescription>
            Key performance indicators across all services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Events/Second"
              value={platformMetrics.logIngestion.eventsPerSecond}
              icon={Activity}
              trend="up"
              description="Current ingestion rate"
              color="green"
            />
            <MetricCard
              title="Active Rules"
              value={platformMetrics.correlationEngine.activeRules}
              icon={AlertCircle}
              trend="stable"
              description="Correlation rules"
              color="blue"
            />
            <MetricCard
              title="Query Time"
              value={platformMetrics.searchApi.avgQueryTime}
              unit="ms"
              icon={Clock}
              trend="down"
              description="Average response"
              color="purple"
            />
            <MetricCard
              title="DB Connections"
              value={platformMetrics.database.connections}
              icon={Database}
              trend="stable"
              description="Active connections"
              color="orange"
            />
          </div>
        </CardContent>
      </Card>

      {/* Log Ingestion Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log Ingestion Service
          </CardTitle>
          <CardDescription>
            Real-time log processing and ingestion metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  title="Total Events"
                  value={platformMetrics.logIngestion.totalEvents}
                  icon={BarChart3}
                  color="blue"
                />
                <MetricCard
                  title="Queue Length"
                  value={platformMetrics.logIngestion.queueLength}
                  icon={Users}
                  color="yellow"
                />
                <MetricCard
                  title="Active Sources"
                  value={platformMetrics.logIngestion.activeSourcesCount}
                  icon={Database}
                  color="green"
                />
                <MetricCard
                  title="Latency"
                  value={platformMetrics.logIngestion.processingLatency}
                  unit="ms"
                  icon={Clock}
                  color="purple"
                />
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-4">Events Per Second (Last 20 minutes)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={eventsPerSecondData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Correlation Engine & Search API */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Correlation Engine */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Correlation Engine
            </CardTitle>
            <CardDescription>
              Rule processing and alert generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {platformMetrics.correlationEngine.alertsGenerated}
                </div>
                <div className="text-sm text-muted-foreground">Alerts Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {platformMetrics.correlationEngine.processingLatency}ms
                </div>
                <div className="text-sm text-muted-foreground">Processing Time</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Cache Hit Ratio</span>
                  <span className="text-sm font-medium">{platformMetrics.correlationEngine.cacheHitRatio}%</span>
                </div>
                <Progress value={platformMetrics.correlationEngine.cacheHitRatio} className="h-2" />
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium mb-3">Alert Generation (Last Hour)</h5>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={alertsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Search API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search API
            </CardTitle>
            <CardDescription>
              Query processing and search performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {platformMetrics.searchApi.activeQueries}
                </div>
                <div className="text-sm text-muted-foreground">Active Queries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {platformMetrics.searchApi.indexSize}GB
                </div>
                <div className="text-sm text-muted-foreground">Index Size</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Cache Hit Ratio</span>
                  <span className="text-sm font-medium">{platformMetrics.searchApi.cacheHitRatio}%</span>
                </div>
                <Progress value={platformMetrics.searchApi.cacheHitRatio} className="h-2" />
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium mb-3">Query Response Time</h5>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={queryTimeData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Performance
          </CardTitle>
          <CardDescription>
            TimescaleDB performance and storage metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <MetricCard
                title="Avg Query Time"
                value={platformMetrics.database.avgQueryTime}
                unit="ms"
                icon={Clock}
                color="green"
              />
              <MetricCard
                title="Active Connections"
                value={platformMetrics.database.connections}
                icon={Users}
                color="blue"
              />
            </div>
            
            <div className="flex justify-center items-center">
              <GaugeChart
                value={platformMetrics.database.storageUsed}
                max={platformMetrics.database.storageTotal}
                title="Storage Usage"
                color="#10b981"
              />
            </div>
            
            <div>
              <h5 className="text-sm font-medium mb-3">Connection Activity</h5>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dbConnectionsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(PlatformMetricsPanel);
export { PlatformMetricsPanel };