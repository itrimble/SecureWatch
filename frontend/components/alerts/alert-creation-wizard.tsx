'use client'

import React, { useState } from 'react'
import { Search, Clock, Bell, Mail, Webhook, FileText, Settings, Play, TestTube, Save, ArrowLeft, ArrowRight, Check, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AlertCreationWizardProps {
  isOpen: boolean
  onClose: () => void
  onSave: (alert: any) => void
}

interface AlertFormData {
  title: string
  description: string
  query: string
  severity: string
  schedule: {
    type: 'realtime' | 'scheduled'
    cron?: string
    interval?: number
    timeRange: string
  }
  conditions: {
    threshold: number
    operator: string
    field: string
  }
  actions: any[]
  tags: string[]
}

export function AlertCreationWizard({ isOpen, onClose, onSave }: AlertCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<AlertFormData>({
    title: '',
    description: '',
    query: '',
    severity: 'medium',
    schedule: {
      type: 'scheduled',
      timeRange: 'last 15 minutes'
    },
    conditions: {
      threshold: 1,
      operator: 'greater',
      field: 'count'
    },
    actions: [],
    tags: []
  })
  const [testResults, setTestResults] = useState<any>(null)
  const [isTestingQuery, setIsTestingQuery] = useState(false)

  const steps = [
    { id: 1, title: 'Basic Information', description: 'Alert name and description' },
    { id: 2, title: 'KQL Query', description: 'Define the search query' },
    { id: 3, title: 'Schedule & Conditions', description: 'When and how to trigger' },
    { id: 4, title: 'Actions', description: 'What happens when triggered' },
    { id: 5, title: 'Review & Test', description: 'Validate and save' }
  ]

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleTestQuery = async () => {
    setIsTestingQuery(true)
    // Simulate API call
    setTimeout(() => {
      setTestResults({
        resultCount: 42,
        executionTime: 1.2,
        sample: [
          { timestamp: '2024-06-05T10:30:00Z', source_ip: '192.168.1.100', event_id: '4625', count: 8 },
          { timestamp: '2024-06-05T10:25:00Z', source_ip: '10.0.0.50', event_id: '4625', count: 6 },
          { timestamp: '2024-06-05T10:20:00Z', source_ip: '172.16.0.25', event_id: '4625', count: 12 }
        ]
      })
      setIsTestingQuery(false)
    }, 2000)
  }

  const handleSave = () => {
    const newAlert = {
      id: `alert-${Date.now()}`,
      ...formData,
      status: 'enabled',
      triggeredCount: 0,
      createdBy: 'current_user',
      createdAt: new Date(),
      modifiedAt: new Date(),
      lastRun: null,
      nextRun: formData.schedule.type === 'scheduled' ? new Date(Date.now() + 300000) : null
    }
    onSave(newAlert)
    onClose()
  }

  const addAction = (type: string) => {
    const newAction = {
      id: `action-${Date.now()}`,
      type,
      config: {},
      enabled: true
    }
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }))
  }

  const removeAction = (actionId: string) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter(a => a.id !== actionId)
    }))
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Alert Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Failed Login Attempts"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this alert detects..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="severity">Severity Level</Label>
              <Select value={formData.severity} onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value.split(', ').filter(t => t.trim()) }))}
                placeholder="e.g., authentication, security, brute-force"
                className="mt-1"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="query">KQL Query *</Label>
              <Textarea
                id="query"
                value={formData.query}
                onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                placeholder="Enter your KQL query here..."
                className="mt-1 font-mono"
                rows={8}
              />
              <p className="text-sm text-gray-500 mt-1">
                Write a KQL query that will return results when the alert condition is met.
              </p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleTestQuery} disabled={!formData.query || isTestingQuery}>
                <TestTube className="h-4 w-4 mr-2" />
                {isTestingQuery ? 'Testing...' : 'Test Query'}
              </Button>
              <Button variant="outline">
                <Info className="h-4 w-4 mr-2" />
                KQL Reference
              </Button>
            </div>
            {testResults && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  Query executed successfully! Found {testResults.resultCount} results in {testResults.executionTime}s
                </AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Schedule Type</Label>
              <div className="mt-2 space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="realtime"
                    name="schedule"
                    checked={formData.schedule.type === 'realtime'}
                    onChange={() => setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, type: 'realtime' } }))}
                  />
                  <label htmlFor="realtime" className="text-sm">Real-time (continuous)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="scheduled"
                    name="schedule"
                    checked={formData.schedule.type === 'scheduled'}
                    onChange={() => setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, type: 'scheduled' } }))}
                  />
                  <label htmlFor="scheduled" className="text-sm">Scheduled (periodic)</label>
                </div>
              </div>
            </div>

            {formData.schedule.type === 'scheduled' && (
              <div>
                <Label htmlFor="interval">Run Every</Label>
                <Select 
                  value={formData.schedule.interval?.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    schedule: { ...prev.schedule, interval: parseInt(value) }
                  }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="360">6 hours</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="timeRange">Time Range</Label>
              <Select 
                value={formData.schedule.timeRange} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  schedule: { ...prev.schedule, timeRange: value }
                }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last 5 minutes">Last 5 minutes</SelectItem>
                  <SelectItem value="last 15 minutes">Last 15 minutes</SelectItem>
                  <SelectItem value="last 30 minutes">Last 30 minutes</SelectItem>
                  <SelectItem value="last 1 hour">Last 1 hour</SelectItem>
                  <SelectItem value="last 6 hours">Last 6 hours</SelectItem>
                  <SelectItem value="last 24 hours">Last 24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-medium">Alert Conditions</Label>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="field">Field</Label>
                  <Input
                    id="field"
                    value={formData.conditions.field}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      conditions: { ...prev.conditions, field: e.target.value }
                    }))}
                    placeholder="count"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="operator">Operator</Label>
                  <Select 
                    value={formData.conditions.operator} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      conditions: { ...prev.conditions, operator: value }
                    }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greater">Greater than</SelectItem>
                      <SelectItem value="less">Less than</SelectItem>
                      <SelectItem value="equal">Equal to</SelectItem>
                      <SelectItem value="not_equal">Not equal to</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="threshold">Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={formData.conditions.threshold}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      conditions: { ...prev.conditions, threshold: parseInt(e.target.value) || 0 }
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Alert Actions</Label>
              <p className="text-sm text-gray-500 mt-1">Choose what happens when this alert is triggered</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button variant="outline" onClick={() => addAction('email')} className="h-20 flex-col">
                <Mail className="h-6 w-6 mb-2" />
                Email
              </Button>
              <Button variant="outline" onClick={() => addAction('webhook')} className="h-20 flex-col">
                <Webhook className="h-6 w-6 mb-2" />
                Webhook
              </Button>
              <Button variant="outline" onClick={() => addAction('ticket')} className="h-20 flex-col">
                <FileText className="h-6 w-6 mb-2" />
                Create Ticket
              </Button>
            </div>

            {formData.actions.length > 0 && (
              <div className="space-y-3">
                <Label>Configured Actions</Label>
                {formData.actions.map((action, index) => (
                  <Card key={action.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {action.type === 'email' && <Mail className="h-4 w-4" />}
                          {action.type === 'webhook' && <Webhook className="h-4 w-4" />}
                          {action.type === 'ticket' && <FileText className="h-4 w-4" />}
                          <span className="capitalize">{action.type} Action</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch defaultChecked />
                          <Button variant="ghost" size="sm" onClick={() => removeAction(action.id)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Review your alert configuration before saving. The alert will be enabled by default.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{formData.title}</CardTitle>
                  <CardDescription>{formData.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Severity:</span>
                      <Badge className="ml-2 capitalize">{formData.severity}</Badge>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Schedule:</span>
                      <span className="ml-2 capitalize">{formData.schedule.type}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Time Range:</span>
                      <span className="ml-2">{formData.schedule.timeRange}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Actions:</span>
                      <span className="ml-2">{formData.actions.length} configured</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label className="text-sm font-medium text-gray-500">KQL Query</Label>
                <Textarea
                  value={formData.query}
                  readOnly
                  className="mt-1 font-mono text-sm"
                  rows={4}
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() !== ''
      case 2:
        return formData.query.trim() !== ''
      case 3:
        return true
      case 4:
        return true
      case 5:
        return true
      default:
        return false
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Alert</DialogTitle>
          <DialogDescription>
            Set up a new security alert with KQL-powered detection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${currentStep >= step.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    w-16 h-0.5 mx-2
                    ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <h3 className="text-lg font-medium">{steps[currentStep - 1].title}</h3>
            <p className="text-sm text-gray-500">{steps[currentStep - 1].description}</p>
          </div>

          <Progress value={(currentStep / steps.length) * 100} className="w-full" />

          {/* Step Content */}
          <div className="min-h-[400px]">
            {renderStep()}
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              
              {currentStep < steps.length ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={!canProceed()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}