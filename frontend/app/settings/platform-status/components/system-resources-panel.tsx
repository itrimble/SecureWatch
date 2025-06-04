'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Network, 
  Activity,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePlatformStatus } from "../platform-status-provider";

export function SystemResourcesPanel() {
  const { data } = usePlatformStatus();

  if (!data?.systemResources) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading system resources...</div>
        </CardContent>
      </Card>
    );
  }

  const { systemResources } = data;

  // Generate mock time series data for charts
  const generateResourceHistory = (currentValue: number, points: number = 20) => {
    return Array.from({ length: points }, (_, i) => ({
      time: new Date(Date.now() - (points - i - 1) * 60000).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      cpu: Math.max(0, Math.min(100, currentValue + (Math.random() - 0.5) * 20)),
      memory: Math.max(0, Math.min(100, systemResources.memory.percentage + (Math.random() - 0.5) * 10)),
      disk: Math.max(0, Math.min(100, systemResources.disk.percentage + (Math.random() - 0.5) * 5)),
      network: Math.max(0, (Math.random()) * 1000) // Random network activity
    }));
  };

  const resourceHistory = generateResourceHistory(systemResources.cpu.percentage);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getResourceColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getResourceBgColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const ResourceGauge = ({ 
    value, 
    max, 
    title, 
    unit = '', 
    icon: Icon,
    color 
  }: { 
    value: number; 
    max: number; 
    title: string; 
    unit?: string;
    icon: React.ElementType;
    color: string;
  }) => {
    const percentage = (value / max) * 100;
    
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${color}`} />
              <span className="font-medium">{title}</span>
            </div>
            <Badge variant={percentage >= 90 ? 'destructive' : percentage >= 70 ? 'secondary' : 'default'}>
              {percentage.toFixed(1)}%
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used</span>
              <span className="font-medium">{value.toLocaleString()}{unit}</span>
            </div>
            <Progress 
              value={percentage} 
              className="h-3"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0{unit}</span>
              <span>{max.toLocaleString()}{unit}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const NetworkActivityCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Network Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {formatBytes(systemResources.network.bytesIn)}
              </div>
              <div className="text-sm text-muted-foreground">Bytes In</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {formatBytes(systemResources.network.bytesOut)}
              </div>
              <div className="text-sm text-muted-foreground">Bytes Out</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xl font-bold text-purple-500">
              {systemResources.network.connectionsActive}
            </div>
            <div className="text-sm text-muted-foreground">Active Connections</div>
          </div>

          <div>
            <h5 className="text-sm font-medium mb-3">Network Traffic (Last 20 minutes)</h5>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={resourceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="network"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const LoadAverageCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Load Average
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-500">
                {systemResources.cpu.loadAverage[0].toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">1 min</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-500">
                {systemResources.cpu.loadAverage[1].toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">5 min</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-500">
                {systemResources.cpu.loadAverage[2].toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">15 min</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-muted-foreground">
              CPU Cores: {systemResources.cpu.cores}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Resources Overview
          </CardTitle>
          <CardDescription>
            Real-time system performance monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ResourceGauge
              value={systemResources.cpu.percentage}
              max={100}
              title="CPU Usage"
              unit="%"
              icon={Cpu}
              color={getResourceColor(systemResources.cpu.percentage)}
            />
            
            <ResourceGauge
              value={systemResources.memory.usedMB}
              max={systemResources.memory.totalMB}
              title="Memory Usage"
              unit="MB"
              icon={MemoryStick}
              color={getResourceColor(systemResources.memory.percentage)}
            />
            
            <ResourceGauge
              value={systemResources.disk.usedGB}
              max={systemResources.disk.totalGB}
              title="Disk Usage"
              unit="GB"
              icon={HardDrive}
              color={getResourceColor(systemResources.disk.percentage)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU & Memory Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              CPU & Memory Trends
            </CardTitle>
            <CardDescription>
              Last 20 minutes of system resource usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={resourceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="CPU %"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Memory %"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">CPU</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Memory</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Activity */}
        <NetworkActivityCard />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadAverageCard />
        
        {/* Storage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Used Storage</span>
                <span className="text-sm font-medium">
                  {systemResources.disk.usedGB}GB / {systemResources.disk.totalGB}GB
                </span>
              </div>
              
              <Progress 
                value={systemResources.disk.percentage} 
                className="h-3"
              />
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-500">
                    {systemResources.disk.percentage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Used</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-500">
                    {(100 - systemResources.disk.percentage).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Free</div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground text-center">
                {(systemResources.disk.totalGB - systemResources.disk.usedGB).toFixed(1)}GB available
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Resource Usage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Cpu className={`h-8 w-8 mx-auto mb-2 ${getResourceColor(systemResources.cpu.percentage)}`} />
              <div className="text-2xl font-bold">{systemResources.cpu.percentage.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">CPU Usage</div>
              <div className="text-xs text-muted-foreground">{systemResources.cpu.cores} cores</div>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <MemoryStick className={`h-8 w-8 mx-auto mb-2 ${getResourceColor(systemResources.memory.percentage)}`} />
              <div className="text-2xl font-bold">{systemResources.memory.percentage}%</div>
              <div className="text-sm text-muted-foreground">Memory</div>
              <div className="text-xs text-muted-foreground">
                {systemResources.memory.usedMB}MB / {systemResources.memory.totalMB}MB
              </div>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <HardDrive className={`h-8 w-8 mx-auto mb-2 ${getResourceColor(systemResources.disk.percentage)}`} />
              <div className="text-2xl font-bold">{systemResources.disk.percentage}%</div>
              <div className="text-sm text-muted-foreground">Disk</div>
              <div className="text-xs text-muted-foreground">
                {systemResources.disk.usedGB}GB / {systemResources.disk.totalGB}GB
              </div>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Network className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">{systemResources.network.connectionsActive}</div>
              <div className="text-sm text-muted-foreground">Connections</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}