'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  Brain, 
  Shield, 
  Zap,
  Clock,
  TrendingUp,
  Eye,
  AlertCircle,
  CheckCircle,
  Pause
} from 'lucide-react';

interface DashboardMetrics {
  totalEvents: number;
  correlatedEvents: number;
  activeRules: number;
  triggeredAlerts: number;
  processingRate: number;
  accuracy: number;
}

interface EventData {
  time: string;
  total: number;
  correlated: number;
  alerts: number;
}

interface RuleStatus {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  triggers: number;
  lastTriggered: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface RecentAlert {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  source: string;
  status: 'new' | 'investigating' | 'resolved';
}

function CorrelationDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalEvents: 0,
    correlatedEvents: 0,
    activeRules: 0,
    triggeredAlerts: 0,
    processingRate: 0,
    accuracy: 0
  });
  const [eventData, setEventData] = useState<EventData[]>([]);
  const [ruleStatuses, setRuleStatuses] = useState<RuleStatus[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  const mockMetrics: DashboardMetrics = {
    totalEvents: 1247892,
    correlatedEvents: 12483,
    activeRules: 24,
    triggeredAlerts: 127,
    processingRate: 1250,
    accuracy: 94.2
  };

  const mockEventData: EventData[] = [
    { time: '00:00', total: 8420, correlated: 124, alerts: 8 },
    { time: '04:00', total: 6230, correlated: 89, alerts: 5 },
    { time: '08:00', total: 12450, correlated: 234, alerts: 15 },
    { time: '12:00', total: 15670, correlated: 298, alerts: 23 },
    { time: '16:00', total: 18920, correlated: 367, alerts: 31 },
    { time: '20:00', total: 14320, correlated: 245, alerts: 18 }
  ];

  const mockRuleStatuses: RuleStatus[] = [
    {
      id: '1',
      name: 'Multiple Failed Logins',
      status: 'active',
      triggers: 23,
      lastTriggered: '2 hours ago',
      severity: 'high'
    },
    {
      id: '2',
      name: 'Suspicious PowerShell Activity',
      status: 'active',
      triggers: 8,
      lastTriggered: '15 minutes ago',
      severity: 'critical'
    },
    {
      id: '3',
      name: 'Data Exfiltration Pattern',
      status: 'paused',
      triggers: 1,
      lastTriggered: '3 days ago',
      severity: 'critical'
    },
    {
      id: '4',
      name: 'Privilege Escalation Attempt',
      status: 'active',
      triggers: 12,
      lastTriggered: '1 hour ago',
      severity: 'high'
    },
    {
      id: '5',
      name: 'Malware Communication',
      status: 'error',
      triggers: 0,
      lastTriggered: 'Never',
      severity: 'medium'
    }
  ];

  const mockRecentAlerts: RecentAlert[] = [
    {
      id: 'ALT-001',
      title: 'Multiple Failed Login Attempts Detected',
      severity: 'high',
      timestamp: '2 minutes ago',
      source: 'Authentication Monitor',
      status: 'new'
    },
    {
      id: 'ALT-002',
      title: 'Suspicious PowerShell Execution',
      severity: 'critical',
      timestamp: '15 minutes ago',
      source: 'Endpoint Detection',
      status: 'investigating'
    },
    {
      id: 'ALT-003',
      title: 'Privilege Escalation Attempt',
      severity: 'high',
      timestamp: '1 hour ago',
      source: 'Access Control Monitor',
      status: 'investigating'
    },
    {
      id: 'ALT-004',
      title: 'Unusual Network Traffic Pattern',
      severity: 'medium',
      timestamp: '2 hours ago',
      source: 'Network Monitor',
      status: 'resolved'
    },
    {
      id: 'ALT-005',
      title: 'File Integrity Violation',
      severity: 'medium',
      timestamp: '3 hours ago',
      source: 'File Monitor',
      status: 'resolved'
    }
  ];

  useEffect(() => {
    // Simulate API calls
    setTimeout(() => {
      setMetrics(mockMetrics);
      setEventData(mockEventData);
      setRuleStatuses(mockRuleStatuses);
      setRecentAlerts(mockRecentAlerts);
      setLoading(false);
    }, 1000);
  }, []);

  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  }, []);

  const getAlertStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'new': return 'text-red-600 bg-red-50 border-red-200';
      case 'investigating': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'resolved': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Processed Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.processingRate.toLocaleString()} events/minute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Correlated Events</CardTitle>
            <Brain className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {metrics.correlatedEvents.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {((metrics.correlatedEvents / metrics.totalEvents) * 100).toFixed(1)}% correlation rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeRules}</div>
            <p className="text-xs text-muted-foreground">
              {ruleStatuses.filter(r => r.status === 'error').length} with errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts Generated</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{metrics.triggeredAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {recentAlerts.filter(a => a.status === 'new').length} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detection Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{metrics.accuracy}%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Speed</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.processingRate}</div>
            <p className="text-xs text-muted-foreground">
              events per minute
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Event Processing Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Event Processing Overview</CardTitle>
          <CardDescription>
            Real-time event processing and correlation statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={eventData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="total" 
                stackId="1"
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.3}
                name="Total Events"
              />
              <Area 
                type="monotone" 
                dataKey="correlated" 
                stackId="2"
                stroke="#82ca9d" 
                fill="#82ca9d" 
                fillOpacity={0.6}
                name="Correlated Events"
              />
              <Area 
                type="monotone" 
                dataKey="alerts" 
                stackId="3"
                stroke="#ff7300" 
                fill="#ff7300" 
                fillOpacity={0.8}
                name="Generated Alerts"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Rule Status Monitor */}
        <Card>
          <CardHeader>
            <CardTitle>Rule Status Monitor</CardTitle>
            <CardDescription>
              Current status of active correlation rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ruleStatuses.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(rule.status)}
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {rule.triggers} triggers • Last: {rule.lastTriggered}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getSeverityColor(rule.severity)} text-white`}>
                      {rule.severity}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {rule.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>
              Latest security alerts generated by correlation rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${getSeverityColor(alert.severity)} text-white text-xs`}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className={`${getAlertStatusColor(alert.status)} text-xs`}>
                        {alert.status}
                      </Badge>
                    </div>
                    <div className="font-medium text-sm">{alert.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {alert.source} • {alert.timestamp}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                View All Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { CorrelationDashboard };
export default memo(CorrelationDashboard);