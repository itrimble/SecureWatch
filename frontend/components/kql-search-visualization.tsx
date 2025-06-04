"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Search, 
  Play, 
  Save, 
  Download, 
  BarChart3, 
  LineChart, 
  PieChart, 
  Map, 
  Activity,
  Clock,
  Database,
  AlertCircle,
  CheckCircle,
  Loader2,
  Table as TableIcon,
  TreePine,
  Zap
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  AreaChart,
  Area
} from 'recharts';

interface KQLQueryResult {
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
  rows: any[];
  metadata: {
    totalRows: number;
    scannedRows: number;
    executionTime: number;
    fromCache: boolean;
    totalTime?: number;
  };
}

interface QueryExecution {
  id: string;
  query: string;
  timestamp: Date;
  status: 'running' | 'completed' | 'error';
  result?: KQLQueryResult;
  error?: string;
  executionTime?: number;
}

const PREDEFINED_QUERIES = [
  {
    name: "Critical Security Events",
    description: "Find all critical severity events in the last hour",
    query: `logs
| where timestamp >= ago(1h)
| where enriched_data.severity == "Critical" 
| sort by timestamp desc
| limit 100`,
    category: "Security"
  },
  {
    name: "Top Event Sources",
    description: "Most active log sources by count",
    query: `logs
| summarize event_count = count() by source_identifier
| sort by event_count desc
| limit 10`,
    category: "Analytics"
  },
  {
    name: "Authentication Events",
    description: "Login and authentication activities",
    query: `logs
| where message contains "login" or message contains "auth"
| where timestamp >= ago(24h)
| sort by timestamp desc
| limit 50`,
    category: "Security"
  },
  {
    name: "Error Analysis",
    description: "System errors and exceptions over time",
    query: `logs
| where message contains "error" or message contains "exception"
| where timestamp >= ago(6h)
| summarize error_count = count() by bin(timestamp, 30m)
| sort by timestamp asc`,
    category: "System"
  },
  {
    name: "Network Activity",
    description: "Network-related events and connections",
    query: `logs
| where source_identifier contains "network" or message contains "connection"
| where timestamp >= ago(2h)
| extend ip = extract(@"(\d+\.\d+\.\d+\.\d+)", 1, message)
| where isnotempty(ip)
| summarize connection_count = count() by ip
| sort by connection_count desc`,
    category: "Network"
  }
];

const VISUALIZATION_TYPES = [
  { id: 'table', name: 'Table', icon: TableIcon, description: 'Raw data in tabular format' },
  { id: 'bar', name: 'Bar Chart', icon: BarChart3, description: 'Compare values across categories' },
  { id: 'line', name: 'Line Chart', icon: LineChart, description: 'Show trends over time' },
  { id: 'area', name: 'Area Chart', icon: Activity, description: 'Filled line chart for volume data' },
  { id: 'pie', name: 'Pie Chart', icon: PieChart, description: 'Show proportional data' },
  { id: 'timeline', name: 'Timeline', icon: Clock, description: 'Events in chronological order' }
];

const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export default function KQLSearchVisualization() {
  const [query, setQuery] = useState('');
  const [executions, setExecutions] = useState<QueryExecution[]>([]);
  const [currentExecution, setCurrentExecution] = useState<QueryExecution | null>(null);
  const [visualizationType, setVisualizationType] = useState<string>('table');
  const [isExecuting, setIsExecuting] = useState(false);

  const executeQuery = useCallback(async () => {
    if (!query.trim()) return;

    const executionId = Date.now().toString();
    const execution: QueryExecution = {
      id: executionId,
      query: query.trim(),
      timestamp: new Date(),
      status: 'running'
    };

    setExecutions(prev => [execution, ...prev]);
    setCurrentExecution(execution);
    setIsExecuting(true);

    try {
      // Mock API call - replace with actual KQL search API
      const response = await fetch('/api/v1/search/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': 'default'
        },
        body: JSON.stringify({
          query: query.trim(),
          maxRows: 1000,
          timeout: 30000,
          cache: true
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result: KQLQueryResult = await response.json();
      
      const completedExecution: QueryExecution = {
        ...execution,
        status: 'completed',
        result,
        executionTime: result.metadata.executionTime
      };

      setExecutions(prev => prev.map(ex => ex.id === executionId ? completedExecution : ex));
      setCurrentExecution(completedExecution);

    } catch (error) {
      const errorExecution: QueryExecution = {
        ...execution,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      setExecutions(prev => prev.map(ex => ex.id === executionId ? errorExecution : ex));
      setCurrentExecution(errorExecution);
    } finally {
      setIsExecuting(false);
    }
  }, [query]);

  const loadPredefinedQuery = useCallback((predefinedQuery: typeof PREDEFINED_QUERIES[0]) => {
    setQuery(predefinedQuery.query);
  }, []);

  const renderVisualization = useMemo(() => {
    if (!currentExecution?.result || currentExecution.status !== 'completed') {
      return null;
    }

    const { rows, columns } = currentExecution.result;

    switch (visualizationType) {
      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  {columns.map((col) => (
                    <th key={col.name} className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {rows.slice(0, 100).map((row, index) => (
                  <tr key={index} className="hover:bg-gray-700">
                    {columns.map((col) => (
                      <td key={col.name} className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">
                        {typeof row[col.name] === 'object' ? JSON.stringify(row[col.name]) : String(row[col.name] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'bar':
        // Assume first column is category, second is value
        if (columns.length >= 2) {
          const chartData = rows.slice(0, 20).map(row => ({
            name: String(row[columns[0].name] || ''),
            value: Number(row[columns[1].name]) || 0
          }));

          return (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <YAxis tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '0.375rem', color: '#e5e7eb' }}
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          );
        }
        break;

      case 'line':
        if (columns.length >= 2) {
          const chartData = rows.slice(0, 50).map(row => ({
            name: String(row[columns[0].name] || ''),
            value: Number(row[columns[1].name]) || 0
          }));

          return (
            <ResponsiveContainer width="100%" height={400}>
              <RechartsLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <YAxis tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '0.375rem', color: '#e5e7eb' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </RechartsLineChart>
            </ResponsiveContainer>
          );
        }
        break;

      case 'area':
        if (columns.length >= 2) {
          const chartData = rows.slice(0, 50).map(row => ({
            name: String(row[columns[0].name] || ''),
            value: Number(row[columns[1].name]) || 0
          }));

          return (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <YAxis tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '0.375rem', color: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          );
        }
        break;

      case 'pie':
        if (columns.length >= 2) {
          const chartData = rows.slice(0, 10).map((row, index) => ({
            name: String(row[columns[0].name] || ''),
            value: Number(row[columns[1].name]) || 0,
            fill: CHART_COLORS[index % CHART_COLORS.length]
          }));

          return (
            <ResponsiveContainer width="100%" height={400}>
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '0.375rem', color: '#e5e7eb' }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          );
        }
        break;

      case 'timeline':
        // Timeline visualization for time-based data
        return (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {rows.slice(0, 50).map((row, index) => {
              const timeCol = columns.find(col => col.name.includes('timestamp') || col.name.includes('time'));
              const messageCol = columns.find(col => col.name.includes('message') || col.name.includes('description'));
              
              return (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-300">
                      {timeCol ? new Date(row[timeCol.name]).toLocaleString() : `Event ${index + 1}`}
                    </div>
                    <div className="text-gray-100 mt-1">
                      {messageCol ? String(row[messageCol.name]) : JSON.stringify(row)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
    }

    return <div className="text-center text-gray-400 py-8">Visualization not available for this data structure</div>;
  }, [currentExecution, visualizationType]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">KQL Search & Visualization</h1>
            <p className="text-gray-400">Query your security data with KQL and visualize results</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              <Database className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Query Builder Section */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TreePine className="w-5 h-5" />
                  Query Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {PREDEFINED_QUERIES.map((predefined, index) => (
                  <div key={index} className="p-3 border border-gray-600 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                       onClick={() => loadPredefinedQuery(predefined)}>
                    <div className="font-medium text-sm text-gray-200">{predefined.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{predefined.description}</div>
                    <Badge variant="outline" className="text-xs mt-2">{predefined.category}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Query History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Queries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {executions.slice(0, 5).map((execution) => (
                  <div key={execution.id} className="p-2 border border-gray-600 rounded cursor-pointer hover:border-blue-500"
                       onClick={() => setQuery(execution.query)}>
                    <div className="flex items-center gap-2">
                      {execution.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {execution.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      {execution.status === 'running' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                      <span className="text-xs text-gray-400">{execution.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <div className="text-sm text-gray-300 mt-1 truncate">{execution.query}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Query and Results Section */}
          <div className="lg:col-span-3 space-y-4">
            {/* Query Input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  KQL Query Editor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your KQL query here...&#10;&#10;Example:&#10;logs&#10;| where timestamp >= ago(1h)&#10;| where enriched_data.severity == 'Critical'&#10;| sort by timestamp desc&#10;| limit 100"
                  className="min-h-32 font-mono text-sm bg-gray-800 border-gray-600"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={executeQuery} 
                      disabled={!query.trim() || isExecuting}
                      className="flex items-center gap-2"
                    >
                      {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Execute Query
                    </Button>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Save className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Save Query</TooltipContent>
                    </Tooltip>
                  </div>

                  {currentExecution?.result && (
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{currentExecution.result.metadata.totalRows} rows</span>
                      <span>{currentExecution.result.metadata.executionTime}ms</span>
                      {currentExecution.result.metadata.fromCache && (
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          <Zap className="w-3 h-3 mr-1" />
                          Cached
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results and Visualization */}
            {currentExecution && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Query Results</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={visualizationType} onValueChange={setVisualizationType}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VISUALIZATION_TYPES.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex items-center gap-2">
                                <type.icon className="w-4 h-4" />
                                {type.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Export Results</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentExecution.status === 'running' && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="ml-2 text-gray-400">Executing query...</span>
                    </div>
                  )}
                  
                  {currentExecution.status === 'error' && (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-200 mb-2">Query Failed</h3>
                      <p className="text-gray-400 mb-4">{currentExecution.error}</p>
                      <Button variant="outline" onClick={executeQuery}>
                        Retry Query
                      </Button>
                    </div>
                  )}
                  
                  {currentExecution.status === 'completed' && currentExecution.result && (
                    <div className="space-y-4">
                      {renderVisualization}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}