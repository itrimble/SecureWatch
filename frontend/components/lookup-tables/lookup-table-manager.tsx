"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Upload, 
  Database, 
  Search, 
  Trash2, 
  RefreshCw, 
  Download, 
  Eye, 
  Settings, 
  TrendingUp,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface LookupTable {
  id: string;
  name: string;
  description?: string;
  filename: string;
  keyField: string;
  fields: LookupField[];
  recordCount: number;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
  tags: string[];
  queryCount?: number;
  lastUsed?: string;
}

interface LookupField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'email' | 'url';
  description?: string;
  isKey: boolean;
  sampleValues: string[];
}

interface LookupStats {
  totalTables: number;
  totalRecords: number;
  totalQueries: number;
  cacheHitRate: number;
  averageQueryTime: number;
  topTables: Array<{
    name: string;
    queryCount: number;
    lastUsed: string;
  }>;
}

export function LookupTableManager() {
  const [tables, setTables] = useState<LookupTable[]>([]);
  const [stats, setStats] = useState<LookupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<LookupTable | null>(null);
  const [testQuery, setTestQuery] = useState({ keyValue: '', returnFields: '' });
  const [testResult, setTestResult] = useState<any>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    keyField: '',
    description: '',
    tags: '',
    delimiter: ',',
    hasHeader: true
  });

  useEffect(() => {
    loadTables();
    loadStats();
  }, []);

  const loadTables = async () => {
    try {
      const response = await fetch('/api/lookup-tables');
      if (response.ok) {
        const data = await response.json();
        setTables(data);
      } else {
        throw new Error('Failed to load lookup tables');
      }
    } catch (error) {
      setError('Failed to load lookup tables');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/lookup-tables?stats=true');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadForm.file || !uploadForm.keyField) {
      setError('Please select a file and specify a key field');
      return;
    }

    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('keyField', uploadForm.keyField);
      formData.append('description', uploadForm.description);
      formData.append('tags', uploadForm.tags);
      formData.append('delimiter', uploadForm.delimiter);
      formData.append('hasHeader', uploadForm.hasHeader.toString());
      formData.append('createdBy', 'current-user'); // TODO: Get from auth context

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev === null || prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      const response = await fetch('/api/lookup-tables', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Successfully uploaded lookup table '${result.table.name}' with ${result.table.recordCount} records`);
        setUploadForm({
          file: null,
          keyField: '',
          description: '',
          tags: '',
          delimiter: ',',
          hasHeader: true
        });
        await loadTables();
        await loadStats();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Upload failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setTimeout(() => setUploadProgress(null), 2000);
    }
  };

  const deleteTable = async (table: LookupTable) => {
    if (!confirm(`Are you sure you want to delete lookup table '${table.name}'? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/lookup-tables?id=${table.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess(`Lookup table '${table.name}' deleted successfully`);
        await loadTables();
        await loadStats();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete table');
    }
  };

  const clearCache = async (table: LookupTable) => {
    try {
      const response = await fetch(`/api/lookup-tables?id=${table.id}&action=clear-cache`, {
        method: 'PUT'
      });

      if (response.ok) {
        setSuccess(`Cache cleared for lookup table '${table.name}'`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to clear cache');
    }
  };

  const testLookup = async () => {
    if (!selectedTable || !testQuery.keyValue) {
      setError('Please select a table and enter a key value');
      return;
    }

    try {
      const params = new URLSearchParams({
        table: selectedTable.name,
        keyField: selectedTable.keyField,
        keyValue: testQuery.keyValue
      });

      if (testQuery.returnFields) {
        params.append('returnFields', testQuery.returnFields);
      }

      const response = await fetch(`/api/lookup-tables/query?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Lookup test failed');
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading lookup tables...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lookup Tables</h1>
          <p className="text-muted-foreground">
            Manage CSV lookup tables for data enrichment and correlation
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Lookup Table</DialogTitle>
              <DialogDescription>
                Upload a CSV file to create a new lookup table for data enrichment
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <Label htmlFor="file">CSV File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadForm(prev => ({ 
                    ...prev, 
                    file: e.target.files?.[0] || null 
                  }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="keyField">Key Field</Label>
                <Input
                  id="keyField"
                  placeholder="e.g., ip_address, user_id"
                  value={uploadForm.keyField}
                  onChange={(e) => setUploadForm(prev => ({ 
                    ...prev, 
                    keyField: e.target.value 
                  }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this lookup table..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (Optional)</Label>
                <Input
                  id="tags"
                  placeholder="threat-intel, geolocation, assets"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ 
                    ...prev, 
                    tags: e.target.value 
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delimiter">Delimiter</Label>
                  <Select
                    value={uploadForm.delimiter}
                    onValueChange={(value) => setUploadForm(prev => ({ 
                      ...prev, 
                      delimiter: value 
                    }))}
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
                  <input
                    type="checkbox"
                    id="hasHeader"
                    checked={uploadForm.hasHeader}
                    onChange={(e) => setUploadForm(prev => ({ 
                      ...prev, 
                      hasHeader: e.target.checked 
                    }))}
                  />
                  <Label htmlFor="hasHeader">Has header row</Label>
                </div>
              </div>

              {uploadProgress !== null && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-muted-foreground">
                    {uploadProgress === 100 ? 'Upload complete!' : `Uploading... ${uploadProgress}%`}
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={uploadProgress !== null}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Table
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="tables" className="w-full">
        <TabsList>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="test">Test Lookup</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTables}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.cacheHitRate.toFixed(1)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Query Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageQueryTime.toFixed(0)}ms</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tables List */}
          <Card>
            <CardHeader>
              <CardTitle>Lookup Tables</CardTitle>
              <CardDescription>
                Manage your uploaded CSV lookup tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tables.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No lookup tables</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your first CSV file to create a lookup table
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Field</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map((table) => (
                      <TableRow key={table.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{table.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {table.description || table.filename}
                            </div>
                            {table.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {table.tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {table.keyField}
                        </TableCell>
                        <TableCell>{table.recordCount.toLocaleString()}</TableCell>
                        <TableCell>{formatFileSize(table.fileSize)}</TableCell>
                        <TableCell>
                          <Badge variant={table.isActive ? "default" : "secondary"}>
                            {table.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {table.lastUsed ? formatDate(table.lastUsed) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTable(table)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => clearCache(table)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTable(table)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Usage Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Total Queries (24h)</Label>
                      <div className="text-2xl font-bold">{stats.totalQueries}</div>
                    </div>
                    <div>
                      <Label>Average Response Time</Label>
                      <div className="text-2xl font-bold">{stats.averageQueryTime.toFixed(2)}ms</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Used Tables</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table Name</TableHead>
                        <TableHead>Query Count</TableHead>
                        <TableHead>Last Used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.topTables.map((table) => (
                        <TableRow key={table.name}>
                          <TableCell>{table.name}</TableCell>
                          <TableCell>{table.queryCount}</TableCell>
                          <TableCell>{formatDate(table.lastUsed)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Lookup</CardTitle>
              <CardDescription>
                Test lookup queries against your tables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Table</Label>
                <Select
                  value={selectedTable?.id || ""}
                  onValueChange={(value) => {
                    const table = tables.find(t => t.id === value);
                    setSelectedTable(table || null);
                    setTestResult(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a lookup table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        {table.name} (Key: {table.keyField})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTable && (
                <>
                  <div>
                    <Label>Key Value</Label>
                    <Input
                      placeholder={`Enter ${selectedTable.keyField} value`}
                      value={testQuery.keyValue}
                      onChange={(e) => setTestQuery(prev => ({ 
                        ...prev, 
                        keyValue: e.target.value 
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Return Fields (Optional)</Label>
                    <Input
                      placeholder="field1,field2,field3 (leave empty for all)"
                      value={testQuery.returnFields}
                      onChange={(e) => setTestQuery(prev => ({ 
                        ...prev, 
                        returnFields: e.target.value 
                      }))}
                    />
                  </div>

                  <Button onClick={testLookup}>
                    <Search className="h-4 w-4 mr-2" />
                    Test Lookup
                  </Button>

                  {testResult && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Lookup Result</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label>Found</Label>
                            <Badge variant={testResult.found ? "default" : "secondary"}>
                              {testResult.found ? "Yes" : "No"}
                            </Badge>
                          </div>
                          <div>
                            <Label>Query Time</Label>
                            <div>{formatDate(testResult.timestamp)}</div>
                          </div>
                        </div>
                        
                        {testResult.found && testResult.record && (
                          <div>
                            <Label>Record Data</Label>
                            <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                              {JSON.stringify(testResult.record, null, 2)}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}