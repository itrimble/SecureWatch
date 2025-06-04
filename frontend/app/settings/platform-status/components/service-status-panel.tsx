'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Server, 
  Database, 
  Globe, 
  Shield, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Play,
  Square,
  RotateCcw,
  Eye,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlatformStatus, ServiceStatus } from "../platform-status-provider";

interface ServiceStatusPanelProps {
  expanded?: boolean;
}

export function ServiceStatusPanel({ expanded = false }: ServiceStatusPanelProps) {
  const { data } = usePlatformStatus();

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading services...</div>
        </CardContent>
      </Card>
    );
  }

  const allServices = [...data.services, ...data.dockerServices];

  const getServiceIcon = (serviceName: string) => {
    if (serviceName.toLowerCase().includes('database') || serviceName.toLowerCase().includes('postgres')) {
      return Database;
    }
    if (serviceName.toLowerCase().includes('frontend') || serviceName.toLowerCase().includes('web')) {
      return Globe;
    }
    if (serviceName.toLowerCase().includes('security') || serviceName.toLowerCase().includes('auth')) {
      return Shield;
    }
    return Server;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unoperational':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unoperational':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'Unknown';
    
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const ServiceCard = ({ service }: { service: ServiceStatus }) => {
    const ServiceIcon = getServiceIcon(service.name);

    return (
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ServiceIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{service.name}</CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusIcon(service.status)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Play className="h-4 w-4 mr-2" />
                    Start Service
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Square className="h-4 w-4 mr-2" />
                    Stop Service
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restart Service
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    View Logs
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={service.status === 'operational' ? 'default' : service.status === 'degraded' ? 'secondary' : 'destructive'}
              className="capitalize"
            >
              {service.status}
            </Badge>
            {service.port && (
              <Badge variant="outline">
                Port {service.port}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Health Score */}
          {service.healthScore !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Health Score</span>
                <span className="text-sm font-medium">{service.healthScore}%</span>
              </div>
              <Progress 
                value={service.healthScore} 
                className="h-2" 
              />
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Uptime</div>
              <div className="font-medium">{formatUptime(service.uptime)}</div>
            </div>
            
            {service.responseTime && (
              <div>
                <div className="text-muted-foreground">Response</div>
                <div className="font-medium">{service.responseTime}ms</div>
              </div>
            )}
            
            {service.cpu && (
              <div>
                <div className="text-muted-foreground">CPU</div>
                <div className="font-medium">{service.cpu}%</div>
              </div>
            )}
            
            {service.memory && (
              <div>
                <div className="text-muted-foreground">Memory</div>
                <div className="font-medium">{service.memory}MB</div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {service.error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
              {service.error}
            </div>
          )}

          {/* Last Check */}
          {service.lastCheck && (
            <div className="text-xs text-muted-foreground">
              Last checked: {service.lastCheck.toLocaleTimeString()}
            </div>
          )}
        </CardContent>

        {/* Status Indicator Bar */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${getStatusColor(service.status)}`} />
      </Card>
    );
  };

  if (expanded) {
    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Service Overview
            </CardTitle>
            <CardDescription>
              Real-time status of all SecureWatch services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {allServices.filter(s => s.status === 'operational').length}
                </div>
                <div className="text-sm text-muted-foreground">Operational</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {allServices.filter(s => s.status === 'degraded').length}
                </div>
                <div className="text-sm text-muted-foreground">Degraded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {allServices.filter(s => s.status === 'unoperational').length}
                </div>
                <div className="text-sm text-muted-foreground">Down</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {allServices.length}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Microservices */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Microservices</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.services.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        </div>

        {/* Infrastructure Services */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Infrastructure Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.dockerServices.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Service Status
        </CardTitle>
        <CardDescription>
          {allServices.filter(s => s.status === 'operational').length} of {allServices.length} services operational
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allServices.slice(0, 6).map((service) => (
            <div key={service.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <div>
                  <div className="font-medium">{service.name}</div>
                  {service.port && (
                    <div className="text-sm text-muted-foreground">Port {service.port}</div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <Badge 
                  variant={service.status === 'operational' ? 'default' : service.status === 'degraded' ? 'secondary' : 'destructive'}
                  className="capitalize text-xs"
                >
                  {service.status}
                </Badge>
                {service.healthScore !== undefined && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {service.healthScore}% health
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {allServices.length > 6 && (
            <div className="text-center">
              <Button variant="outline" size="sm">
                View All {allServices.length} Services
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}