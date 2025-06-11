"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';

interface SupportedFileType {
  mimeType: string;
  extensions: string[];
  processor: string;
  maxSize: number;
  description: string;
  maxSizeMB: number;
}

interface FileUploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  processor: string;
  uploadPath: string;
  processingStatus: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
  error?: string;
}

interface ProcessingStatus {
  fileId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    eventsProcessed: number;
    errors: string[];
    startTime: string;
    endTime?: string;
    processingTimeMs?: number;
  };
  error?: string;
}

interface UploadedFile {
  file: File;
  id: string;
  status: 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: FileUploadResult;
  processingStatus?: ProcessingStatus;
  error?: string;
}

export function FileUploadWidget() {
  const [supportedTypes, setSupportedTypes] = useState<SupportedFileType[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Upload options
  const [uploadOptions, setUploadOptions] = useState({
    source: '',
    sourcetype: '',
    index: 'adhoc_analysis',
    delimiter: ',',
    hasHeaders: true,
    timestampField: '',
    timestampFormat: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load supported file types on component mount
  React.useEffect(() => {
    loadSupportedTypes();
  }, []);

  const loadSupportedTypes = async () => {
    try {
      const response = await fetch('/api/files/upload');
      if (response.ok) {
        const data = await response.json();
        setSupportedTypes(data.supportedTypes || []);
      }
    } catch (error) {
      console.error('Failed to load supported file types:', error);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      const fileId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const uploadedFile: UploadedFile = {
        file,
        id: fileId,
        status: 'uploading',
        progress: 0
      };

      setUploadedFiles(prev => [...prev, uploadedFile]);
      
      // Start upload
      uploadFile(file, fileId);
    }
  };

  const uploadFile = async (file: File, fileId: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(uploadOptions));

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const result: FileUploadResult = await response.json();

      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? {
          ...f,
          status: result.success ? 'queued' : 'failed',
          progress: result.success ? 100 : 0,
          result,
          error: result.error
        } : f
      ));

      // Start polling for processing status if successful
      if (result.success) {
        pollProcessingStatus(fileId, result.fileId);
      }

    } catch (error) {
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? {
          ...f,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    }
  };

  const pollProcessingStatus = async (uploadId: string, fileId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/files/upload?fileId=${fileId}`);
        if (response.ok) {
          const data = await response.json();
          const status: ProcessingStatus = data.data;

          setUploadedFiles(prev => prev.map(f => 
            f.id === uploadId ? {
              ...f,
              status: status.status,
              progress: status.progress || 0,
              processingStatus: status
            } : f
          ));

          // Continue polling if still processing
          if (status.status === 'queued' || status.status === 'processing') {
            setTimeout(poll, 2000); // Poll every 2 seconds
          }
        }
      } catch (error) {
        console.error('Failed to poll processing status:', error);
      }
    };

    poll();
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearCompleted = () => {
    setUploadedFiles(prev => prev.filter(f => f.status !== 'completed' && f.status !== 'failed'));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'queued':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const supportedExtensions = supportedTypes
    .flatMap(type => type.extensions)
    .join(', ');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Ad-Hoc File Analysis
        </CardTitle>
        <CardDescription>
          Upload log files for one-time analysis. Supported formats: {supportedExtensions || 'Loading...'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              placeholder="e.g., webserver01"
              value={uploadOptions.source}
              onChange={(e) => setUploadOptions(prev => ({ ...prev, source: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sourcetype">Source Type</Label>
            <Select
              value={uploadOptions.sourcetype}
              onValueChange={(value) => setUploadOptions(prev => ({ ...prev, sourcetype: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auto-detect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-detect</SelectItem>
                <SelectItem value="access_log">Access Log</SelectItem>
                <SelectItem value="error_log">Error Log</SelectItem>
                <SelectItem value="application_log">Application Log</SelectItem>
                <SelectItem value="security_log">Security Log</SelectItem>
                <SelectItem value="system_log">System Log</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delimiter">CSV Delimiter</Label>
            <Select
              value={uploadOptions.delimiter}
              onValueChange={(value) => setUploadOptions(prev => ({ ...prev, delimiter: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=",">Comma (,)</SelectItem>
                <SelectItem value=";">Semicolon (;)</SelectItem>
                <SelectItem value="\t">Tab</SelectItem>
                <SelectItem value="|">Pipe (|)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="hasHeaders"
              checked={uploadOptions.hasHeaders}
              onCheckedChange={(checked) => 
                setUploadOptions(prev => ({ ...prev, hasHeaders: checked as boolean }))
              }
            />
            <Label htmlFor="hasHeaders" className="text-sm">Has headers</Label>
          </div>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            Drag and drop files here, or{' '}
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700 underline"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <p className="text-sm text-gray-500">
            Max file size: {supportedTypes.length > 0 ? 
              Math.max(...supportedTypes.map(t => t.maxSizeMB)) + 'MB' : 
              '100MB'
            }
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
            accept={supportedTypes.flatMap(t => t.extensions).join(',')}
          />
        </div>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Uploaded Files</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearCompleted}
                disabled={!uploadedFiles.some(f => f.status === 'completed' || f.status === 'failed')}
              >
                Clear Completed
              </Button>
            </div>

            <div className="space-y-2">
              {uploadedFiles.map((uploadedFile) => (
                <div key={uploadedFile.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(uploadedFile.status)}
                      <div>
                        <p className="font-medium">{uploadedFile.file.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(uploadedFile.file.size)} • {uploadedFile.result?.processor || 'Unknown format'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(uploadedFile.status)}>
                        {uploadedFile.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadedFile.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                    <div className="mb-2">
                      <Progress value={uploadedFile.progress} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">
                        {uploadedFile.status === 'uploading' ? 'Uploading...' : 
                         uploadedFile.status === 'processing' ? 'Processing...' : 
                         `${uploadedFile.progress}%`}
                      </p>
                    </div>
                  )}

                  {/* Processing Results */}
                  {uploadedFile.processingStatus?.result && (
                    <div className="text-sm space-y-1">
                      <p className="text-green-600">
                        ✓ Processed {uploadedFile.processingStatus.result.eventsProcessed} events
                      </p>
                      {uploadedFile.processingStatus.result.processingTimeMs && (
                        <p className="text-gray-500">
                          Processing time: {uploadedFile.processingStatus.result.processingTimeMs}ms
                        </p>
                      )}
                      {uploadedFile.processingStatus.result.errors.length > 0 && (
                        <p className="text-orange-600">
                          {uploadedFile.processingStatus.result.errors.length} warnings
                        </p>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadedFile.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {uploadedFile.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supported File Types Info */}
        {supportedTypes.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Supported File Types</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {supportedTypes.map((type) => (
                <div key={type.processor} className="flex justify-between">
                  <span>{type.description}</span>
                  <span className="text-gray-500">{type.extensions.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}