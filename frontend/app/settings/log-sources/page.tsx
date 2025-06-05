"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Plus,
  Search,
  Filter,
  CheckCircle,
  ExclamationTriangle,
  XCircle,
  Edit as EditIcon,
  Trash as TrashIcon,
  Info as InfoIcon,
  Cloud as CloudIcon,
  Monitor as ComputerDesktopIcon,
  Server as ServerIcon,
  Inbox as InboxArrowDownIcon,
  Activity,
  Zap,
  Database,
  RefreshCw
} from "lucide-react";
import { AddLogSourceWizard } from "@/components/log-sources/add-log-source-wizard";
import EVTXFileUpload from "@/components/log-sources/evtx-file-upload";

interface LogSource {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  eventsPerSecond: number;
  lastEventReceived: string;
  totalEvents: number;
  parser: string;
  tags: string[];
  createdAt: string;
  config?: Record<string, any>;
}

// Mock data for demonstration
const mockLogSources: LogSource[] = [
  {
    id: '1',
    name: 'Primary Domain Controller',
    type: 'Windows Event Logs',
    status: 'healthy',
    eventsPerSecond: 45.2,
    lastEventReceived: '2025-06-05T01:35:00Z',
    totalEvents: 156789,
    parser: 'windows-event-parser',
    tags: ['production', 'critical', 'windows'],
    createdAt: '2025-06-01T10:00:00Z'
  },
  {
    id: '2',
    name: 'macOS Security Events',
    type: 'macOS Agent',
    status: 'healthy',
    eventsPerSecond: 12.8,
    lastEventReceived: '2025-06-05T01:34:45Z',
    totalEvents: 45623,
    parser: 'macos-unified-logs',
    tags: ['production', 'macos', 'endpoint'],
    createdAt: '2025-06-02T14:30:00Z'
  },
  {
    id: '3',
    name: 'AWS CloudTrail - Production',
    type: 'AWS CloudTrail',
    status: 'warning',
    eventsPerSecond: 23.1,
    lastEventReceived: '2025-06-05T01:30:00Z',
    totalEvents: 89456,
    parser: 'aws-cloudtrail',
    tags: ['production', 'aws', 'cloud'],
    createdAt: '2025-06-01T16:15:00Z'
  },
  {
    id: '4',
    name: 'Firewall Logs',
    type: 'Syslog',
    status: 'error',
    eventsPerSecond: 0,
    lastEventReceived: '2025-06-04T22:15:00Z',
    totalEvents: 234567,
    parser: 'cisco-asa-syslog',
    tags: ['network', 'firewall', 'security'],
    createdAt: '2025-05-28T09:00:00Z'
  },
  {
    id: '5',
    name: 'Linux Audit Logs',
    type: 'Linux Agent',
    status: 'healthy',
    eventsPerSecond: 8.5,
    lastEventReceived: '2025-06-05T01:34:30Z',
    totalEvents: 67890,
    parser: 'linux-audit',
    tags: ['production', 'linux', 'audit'],
    createdAt: '2025-06-03T11:45:00Z'
  }
];

const statusConfig = {
  healthy: { 
    icon: CheckCircle, 
    color: 'text-green-500', 
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    label: 'Healthy'
  },
  warning: { 
    icon: ExclamationTriangle, 
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    label: 'Warning'
  },
  error: { 
    icon: XCircle, 
    color: 'text-red-500', 
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    label: 'Error'
  },
  offline: { 
    icon: XCircle, 
    color: 'text-gray-500', 
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    label: 'Offline'
  }
};

const typeIcons = {
  'Windows Event Logs': ComputerDesktopIcon,
  'macOS Agent': ComputerDesktopIcon,
  'Linux Agent': ComputerDesktopIcon,
  'AWS CloudTrail': CloudIcon,
  'Syslog': ServerIcon,
  'Custom API': ServerIcon
};

export default function LogSourceManagementPage() {
  const [logSources, setLogSources] = useState<LogSource[]>(mockLogSources);
  const [filteredSources, setFilteredSources] = useState<LogSource[]>(mockLogSources);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Summary statistics
  const totalSources = logSources.length;
  const activeSources = logSources.filter(s => s.status === 'healthy').length;
  const errorSources = logSources.filter(s => s.status === 'error').length;
  const totalEPS = logSources.reduce((sum, s) => sum + s.eventsPerSecond, 0);

  // Filter logic
  useEffect(() => {
    let filtered = logSources;

    if (searchTerm) {
      filtered = filtered.filter(source =>
        source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        source.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        source.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(source => source.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(source => source.type === typeFilter);
    }

    setFilteredSources(filtered);
  }, [logSources, searchTerm, statusFilter, typeFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this log source? This action cannot be undone.')) {
      setLogSources(prev => prev.filter(s => s.id !== id));
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getUniqueTypes = () => {
    return Array.from(new Set(logSources.map(s => s.type)));
  };

  const StatusIcon = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Log Source Management</h1>
            <p className="text-gray-400">Configure and monitor data ingestion sources for your SIEM platform</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Log Source
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Log Source</DialogTitle>
                </DialogHeader>
                <AddLogSourceWizard onClose={() => setIsWizardOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Sources</p>
                  <p className="text-2xl font-bold text-gray-100">{totalSources}</p>
                </div>
                <Database className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Sources</p>
                  <p className="text-2xl font-bold text-green-500">{activeSources}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Sources with Errors</p>
                  <p className="text-2xl font-bold text-red-500">{errorSources}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total EPS</p>
                  <p className="text-2xl font-bold text-blue-500">{totalEPS.toFixed(1)}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search log sources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {getUniqueTypes().map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EVTX File Upload */}
        <EVTXFileUpload />

        {/* Log Sources Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Log Sources ({filteredSources.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSources.length === 0 ? (
              <div className="text-center py-12">
                <InboxArrowDownIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-200 mb-2">
                  {logSources.length === 0 ? 'No log sources configured yet' : 'No sources match your filters'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {logSources.length === 0 
                    ? 'Get started by adding your first log source to begin collecting security data.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
                {logSources.length === 0 && (
                  <Button onClick={() => setIsWizardOpen(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Your First Log Source
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>EPS</TableHead>
                      <TableHead>Last Event</TableHead>
                      <TableHead>Total Events</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSources.map((source) => {
                      const TypeIcon = typeIcons[source.type as keyof typeof typeIcons] || ServerIcon;
                      return (
                        <TableRow key={source.id} className="hover:bg-gray-700/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusIcon status={source.status} />
                              <span className="text-sm">{statusConfig[source.status].label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TypeIcon className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{source.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{source.type}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-yellow-500" />
                              {source.eventsPerSecond.toFixed(1)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-sm">
                                  {new Date(source.lastEventReceived).toLocaleTimeString()}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {formatTimestamp(source.lastEventReceived)}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {source.totalEvents.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {source.tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {source.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{source.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-end">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <InfoIcon className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <EditIcon className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Configuration</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDelete(source.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Source</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}