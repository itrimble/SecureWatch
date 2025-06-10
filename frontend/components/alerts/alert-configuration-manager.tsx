'use client';

import React, { useState } from 'react';
import {
  Settings,
  Clock,
  Users,
  Shield,
  Bell,
  Database,
  Zap,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Mail,
  Webhook,
  FileText,
  Pause,
  Play,
  Edit,
  Copy,
  Trash2,
  Download,
  Upload,
  Filter,
  Search,
  Eye,
} from 'lucide-react';
import { AlertActionManager } from './alert-action-manager';
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
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AlertConfiguration {
  id: string;
  name: string;
  description: string;
  category: 'authentication' | 'network' | 'endpoint' | 'compliance' | 'custom';
  enabled: boolean;
  schedule: {
    type: 'realtime' | 'scheduled';
    cron?: string;
    interval?: number;
    timeWindow: string;
  };
  suppression: {
    enabled: boolean;
    duration: number;
    maxAlerts: number;
    fields: string[];
  };
  escalation: {
    enabled: boolean;
    levels: EscalationLevel[];
  };
  throttling: {
    enabled: boolean;
    maxAlertsPerHour: number;
    suppressDuplicates: boolean;
  };
  correlation: {
    enabled: boolean;
    correlationKey: string;
    windowSize: number;
  };
  actions: AlertAction[];
  createdAt: Date;
  modifiedAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

interface EscalationLevel {
  id: string;
  level: number;
  delayMinutes: number;
  actions: AlertAction[];
  condition: 'unacknowledged' | 'unresolved' | 'time_based';
}

interface AlertAction {
  id: string;
  type: 'email' | 'webhook' | 'ticket' | 'script' | 'dashboard' | 'sms';
  name: string;
  config: any;
  enabled: boolean;
  failurePolicy: 'ignore' | 'retry' | 'escalate';
  retryCount?: number;
}

export function AlertConfigurationManager() {
  const [configurations, setConfigurations] = useState<AlertConfiguration[]>(
    []
  );
  const [selectedConfig, setSelectedConfig] =
    useState<AlertConfiguration | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample configurations
  React.useEffect(() => {
    const sampleConfigs: AlertConfiguration[] = [
      {
        id: 'config-1',
        name: 'Brute Force Detection',
        description:
          'Advanced brute force attack detection with adaptive thresholds',
        category: 'authentication',
        enabled: true,
        schedule: {
          type: 'realtime',
          timeWindow: 'sliding-15m',
        },
        suppression: {
          enabled: true,
          duration: 300,
          maxAlerts: 5,
          fields: ['source_ip', 'username'],
        },
        escalation: {
          enabled: true,
          levels: [
            {
              id: 'level-1',
              level: 1,
              delayMinutes: 5,
              condition: 'unacknowledged',
              actions: [
                {
                  id: 'action-1',
                  type: 'email',
                  name: 'SOC Team Notification',
                  config: { recipients: ['soc@company.com'] },
                  enabled: true,
                  failurePolicy: 'retry',
                  retryCount: 3,
                },
              ],
            },
            {
              id: 'level-2',
              level: 2,
              delayMinutes: 15,
              condition: 'unacknowledged',
              actions: [
                {
                  id: 'action-2',
                  type: 'webhook',
                  name: 'Security Manager Alert',
                  config: { url: 'https://api.pagerduty.com/incidents' },
                  enabled: true,
                  failurePolicy: 'escalate',
                },
              ],
            },
          ],
        },
        throttling: {
          enabled: true,
          maxAlertsPerHour: 20,
          suppressDuplicates: true,
        },
        correlation: {
          enabled: true,
          correlationKey: 'authentication_anomaly',
          windowSize: 900,
        },
        actions: [],
        createdAt: new Date('2024-01-15'),
        modifiedAt: new Date('2024-06-01'),
        lastTriggered: new Date(Date.now() - 1800000),
        triggerCount: 45,
      },
      {
        id: 'config-2',
        name: 'Privilege Escalation Monitor',
        description: 'Real-time monitoring for privilege escalation attempts',
        category: 'endpoint',
        enabled: true,
        schedule: {
          type: 'realtime',
          timeWindow: 'streaming',
        },
        suppression: {
          enabled: false,
          duration: 0,
          maxAlerts: 0,
          fields: [],
        },
        escalation: {
          enabled: true,
          levels: [
            {
              id: 'level-1',
              level: 1,
              delayMinutes: 0,
              condition: 'time_based',
              actions: [
                {
                  id: 'action-1',
                  type: 'ticket',
                  name: 'Create Security Incident',
                  config: {
                    system: 'ServiceNow',
                    priority: 'P1',
                    category: 'Security Incident',
                  },
                  enabled: true,
                  failurePolicy: 'retry',
                  retryCount: 5,
                },
              ],
            },
          ],
        },
        throttling: {
          enabled: false,
          maxAlertsPerHour: 0,
          suppressDuplicates: false,
        },
        correlation: {
          enabled: true,
          correlationKey: 'privilege_escalation',
          windowSize: 300,
        },
        actions: [],
        createdAt: new Date('2024-02-20'),
        modifiedAt: new Date('2024-06-02'),
        lastTriggered: new Date(Date.now() - 3600000),
        triggerCount: 12,
      },
    ];
    setConfigurations(sampleConfigs);
  }, []);

  const filteredConfigs = configurations.filter((config) => {
    const matchesCategory =
      filterCategory === 'all' || config.category === filterCategory;
    const matchesSearch =
      searchQuery === '' ||
      config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const DenseConfigTable = () => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-8 p-2">
              <input type="checkbox" className="rounded" />
            </TableHead>
            <TableHead className="p-2 font-medium">NAME</TableHead>
            <TableHead className="p-2 font-medium">CATEGORY</TableHead>
            <TableHead className="p-2 font-medium">STATUS</TableHead>
            <TableHead className="p-2 font-medium">SCHEDULE</TableHead>
            <TableHead className="p-2 font-medium">TRIGGERED</TableHead>
            <TableHead className="p-2 font-medium">SUPPRESSION</TableHead>
            <TableHead className="p-2 font-medium">ESCALATION</TableHead>
            <TableHead className="p-2 font-medium">CORRELATION</TableHead>
            <TableHead className="p-2 font-medium">LAST MODIFIED</TableHead>
            <TableHead className="p-2 font-medium">ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredConfigs.map((config) => (
            <TableRow
              key={config.id}
              className="text-xs hover:bg-muted/50 cursor-pointer border-b"
              onClick={() => setSelectedConfig(config)}
            >
              <TableCell className="p-2">
                <input type="checkbox" className="rounded" />
              </TableCell>
              <TableCell className="p-2">
                <div className="text-blue-600 hover:underline max-w-40 truncate font-medium">
                  {config.name}
                </div>
                <div className="text-muted-foreground text-xs truncate max-w-40">
                  {config.description}
                </div>
              </TableCell>
              <TableCell className="p-2">
                <Badge
                  variant="outline"
                  className="text-xs px-1 py-0 h-5 capitalize"
                >
                  {config.category.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="p-2">
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-gray-400'}`}
                  />
                  <span>{config.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </TableCell>
              <TableCell className="p-2">
                <Badge
                  variant="outline"
                  className={`text-xs px-1 py-0 h-5 ${
                    config.schedule.type === 'realtime'
                      ? 'border-blue-200 text-blue-700 bg-blue-50'
                      : 'border-gray-200 text-gray-700 bg-gray-50'
                  }`}
                >
                  {config.schedule.type === 'realtime'
                    ? 'REAL-TIME'
                    : 'SCHEDULED'}
                </Badge>
              </TableCell>
              <TableCell className="p-2">{config.triggerCount}</TableCell>
              <TableCell className="p-2">
                <Badge
                  variant="outline"
                  className={`text-xs px-1 py-0 h-5 ${
                    config.suppression.enabled
                      ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                      : 'border-gray-200 text-gray-700 bg-gray-50'
                  }`}
                >
                  {config.suppression.enabled ? 'ACTIVE' : 'DISABLED'}
                </Badge>
              </TableCell>
              <TableCell className="p-2">
                <Badge
                  variant="outline"
                  className={`text-xs px-1 py-0 h-5 ${
                    config.escalation.enabled
                      ? 'border-orange-200 text-orange-700 bg-orange-50'
                      : 'border-gray-200 text-gray-700 bg-gray-50'
                  }`}
                >
                  {config.escalation.enabled
                    ? `${config.escalation.levels.length} LEVELS`
                    : 'DISABLED'}
                </Badge>
              </TableCell>
              <TableCell className="p-2">
                <Badge
                  variant="outline"
                  className={`text-xs px-1 py-0 h-5 ${
                    config.correlation.enabled
                      ? 'border-purple-200 text-purple-700 bg-purple-50'
                      : 'border-gray-200 text-gray-700 bg-gray-50'
                  }`}
                >
                  {config.correlation.enabled ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </TableCell>
              <TableCell className="p-2">
                {config.modifiedAt
                  .toISOString()
                  .split('T')[0]
                  .replace(/-/g, '') +
                  'T' +
                  config.modifiedAt
                    .toTimeString()
                    .split(' ')[0]
                    .replace(/:/g, '')}
              </TableCell>
              <TableCell className="p-2">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const ConfigurationsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Active Configs
              </p>
              <p className="text-2xl font-bold">
                {configurations.filter((c) => c.enabled).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                With Escalation
              </p>
              <p className="text-2xl font-bold">
                {configurations.filter((c) => c.escalation.enabled).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Pause className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Suppressed</p>
              <p className="text-2xl font-bold">
                {configurations.filter((c) => c.suppression.enabled).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Real-time</p>
              <p className="text-2xl font-bold">
                {
                  configurations.filter((c) => c.schedule.type === 'realtime')
                    .length
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ConfigurationsList = () => (
    <div>
      {/* Filters Bar */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Badge
          variant="outline"
          className="text-xs bg-blue-50 border-blue-200 text-blue-700"
        >
          Category = Authentication
        </Badge>
        <span className="text-xs text-muted-foreground">×</span>
        <Badge
          variant="outline"
          className="text-xs bg-green-50 border-green-200 text-green-700"
        >
          Status = Enabled
        </Badge>
        <span className="text-xs text-muted-foreground">×</span>
        <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
          Clear All
        </Button>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Showing:</span>
          <Select defaultValue="all">
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Configs</SelectItem>
              <SelectItem value="enabled">Enabled Only</SelectItem>
              <SelectItem value="disabled">Disabled Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
            <Upload className="h-3 w-3 mr-1" />
            Import
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setIsEditOpen(true)}
          >
            <Settings className="h-3 w-3 mr-1" />
            New Config
          </Button>
        </div>
      </div>

      {/* Dense Table */}
      <DenseConfigTable />
    </div>
  );

  const EscalationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Escalation Policies</CardTitle>
          <CardDescription>
            Configure multi-level escalation for critical alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="escalation-enabled">Enable Escalation</Label>
              <Switch id="escalation-enabled" defaultChecked />
            </div>
            <div className="space-y-3">
              <Label>Escalation Levels</Label>
              <div className="space-y-3">
                {[1, 2, 3].map((level) => (
                  <Card key={level} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">Level {level}</span>
                      <Switch defaultChecked={level <= 2} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <Label>Delay (minutes)</Label>
                        <Input
                          type="number"
                          defaultValue={
                            level === 1 ? '5' : level === 2 ? '15' : '30'
                          }
                        />
                      </div>
                      <div>
                        <Label>Condition</Label>
                        <Select defaultValue="unacknowledged">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unacknowledged">
                              Unacknowledged
                            </SelectItem>
                            <SelectItem value="unresolved">
                              Unresolved
                            </SelectItem>
                            <SelectItem value="time_based">
                              Time Based
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const SuppressionSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alert Suppression</CardTitle>
          <CardDescription>
            Reduce alert noise with intelligent suppression
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="suppression-enabled">Enable Suppression</Label>
              <Switch id="suppression-enabled" defaultChecked />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="suppression-duration">
                  Suppression Duration (seconds)
                </Label>
                <Input
                  id="suppression-duration"
                  type="number"
                  defaultValue="300"
                />
              </div>
              <div>
                <Label htmlFor="max-alerts">Max Alerts in Window</Label>
                <Input id="max-alerts" type="number" defaultValue="5" />
              </div>
            </div>
            <div>
              <Label htmlFor="suppression-fields">Suppression Fields</Label>
              <Input
                id="suppression-fields"
                placeholder="source_ip, username, event_id"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fields to group alerts by for suppression (comma-separated)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Throttling</CardTitle>
          <CardDescription>Control alert volume and frequency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="throttling-enabled">Enable Throttling</Label>
              <Switch id="throttling-enabled" defaultChecked />
            </div>
            <div>
              <Label htmlFor="max-per-hour">Maximum Alerts per Hour</Label>
              <div className="mt-2">
                <Slider
                  defaultValue={[50]}
                  max={200}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>50 alerts/hour</span>
                  <span>200</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="suppress-duplicates">
                Suppress Duplicate Alerts
              </Label>
              <Switch id="suppress-duplicates" defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const CorrelationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alert Correlation</CardTitle>
          <CardDescription>Group related alerts into incidents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="correlation-enabled">Enable Correlation</Label>
              <Switch id="correlation-enabled" defaultChecked />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="correlation-key">Correlation Key</Label>
                <Input
                  id="correlation-key"
                  placeholder="e.g., attack_campaign, incident_type"
                />
              </div>
              <div>
                <Label htmlFor="correlation-window">
                  Time Window (seconds)
                </Label>
                <Input
                  id="correlation-window"
                  type="number"
                  defaultValue="900"
                />
              </div>
            </div>
            <div>
              <Label>Correlation Rules</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">
                    Group by source IP and attack type
                  </span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">
                    Correlate failed logins with privilege escalation
                  </span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">
                    Link network anomalies with endpoint alerts
                  </span>
                  <Switch />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const GlobalSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Global Alert Processing</CardTitle>
          <CardDescription>
            System-wide alert configuration settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="global-enabled">Enable Alert Processing</Label>
              <Switch id="global-enabled" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
              <Switch id="maintenance-mode" />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="processing-threads">Processing Threads</Label>
                <Input id="processing-threads" type="number" defaultValue="4" />
              </div>
              <div>
                <Label htmlFor="queue-size">Alert Queue Size</Label>
                <Input id="queue-size" type="number" defaultValue="1000" />
              </div>
            </div>
            <div>
              <Label htmlFor="retention-days">Alert Retention (days)</Label>
              <Input id="retention-days" type="number" defaultValue="90" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Settings</CardTitle>
          <CardDescription>
            Configure external system integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Email Configuration</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="SMTP Server" />
                <Input placeholder="Port" type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Username" />
                <Input placeholder="Password" type="password" />
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label>Webhook Settings</Label>
              <Input placeholder="Default Webhook URL" />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Timeout (seconds)"
                  type="number"
                  defaultValue="30"
                />
                <Input
                  placeholder="Retry Attempts"
                  type="number"
                  defaultValue="3"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 max-w-full">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-6 h-8">
          <TabsTrigger value="overview" className="text-xs">
            OVERVIEW
          </TabsTrigger>
          <TabsTrigger value="escalation" className="text-xs">
            ESCALATION
          </TabsTrigger>
          <TabsTrigger value="suppression" className="text-xs">
            SUPPRESSION
          </TabsTrigger>
          <TabsTrigger value="correlation" className="text-xs">
            CORRELATION
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">
            ACTIONS
          </TabsTrigger>
          <TabsTrigger value="global" className="text-xs">
            GLOBAL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <ConfigurationsList />
        </TabsContent>

        <TabsContent value="escalation" className="space-y-3">
          <EscalationSettings />
        </TabsContent>

        <TabsContent value="suppression" className="space-y-3">
          <SuppressionSettings />
        </TabsContent>

        <TabsContent value="correlation" className="space-y-3">
          <CorrelationSettings />
        </TabsContent>

        <TabsContent value="actions" className="space-y-3">
          <AlertActionManager />
        </TabsContent>

        <TabsContent value="global" className="space-y-3">
          <GlobalSettings />
        </TabsContent>
      </Tabs>

      {/* Configuration Detail Modal */}
      {selectedConfig && (
        <Dialog
          open={!!selectedConfig}
          onOpenChange={() => setSelectedConfig(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span>{selectedConfig.name}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedConfig.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Category
                  </Label>
                  <Badge variant="outline" className="capitalize mt-1">
                    {selectedConfig.category.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Status
                  </Label>
                  <Badge
                    variant={selectedConfig.enabled ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {selectedConfig.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Schedule Type
                  </Label>
                  <p className="text-sm mt-1 capitalize">
                    {selectedConfig.schedule.type}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Time Window
                  </Label>
                  <p className="text-sm mt-1">
                    {selectedConfig.schedule.timeWindow}
                  </p>
                </div>
              </div>

              {selectedConfig.suppression.enabled && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Suppression Settings
                  </Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded border">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="font-medium">Duration:</span>{' '}
                        {selectedConfig.suppression.duration}s
                      </div>
                      <div>
                        <span className="font-medium">Max Alerts:</span>{' '}
                        {selectedConfig.suppression.maxAlerts}
                      </div>
                      <div>
                        <span className="font-medium">Fields:</span>{' '}
                        {selectedConfig.suppression.fields.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedConfig.escalation.enabled && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Escalation Levels
                  </Label>
                  <div className="mt-2 space-y-2">
                    {selectedConfig.escalation.levels.map((level) => (
                      <div key={level.id} className="p-3 border rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            Level {level.level}
                          </span>
                          <Badge variant="outline">{level.condition}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Triggers after {level.delayMinutes} minutes with{' '}
                          {level.actions.length} action(s)
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedConfig(null)}>
                Close
              </Button>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
