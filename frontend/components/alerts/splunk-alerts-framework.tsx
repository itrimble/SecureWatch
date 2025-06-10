'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bell,
  Clock,
  Search,
  Settings,
  Play,
  Pause,
  Calendar,
  Mail,
  Webhook,
  Database,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  Download,
  Upload,
} from 'lucide-react';
import { AlertCreationWizard } from './alert-creation-wizard';
import { AlertConfigurationManager } from './alert-configuration-manager';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Alert {
  id: string;
  title: string;
  description: string;
  query: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'enabled' | 'disabled' | 'suppressed';
  schedule: {
    type: 'realtime' | 'scheduled';
    cron?: string;
    interval?: number;
    timeRange: string;
  };
  conditions: {
    threshold: number;
    operator: 'greater' | 'less' | 'equal' | 'not_equal';
    field?: string;
  };
  actions: AlertAction[];
  lastRun?: Date;
  nextRun?: Date;
  triggeredCount: number;
  createdBy: string;
  createdAt: Date;
  modifiedAt: Date;
  tags: string[];
}

interface AlertAction {
  id: string;
  type: 'email' | 'webhook' | 'ticket' | 'script' | 'dashboard';
  config: any;
  enabled: boolean;
}

interface AlertHistory {
  id: string;
  alertId: string;
  triggeredAt: Date;
  severity: string;
  resultCount: number;
  message: string;
  status: 'fired' | 'resolved' | 'suppressed';
  duration: number;
}

export function SplunkAlertsFramework() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isCreateAlertOpen, setIsCreateAlertOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('alerts');

  // Sample data
  useEffect(() => {
    const sampleAlerts: Alert[] = [
      {
        id: 'alert-1',
        title: 'Failed Login Attempts',
        description:
          'Monitor for multiple failed login attempts from same source',
        query: 'event_id:4625 | stats count by source_ip | where count > 5',
        severity: 'high',
        status: 'enabled',
        schedule: {
          type: 'scheduled',
          cron: '*/5 * * * *',
          timeRange: 'last 15 minutes',
        },
        conditions: {
          threshold: 5,
          operator: 'greater',
          field: 'count',
        },
        actions: [
          {
            id: 'action-1',
            type: 'email',
            config: {
              recipients: ['security@company.com'],
              subject: 'High Alert: Multiple Failed Logins',
            },
            enabled: true,
          },
        ],
        lastRun: new Date(Date.now() - 300000),
        nextRun: new Date(Date.now() + 300000),
        triggeredCount: 12,
        createdBy: 'security_admin',
        createdAt: new Date('2024-01-15'),
        modifiedAt: new Date('2024-06-01'),
        tags: ['authentication', 'security', 'brute-force'],
      },
      {
        id: 'alert-2',
        title: 'Privilege Escalation Detection',
        description: 'Detect potential privilege escalation activities',
        query:
          'event_id:4672 OR event_id:4648 | stats count by user, process | where count > 10',
        severity: 'critical',
        status: 'enabled',
        schedule: {
          type: 'realtime',
          timeRange: 'last 1 hour',
        },
        conditions: {
          threshold: 10,
          operator: 'greater',
          field: 'count',
        },
        actions: [
          {
            id: 'action-2',
            type: 'webhook',
            config: {
              url: 'https://api.slack.com/webhooks/security',
              method: 'POST',
            },
            enabled: true,
          },
          {
            id: 'action-3',
            type: 'ticket',
            config: { system: 'ServiceNow', priority: 'P1' },
            enabled: true,
          },
        ],
        lastRun: new Date(Date.now() - 60000),
        nextRun: new Date(Date.now() + 60000),
        triggeredCount: 3,
        createdBy: 'soc_analyst',
        createdAt: new Date('2024-02-20'),
        modifiedAt: new Date('2024-06-02'),
        tags: ['privilege-escalation', 'critical', 'windows'],
      },
      {
        id: 'alert-3',
        title: 'Suspicious Network Activity',
        description: 'Monitor for unusual network connections',
        query:
          'source_type:network | stats sum(bytes_out) as total_bytes by dest_ip | where total_bytes > 1000000000',
        severity: 'medium',
        status: 'disabled',
        schedule: {
          type: 'scheduled',
          cron: '0 */6 * * *',
          timeRange: 'last 6 hours',
        },
        conditions: {
          threshold: 1000000000,
          operator: 'greater',
          field: 'total_bytes',
        },
        actions: [
          {
            id: 'action-4',
            type: 'email',
            config: { recipients: ['network-team@company.com'] },
            enabled: true,
          },
        ],
        lastRun: new Date(Date.now() - 21600000),
        nextRun: new Date(Date.now() + 21600000),
        triggeredCount: 8,
        createdBy: 'network_admin',
        createdAt: new Date('2024-03-10'),
        modifiedAt: new Date('2024-05-15'),
        tags: ['network', 'data-exfiltration', 'monitoring'],
      },
    ];

    const sampleHistory: AlertHistory[] = [
      {
        id: 'hist-1',
        alertId: 'alert-1',
        triggeredAt: new Date(Date.now() - 1800000),
        severity: 'high',
        resultCount: 8,
        message: '8 failed login attempts detected from IP 192.168.1.100',
        status: 'fired',
        duration: 300,
      },
      {
        id: 'hist-2',
        alertId: 'alert-2',
        triggeredAt: new Date(Date.now() - 3600000),
        severity: 'critical',
        resultCount: 15,
        message: 'Privilege escalation detected for user admin_svc',
        status: 'resolved',
        duration: 1200,
      },
      {
        id: 'hist-3',
        alertId: 'alert-1',
        triggeredAt: new Date(Date.now() - 7200000),
        severity: 'high',
        resultCount: 6,
        message: '6 failed login attempts detected from IP 10.0.0.50',
        status: 'resolved',
        duration: 600,
      },
    ];

    setAlerts(sampleAlerts);
    setAlertHistory(sampleHistory);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'disabled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'suppressed':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesStatus =
      filterStatus === 'all' || alert.status === filterStatus;
    const matchesSeverity =
      filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesSearch =
      searchQuery === '' ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesStatus && matchesSeverity && matchesSearch;
  });

  const DenseAlertsTable = () => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-8 p-2">
              <input type="checkbox" className="rounded" />
            </TableHead>
            <TableHead className="p-2 font-medium">STATE</TableHead>
            <TableHead className="p-2 font-medium">NAME</TableHead>
            <TableHead className="p-2 font-medium">RULE</TableHead>
            <TableHead className="p-2 font-medium">PRIORITY</TableHead>
            <TableHead className="p-2 font-medium">VERDICT</TableHead>
            <TableHead className="p-2 font-medium">RISK SCORE</TableHead>
            <TableHead className="p-2 font-medium">SEVERITY</TableHead>
            <TableHead className="p-2 font-medium">CASE</TableHead>
            <TableHead className="p-2 font-medium">CREATED</TableHead>
            <TableHead className="p-2 font-medium">SOURCE</TableHead>
            <TableHead className="p-2 font-medium">TAGS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAlerts.map((alert, index) => (
            <TableRow
              key={alert.id}
              className="text-xs hover:bg-muted/50 cursor-pointer border-b"
              onClick={() => setSelectedAlert(alert)}
            >
              <TableCell className="p-2">
                <input type="checkbox" className="rounded" />
              </TableCell>
              <TableCell className="p-2">
                <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                  {alert.status === 'enabled' ? 'New' : 'Disabled'}
                </Badge>
              </TableCell>
              <TableCell className="p-2">
                <div className="text-blue-600 hover:underline max-w-32 truncate">
                  {alert.title}
                </div>
              </TableCell>
              <TableCell className="p-2 max-w-24 truncate">
                {alert.tags[0] || 'Custom Rule'}
              </TableCell>
              <TableCell className="p-2">
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      alert.severity === 'critical'
                        ? 'bg-red-500'
                        : alert.severity === 'high'
                          ? 'bg-orange-500'
                          : alert.severity === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                    }`}
                  />
                  <span className="capitalize">{alert.severity}</span>
                </div>
              </TableCell>
              <TableCell className="p-2 text-gray-500">[Unspecified]</TableCell>
              <TableCell className="p-2">
                <Badge
                  variant="outline"
                  className={`text-xs px-1 py-0 h-5 ${
                    alert.severity === 'critical'
                      ? 'border-red-200 text-red-700 bg-red-50'
                      : alert.severity === 'high'
                        ? 'border-orange-200 text-orange-700 bg-orange-50'
                        : 'border-gray-200 text-gray-700 bg-gray-50'
                  }`}
                >
                  {alert.severity === 'critical'
                    ? 'HIGH RISK'
                    : alert.severity === 'high'
                      ? 'HIGH RISK'
                      : alert.severity === 'medium'
                        ? 'MED_RISK'
                        : 'LOW RISK'}
                </Badge>
              </TableCell>
              <TableCell className="p-2 capitalize">{alert.severity}</TableCell>
              <TableCell className="p-2 text-gray-500">[n/a]</TableCell>
              <TableCell className="p-2">
                {alert.createdAt.toISOString().split('T')[0].replace(/-/g, '') +
                  'T' +
                  alert.createdAt
                    .toTimeString()
                    .split(' ')[0]
                    .replace(/:/g, '')}
              </TableCell>
              <TableCell className="p-2">
                <span className="max-w-24 truncate block">
                  {alert.tags[1] || 'Curated Detections'}
                </span>
              </TableCell>
              <TableCell className="p-2">
                <div className="flex gap-1 flex-wrap">
                  {alert.tags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs px-1 py-0 h-4 bg-gray-100 text-gray-600 border-gray-300"
                    >
                      {tag.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const AlertsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Enabled Alerts
              </p>
              <p className="text-2xl font-bold">
                {alerts.filter((a) => a.status === 'enabled').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Critical Alerts
              </p>
              <p className="text-2xl font-bold">
                {alerts.filter((a) => a.severity === 'critical').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Triggered Today
              </p>
              <p className="text-2xl font-bold">
                {
                  alertHistory.filter(
                    (h) =>
                      h.triggeredAt.toDateString() === new Date().toDateString()
                  ).length
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <XCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Suppressed</p>
              <p className="text-2xl font-bold">
                {alerts.filter((a) => a.status === 'suppressed').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const AlertsList = () => (
    <div>
      {/* Filters Bar */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Badge
          variant="outline"
          className="text-xs bg-blue-50 border-blue-200 text-blue-700"
        >
          State = New
        </Badge>
        <span className="text-xs text-muted-foreground">×</span>
        <Badge
          variant="outline"
          className="text-xs bg-red-50 border-red-200 text-red-700"
        >
          Priority = Critical (+3)
        </Badge>
        <span className="text-xs text-muted-foreground">×</span>
        <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
          Clear All
        </Button>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Refresh time:</span>
          <Select defaultValue="none">
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (default)</SelectItem>
              <SelectItem value="30s">30 seconds</SelectItem>
              <SelectItem value="1m">1 minute</SelectItem>
            </SelectContent>
          </Select>
          <RefreshCw className="h-4 w-4 text-muted-foreground cursor-pointer" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Showing:</span>
          <Select defaultValue="3days">
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1day">Last 1 day</SelectItem>
              <SelectItem value="3days">Last 3 days</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <RefreshCw className="h-4 w-4 text-muted-foreground cursor-pointer" />
          <Button variant="ghost" size="sm" className="h-8 px-2">
            ⋮
          </Button>
        </div>
      </div>

      {/* Dense Table */}
      <DenseAlertsTable />
    </div>
  );

  const IOCMatchesTable = () => (
    <div>
      {/* Filters Bar */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Badge
          variant="outline"
          className="text-xs bg-green-50 border-green-200 text-green-700"
        >
          Status = Active
        </Badge>
        <span className="text-xs text-muted-foreground">×</span>
        <Badge
          variant="outline"
          className="text-xs bg-orange-50 border-orange-200 text-orange-700"
        >
          Type = Malware Hash
        </Badge>
        <span className="text-xs text-muted-foreground">×</span>
        <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
          Clear All
        </Button>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Refresh time:</span>
          <Select defaultValue="none">
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (default)</SelectItem>
              <SelectItem value="30s">30 seconds</SelectItem>
              <SelectItem value="1m">1 minute</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Showing:</span>
          <Select defaultValue="3days">
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1day">Last 1 day</SelectItem>
              <SelectItem value="3days">Last 3 days</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-8 p-2">
                <input type="checkbox" className="rounded" />
              </TableHead>
              <TableHead className="p-2 font-medium">IOC VALUE</TableHead>
              <TableHead className="p-2 font-medium">TYPE</TableHead>
              <TableHead className="p-2 font-medium">SOURCE</TableHead>
              <TableHead className="p-2 font-medium">CONFIDENCE</TableHead>
              <TableHead className="p-2 font-medium">LAST SEEN</TableHead>
              <TableHead className="p-2 font-medium">MATCH COUNT</TableHead>
              <TableHead className="p-2 font-medium">THREAT LEVEL</TableHead>
              <TableHead className="p-2 font-medium">STATUS</TableHead>
              <TableHead className="p-2 font-medium">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertHistory.map((hist, index) => {
              const alert = alerts.find((a) => a.id === hist.alertId);
              return (
                <TableRow
                  key={hist.id}
                  className="text-xs hover:bg-muted/50 cursor-pointer border-b"
                >
                  <TableCell className="p-2">
                    <input type="checkbox" className="rounded" />
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="text-blue-600 hover:underline font-mono text-xs max-w-48 truncate">
                      {index === 0
                        ? '192.168.1.100'
                        : index === 1
                          ? 'powershell.exe'
                          : '10.0.0.50'}
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                      {index === 0
                        ? 'IP Address'
                        : index === 1
                          ? 'Process'
                          : 'IP Address'}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-2 max-w-24 truncate">
                    Threat Intelligence
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>High (85%)</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    {hist.triggeredAt
                      .toISOString()
                      .split('T')[0]
                      .replace(/-/g, '') +
                      'T' +
                      hist.triggeredAt
                        .toTimeString()
                        .split(' ')[0]
                        .replace(/:/g, '')}
                  </TableCell>
                  <TableCell className="p-2">{hist.resultCount}</TableCell>
                  <TableCell className="p-2">
                    <Badge
                      variant="outline"
                      className={`text-xs px-1 py-0 h-5 ${
                        hist.severity === 'critical'
                          ? 'border-red-200 text-red-700 bg-red-50'
                          : hist.severity === 'high'
                            ? 'border-orange-200 text-orange-700 bg-orange-50'
                            : 'border-yellow-200 text-yellow-700 bg-yellow-50'
                      }`}
                    >
                      {hist.severity === 'critical'
                        ? 'CRITICAL'
                        : hist.severity === 'high'
                          ? 'HIGH'
                          : 'MEDIUM'}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-2">
                    <Badge
                      variant="outline"
                      className={`text-xs px-1 py-0 h-5 ${
                        hist.status === 'fired'
                          ? 'border-red-200 text-red-700 bg-red-50'
                          : hist.status === 'resolved'
                            ? 'border-green-200 text-green-700 bg-green-50'
                            : 'border-gray-200 text-gray-700 bg-gray-50'
                      }`}
                    >
                      {hist.status === 'fired' ? 'ACTIVE' : 'RESOLVED'}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const handleCreateAlert = (newAlert: Alert) => {
    setAlerts((prev) => [...prev, newAlert]);
  };

  return (
    <div className="p-4 max-w-full">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4 border-b pb-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">ALERTS</h1>
          <span className="text-sm text-muted-foreground">IOC MATCHES</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Welcome to Alerts and IoCs. Looking for alerts from other sources? Go
          to the{' '}
          <a href="#" className="text-blue-600 hover:underline">
            Legacy Enterprise Insights Page
          </a>
          .
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="alerts" className="text-xs">
            ALERTS
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            IOC MATCHES
          </TabsTrigger>
          <TabsTrigger value="configuration" className="text-xs">
            CONFIGURATION
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            SETTINGS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-3">
          <AlertsList />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <IOCMatchesTable />
        </TabsContent>

        <TabsContent value="configuration" className="space-y-3">
          <AlertConfigurationManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Alert Processing Settings */}
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold border-b pb-2">
                  ALERT PROCESSING
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable-alerts" className="text-xs">
                      Enable Alert Processing
                    </Label>
                    <Switch id="enable-alerts" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alert-throttling" className="text-xs">
                      Alert Throttling
                    </Label>
                    <Switch id="alert-throttling" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="max-alerts" className="text-xs">
                      Max Alerts/Hour
                    </Label>
                    <Input
                      id="max-alerts"
                      type="number"
                      defaultValue="100"
                      className="w-20 h-6 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="queue-size" className="text-xs">
                      Queue Size
                    </Label>
                    <Input
                      id="queue-size"
                      type="number"
                      defaultValue="5000"
                      className="w-20 h-6 text-xs"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Notification Settings */}
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold border-b pb-2">
                  NOTIFICATIONS
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifications" className="text-xs">
                      Email Notifications
                    </Label>
                    <Switch id="email-notifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="webhook-notifications" className="text-xs">
                      Webhook Notifications
                    </Label>
                    <Switch id="webhook-notifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sms-notifications" className="text-xs">
                      SMS Notifications
                    </Label>
                    <Switch id="sms-notifications" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notification-delay" className="text-xs">
                      Delay (seconds)
                    </Label>
                    <Input
                      id="notification-delay"
                      type="number"
                      defaultValue="0"
                      className="w-20 h-6 text-xs"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Data Retention */}
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold border-b pb-2">
                  DATA RETENTION
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alert-retention" className="text-xs">
                      Alert Retention (days)
                    </Label>
                    <Input
                      id="alert-retention"
                      type="number"
                      defaultValue="90"
                      className="w-20 h-6 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="event-retention" className="text-xs">
                      Event Retention (days)
                    </Label>
                    <Input
                      id="event-retention"
                      type="number"
                      defaultValue="365"
                      className="w-20 h-6 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-cleanup" className="text-xs">
                      Auto Cleanup
                    </Label>
                    <Switch id="auto-cleanup" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compress-old" className="text-xs">
                      Compress Old Data
                    </Label>
                    <Switch id="compress-old" defaultChecked />
                  </div>
                </div>
              </div>
            </Card>

            {/* Performance Settings */}
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold border-b pb-2">
                  PERFORMANCE
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="batch-processing" className="text-xs">
                      Batch Processing
                    </Label>
                    <Switch id="batch-processing" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="batch-size" className="text-xs">
                      Batch Size
                    </Label>
                    <Input
                      id="batch-size"
                      type="number"
                      defaultValue="1000"
                      className="w-20 h-6 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="worker-threads" className="text-xs">
                      Worker Threads
                    </Label>
                    <Input
                      id="worker-threads"
                      type="number"
                      defaultValue="4"
                      className="w-20 h-6 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cache-enabled" className="text-xs">
                      Enable Caching
                    </Label>
                    <Switch id="cache-enabled" defaultChecked />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
              <Download className="h-3 w-3 mr-1" />
              Export Settings
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Import Settings
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset to Defaults
            </Button>
            <Button size="sm" className="h-8 px-3 text-xs ml-auto">
              Save Changes
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <Dialog
          open={!!selectedAlert}
          onOpenChange={() => setSelectedAlert(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>{selectedAlert.title}</span>
              </DialogTitle>
              <DialogDescription>{selectedAlert.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Severity
                  </Label>
                  <Badge
                    className={`${getSeverityColor(selectedAlert.severity)} capitalize mt-1`}
                  >
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Status
                  </Label>
                  <Badge
                    className={`${getStatusColor(selectedAlert.status)} capitalize mt-1`}
                  >
                    {selectedAlert.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  KQL Query
                </Label>
                <Textarea
                  value={selectedAlert.query}
                  readOnly
                  className="mt-1 font-mono text-sm"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Schedule Type
                  </Label>
                  <p className="text-sm mt-1 capitalize">
                    {selectedAlert.schedule.type}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Time Range
                  </Label>
                  <p className="text-sm mt-1">
                    {selectedAlert.schedule.timeRange}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Alert Actions
                </Label>
                <div className="mt-2 space-y-2">
                  {selectedAlert.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center space-x-2">
                        {action.type === 'email' && (
                          <Mail className="h-4 w-4" />
                        )}
                        {action.type === 'webhook' && (
                          <Webhook className="h-4 w-4" />
                        )}
                        {action.type === 'ticket' && (
                          <FileText className="h-4 w-4" />
                        )}
                        <span className="capitalize">{action.type}</span>
                      </div>
                      <Badge variant={action.enabled ? 'default' : 'secondary'}>
                        {action.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedAlert) {
                      navigator.clipboard.writeText(selectedAlert.query);
                      toast.success('KQL query copied to clipboard');
                    }
                  }}
                  title="Copy KQL Query"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Query
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedAlert) {
                      const alertData = JSON.stringify(selectedAlert, null, 2);
                      navigator.clipboard.writeText(alertData);
                      toast.success('Alert configuration copied to clipboard');
                    }
                  }}
                  title="Copy Alert Configuration"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Config
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedAlert(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (selectedAlert) {
                      // Set edit mode and open creation wizard with pre-filled data
                      toast.info(
                        `Opening edit mode for alert: ${selectedAlert.title}`
                      );
                      setIsCreateAlertOpen(true);
                      setSelectedAlert(null);
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Alert
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Alert Creation Wizard */}
      <AlertCreationWizard
        isOpen={isCreateAlertOpen}
        onClose={() => setIsCreateAlertOpen(false)}
        onSave={handleCreateAlert}
      />
    </div>
  );
}
