"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  File, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  FileText,
  Activity,
  Shield,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface EVTXUploadStats {
  total_events: number;
  processed_events: number;
  failed_events: number;
  duration_seconds: number;
  events_per_second: number;
  source_file: string;
}

interface EVTXUploadResult {
  success: boolean;
  error?: string;
  stats?: EVTXUploadStats;
  failed_details?: Array<{
    event_id: number;
    error: string;
  }>;
}

export default function EVTXFileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<EVTXUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file extension
      if (!file.name.toLowerCase().endsWith('.evtx')) {
        toast.error('Please select a valid EVTX file');
        return;
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 100MB');
        return;
      }

      setSelectedFile(file);
      setUploadResult(null);
      toast.success(`Selected file: ${file.name}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an EVTX file first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      // Step 1: Parse EVTX file with Python parser
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress during parsing
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 80));
      }, 500);

      const parseResponse = await fetch('/api/evtx/parse', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(85);

      if (!parseResponse.ok) {
        throw new Error(`Parse failed: ${parseResponse.status} ${parseResponse.statusText}`);
      }

      const parseResult = await parseResponse.json();
      
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse EVTX file');
      }

      setUploadProgress(90);

      // Step 2: Send parsed events to log ingestion
      const ingestionResponse = await fetch('http://localhost:4002/api/logs/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: parseResult.events }),
      });

      if (!ingestionResponse.ok) {
        throw new Error(`Ingestion failed: ${ingestionResponse.status} ${ingestionResponse.statusText}`);
      }

      const ingestionResult = await ingestionResponse.json();
      
      setUploadProgress(100);
      
      // Combine results
      const finalResult: EVTXUploadResult = {
        success: true,
        stats: {
          total_events: parseResult.total_events || 0,
          processed_events: ingestionResult.processed_events || 0,
          failed_events: ingestionResult.failed_events || 0,
          duration_seconds: parseResult.duration_seconds || 0,
          events_per_second: parseResult.events_per_second || 0,
          source_file: selectedFile.name
        },
        failed_details: ingestionResult.failed_details || []
      };

      setUploadResult(finalResult);
      
      toast.success(`Successfully processed ${finalResult.stats?.processed_events} events from ${selectedFile.name}`);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      toast.error('Failed to process EVTX file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Windows EVTX File Upload
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload Windows Event Log (EVTX) files for analysis in SecureWatch SIEM
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* File Selection */}
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            {selectedFile ? (
              <div className="space-y-3">
                <File className="h-12 w-12 mx-auto text-blue-500" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)} • EVTX File
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={handleUpload} 
                    disabled={isUploading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUploading ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4 mr-2" />
                        Process EVTX File
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleReset} disabled={isUploading}>
                    Reset
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="font-medium">Select EVTX File</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a Windows Event Log file to upload (max 100MB)
                  </p>
                </div>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  Browse Files
                </Button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".evtx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing EVTX file...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Parsing events and sending to SecureWatch SIEM
            </p>
          </div>
        )}

        {/* Upload Results */}
        {uploadResult && (
          <div className="space-y-4">
            <Separator />
            
            {uploadResult.success ? (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  EVTX file processed successfully! Events are now available in SecureWatch.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 dark:text-red-300">
                  Failed to process EVTX file: {uploadResult.error}
                </AlertDescription>
              </Alert>
            )}

            {/* Processing Statistics */}
            {uploadResult.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Total Events</p>
                        <p className="text-2xl font-bold">{uploadResult.stats.total_events.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Processed</p>
                        <p className="text-2xl font-bold text-green-600">{uploadResult.stats.processed_events.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-sm font-medium">Failed</p>
                        <p className="text-2xl font-bold text-red-600">{uploadResult.stats.failed_events.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Rate</p>
                        <p className="text-2xl font-bold">{Math.round(uploadResult.stats.events_per_second)}/sec</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Processing Details */}
            {uploadResult.stats && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Processing Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Source File:</span>
                    <span className="ml-2 font-medium">{uploadResult.stats.source_file}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-2 font-medium">{formatDuration(uploadResult.stats.duration_seconds)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="ml-2 font-medium">
                      {((uploadResult.stats.processed_events / uploadResult.stats.total_events) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Processing Speed:</span>
                    <span className="ml-2 font-medium">{uploadResult.stats.events_per_second.toFixed(1)} events/sec</span>
                  </div>
                </div>
              </div>
            )}

            {/* Failed Events Details */}
            {uploadResult.failed_details && uploadResult.failed_details.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Failed Events ({uploadResult.failed_details.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {uploadResult.failed_details.slice(0, 10).map((failure, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <Badge variant="outline" className="text-xs">
                        Event {failure.event_id}
                      </Badge>
                      <span className="text-muted-foreground">{failure.error}</span>
                    </div>
                  ))}
                  {uploadResult.failed_details.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      + {uploadResult.failed_details.length - 10} more failed events
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {uploadResult.success && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Next Steps</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Events are now searchable in the Explorer</li>
                  <li>• Check the Correlation Dashboard for security alerts</li>
                  <li>• Review authentication and process events for threats</li>
                  <li>• Use KQL queries for advanced analysis</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}