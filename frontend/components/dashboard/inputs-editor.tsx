'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Plus,
  Trash2,
  Settings,
  Filter,
  Calendar,
  List,
  Type,
  CheckSquare,
  Search,
  Clock,
  Database,
  Users,
  Globe,
  Activity,
  Eye,
  Copy,
  Save,
  X
} from "lucide-react"

interface DashboardInput {
  id: string
  label: string
  type: 'text' | 'dropdown' | 'time' | 'multiselect' | 'checkbox'
  token: string
  defaultValue: string | string[] | boolean
  options?: { label: string; value: string }[]
  searchOnChange: boolean
  description?: string
}

interface InputsEditorProps {
  inputs: DashboardInput[]
  onSave: (inputs: DashboardInput[]) => void
  onCancel: () => void
}

const INPUT_TYPES = [
  {
    id: 'text',
    name: 'Text Input',
    description: 'Free text input field',
    icon: Type,
    hasOptions: false,
    defaultValue: '',
    example: 'User enters search terms, hostnames, etc.'
  },
  {
    id: 'dropdown',
    name: 'Dropdown',
    description: 'Single selection dropdown',
    icon: List,
    hasOptions: true,
    defaultValue: '',
    example: 'Source types, severity levels, environments'
  },
  {
    id: 'multiselect',
    name: 'Multi-Select',
    description: 'Multiple selection dropdown',
    icon: CheckSquare,
    hasOptions: true,
    defaultValue: [],
    example: 'Multiple data sources, event types'
  },
  {
    id: 'time',
    name: 'Time Range',
    description: 'Time range picker',
    icon: Clock,
    hasOptions: false,
    defaultValue: '24h',
    example: 'Last 24 hours, Last week, Custom range'
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    description: 'Boolean toggle',
    icon: CheckSquare,
    hasOptions: false,
    defaultValue: false,
    example: 'Include/exclude certain data'
  }
]

// Predefined input templates for common use cases
const INPUT_TEMPLATES = {
  'time-range': {
    label: 'Time Range',
    type: 'time' as const,
    token: 'timerange',
    defaultValue: '24h',
    searchOnChange: true,
    description: 'Global time range for all panels'
  },
  'data-source': {
    label: 'Data Source',
    type: 'dropdown' as const,
    token: 'source',
    defaultValue: '*',
    searchOnChange: true,
    options: [
      { label: 'All Sources', value: '*' },
      { label: 'Windows Events', value: 'windows' },
      { label: 'Syslog', value: 'syslog' },
      { label: 'Network Logs', value: 'network' },
      { label: 'Application Logs', value: 'application' },
      { label: 'Security Events', value: 'security' }
    ],
    description: 'Filter data by source type'
  },
  'severity-filter': {
    label: 'Severity',
    type: 'multiselect' as const,
    token: 'severity',
    defaultValue: ['critical', 'high', 'medium'],
    searchOnChange: false,
    options: [
      { label: 'Critical', value: 'critical' },
      { label: 'High', value: 'high' },
      { label: 'Medium', value: 'medium' },
      { label: 'Low', value: 'low' },
      { label: 'Information', value: 'info' }
    ],
    description: 'Select event severity levels'
  },
  'hostname-filter': {
    label: 'Hostname',
    type: 'text' as const,
    token: 'hostname',
    defaultValue: '',
    searchOnChange: false,
    description: 'Filter by specific hostname'
  },
  'user-filter': {
    label: 'Username',
    type: 'text' as const,
    token: 'username',
    defaultValue: '',
    searchOnChange: false,
    description: 'Filter by username'
  },
  'environment': {
    label: 'Environment',
    type: 'dropdown' as const,
    token: 'env',
    defaultValue: 'production',
    searchOnChange: true,
    options: [
      { label: 'Production', value: 'production' },
      { label: 'Staging', value: 'staging' },
      { label: 'Development', value: 'development' },
      { label: 'All Environments', value: '*' }
    ],
    description: 'Select environment'
  }
}

export function InputsEditor({ inputs, onSave, onCancel }: InputsEditorProps) {
  const [editedInputs, setEditedInputs] = useState<DashboardInput[]>(inputs)
  const [selectedInput, setSelectedInput] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const addInput = useCallback((template?: any) => {
    const newInput: DashboardInput = template ? {
      id: `input-${Date.now()}`,
      ...template
    } : {
      id: `input-${Date.now()}`,
      label: 'New Input',
      type: 'text',
      token: `token_${Date.now()}`,
      defaultValue: '',
      searchOnChange: false,
      description: ''
    }

    setEditedInputs(prev => [...prev, newInput])
    setSelectedInput(newInput.id)
    setShowTemplates(false)
  }, [])

  const updateInput = useCallback((inputId: string, updates: Partial<DashboardInput>) => {
    setEditedInputs(prev => prev.map(input =>
      input.id === inputId ? { ...input, ...updates } : input
    ))
  }, [])

  const removeInput = useCallback((inputId: string) => {
    setEditedInputs(prev => prev.filter(input => input.id !== inputId))
    if (selectedInput === inputId) {
      setSelectedInput(null)
    }
  }, [selectedInput])

  const addOption = useCallback((inputId: string) => {
    updateInput(inputId, {
      options: [
        ...(editedInputs.find(i => i.id === inputId)?.options || []),
        { label: 'New Option', value: 'new_option' }
      ]
    })
  }, [editedInputs, updateInput])

  const updateOption = useCallback((inputId: string, optionIndex: number, updates: { label?: string; value?: string }) => {
    const input = editedInputs.find(i => i.id === inputId)
    if (input?.options) {
      const newOptions = [...input.options]
      newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates }
      updateInput(inputId, { options: newOptions })
    }
  }, [editedInputs, updateInput])

  const removeOption = useCallback((inputId: string, optionIndex: number) => {
    const input = editedInputs.find(i => i.id === inputId)
    if (input?.options) {
      const newOptions = input.options.filter((_, index) => index !== optionIndex)
      updateInput(inputId, { options: newOptions })
    }
  }, [editedInputs, updateInput])

  const getInputTypeInfo = useCallback((type: string) => {
    return INPUT_TYPES.find(t => t.id === type)
  }, [])

  const selectedInputData = selectedInput ? editedInputs.find(i => i.id === selectedInput) : null

  return (
    <div className="w-full max-w-6xl max-h-[80vh] overflow-y-auto">
      <div className="flex h-[600px]">
        {/* Input List */}
        <div className="w-1/3 border-r border-gray-700 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-100">Dashboard Inputs</h3>
            <div className="relative">
              <Button
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Input
              </Button>
              
              {showTemplates && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                  <div className="p-3 border-b border-gray-700">
                    <div className="font-medium text-gray-100">Add Input</div>
                    <div className="text-sm text-gray-400">Choose a template or create custom</div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addInput()}
                      className="w-full justify-start"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Custom Input
                    </Button>
                    
                    <Separator />
                    
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Templates</div>
                    
                    {Object.entries(INPUT_TEMPLATES).map(([key, template]) => {
                      const typeInfo = getInputTypeInfo(template.type)
                      return (
                        <Button
                          key={key}
                          variant="ghost"
                          size="sm"
                          onClick={() => addInput(template)}
                          className="w-full justify-start text-left"
                        >
                          {typeInfo && <typeInfo.icon className="w-4 h-4 mr-2" />}
                          <div>
                            <div className="font-medium">{template.label}</div>
                            <div className="text-xs text-gray-500">{template.description}</div>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                  
                  <div className="p-3 border-t border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplates(false)}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {editedInputs.map((input) => {
              const typeInfo = getInputTypeInfo(input.type)
              return (
                <Card
                  key={input.id}
                  className={`cursor-pointer transition-colors ${
                    selectedInput === input.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedInput(input.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {typeInfo && <typeInfo.icon className="w-4 h-4 text-gray-400" />}
                        <div>
                          <div className="font-medium text-gray-100">{input.label}</div>
                          <div className="text-xs text-gray-500">
                            <Badge variant="outline" className="text-xs font-mono">
                              ${input.token}$
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeInput(input.id)
                        }}
                        className="w-6 h-6 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {editedInputs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Filter className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No inputs configured</p>
                <p className="text-xs">Add inputs to enable dashboard filtering</p>
              </div>
            )}
          </div>
        </div>

        {/* Input Configuration */}
        <div className="flex-1 p-4">
          {selectedInputData ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-100 mb-1">
                  Configure Input: {selectedInputData.label}
                </h3>
                <p className="text-sm text-gray-400">
                  Customize how users can filter dashboard data
                </p>
              </div>

              {/* Basic Settings */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Basic Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Label</Label>
                      <Input
                        value={selectedInputData.label}
                        onChange={(e) => updateInput(selectedInputData.id, { label: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-gray-100"
                        placeholder="Enter display label..."
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Token Name</Label>
                      <Input
                        value={selectedInputData.token}
                        onChange={(e) => updateInput(selectedInputData.id, { token: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-gray-100 font-mono"
                        placeholder="token_name"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Use in queries as: ${selectedInputData.token}$
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Input
                      value={selectedInputData.description || ''}
                      onChange={(e) => updateInput(selectedInputData.id, { description: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-gray-100"
                      placeholder="Optional description for users..."
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Input Type</Label>
                    <Select
                      value={selectedInputData.type}
                      onValueChange={(value) => updateInput(selectedInputData.id, { 
                        type: value as any,
                        defaultValue: getInputTypeInfo(value)?.defaultValue
                      })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INPUT_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedInputData.searchOnChange}
                      onChange={(e) => updateInput(selectedInputData.id, { searchOnChange: e.target.checked })}
                      className="rounded"
                    />
                    <Label className="text-gray-300">Auto-refresh panels when changed</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Type-specific Settings */}
              {(selectedInputData.type === 'dropdown' || selectedInputData.type === 'multiselect') && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Options
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addOption(selectedInputData.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Option
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedInputData.options?.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={option.label}
                            onChange={(e) => updateOption(selectedInputData.id, index, { label: e.target.value })}
                            placeholder="Display text..."
                            className="bg-gray-700 border-gray-600 text-gray-100"
                          />
                          <Input
                            value={option.value}
                            onChange={(e) => updateOption(selectedInputData.id, index, { value: e.target.value })}
                            placeholder="Value..."
                            className="bg-gray-700 border-gray-600 text-gray-100 font-mono"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(selectedInputData.id, index)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {(!selectedInputData.options || selectedInputData.options.length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                          <List className="w-6 h-6 mx-auto mb-2" />
                          <p className="text-sm">No options added</p>
                          <p className="text-xs">Add options for users to select from</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Default Value */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Default Value</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedInputData.type === 'text' && (
                    <Input
                      value={selectedInputData.defaultValue || ''}
                      onChange={(e) => updateInput(selectedInputData.id, { defaultValue: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-gray-100"
                      placeholder="Default text value..."
                    />
                  )}
                  
                  {selectedInputData.type === 'dropdown' && (
                    <Select
                      value={selectedInputData.defaultValue || ''}
                      onValueChange={(value) => updateInput(selectedInputData.id, { defaultValue: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100">
                        <SelectValue placeholder="Select default option..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedInputData.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {selectedInputData.type === 'checkbox' && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedInputData.defaultValue || false}
                        onChange={(e) => updateInput(selectedInputData.id, { defaultValue: e.target.checked })}
                        className="rounded"
                      />
                      <Label className="text-gray-300">Default to checked</Label>
                    </div>
                  )}
                  
                  {selectedInputData.type === 'time' && (
                    <Select
                      value={selectedInputData.defaultValue || '24h'}
                      onValueChange={(value) => updateInput(selectedInputData.id, { defaultValue: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15m">Last 15 minutes</SelectItem>
                        <SelectItem value="1h">Last hour</SelectItem>
                        <SelectItem value="4h">Last 4 hours</SelectItem>
                        <SelectItem value="24h">Last 24 hours</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>

              {/* Usage Example */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Usage in Queries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-gray-900 p-3 rounded font-mono text-sm">
                      <div className="text-gray-400 mb-2">{/* Example KQL query using this input: */}</div>
                      <div className="text-gray-100">
                        * | where timestamp {'>='} ago(1h)
                        {selectedInputData.type === 'text' && selectedInputData.token === 'hostname' && (
                          <><br />| where hostname contains &quot;${selectedInputData.token}$&quot;</>
                        )}
                        {selectedInputData.type === 'dropdown' && selectedInputData.token === 'source' && (
                          <><br />| where source_type == &quot;${selectedInputData.token}$&quot;</>
                        )}
                        {selectedInputData.type === 'multiselect' && selectedInputData.token === 'severity' && (
                          <><br />| where severity in (${selectedInputData.token}$)</>
                        )}
                        <br />| stats count by hostname
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      The token <Badge variant="outline" className="font-mono">${selectedInputData.token}$</Badge> will be replaced with the user&apos;s input value
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Settings className="w-12 h-12 mx-auto mb-4" />
                <p className="text-lg font-medium">No Input Selected</p>
                <p className="text-sm">Select an input from the list to configure it</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-700">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onSave(editedInputs)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Inputs
        </Button>
      </div>
    </div>
  )
}