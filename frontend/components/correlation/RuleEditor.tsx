'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save, AlertCircle, Code } from 'lucide-react';
import { toast } from 'sonner';

interface RuleEditorProps {
  rule?: any;
  onClose: () => void;
  onSave: (rule: any) => void;
}

export function RuleEditor({ rule, onClose, onSave }: RuleEditorProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'simple',
    severity: 'medium',
    enabled: true,
    time_window_minutes: 5,
    event_count_threshold: 1,
    conditions: [],
    actions: [],
    tags: []
  });

  const [conditions, setConditions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (rule) {
      setFormData({
        ...rule,
        conditions: rule.conditions || [],
        actions: rule.actions || [],
        tags: rule.tags || []
      });
      setConditions(rule.conditions || []);
      setActions(rule.actions || []);
    }
  }, [rule]);

  const handleAddCondition = () => {
    const newCondition = {
      id: Date.now().toString(),
      field_name: '',
      operator: 'equals',
      value: '',
      condition_type: 'field_match'
    };
    setConditions([...conditions, newCondition]);
  };

  const handleUpdateCondition = (index: number, field: string, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleAddAction = () => {
    const newAction = {
      id: Date.now().toString(),
      action_type: 'alert',
      priority: 1,
      enabled: true,
      config: {}
    };
    setActions([...actions, newAction]);
  };

  const handleUpdateAction = (index: number, field: string, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Rule name is required');
      return;
    }

    const ruleData = {
      ...formData,
      rule_logic: {
        operator: 'AND',
        conditions: conditions.map(c => ({
          field: c.field_name,
          operator: c.operator,
          value: c.value
        }))
      },
      conditions,
      actions
    };

    try {
      const response = await fetch(
        rule ? `/api/correlation/rules/${rule.id}` : '/api/correlation/rules',
        {
          method: rule ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ruleData)
        }
      );

      if (response.ok) {
        toast.success(rule ? 'Rule updated successfully' : 'Rule created successfully');
        onSave(ruleData);
      } else {
        throw new Error('Failed to save rule');
      }
    } catch (error) {
      toast.error('Failed to save rule');
      console.error('Error saving rule:', error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rule ? 'Edit Correlation Rule' : 'Create New Correlation Rule'}
          </DialogTitle>
          <DialogDescription>
            Define conditions and actions for automated event correlation
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Brute Force Detection"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this rule detects..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Rule Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="threshold">Threshold</SelectItem>
                    <SelectItem value="sequence">Sequence</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                    <SelectItem value="ml-based">ML-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
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
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="enabled">Enable rule immediately</Label>
            </div>
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Rule Conditions</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Condition
              </Button>
            </div>

            {conditions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No conditions defined. Add conditions to trigger this rule.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {conditions.map((condition, index) => (
                  <Card key={condition.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Field</Label>
                          <Input
                            value={condition.field_name}
                            onChange={(e) => handleUpdateCondition(index, 'field_name', e.target.value)}
                            placeholder="e.g., event_id"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Operator</Label>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => handleUpdateCondition(index, 'operator', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="greater_than">Greater Than</SelectItem>
                              <SelectItem value="less_than">Less Than</SelectItem>
                              <SelectItem value="regex_match">Regex Match</SelectItem>
                              <SelectItem value="in">In List</SelectItem>
                              <SelectItem value="not_in">Not In List</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Value</Label>
                          <div className="flex gap-2">
                            <Input
                              value={condition.value}
                              onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                              placeholder="e.g., 4625"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCondition(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {formData.type === 'threshold' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Threshold Settings</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Time Window (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.time_window_minutes}
                      onChange={(e) => setFormData({ ...formData, time_window_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Count Threshold</Label>
                    <Input
                      type="number"
                      value={formData.event_count_threshold}
                      onChange={(e) => setFormData({ ...formData, event_count_threshold: parseInt(e.target.value) })}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Actions</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAction}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Action
              </Button>
            </div>

            {actions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No actions defined. Add actions to respond to matches.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {actions.map((action, index) => (
                  <Card key={action.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="grid grid-cols-2 gap-4 flex-1">
                            <div className="space-y-2">
                              <Label>Action Type</Label>
                              <Select
                                value={action.action_type}
                                onValueChange={(value) => handleUpdateAction(index, 'action_type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="alert">Create Alert</SelectItem>
                                  <SelectItem value="email">Send Email</SelectItem>
                                  <SelectItem value="webhook">Call Webhook</SelectItem>
                                  <SelectItem value="script">Run Script</SelectItem>
                                  <SelectItem value="block">Block IP/User</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Priority</Label>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={action.priority}
                                onChange={(e) => handleUpdateAction(index, 'priority', parseInt(e.target.value))}
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAction(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {action.action_type === 'email' && (
                          <div className="space-y-2">
                            <Label>Recipients (comma-separated)</Label>
                            <Input
                              value={action.config.recipients || ''}
                              onChange={(e) => handleUpdateAction(index, 'config', { ...action.config, recipients: e.target.value })}
                              placeholder="admin@example.com, security@example.com"
                            />
                          </div>
                        )}

                        {action.action_type === 'webhook' && (
                          <div className="space-y-2">
                            <Label>Webhook URL</Label>
                            <Input
                              value={action.config.url || ''}
                              onChange={(e) => handleUpdateAction(index, 'config', { ...action.config, url: e.target.value })}
                              placeholder="https://api.example.com/webhook"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Advanced Configuration</CardTitle>
                <CardDescription>
                  Configure advanced rule behavior and metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={formData.tags?.join(', ') || ''}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    placeholder="authentication, brute-force, high-priority"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Custom Metadata (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(formData.metadata || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const metadata = JSON.parse(e.target.value);
                        setFormData({ ...formData, metadata });
                      } catch (error) {
                        // Invalid JSON, ignore
                      }
                    }}
                    placeholder="{}"
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Rule Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify({
                    ...formData,
                    rule_logic: {
                      operator: 'AND',
                      conditions: conditions.map(c => ({
                        field: c.field_name,
                        operator: c.operator,
                        value: c.value
                      }))
                    }
                  }, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            {rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}