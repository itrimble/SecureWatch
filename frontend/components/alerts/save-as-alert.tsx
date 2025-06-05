'use client'

import React, { useState } from 'react'
import { AlertTriangle, Save, Clock, Bell, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SaveAsAlertProps {
  searchQuery: string
  timeRange: string
  resultCount?: number
  onSave: (alert: any) => void
  trigger?: React.ReactNode
}

export function SaveAsAlert({ 
  searchQuery, 
  timeRange, 
  resultCount,
  onSave, 
  trigger 
}: SaveAsAlertProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    threshold: resultCount || 1,
    operator: 'greater',
    schedule: {
      type: 'scheduled' as 'scheduled' | 'realtime',
      interval: 15,
      timeRange: timeRange
    },
    actions: {
      email: true,
      emailRecipients: '',
      webhook: false,
      webhookUrl: ''
    }
  })

  const handleSave = () => {
    const newAlert = {
      id: `alert-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      query: searchQuery,
      severity: formData.severity,
      status: 'enabled',
      schedule: formData.schedule,
      conditions: {
        threshold: formData.threshold,
        operator: formData.operator,
        field: 'count'
      },
      actions: [
        ...(formData.actions.email ? [{
          id: `email-${Date.now()}`,
          type: 'email',
          config: { recipients: formData.actions.emailRecipients.split(',').map(e => e.trim()) },
          enabled: true
        }] : []),
        ...(formData.actions.webhook ? [{
          id: `webhook-${Date.now()}`,
          type: 'webhook',
          config: { url: formData.actions.webhookUrl },
          enabled: true
        }] : [])
      ],
      triggeredCount: 0,
      createdBy: 'current_user',
      createdAt: new Date(),
      modifiedAt: new Date(),
      lastRun: null,
      nextRun: new Date(Date.now() + (formData.schedule.interval * 60 * 1000)),
      tags: ['search-based', 'auto-created']
    }

    onSave(newAlert)
    setIsOpen(false)
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      threshold: resultCount || 1,
      operator: 'greater',
      schedule: {
        type: 'scheduled',
        interval: 15,
        timeRange: timeRange
      },
      actions: {
        email: true,
        emailRecipients: '',
        webhook: false,
        webhookUrl: ''
      }
    })
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <AlertTriangle className="h-4 w-4 mr-2" />
      Save as Alert
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Save Search as Alert</span>
          </DialogTitle>
          <DialogDescription>
            Create a security alert based on your current search query and results
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Context */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Search Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-gray-500">Query</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded border font-mono text-sm">
                  {searchQuery}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs font-medium text-gray-500">Time Range</Label>
                  <div className="mt-1">{timeRange}</div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">Current Results</Label>
                  <div className="mt-1 flex items-center space-x-1">
                    <span>{resultCount || 0} events</span>
                    {resultCount && resultCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {resultCount > 10 ? 'High Volume' : resultCount > 5 ? 'Medium' : 'Low Volume'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Alert Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., High Volume Failed Logins Alert"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this alert monitors and when it should trigger..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="severity">Severity Level</Label>
                <Select 
                  value={formData.severity} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
                >
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
                <Label htmlFor="threshold">Alert when results</Label>
                <div className="flex space-x-2 mt-1">
                  <Select 
                    value={formData.operator} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, operator: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greater">Greater than</SelectItem>
                      <SelectItem value="less">Less than</SelectItem>
                      <SelectItem value="equal">Equal to</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={formData.threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                    className="w-20"
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="border-t pt-4">
              <Label className="text-base font-medium">Schedule</Label>
              <div className="mt-3 space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="scheduled-radio"
                      name="schedule-type"
                      checked={formData.schedule.type === 'scheduled'}
                      onChange={() => setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, type: 'scheduled' } }))}
                    />
                    <label htmlFor="scheduled-radio" className="text-sm">Scheduled</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="realtime-radio"
                      name="schedule-type"
                      checked={formData.schedule.type === 'realtime'}
                      onChange={() => setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, type: 'realtime' } }))}
                    />
                    <label htmlFor="realtime-radio" className="text-sm">Real-time</label>
                  </div>
                </div>

                {formData.schedule.type === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="interval">Check Every</Label>
                      <Select 
                        value={formData.schedule.interval.toString()} 
                        onValueChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          schedule: { ...prev.schedule, interval: parseInt(value) }
                        }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="time-range">Time Window</Label>
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
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-4">
              <Label className="text-base font-medium">Alert Actions</Label>
              <div className="mt-3 space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="email-action"
                    checked={formData.actions.email}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      actions: { ...prev.actions, email: e.target.checked }
                    }))}
                  />
                  <label htmlFor="email-action" className="text-sm font-medium">Send Email</label>
                </div>

                {formData.actions.email && (
                  <div className="ml-6">
                    <Label htmlFor="email-recipients">Email Recipients</Label>
                    <Input
                      id="email-recipients"
                      value={formData.actions.emailRecipients}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        actions: { ...prev.actions, emailRecipients: e.target.value }
                      }))}
                      placeholder="security@company.com, admin@company.com"
                      className="mt-1"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="webhook-action"
                    checked={formData.actions.webhook}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      actions: { ...prev.actions, webhook: e.target.checked }
                    }))}
                  />
                  <label htmlFor="webhook-action" className="text-sm font-medium">Webhook</label>
                </div>

                {formData.actions.webhook && (
                  <div className="ml-6">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      value={formData.actions.webhookUrl}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        actions: { ...prev.actions, webhookUrl: e.target.value }
                      }))}
                      placeholder="https://hooks.slack.com/services/..."
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.title.trim() || (!formData.actions.email && !formData.actions.webhook)}
          >
            <Save className="h-4 w-4 mr-2" />
            Create Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}