'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, 
  Activity, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Search,
  Eye,
  ExternalLink,
  AlertCircle,
  Info,
  Shield,
  Zap
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlatformStatus, Alert, LogEntry } from "../platform-status-provider";

interface RecentActivityPanelProps {
  expanded?: boolean;
}

export function RecentActivityPanel({ expanded = false }: RecentActivityPanelProps) {
  const { data } = usePlatformStatus();
  const [alertFilter, setAlertFilter] = useState<string>('all');
  const [logFilter, setLogFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading activity...</div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug':
        return <Activity className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-500';
      case 'acknowledged':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredAlerts = data.recentAlerts.filter(alert => {
    const matchesFilter = alertFilter === 'all' || alert.severity === alertFilter;
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.source.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredLogs = data.recentLogs.filter(log => {
    const matchesFilter = logFilter === 'all' || log.level === logFilter;
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.service.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const AlertItem = ({ alert }: { alert: Alert }) => (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        {getSeverityIcon(alert.severity)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="font-medium text-sm">{alert.title}</div>
            {alert.description && (
              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {alert.description}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-xs">
              {alert.source}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Badge 
              variant={alert.severity === 'critical' ? 'destructive' : 
                      alert.severity === 'high' ? 'destructive' :
                      alert.severity === 'medium' ? 'secondary' : 'default'}
              className="text-xs capitalize"
            >
              {alert.severity}
            </Badge>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(alert.status)}`} />
            <span className="text-xs text-muted-foreground capitalize">{alert.status}</span>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {alert.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );

  const LogItem = ({ log }: { log: LogEntry }) => (
    <div className="flex items-start gap-3 p-2 hover:bg-muted/20 transition-colors">
      <div className="flex-shrink-0 mt-1">
        {getLogLevelIcon(log.level)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="text-sm font-mono text-foreground">{log.message}</div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-xs">
              {log.service}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <Badge 
            variant={log.level === 'error' ? 'destructive' : 
                    log.level === 'warn' ? 'secondary' : 'default'}
            className="text-xs uppercase"
          >
            {log.level}
          </Badge>
          
          <div className="text-xs text-muted-foreground">
            {log.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );

  if (expanded) {
    return (
      <div className="space-y-6">
        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Overview
            </CardTitle>
            <CardDescription>
              Recent alerts and system activity across all services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {data.recentAlerts.filter(a => a.severity === 'critical').length}
                </div>
                <div className="text-sm text-muted-foreground">Critical Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {data.recentAlerts.filter(a => a.severity === 'high').length}
                </div>
                <div className="text-sm text-muted-foreground">High Priority</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {data.recentAlerts.filter(a => a.status === 'resolved').length}
                </div>
                <div className="text-sm text-muted-foreground">Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {data.recentLogs.filter(l => l.level === 'error').length}
                </div>
                <div className="text-sm text-muted-foreground">Error Logs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts and logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={alertFilter} onValueChange={setAlertFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Alert Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Alerts</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={logFilter} onValueChange={setLogFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Log Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Logs</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Activity */}
        <Tabs defaultValue="alerts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="alerts">
              Recent Alerts ({filteredAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="logs">
              System Logs ({filteredLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Security Alerts & Incidents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {filteredAlerts.length > 0 ? (
                      filteredAlerts.map((alert) => (
                        <AlertItem key={alert.id} alert={alert} />
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No alerts match your filters
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  System Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log, index) => (
                        <LogItem key={index} log={log} />
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No logs match your filters
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest security alerts and system events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="alerts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {data.recentAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center gap-3 p-2 border rounded hover:bg-muted/30">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{alert.title}</div>
                      <div className="text-xs text-muted-foreground">{alert.source}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {alert.severity}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {data.recentAlerts.length > 5 && (
                  <div className="text-center">
                    <Button variant="outline" size="sm">
                      View All {data.recentAlerts.length} Alerts
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {data.recentLogs.slice(0, 8).map((log, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 hover:bg-muted/20">
                    {getLogLevelIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono truncate">{log.message}</div>
                      <div className="text-xs text-muted-foreground">{log.service}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                
                {data.recentLogs.length > 8 && (
                  <div className="text-center">
                    <Button variant="outline" size="sm">
                      View All Logs
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}