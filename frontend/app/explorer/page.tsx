'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SplunkLayout } from '@/components/splunk-layout';
import { FieldSidebar } from '@/components/explorer/field-sidebar';
import { SaveAsAlert } from '@/components/alerts/save-as-alert';
import {
  Search,
  Play,
  Pause,
  Square,
  Calendar as CalendarIcon,
  Clock,
  Save,
  Download,
  Share,
  Bell,
  BarChart3,
  Table as TableIcon,
  Eye,
  Filter,
  Settings,
  ChevronDown,
  ChevronRight,
  Database,
  Zap,
  RefreshCw,
  History,
  Star,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, subHours, subDays, subWeeks } from 'date-fns';
import type { LogEntry } from '@/lib/types/log_entry';

// Sample KQL queries for autocomplete/history
const sampleKQLQueries = [
  'EventID:4625 | where TimeGenerated > ago(1h)',
  'ProcessName:"powershell.exe" | project TimeGenerated, ComputerName, CommandLine',
  'SecurityEvent | where EventID in (4624, 4625) | summarize count() by Account',
  'Syslog | where SeverityLevel == "err" | top 10 by TimeGenerated',
  'NetworkConnections | where DestinationPort in (80, 443, 22) | summarize count() by SourceIP',
  'WindowsEvent | where EventID == 4688 | extend ProcessName = tostring(EventData.NewProcessName)',
  'AuthenticationLogs | where Result == "Failed" | summarize FailedAttempts = count() by UserName',
  'FileSystem | where EventType == "Created" | where FileName endswith ".exe"',
];

// Mock field data that would come from search results - enhanced for Splunk-style field sidebar
const mockFieldData = [
  {
    name: 'timestamp',
    type: 'timestamp' as const,
    coverage: 100,
    distinctValues: 1547,
    topValues: [
      { value: '2025-06-05T01:35:22Z', count: 245, percentage: 15.8 },
      { value: '2025-06-05T01:34:58Z', count: 198, percentage: 12.8 },
      { value: '2025-06-05T01:34:45Z', count: 167, percentage: 10.8 },
    ],
    isSelected: true,
    isInteresting: false,
    description: 'Event timestamp',
  },
  {
    name: 'eventId',
    type: 'string' as const,
    coverage: 98.5,
    distinctValues: 45,
    topValues: [
      { value: '4624', count: 456, percentage: 29.5 },
      { value: '4625', count: 321, percentage: 20.7 },
      { value: '4688', count: 289, percentage: 18.7 },
      { value: '1102', count: 156, percentage: 10.1 },
    ],
    isSelected: true,
    isInteresting: true,
    description: 'Windows Event ID',
  },
  {
    name: 'computerName',
    type: 'string' as const,
    coverage: 95.2,
    distinctValues: 12,
    topValues: [
      { value: 'DC01', count: 623, percentage: 40.3 },
      { value: 'WS001', count: 434, percentage: 28.1 },
      { value: 'SRV02', count: 289, percentage: 18.7 },
      { value: 'FW01', count: 201, percentage: 13.0 },
    ],
    isSelected: true,
    isInteresting: true,
    description: 'Source computer name',
  },
  {
    name: 'userName',
    type: 'string' as const,
    coverage: 87.3,
    distinctValues: 67,
    topValues: [
      { value: 'admin', count: 345, percentage: 22.3 },
      { value: 'jdoe', count: 234, percentage: 15.1 },
      { value: 'service_account', count: 189, percentage: 12.2 },
      { value: 'guest', count: 123, percentage: 8.0 },
    ],
    isSelected: false,
    isInteresting: true,
    description: 'Username associated with event',
  },
  {
    name: 'sourceIP',
    type: 'ip' as const,
    coverage: 76.4,
    distinctValues: 23,
    topValues: [
      { value: '10.0.1.100', count: 298, percentage: 19.3 },
      { value: '192.168.1.50', count: 234, percentage: 15.1 },
      { value: '172.16.0.5', count: 178, percentage: 11.5 },
    ],
    isSelected: false,
    isInteresting: true,
    description: 'Source IP address',
  },
  {
    name: 'severity',
    type: 'string' as const,
    coverage: 100,
    distinctValues: 4,
    topValues: [
      { value: 'Information', count: 1005, percentage: 65.0 },
      { value: 'Warning', count: 387, percentage: 25.0 },
      { value: 'Error', count: 124, percentage: 8.0 },
      { value: 'Critical', count: 31, percentage: 2.0 },
    ],
    isSelected: false,
    isInteresting: true,
    description: 'Event severity level',
  },
  {
    name: 'processName',
    type: 'string' as const,
    coverage: 68.2,
    distinctValues: 89,
    topValues: [
      { value: 'explorer.exe', count: 234, percentage: 15.1 },
      { value: 'chrome.exe', count: 189, percentage: 12.2 },
      { value: 'powershell.exe', count: 156, percentage: 10.1 },
    ],
    isSelected: false,
    isInteresting: false,
    description: 'Process executable name',
  },
  {
    name: 'message',
    type: 'string' as const,
    coverage: 100,
    distinctValues: 1234,
    topValues: [
      { value: 'An account failed to log on', count: 321, percentage: 20.7 },
      { value: 'A new process has been created', count: 289, percentage: 18.7 },
      {
        value: 'An account was successfully logged on',
        count: 256,
        percentage: 16.5,
      },
    ],
    isSelected: false,
    isInteresting: false,
    description: 'Event message content',
  },
];

// Time range presets
const timeRangePresets = [
  {
    label: 'Last 15 minutes',
    value: '15m',
    startTime: () => subHours(new Date(), 0.25),
  },
  { label: 'Last hour', value: '1h', startTime: () => subHours(new Date(), 1) },
  {
    label: 'Last 4 hours',
    value: '4h',
    startTime: () => subHours(new Date(), 4),
  },
  {
    label: 'Last 24 hours',
    value: '24h',
    startTime: () => subDays(new Date(), 1),
  },
  {
    label: 'Last 7 days',
    value: '7d',
    startTime: () => subWeeks(new Date(), 1),
  },
  {
    label: 'Last 30 days',
    value: '30d',
    startTime: () => subDays(new Date(), 30),
  },
];

// Mock search results data
const mockSearchResults = [
  {
    timestamp: '2025-06-05T01:35:22Z',
    eventId: '4625',
    computerName: 'DC01',
    userName: 'admin',
    sourceIP: '192.168.1.100',
    severity: 'Warning',
    message: 'An account failed to log on',
  },
  {
    timestamp: '2025-06-05T01:34:58Z',
    eventId: '4688',
    computerName: 'WS001',
    userName: 'jdoe',
    sourceIP: '10.0.1.55',
    severity: 'Information',
    message: 'A new process has been created',
  },
  {
    timestamp: '2025-06-05T01:34:45Z',
    eventId: '4624',
    computerName: 'SRV02',
    userName: 'service_account',
    sourceIP: '172.16.0.10',
    severity: 'Information',
    message: 'An account was successfully logged on',
  },
];

// Mock chart data
const mockChartData = [
  { time: '01:00', events: 145 },
  { time: '01:15', events: 167 },
  { time: '01:30', events: 134 },
  { time: '01:45', events: 178 },
  { time: '02:00', events: 156 },
];

const severityChartData = [
  { name: 'Information', value: 65, color: '#22c55e' },
  { name: 'Warning', value: 25, color: '#eab308' },
  { name: 'Error', value: 8, color: '#f97316' },
  { name: 'Critical', value: 2, color: '#ef4444' },
];

export default function ExplorerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMountedRef = useRef(true);

  const [kqlQuery, setKQLQuery] = useState(searchParams.get('query') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<
    'idle' | 'running' | 'completed' | 'error'
  >('idle');
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [customTimeRange, setCustomTimeRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [isCustomTimeOpen, setIsCustomTimeOpen] = useState(false);
  const [searchResults, setSearchResults] = useState(mockSearchResults);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'timestamp',
    'eventId',
    'computerName',
  ]);
  const [showFieldSidebar, setShowFieldSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState('events');
  const [searchStats, setSearchStats] = useState({
    totalEvents: 1547,
    scannedEvents: 2891045,
    executionTime: 245,
    searchProgress: 100,
  });

  // Cleanup tracking when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadRecentLogs = useCallback(async () => {
    try {
      // Load recent logs from the backend API
      const response = await fetch('/api/logs?limit=100');
      if (response.ok) {
        const logs = await response.json();
        const transformedResults = logs.map((log: any) => ({
          timestamp: log.timestamp,
          eventId: log.enriched_data?.event_id || 'LOG',
          computerName: log.enriched_data?.hostname || log.source_identifier,
          userName: log.enriched_data?.user_id || 'System',
          sourceIP: log.enriched_data?.ip_address || 'N/A',
          severity: log.enriched_data?.severity || 'Information',
          message: log.message,
          source: log.source_type || 'unknown',
        }));
        setSearchResults(transformedResults);
        setSearchStats((prev) => ({
          ...prev,
          totalEvents: transformedResults.length,
          scannedEvents: transformedResults.length,
          executionTime: 50,
        }));
      }
    } catch (error) {
      console.error('Failed to load recent logs:', error);
      // Keep mock data as final fallback
    }
  }, []);

  const handleSearch = useCallback(
    async (query?: string) => {
      const searchQuery = query || kqlQuery;
      if (!searchQuery.trim()) {
        // If no query, load recent logs
        await loadRecentLogs();
        return;
      }

      setIsSearching(true);
      setSearchStatus('running');
      setSearchStats((prev) => ({ ...prev, searchProgress: 0 }));

      // Simulate search progress with proper cleanup tracking
      let progressInterval: NodeJS.Timeout | undefined;
      const startProgressSimulation = () => {
        progressInterval = setInterval(() => {
          setSearchStats((prev) => {
            const newProgress = Math.min(prev.searchProgress + 10, 90);
            return { ...prev, searchProgress: newProgress };
          });
        }, 200);
      };

      startProgressSimulation();

      try {
        // Call the real Search API with KQL query
        const response = await fetch('/api/v1/search/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Organization-ID': 'c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 1000,
            organizationId: 'c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3',
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Search failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        // Transform the search results to match our UI format
        const transformedResults =
          data.rows?.map((row: any, index: number) => ({
            timestamp: row.timestamp || new Date().toISOString(),
            eventId: row.event_id || 'N/A',
            computerName: row.hostname || row.source_identifier || 'Unknown',
            userName: row.user_name || row.auth_user || 'System',
            sourceIP: row.source_ip || row.destination_ip || 'N/A',
            severity: row.log_level || row.severity || 'Information',
            message: row.message || 'No message available',
            source: row.source_type || 'unknown',
          })) || [];

        setSearchResults(transformedResults);

        // Add to history if not already there
        if (!queryHistory.includes(searchQuery)) {
          setQueryHistory((prev) => [searchQuery, ...prev.slice(0, 9)]);
        }

        setSearchStatus('completed');
        setSearchStats((prev) => ({
          ...prev,
          searchProgress: 100,
          executionTime: data.metadata?.executionTime || 245,
          totalEvents: transformedResults.length,
          scannedEvents:
            data.metadata?.scannedRows ||
            data.metadata?.totalRows ||
            transformedResults.length,
        }));
      } catch (error) {
        console.error('Search error:', error);
        if (isMountedRef.current) {
          setSearchStatus('error');
          // Fall back to loading recent logs on error
          await loadRecentLogs();
        }
      } finally {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        if (isMountedRef.current) {
          setIsSearching(false);
        }
      }
    },
    [kqlQuery, loadRecentLogs, queryHistory, isMountedRef]
  );

  useEffect(() => {
    // Initialize custom time range on client side to avoid hydration mismatch
    setCustomTimeRange({ start: new Date(), end: new Date() });
  }, []);

  useEffect(() => {
    const query = searchParams.get('query');
    if (query) {
      setKQLQuery(query);
      handleSearch(query);
    } else {
      // Load recent logs on initial page load
      loadRecentLogs();
    }
  }, [searchParams, handleSearch, loadRecentLogs]);

  const handleStopSearch = () => {
    setIsSearching(false);
    setSearchStatus('idle');
  };

  const handleSaveSearch = () => {
    // Implement save search functionality
    console.log('Saving search:', kqlQuery);
  };

  const handleCreateAlert = () => {
    // Navigate to alert creation with pre-filled query
    router.push(`/alerts/new?query=${encodeURIComponent(kqlQuery)}`);
  };

  const handleSaveAsAlert = (alert: any) => {
    // In a real app, this would save to backend
    console.log('Alert created:', alert);
    // Navigate to alerts page
    router.push('/alerts');
  };

  const handleAddToDashboard = () => {
    // Navigate to dashboard with query
    router.push(
      `/dashboard?addPanel=true&query=${encodeURIComponent(kqlQuery)}`
    );
  };

  const handleFieldToggle = (fieldName: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((f) => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const handleFieldFilter = (fieldName: string, value: string) => {
    const filterClause = `| where ${fieldName} == "${value}"`;
    setKQLQuery((prev) => prev + ' ' + filterClause);
  };

  const getTimeRangeLabel = () => {
    const preset = timeRangePresets.find((p) => p.value === selectedTimeRange);
    if (!preset) return 'Custom range';

    // Use shorter labels for header button
    const shortLabels: Record<string, string> = {
      '15m': '15 mins',
      '1h': '1 hour',
      '4h': '4 hours',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
    };

    return shortLabels[preset.value] || preset.label;
  };

  const getStatusIcon = () => {
    switch (searchStatus) {
      case 'running':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleFieldSelect = (
    fieldName: string,
    action: 'add' | 'remove' | 'filter' | 'stats'
  ) => {
    switch (action) {
      case 'add':
        if (!selectedFields.includes(fieldName)) {
          setSelectedFields((prev) => [...prev, fieldName]);
        }
        break;
      case 'remove':
        setSelectedFields((prev) => prev.filter((f) => f !== fieldName));
        break;
      case 'filter':
        // Add field filter to KQL query
        const filterClause = ` | where ${fieldName} != ""`;
        setKQLQuery((prev) => prev + filterClause);
        break;
      case 'stats':
        // Navigate to statistics view with field focus
        setActiveTab('statistics');
        break;
    }
  };

  const handleFieldValueFilter = (fieldName: string, value: string) => {
    const filterClause = ` | where ${fieldName} == "${value}"`;
    setKQLQuery((prev) => prev + filterClause);
  };

  return (
    <SplunkLayout
      showSidebar={true}
      sidebar={
        <FieldSidebar
          fields={mockFieldData}
          onFieldSelect={handleFieldSelect}
          onFieldValueFilter={handleFieldValueFilter}
          searchResults={searchResults}
        />
      }
    >
      <div className="flex flex-col h-full">
        <div className="p-6 flex-shrink-0">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Search & Investigation</h1>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleSaveSearch}>
                <Save className="w-4 h-4 mr-2" />
                Save Search
              </Button>
              <SaveAsAlert
                searchQuery={kqlQuery}
                timeRange={getTimeRangeLabel()}
                resultCount={searchResults.length}
                onSave={handleSaveAsAlert}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToDashboard}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Add to Dashboard
              </Button>

              {/* Time Range Picker moved to header */}
              <Popover
                open={isCustomTimeOpen}
                onOpenChange={setIsCustomTimeOpen}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {getTimeRangeLabel()}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 z-50">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Quick Ranges</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {timeRangePresets.map((preset) => (
                          <Button
                            key={preset.value}
                            variant={
                              selectedTimeRange === preset.value
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            onClick={() => {
                              setSelectedTimeRange(preset.value);
                              setIsCustomTimeOpen(false);
                            }}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-sm mb-2">Custom Range</h4>
                      <div className="space-y-2">
                        <Calendar
                          mode="range"
                          selected={{
                            from: customTimeRange.start || undefined,
                            to: customTimeRange.end || undefined,
                          }}
                          onSelect={(range) => {
                            if (range?.from && range?.to) {
                              setCustomTimeRange({
                                start: range.from,
                                end: range.to,
                              });
                              setSelectedTimeRange('custom');
                            }
                          }}
                          className="rounded-md border border-gray-600 z-50"
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* KQL Search Bar */}
          <div className="space-y-4">
            {/* Search Input Row */}
            <div className="flex items-start space-x-3">
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Enter your KQL query... (e.g., EventID:4625 | where TimeGenerated > ago(1h))"
                  value={kqlQuery}
                  onChange={(e) => setKQLQuery(e.target.value)}
                  className="min-h-[80px] bg-muted border-border text-foreground font-mono resize-y pr-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
                {queryHistory.length > 0 && (
                  <div className="absolute bottom-2 right-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <History className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 z-50">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Query History</h4>
                          {queryHistory.map((query, index) => (
                            <div
                              key={index}
                              className="p-2 text-xs bg-muted rounded cursor-pointer hover:bg-accent font-mono"
                              onClick={() => setKQLQuery(query)}
                            >
                              {query}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>

            {/* Search Control Row */}
            <div className="flex items-center justify-end">
              {/* Search Control Buttons */}
              <div className="flex items-center space-x-2">
                {isSearching ? (
                  <Button
                    onClick={handleStopSearch}
                    variant="destructive"
                    size="default"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSearch()}
                    disabled={!kqlQuery.trim()}
                    size="default"
                    className="px-6"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                )}
              </div>
            </div>

            {/* Search Status and Progress */}
            {searchStatus !== 'idle' && (
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon()}
                    <span className="text-sm">
                      {searchStatus === 'running' && 'Searching...'}
                      {searchStatus === 'completed' && 'Search completed'}
                      {searchStatus === 'error' && 'Search failed'}
                    </span>
                  </div>
                  {searchStatus === 'completed' && (
                    <div className="flex items-center space-x-4 text-sm bg-muted/50 rounded-lg p-3 border">
                      <div className="flex items-center space-x-1 text-blue-400">
                        <Search className="w-4 h-4" />
                        <span className="font-medium">
                          {searchStats.totalEvents.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          events found
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-purple-400">
                        <Database className="w-4 h-4" />
                        <span className="font-medium">
                          {searchStats.scannedEvents.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">scanned</span>
                      </div>
                      <div className="flex items-center space-x-1 text-green-400">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">
                          {searchStats.executionTime}ms
                        </span>
                        <span className="text-muted-foreground">
                          execution time
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-orange-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-muted-foreground">
                          Last updated 2 min ago
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {searchStatus === 'running' && (
                  <Progress
                    value={searchStats.searchProgress}
                    className="h-2"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Area - Main Content */}
        <div className="flex-1 p-6 pt-0 min-h-0 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col h-full"
          >
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="flex-1 mt-6 overflow-hidden">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      Search Results ({searchStats.totalEvents.toLocaleString()}{' '}
                      events)
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <Select defaultValue="50">
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="500">500</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <div className="h-full overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b border-border">
                          {selectedFields.map((field) => (
                            <th
                              key={field}
                              className="text-left p-2 font-medium"
                            >
                              {field}
                            </th>
                          ))}
                          <th className="text-left p-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((result, index) => (
                          <tr
                            key={index}
                            className="border-b border-border hover:bg-muted"
                          >
                            {selectedFields.map((field) => (
                              <td key={field} className="p-2">
                                {result[field as keyof typeof result]}
                              </td>
                            ))}
                            <td className="p-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="statistics"
              className="flex-1 mt-6 overflow-hidden"
            >
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle>Statistical Analysis</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-4">Events Over Time</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={mockChartData}>
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#374151',
                                border: '1px solid #4b5563',
                                borderRadius: '6px',
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="events"
                              stroke="#3b82f6"
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-4">
                        Event Severity Distribution
                      </h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={severityChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                            >
                              {severityChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#374151',
                                border: '1px solid #4b5563',
                                borderRadius: '6px',
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="visualizations"
              className="flex-1 mt-6 overflow-hidden"
            >
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle>Visualization Builder</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Chart Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">Line Chart</SelectItem>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="pie">Pie Chart</SelectItem>
                          <SelectItem value="area">Area Chart</SelectItem>
                          <SelectItem value="scatter">Scatter Plot</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="X-Axis Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockFieldData.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Y-Axis Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockFieldData.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4" />
                        <p>
                          Configure chart options above to generate
                          visualization
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SplunkLayout>
  );
}
