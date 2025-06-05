'use client'

import React, { useState } from 'react'
import { Mail, Webhook, FileText, Phone, Database, Code, Slack, MessageCircle, AlertTriangle, Settings, Plus, Edit, Trash2, TestTube, Copy, RefreshCw, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AlertAction {
  id: string
  name: string
  type: 'email' | 'webhook' | 'ticket' | 'sms' | 'script' | 'slack' | 'teams' | 'database'
  description: string
  enabled: boolean
  config: any
  failurePolicy: 'ignore' | 'retry' | 'escalate'
  retryCount: number
  timeout: number
  lastRun?: Date
  successCount: number
  failureCount: number
  tags: string[]
}

interface ActionTemplate {
  id: string
  name: string
  type: string
  description: string
  configSchema: any
  icon: React.ComponentType<any>
}

export function AlertActionManager() {
  const [actions, setActions] = useState<AlertAction[]>([])
  const [selectedAction, setSelectedAction] = useState<AlertAction | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isTestOpen, setIsTestOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('actions')
  const [testResults, setTestResults] = useState<any>(null)

  // Action templates
  const actionTemplates: ActionTemplate[] = [
    {
      id: 'email',
      name: 'Email Notification',
      type: 'email',
      description: 'Send email alerts to specified recipients',
      icon: Mail,
      configSchema: {
        recipients: { type: 'array', required: true },
        subject: { type: 'string', required: true },
        template: { type: 'string', required: false },
        smtpServer: { type: 'string', required: false }
      }
    },
    {
      id: 'webhook',
      name: 'Webhook',
      type: 'webhook',
      description: 'Send HTTP POST requests to external systems',
      icon: Webhook,
      configSchema: {
        url: { type: 'string', required: true },
        method: { type: 'string', required: false },
        headers: { type: 'object', required: false },
        payload: { type: 'string', required: false }
      }
    },
    {
      id: 'ticket',
      name: 'Create Ticket',
      type: 'ticket',
      description: 'Create tickets in ITSM systems (ServiceNow, Jira)',
      icon: FileText,
      configSchema: {
        system: { type: 'string', required: true },
        project: { type: 'string', required: true },
        priority: { type: 'string', required: true },
        assignee: { type: 'string', required: false }
      }
    },
    {
      id: 'slack',
      name: 'Slack Message',
      type: 'slack',
      description: 'Send messages to Slack channels',
      icon: Slack,
      configSchema: {
        webhook: { type: 'string', required: true },
        channel: { type: 'string', required: true },
        username: { type: 'string', required: false },
        template: { type: 'string', required: false }
      }
    },
    {
      id: 'sms',
      name: 'SMS Alert',
      type: 'sms',
      description: 'Send SMS notifications via Twilio or similar',
      icon: Phone,
      configSchema: {
        provider: { type: 'string', required: true },
        recipients: { type: 'array', required: true },
        message: { type: 'string', required: true }
      }
    },
    {
      id: 'script',
      name: 'Custom Script',
      type: 'script',
      description: 'Execute custom scripts or commands',
      icon: Code,
      configSchema: {
        scriptPath: { type: 'string', required: true },
        arguments: { type: 'array', required: false },
        environment: { type: 'object', required: false },
        workingDirectory: { type: 'string', required: false }
      }
    },
    {
      id: 'database',
      name: 'Database Insert',
      type: 'database',
      description: 'Insert alert data into external databases',
      icon: Database,
      configSchema: {
        connectionString: { type: 'string', required: true },
        table: { type: 'string', required: true },
        mapping: { type: 'object', required: true }
      }
    }
  ]

  // Sample actions
  React.useEffect(() => {
    const sampleActions: AlertAction[] = [
      {
        id: 'action-1',
        name: 'SOC Team Email',
        type: 'email',
        description: 'Primary notification to SOC team',
        enabled: true,
        config: {
          recipients: ['soc@company.com', 'security-alerts@company.com'],
          subject: 'Security Alert: {{alert.title}}',
          template: 'security-alert-template',
          smtpServer: 'smtp.company.com'
        },
        failurePolicy: 'retry',
        retryCount: 3,
        timeout: 30,
        lastRun: new Date(Date.now() - 1800000),
        successCount: 245,
        failureCount: 3,
        tags: ['primary', 'email', 'soc']
      },
      {
        id: 'action-2',
        name: 'PagerDuty Integration',
        type: 'webhook',
        description: 'Create incidents in PagerDuty',
        enabled: true,
        config: {
          url: 'https://events.pagerduty.com/v2/enqueue',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Token token={{secrets.pagerduty_token}}'
          },
          payload: JSON.stringify({
            routing_key: '{{config.routing_key}}',
            event_action: 'trigger',
            payload: {
              summary: '{{alert.title}}',
              severity: '{{alert.severity}}',
              source: 'SecureWatch SIEM'
            }
          })
        },
        failurePolicy: 'escalate',
        retryCount: 5,
        timeout: 15,
        lastRun: new Date(Date.now() - 900000),
        successCount: 89,
        failureCount: 1,
        tags: ['critical', 'webhook', 'pagerduty']
      },
      {
        id: 'action-3',
        name: 'Security Slack Channel',
        type: 'slack',
        description: 'Post to #security-alerts channel',
        enabled: true,
        config: {
          webhook: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
          channel: '#security-alerts',
          username: 'SecureWatch Bot',
          template: 'slack-security-alert'
        },
        failurePolicy: 'ignore',
        retryCount: 2,
        timeout: 10,
        lastRun: new Date(Date.now() - 300000),
        successCount: 156,
        failureCount: 8,
        tags: ['notification', 'slack', 'team']
      }
    ]
    setActions(sampleActions)
  }, [])

  const handleTestAction = async (action: AlertAction) => {
    setIsTestOpen(true)
    // Simulate testing
    setTimeout(() => {
      setTestResults({
        success: Math.random() > 0.2,
        responseTime: Math.floor(Math.random() * 1000) + 100,
        response: action.type === 'email' ? 'Email sent successfully' : 
                 action.type === 'webhook' ? 'HTTP 200 OK' :
                 action.type === 'slack' ? 'Message posted to channel' :
                 'Action executed successfully',
        timestamp: new Date()
      })
    }, 2000)
  }

  const ActionCard = ({ action }: { action: AlertAction }) => {
    const template = actionTemplates.find(t => t.type === action.type)
    const IconComponent = template?.icon || AlertTriangle
    
    return (
      <Card className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <IconComponent className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">{action.name}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={action.enabled ? 'default' : 'secondary'}>
                {action.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {action.type}
              </Badge>
            </div>
          </div>
          <CardDescription className="text-sm text-gray-600 mt-1">
            {action.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <span className="font-medium text-gray-500">Success Rate:</span>
              <div className="mt-1">
                <span className="text-green-600">
                  {Math.round((action.successCount / (action.successCount + action.failureCount)) * 100)}%
                </span>
                <span className="text-gray-400 ml-1">
                  ({action.successCount}/{action.successCount + action.failureCount})
                </span>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-500">Failure Policy:</span>
              <div className="mt-1 capitalize">{action.failurePolicy}</div>
            </div>
            <div>
              <span className="font-medium text-gray-500">Timeout:</span>
              <div className="mt-1">{action.timeout}s</div>
            </div>
            <div>
              <span className="font-medium text-gray-500">Last Run:</span>
              <div className="mt-1">
                {action.lastRun ? action.lastRun.toLocaleTimeString() : 'Never'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {action.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={() => handleTestAction(action)}>
                <TestTube className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedAction(action)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const ActionTemplateGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {actionTemplates.map(template => {
        const IconComponent = template.icon
        return (
          <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 bg-blue-50 rounded-lg w-fit">
                <IconComponent className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Action
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  const ActionMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Actions</p>
              <p className="text-2xl font-bold">{actions.filter(a => a.enabled).length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Executions</p>
              <p className="text-2xl font-bold">
                {actions.reduce((sum, a) => sum + a.successCount + a.failureCount, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <p className="text-2xl font-bold">
                {Math.round((actions.reduce((sum, a) => sum + a.successCount, 0) / 
                actions.reduce((sum, a) => sum + a.successCount + a.failureCount, 0)) * 100)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Failed Actions</p>
              <p className="text-2xl font-bold">
                {actions.reduce((sum, a) => sum + a.failureCount, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Alert Actions</h1>
          <p className="text-gray-600 mt-1">Manage and configure alert action responses</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Action
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="actions">My Actions</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-6">
          <ActionMetrics />
          <div className="space-y-4">
            {actions.map(action => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">Action Templates</h2>
            <p className="text-gray-600">Choose from pre-built action templates to get started quickly</p>
          </div>
          <ActionTemplateGrid />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Action Execution History</CardTitle>
              <CardDescription>Recent action executions and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Executed</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Alert</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map(action => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">{action.name}</TableCell>
                      <TableCell className="capitalize">{action.type}</TableCell>
                      <TableCell>{action.lastRun?.toLocaleString() || 'Never'}</TableCell>
                      <TableCell>
                        <Badge variant="default">Success</Badge>
                      </TableCell>
                      <TableCell>{Math.floor(Math.random() * 500) + 100}ms</TableCell>
                      <TableCell>Failed Login Alert #4625</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Results Modal */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Action Test Results</DialogTitle>
            <DialogDescription>Results from testing the alert action</DialogDescription>
          </DialogHeader>
          {testResults && (
            <div className="space-y-4">
              <Alert>
                {testResults.success ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <AlertDescription>
                  {testResults.success ? 'Action executed successfully' : 'Action failed to execute'}
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Response Time</Label>
                  <p>{testResults.responseTime}ms</p>
                </div>
                <div>
                  <Label>Timestamp</Label>
                  <p>{testResults.timestamp?.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <Label>Response</Label>
                <p className="text-sm bg-gray-50 p-2 rounded border">{testResults.response}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsTestOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}