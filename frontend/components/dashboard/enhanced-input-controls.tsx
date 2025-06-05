'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { 
  Filter,
  Calendar as CalendarIcon,
  Clock,
  Search,
  X,
  ChevronDown,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff
} from "lucide-react"
import { format, subHours, subDays, subWeeks, addDays } from 'date-fns'

interface DashboardInput {
  id: string
  label: string
  type: 'text' | 'dropdown' | 'time' | 'multiselect' | 'checkbox' | 'date-range'
  token: string
  defaultValue: any
  options?: { label: string; value: string }[]
  searchOnChange: boolean
  description?: string
  placeholder?: string
  validation?: {
    required?: boolean
    pattern?: string
    minLength?: number
    maxLength?: number
  }
}

interface EnhancedInputControlsProps {
  inputs: DashboardInput[]
  tokens: Record<string, any>
  onTokenChange: (token: string, value: any) => void
  onRefreshAll: () => void
  autoRefresh: boolean
  onAutoRefreshToggle: (enabled: boolean) => void
  refreshInterval: number
  onRefreshIntervalChange: (interval: number) => void
  isRefreshing: boolean
  className?: string
}

// Time range presets for Splunk-style time picker
const TIME_PRESETS = [
  { label: 'Last 15 minutes', value: '15m', earliest: '-15m@m', latest: 'now' },
  { label: 'Last hour', value: '1h', earliest: '-1h@h', latest: 'now' },
  { label: 'Last 4 hours', value: '4h', earliest: '-4h@h', latest: 'now' },
  { label: 'Last 24 hours', value: '24h', earliest: '-24h@h', latest: 'now' },
  { label: 'Last 7 days', value: '7d', earliest: '-7d@d', latest: 'now' },
  { label: 'Last 30 days', value: '30d', earliest: '-30d@d', latest: 'now' },
  { label: 'Today', value: 'today', earliest: '@d', latest: 'now' },
  { label: 'Yesterday', value: 'yesterday', earliest: '-1d@d', latest: '-0d@d' },
  { label: 'This week', value: 'week', earliest: '@w1', latest: 'now' },
  { label: 'This month', value: 'month', earliest: '@mon', latest: 'now' }
]

export function EnhancedInputControls({
  inputs,
  tokens,
  onTokenChange,
  onRefreshAll,
  autoRefresh,
  onAutoRefreshToggle,
  refreshInterval,
  onRefreshIntervalChange,
  isRefreshing,
  className = ""
}: EnhancedInputControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isCompact, setIsCompact] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Auto-refresh countdown
  const [refreshCountdown, setRefreshCountdown] = useState(refreshInterval)

  useEffect(() => {
    if (autoRefresh && !isRefreshing) {
      const interval = setInterval(() => {
        setRefreshCountdown(prev => {
          if (prev <= 1) {
            onRefreshAll()
            return refreshInterval
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setRefreshCountdown(refreshInterval)
    }
  }, [autoRefresh, isRefreshing, refreshInterval, onRefreshAll])

  // Validate input value
  const validateInput = useCallback((input: DashboardInput, value: any): string | null => {
    if (!input.validation) return null

    const { required, pattern, minLength, maxLength } = input.validation

    if (required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${input.label} is required`
    }

    if (typeof value === 'string') {
      if (minLength && value.length < minLength) {
        return `${input.label} must be at least ${minLength} characters`
      }
      if (maxLength && value.length > maxLength) {
        return `${input.label} must be no more than ${maxLength} characters`
      }
      if (pattern && !new RegExp(pattern).test(value)) {
        return `${input.label} format is invalid`
      }
    }

    return null
  }, [])

  // Handle token change with validation
  const handleTokenChange = useCallback((input: DashboardInput, value: any) => {
    const error = validateInput(input, value)
    
    setValidationErrors(prev => ({
      ...prev,
      [input.id]: error || ''
    }))

    if (!error) {
      onTokenChange(input.token, value)
    }
  }, [onTokenChange, validateInput])

  // Render individual input control
  const renderInputControl = useCallback((input: DashboardInput) => {
    const currentValue = tokens[input.token] ?? input.defaultValue
    const hasError = validationErrors[input.id]

    const inputClasses = `${
      hasError ? 'border-red-500' : 'border-gray-600'
    } bg-gray-800 text-gray-100`

    switch (input.type) {
      case 'text':
        return (
          <div key={input.id} className={isCompact ? "min-w-32" : "min-w-40"}>
            <Label className="text-xs text-gray-400 mb-1 block">{input.label}:</Label>
            <Input
              value={currentValue || ''}
              onChange={(e) => handleTokenChange(input, e.target.value)}
              className={`h-8 ${inputClasses}`}
              placeholder={input.placeholder || `Enter ${input.label.toLowerCase()}...`}
            />
            {hasError && (
              <div className="text-xs text-red-400 mt-1">{hasError}</div>
            )}
          </div>
        )

      case 'dropdown':
        return (
          <div key={input.id} className={isCompact ? "min-w-36" : "min-w-44"}>
            <Label className="text-xs text-gray-400 mb-1 block">{input.label}:</Label>
            <Select value={currentValue} onValueChange={(value) => handleTokenChange(input, value)}>
              <SelectTrigger className={`h-8 ${inputClasses}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {input.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'multiselect':
        const selectedValues = Array.isArray(currentValue) ? currentValue : []
        return (
          <div key={input.id} className={isCompact ? "min-w-40" : "min-w-48"}>
            <Label className="text-xs text-gray-400 mb-1 block">{input.label}:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-8 w-full justify-between ${inputClasses}`}
                >
                  <span className="truncate">
                    {selectedValues.length === 0 
                      ? "Select..." 
                      : selectedValues.length === 1 
                        ? input.options?.find(o => o.value === selectedValues[0])?.label
                        : `${selectedValues.length} selected`
                    }
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="space-y-2">
                  {input.options?.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(option.value)}
                        onChange={(e) => {
                          const newValues = e.target.checked
                            ? [...selectedValues, option.value]
                            : selectedValues.filter(v => v !== option.value)
                          handleTokenChange(input, newValues)
                        }}
                        className="rounded"
                      />
                      <Label className="text-sm font-normal">{option.label}</Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )

      case 'time':
        return (
          <div key={input.id} className={isCompact ? "min-w-40" : "min-w-44"}>
            <Label className="text-xs text-gray-400 mb-1 block">{input.label}:</Label>
            <Select value={currentValue} onValueChange={(value) => handleTokenChange(input, value)}>
              <SelectTrigger className={`h-8 ${inputClasses}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'checkbox':
        return (
          <div key={input.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={currentValue || false}
              onChange={(e) => handleTokenChange(input, e.target.checked)}
              className="rounded"
            />
            <Label className="text-xs text-gray-400">{input.label}</Label>
          </div>
        )

      case 'date-range':
        return (
          <div key={input.id} className={isCompact ? "min-w-48" : "min-w-56"}>
            <Label className="text-xs text-gray-400 mb-1 block">{input.label}:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-8 w-full justify-start text-left font-normal ${inputClasses}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentValue?.from ? (
                    currentValue.to ? (
                      <>
                        {format(currentValue.from, "LLL dd, y")} -{" "}
                        {format(currentValue.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(currentValue.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={currentValue?.from}
                  selected={currentValue}
                  onSelect={(range) => handleTokenChange(input, range)}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        )

      default:
        return null
    }
  }, [tokens, isCompact, validationErrors, handleTokenChange])

  if (inputs.length === 0) return null

  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-lg">Dashboard Inputs</CardTitle>
            {!isExpanded && (
              <Badge variant="outline" className="text-xs">
                {inputs.length} inputs
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Auto-refresh controls */}
            <div className="flex items-center gap-1 text-sm text-gray-400">
              {autoRefresh && !isRefreshing && (
                <span className="font-mono">{refreshCountdown}s</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={() => onAutoRefreshToggle(!autoRefresh)}
              >
                {autoRefresh ? (
                  <Pause className="w-3 h-3 text-green-400" />
                ) : (
                  <Play className="w-3 h-3 text-gray-400" />
                )}
              </Button>
            </div>

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={onRefreshAll}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>

            {/* View options */}
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={() => setIsCompact(!isCompact)}
            >
              {isCompact ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>

            {/* Expand/collapse */}
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className={`flex flex-wrap items-end gap-${isCompact ? '3' : '4'}`}>
            {/* Main inputs */}
            {inputs.filter(input => !input.description?.includes('advanced')).map(renderInputControl)}
            
            {/* Advanced inputs toggle */}
            {inputs.some(input => input.description?.includes('advanced')) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-gray-400 hover:text-gray-100"
              >
                <Settings className="w-3 h-3 mr-1" />
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </Button>
            )}
          </div>

          {/* Advanced inputs */}
          {showAdvanced && inputs.some(input => input.description?.includes('advanced')) && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className={`flex flex-wrap items-end gap-${isCompact ? '3' : '4'}`}>
                {inputs.filter(input => input.description?.includes('advanced')).map(renderInputControl)}
              </div>
            </div>
          )}

          {/* Refresh interval setting */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-4">
                <Label className="text-xs text-gray-400">Auto-refresh interval:</Label>
                <Select 
                  value={refreshInterval.toString()} 
                  onValueChange={(value) => onRefreshIntervalChange(parseInt(value))}
                >
                  <SelectTrigger className="w-32 h-8 bg-gray-800 border-gray-600 text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Token summary */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <Label className="text-xs text-gray-500 mb-2 block">Current token values:</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(tokens).map(([token, value]) => (
                  <Badge key={token} variant="outline" className="text-xs font-mono">
                    ${token}$: {Array.isArray(value) ? value.join(',') : String(value)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}