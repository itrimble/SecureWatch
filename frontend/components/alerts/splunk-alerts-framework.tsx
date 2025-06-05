'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, Bell, Clock, Search, Settings, Play, Pause, Calendar, Mail, Webhook, Database, FileText, CheckCircle, XCircle, AlertCircle, Filter, RefreshCw, Plus, Edit, Trash2, Eye, Copy, Download, Upload } from 'lucide-react'
import { AlertCreationWizard } from './alert-creation-wizard'
import { AlertConfigurationManager } from './alert-configuration-manager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

interface Alert {
  id: string
  title: string
  description: string
  query: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'enabled' | 'disabled' | 'suppressed'
  schedule: {
    type: 'realtime' | 'scheduled'
    cron?: string
    interval?: number
    timeRange: string
  }
  conditions: {
    threshold: number
    operator: 'greater' | 'less' | 'equal' | 'not_equal'
    field?: string
  }
  actions: AlertAction[]
  lastRun?: Date
  nextRun?: Date
  triggeredCount: number
  createdBy: string
  createdAt: Date
  modifiedAt: Date
  tags: string[]
}

interface AlertAction {
  id: string
  type: 'email' | 'webhook' | 'ticket' | 'script' | 'dashboard'
  config: any
  enabled: boolean
}

interface AlertHistory {
  id: string
  alertId: string
  triggeredAt: Date
  severity: string
  resultCount: number
  message: string
  status: 'fired' | 'resolved' | 'suppressed'
  duration: number
}

export function SplunkAlertsFramework() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([])
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [isCreateAlertOpen, setIsCreateAlertOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('alerts')

  // Sample data
  useEffect(() => {
    const sampleAlerts: Alert[] = [
      {
        id: 'alert-1',
        title: 'Failed Login Attempts',
        description: 'Monitor for multiple failed login attempts from same source',
        query: 'event_id:4625 | stats count by source_ip | where count > 5',
        severity: 'high',
        status: 'enabled',
        schedule: {
          type: 'scheduled',
          cron: '*/5 * * * *',
          timeRange: 'last 15 minutes'
        },
        conditions: {
          threshold: 5,
          operator: 'greater',
          field: 'count'
        },
        actions: [
          {
            id: 'action-1',
            type: 'email',
            config: { recipients: ['security@company.com'], subject: 'High Alert: Multiple Failed Logins' },
            enabled: true
          }
        ],
        lastRun: new Date(Date.now() - 300000),
        nextRun: new Date(Date.now() + 300000),
        triggeredCount: 12,
        createdBy: 'security_admin',
        createdAt: new Date('2024-01-15'),
        modifiedAt: new Date('2024-06-01'),
        tags: ['authentication', 'security', 'brute-force']
      },
      {
        id: 'alert-2',
        title: 'Privilege Escalation Detection',
        description: 'Detect potential privilege escalation activities',
        query: 'event_id:4672 OR event_id:4648 | stats count by user, process | where count > 10',
        severity: 'critical',
        status: 'enabled',
        schedule: {
          type: 'realtime',
          timeRange: 'last 1 hour'
        },
        conditions: {
          threshold: 10,
          operator: 'greater',
          field: 'count'
        },
        actions: [
          {
            id: 'action-2',
            type: 'webhook',
            config: { url: 'https://api.slack.com/webhooks/security', method: 'POST' },
            enabled: true
          },
          {
            id: 'action-3',
            type: 'ticket',
            config: { system: 'ServiceNow', priority: 'P1' },
            enabled: true
          }
        ],
        lastRun: new Date(Date.now() - 60000),
        nextRun: new Date(Date.now() + 60000),
        triggeredCount: 3,
        createdBy: 'soc_analyst',
        createdAt: new Date('2024-02-20'),
        modifiedAt: new Date('2024-06-02'),
        tags: ['privilege-escalation', 'critical', 'windows']
      },
      {
        id: 'alert-3',
        title: 'Suspicious Network Activity',
        description: 'Monitor for unusual network connections',
        query: 'source_type:network | stats sum(bytes_out) as total_bytes by dest_ip | where total_bytes > 1000000000',
        severity: 'medium',
        status: 'disabled',
        schedule: {
          type: 'scheduled',
          cron: '0 */6 * * *',
          timeRange: 'last 6 hours'
        },
        conditions: {
          threshold: 1000000000,
          operator: 'greater',
          field: 'total_bytes'
        },
        actions: [
          {
            id: 'action-4',
            type: 'email',
            config: { recipients: ['network-team@company.com'] },
            enabled: true
          }
        ],
        lastRun: new Date(Date.now() - 21600000),
        nextRun: new Date(Date.now() + 21600000),
        triggeredCount: 8,
        createdBy: 'network_admin',
        createdAt: new Date('2024-03-10'),
        modifiedAt: new Date('2024-05-15'),
        tags: ['network', 'data-exfiltration', 'monitoring']
      }
    ]

    const sampleHistory: AlertHistory[] = [
      {
        id: 'hist-1',
        alertId: 'alert-1',
        triggeredAt: new Date(Date.now() - 1800000),
        severity: 'high',
        resultCount: 8,
        message: '8 failed login attempts detected from IP 192.168.1.100',
        status: 'fired',
        duration: 300
      },
      {
        id: 'hist-2',
        alertId: 'alert-2',
        triggeredAt: new Date(Date.now() - 3600000),
        severity: 'critical',
        resultCount: 15,
        message: 'Privilege escalation detected for user admin_svc',
        status: 'resolved',
        duration: 1200
      },
      {
        id: 'hist-3',
        alertId: 'alert-1',
        triggeredAt: new Date(Date.now() - 7200000),
        severity: 'high',
        resultCount: 6,
        message: '6 failed login attempts detected from IP 10.0.0.50',
        status: 'resolved',
        duration: 600
      }
    ]

    setAlerts(sampleAlerts)
    setAlertHistory(sampleHistory)
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled': return 'text-green-600 bg-green-50 border-green-200'
      case 'disabled': return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'suppressed': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity
    const matchesSearch = searchQuery === '' || 
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesStatus && matchesSeverity && matchesSearch
  })

  const AlertCard = ({ alert }: { alert: Alert }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedAlert(alert)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">{alert.title}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${getSeverityColor(alert.severity)} capitalize`}>
              {alert.severity}
            </Badge>
            <Badge className={`${getStatusColor(alert.status)} capitalize`}>
              {alert.status}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-sm text-gray-600 mt-1">
          {alert.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-500">Schedule:</span>
            <div className="flex items-center space-x-1 mt-1">
              <Clock className="h-3 w-3" />
              <span>{alert.schedule.type === 'realtime' ? 'Real-time' : 'Scheduled'}</span>
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-500">Triggered:</span>
            <div className="flex items-center space-x-1 mt-1">
              <Bell className="h-3 w-3" />
              <span>{alert.triggeredCount} times</span>
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-500">Last Run:</span>
            <div className="mt-1">
              <span>{alert.lastRun ? alert.lastRun.toLocaleTimeString() : 'Never'}</span>
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-500">Next Run:</span>
            <div className="mt-1">
              <span>{alert.nextRun ? alert.nextRun.toLocaleTimeString() : 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {alert.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const AlertsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Enabled Alerts</p>
              <p className="text-2xl font-bold">{alerts.filter(a => a.status === 'enabled').length}</p>
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
              <p className="text-sm font-medium text-gray-500">Critical Alerts</p>
              <p className="text-2xl font-bold">{alerts.filter(a => a.severity === 'critical').length}</p>
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
              <p className="text-sm font-medium text-gray-500">Triggered Today</p>
              <p className="text-2xl font-bold">{alertHistory.filter(h => h.triggeredAt.toDateString() === new Date().toDateString()).length}</p>
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
              <p className="text-2xl font-bold">{alerts.filter(a => a.status === 'suppressed').length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const AlertsList = () => (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search alerts by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setIsCreateAlertOpen(true)} className="whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" />
          New Alert
        </Button>
      </div>

      <div className="space-y-4">
        {filteredAlerts.map(alert => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  )

  const AlertHistory = () => (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Alert</TableHead>
            <TableHead>Triggered</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Results</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alertHistory.map((hist) => {
            const alert = alerts.find(a => a.id === hist.alertId)
            return (
              <TableRow key={hist.id}>
                <TableCell className="font-medium">{alert?.title}</TableCell>
                <TableCell>{hist.triggeredAt.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={`${getSeverityColor(hist.severity)} capitalize`}>
                    {hist.severity}
                  </Badge>
                </TableCell>
                <TableCell>{hist.resultCount}</TableCell>
                <TableCell>
                  <Badge variant={hist.status === 'fired' ? 'destructive' : hist.status === 'resolved' ? 'default' : 'secondary'}>
                    {hist.status}
                  </Badge>
                </TableCell>
                <TableCell>{Math.round(hist.duration / 60)}m</TableCell>
                <TableCell className="max-w-xs truncate">{hist.message}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )

  const handleCreateAlert = (newAlert: Alert) => {
    setAlerts(prev => [...prev, newAlert])
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Security Alerts</h1>
          <p className="text-gray-600 mt-1">Monitor and manage security alerts with KQL-powered detection</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="history">Alert History</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="settings">Alert Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-6">
          <AlertsOverview />
          <AlertsList />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <AlertHistory />
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <AlertConfigurationManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Global Alert Settings</CardTitle>
              <CardDescription>Configure global settings for alert processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-alerts">Enable Alert Processing</Label>
                  <Switch id="enable-alerts" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="alert-throttling">Alert Throttling</Label>
                  <Switch id="alert-throttling" defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-alerts">Maximum Alerts per Hour</Label>
                  <Input id="max-alerts" type="number" defaultValue="100" className="w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
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
                  <Label className="text-sm font-medium text-gray-500">Severity</Label>
                  <Badge className={`${getSeverityColor(selectedAlert.severity)} capitalize mt-1`}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge className={`${getStatusColor(selectedAlert.status)} capitalize mt-1`}>
                    {selectedAlert.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">KQL Query</Label>
                <Textarea
                  value={selectedAlert.query}
                  readOnly
                  className="mt-1 font-mono text-sm"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Schedule Type</Label>
                  <p className="text-sm mt-1 capitalize">{selectedAlert.schedule.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Time Range</Label>
                  <p className="text-sm mt-1">{selectedAlert.schedule.timeRange}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Alert Actions</Label>
                <div className="mt-2 space-y-2">
                  {selectedAlert.actions.map(action => (
                    <div key={action.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        {action.type === 'email' && <Mail className="h-4 w-4" />}
                        {action.type === 'webhook' && <Webhook className="h-4 w-4" />}
                        {action.type === 'ticket' && <FileText className="h-4 w-4" />}
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                Close
              </Button>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Alert
              </Button>
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
  )
}