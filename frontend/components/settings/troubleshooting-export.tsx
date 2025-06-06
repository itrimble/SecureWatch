'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DownloadIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface ExportServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy';
  opensearch?: any;
  timestamp: string;
}

interface ExportProgress {
  phase: 'validating' | 'querying' | 'compressing' | 'completed' | 'failed';
  message: string;
  progress: number;
}

const TroubleshootingExport: React.FC = () => {
  // Form state
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedLogLevels, setSelectedLogLevels] = useState<string[]>(['error', 'warn']);
  const [maxDocuments, setMaxDocuments] = useState(50000);
  const [includeStackTraces, setIncludeStackTraces] = useState(true);

  // UI state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ExportServiceHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastExportInfo, setLastExportInfo] = useState<any>(null);

  // Available options
  const availableServices = [
    'correlation-engine',
    'analytics-engine',
    'log-ingestion',
    'search-api',
    'auth-service',
    'mcp-marketplace',
    'web-frontend'
  ];

  const availableLogLevels = [
    { value: 'error', label: 'Error', color: 'bg-red-500' },
    { value: 'warn', label: 'Warning', color: 'bg-yellow-500' },
    { value: 'info', label: 'Info', color: 'bg-blue-500' },
    { value: 'debug', label: 'Debug', color: 'bg-gray-500' }
  ];

  // Initialize with reasonable defaults
  useEffect(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    setEndDate(now.toISOString().split('T')[0]);
    setEndTime(now.toISOString().split('T')[1].substring(0, 5));
    setStartDate(oneHourAgo.toISOString().split('T')[0]);
    setStartTime(oneHourAgo.toISOString().split('T')[1].substring(0, 5));
  }, []);

  // Check service health on component mount
  useEffect(() => {
    checkServiceHealth();
  }, []);

  const checkServiceHealth = async () => {
    try {
      const response = await fetch('/api/support/export-logs');
      const health: ExportServiceHealth = await response.json();
      setServiceHealth(health);
    } catch (error) {
      console.error('Failed to check service health:', error);
    }
  };

  const handleServiceToggle = (service: string, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [...prev, service]);
    } else {
      setSelectedServices(prev => prev.filter(s => s !== service));
    }
  };

  const handleLogLevelToggle = (level: string, checked: boolean) => {
    if (checked) {
      setSelectedLogLevels(prev => [...prev, level]);
    } else {
      setSelectedLogLevels(prev => prev.filter(l => l !== level));
    }
  };

  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!startDate || !startTime) {
      errors.push('Start date and time are required');
    }

    if (!endDate || !endTime) {
      errors.push('End date and time are required');
    }

    if (startDate && startTime && endDate && endTime) {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      if (start >= end) {
        errors.push('Start time must be before end time');
      }

      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 30) {
        errors.push('Time range cannot exceed 30 days');
      }

      if (end > new Date()) {
        errors.push('End time cannot be in the future');
      }
    }

    if (selectedLogLevels.length === 0) {
      errors.push('At least one log level must be selected');
    }

    if (maxDocuments < 1 || maxDocuments > 1000000) {
      errors.push('Max documents must be between 1 and 1,000,000');
    }

    return { valid: errors.length === 0, errors };
  };

  const handleExport = async () => {
    setError(null);
    
    const validation = validateForm();
    if (!validation.valid) {
      setError(validation.errors.join('; '));
      return;
    }

    setIsExporting(true);
    setExportProgress({ phase: 'validating', message: 'Validating request...', progress: 10 });

    try {
      const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
      const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

      const requestBody = {
        startTime: startDateTime,
        endTime: endDateTime,
        services: selectedServices.length > 0 ? selectedServices : undefined,
        logLevels: selectedLogLevels,
        maxDocuments,
        includeStackTraces
      };

      setExportProgress({ phase: 'querying', message: 'Querying log data...', progress: 30 });

      const response = await fetch('/api/support/export-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Export failed');
      }

      setExportProgress({ phase: 'compressing', message: 'Creating bundle...', progress: 70 });

      // Get the blob and create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
        `securewatch-logs-${startDate}.zip`;

      setExportProgress({ phase: 'completed', message: 'Download starting...', progress: 100 });

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Store export info for display
      setLastExportInfo({
        filename,
        timestamp: new Date().toISOString(),
        timeRange: `${startDateTime} to ${endDateTime}`,
        services: selectedServices.length > 0 ? selectedServices : ['all'],
        logLevels: selectedLogLevels,
        maxDocuments
      });

      // Reset progress after a delay
      setTimeout(() => {
        setExportProgress(null);
      }, 3000);

    } catch (error) {
      console.error('Export failed:', error);
      setError(error instanceof Error ? error.message : 'Export failed');
      setExportProgress({ phase: 'failed', message: 'Export failed', progress: 0 });
      
      setTimeout(() => {
        setExportProgress(null);
      }, 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const getProgressColor = (phase: string) => {
    switch (phase) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DownloadIcon className="h-5 w-5" />
            Troubleshooting Log Export
          </CardTitle>
          <CardDescription>
            Export internal platform logs for troubleshooting and support analysis. 
            This feature generates a compressed bundle containing operational logs from SecureWatch services.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Health Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Service Status</Label>
            <div className="flex items-center gap-2">
              {serviceHealth ? (
                <>
                  {serviceHealth.status === 'healthy' ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ${serviceHealth.status === 'healthy' ? 'text-green-700' : 'text-red-700'}`}>
                    Log export service is {serviceHealth.status}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={checkServiceHealth}
                    className="ml-auto text-xs"
                  >
                    Refresh
                  </Button>
                </>
              ) : (
                <span className="text-sm text-gray-500">Checking service status...</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Time Range Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Time Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs text-gray-600">Start Date & Time</Label>
                <div className="flex gap-2">
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-xs text-gray-600">End Date & Time</Label>
                <div className="flex gap-2">
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Services (Optional)</Label>
            <p className="text-xs text-gray-600">Leave all unchecked to include logs from all services</p>
            <div className="grid grid-cols-2 gap-3">
              {availableServices.map((service) => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service}`}
                    checked={selectedServices.includes(service)}
                    onCheckedChange={(checked) => handleServiceToggle(service, checked as boolean)}
                  />
                  <Label htmlFor={`service-${service}`} className="text-sm font-mono">
                    {service}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Log Level Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Log Levels</Label>
            <div className="flex flex-wrap gap-3">
              {availableLogLevels.map((level) => (
                <div key={level.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`level-${level.value}`}
                    checked={selectedLogLevels.includes(level.value)}
                    onCheckedChange={(checked) => handleLogLevelToggle(level.value, checked as boolean)}
                  />
                  <Label htmlFor={`level-${level.value}`} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${level.color}`} />
                    {level.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Advanced Options</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-docs" className="text-xs text-gray-600">
                  Max Documents
                </Label>
                <Input
                  id="max-docs"
                  type="number"
                  min="1"
                  max="1000000"
                  value={maxDocuments}
                  onChange={(e) => setMaxDocuments(parseInt(e.target.value) || 50000)}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="include-stack-traces"
                  checked={includeStackTraces}
                  onCheckedChange={(checked) => setIncludeStackTraces(checked as boolean)}
                />
                <Label htmlFor="include-stack-traces" className="text-sm">
                  Include stack traces
                </Label>
              </div>
            </div>
          </div>

          {/* Export Progress */}
          {exportProgress && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{exportProgress.message}</span>
              </div>
              <Progress 
                value={exportProgress.progress} 
                className={`h-2 ${getProgressColor(exportProgress.phase)}`}
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Last Export Info */}
          {lastExportInfo && !isExporting && (
            <Alert>
              <InformationCircleIcon className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Last export completed successfully</p>
                  <p className="text-xs text-gray-600">
                    File: {lastExportInfo.filename} • {new Date(lastExportInfo.timestamp).toLocaleString()}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleExport}
              disabled={isExporting || serviceHealth?.status !== 'healthy'}
              className="flex items-center gap-2"
              size="lg"
            >
              <DownloadIcon className="h-4 w-4" />
              {isExporting ? 'Generating Bundle...' : 'Generate and Download Log Bundle'}
            </Button>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Instructions</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Select a time range when the issue occurred</li>
              <li>• Choose specific services if you know which components were affected</li>
              <li>• Include error and warning logs for most troubleshooting scenarios</li>
              <li>• The generated bundle can be safely shared with SecureWatch support</li>
              <li>• Bundle files are automatically cleaned up after download</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TroubleshootingExport;