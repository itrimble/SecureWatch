/**
 * Alert Clustering Visualization Component
 * 
 * Provides interactive visualization of alert clusters, similarity scores,
 * and clustering insights for SOC analysts and administrators.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { 
  Search,
  Filter,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Users,
  Activity,
  Network,
  BarChart3,
  Layers,
  Settings,
  RefreshCw,
  Download,
  Share2,
  Maximize2,
  Info
} from "lucide-react";
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip,
  ZAxis,
  Cell,
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend
} from 'recharts';

// Types
interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  timestamp: Date;
  ruleId: string;
  ruleName: string;
  riskScore: number;
  confidence: number;
  indicators: Record<string, any>;
  mitreTactics: string[];
  mitreTechniques: string[];
}

interface AlertCluster {
  id: string;
  name: string;
  description: string;
  alerts: Alert[];
  representativeAlert: Alert;
  similarity: number;
  confidence: number;
  clusteringMethod: string;
  impactScore: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  createdAt: Date;
  tags: string[];
}

interface SimilarityScore {
  alertId1: string;
  alertId2: string;
  overallSimilarity: number;
  titleSimilarity: number;
  contentSimilarity: number;
  temporalSimilarity: number;
  spatialSimilarity: number;
  indicatorSimilarity: number;
}

interface ClusteringStats {
  totalAlerts: number;
  totalClusters: number;
  averageClusterSize: number;
  compressionRatio: number;
  processingTime: number;
  qualityScore: number;
  unclusteredAlerts: number;
}

export function AlertClusteringVisualization() {
  const [clusters, setClusters] = useState<AlertCluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<AlertCluster | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.75);
  const [viewMode, setViewMode] = useState<'grid' | 'network' | 'timeline'>('grid');
  const [stats, setStats] = useState<ClusteringStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    loadClusteringData();
  }, []);

  const loadClusteringData = async () => {
    setIsLoading(true);
    
    // Mock API call
    setTimeout(() => {
      const mockClusters = generateMockClusters();
      const mockStats = generateMockStats(mockClusters);
      
      setClusters(mockClusters);
      setStats(mockStats);
      setIsLoading(false);
    }, 1000);
  };

  // Filter clusters based on search and filters
  const filteredClusters = useMemo(() => {
    return clusters.filter(cluster => {
      const matchesSearch = cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cluster.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || cluster.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'all' || cluster.urgency === urgencyFilter;
      const matchesSimilarity = cluster.similarity >= (similarityThreshold / 100);
      
      return matchesSearch && matchesStatus && matchesUrgency && matchesSimilarity;
    });
  }, [clusters, searchTerm, statusFilter, urgencyFilter, similarityThreshold]);

  // Prepare data for visualizations
  const scatterData = useMemo(() => {
    return filteredClusters.map(cluster => ({
      x: cluster.similarity * 100,
      y: cluster.impactScore * 100,
      z: cluster.alerts.length,
      cluster: cluster.name,
      urgency: cluster.urgency,
      status: cluster.status,
      id: cluster.id
    }));
  }, [filteredClusters]);

  const pieData = useMemo(() => {
    const statusCounts = filteredClusters.reduce((acc, cluster) => {
      acc[cluster.status] = (acc[cluster.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
      status
    }));
  }, [filteredClusters]);

  const urgencyData = useMemo(() => {
    const urgencyCounts = filteredClusters.reduce((acc, cluster) => {
      acc[cluster.urgency] = (acc[cluster.urgency] || 0) + cluster.alerts.length;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(urgencyCounts).map(([urgency, count]) => ({
      urgency,
      alerts: count,
      clusters: filteredClusters.filter(c => c.urgency === urgency).length
    }));
  }, [filteredClusters]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#3b82f6';
      case 'investigating': return '#f59e0b';
      case 'resolved': return '#10b981';
      case 'false_positive': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const ClusterCard = ({ cluster }: { cluster: AlertCluster }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selectedCluster?.id === cluster.id ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => setSelectedCluster(cluster)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium">{cluster.name}</CardTitle>
            <CardDescription className="text-xs mt-1 line-clamp-2">
              {cluster.description}
            </CardDescription>
          </div>
          <Badge 
            variant={cluster.urgency === 'critical' ? 'destructive' : 'secondary'}
            className="ml-2"
          >
            {cluster.urgency}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold text-blue-600">{cluster.alerts.length}</div>
              <div className="text-muted-foreground">Alerts</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">
                {(cluster.similarity * 100).toFixed(0)}%
              </div>
              <div className="text-muted-foreground">Similarity</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-purple-600">
                {(cluster.impactScore * 100).toFixed(0)}
              </div>
              <div className="text-muted-foreground">Impact</div>
            </div>
          </div>

          {/* Progress bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Confidence</span>
                <span>{(cluster.confidence * 100).toFixed(0)}%</span>
              </div>
              <Progress value={cluster.confidence * 100} className="h-1" />
            </div>
          </div>

          {/* Status and timing */}
          <div className="flex items-center justify-between text-xs">
            <Badge variant="outline" className="text-xs">
              {cluster.status.replace('_', ' ')}
            </Badge>
            <span className="text-muted-foreground">
              {cluster.createdAt.toLocaleDateString()}
            </span>
          </div>

          {/* Tags */}
          {cluster.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {cluster.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {cluster.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{cluster.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const ClusterDetails = ({ cluster }: { cluster: AlertCluster }) => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{cluster.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{cluster.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{cluster.alerts.length}</div>
            <div className="text-sm text-muted-foreground">Alerts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {(cluster.similarity * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Similarity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {(cluster.impactScore * 100).toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">Impact Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {(cluster.confidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Confidence</div>
          </CardContent>
        </Card>
      </div>

      {/* Representative Alert */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Representative Alert</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="font-medium">{cluster.representativeAlert.title}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {cluster.representativeAlert.description}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {cluster.representativeAlert.severity}
              </Badge>
              <Badge variant="outline">
                Risk: {cluster.representativeAlert.riskScore.toFixed(2)}
              </Badge>
              <Badge variant="outline">
                {cluster.representativeAlert.source}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Rule:</span> {cluster.representativeAlert.ruleName}
              </div>
              <div>
                <span className="font-medium">Timestamp:</span> {cluster.representativeAlert.timestamp.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clustered Alerts ({cluster.alerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {cluster.alerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{alert.title}</div>
                    <div className="text-xs text-muted-foreground">{alert.source}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {alert.severity}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alert Clustering</h1>
          <p className="text-muted-foreground">
            Visualize and manage clustered security alerts
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadClusteringData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalAlerts}</div>
              <div className="text-sm text-muted-foreground">Total Alerts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalClusters}</div>
              <div className="text-sm text-muted-foreground">Clusters</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.averageClusterSize.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Avg Size</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{(stats.compressionRatio * 100).toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Compression</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.processingTime}ms</div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{(stats.qualityScore * 100).toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Quality</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clusters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-sm">Similarity:</span>
              <Slider
                value={[similarityThreshold * 100]}
                onValueChange={(value) => setSimilarityThreshold(value[0] / 100)}
                max={100}
                min={0}
                step={5}
                className="w-32"
              />
              <span className="text-sm font-medium">{(similarityThreshold * 100).toFixed(0)}%</span>
            </div>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Layers className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'network' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('network')}
                className="rounded-none"
              >
                <Network className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="rounded-l-none"
              >
                <Activity className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clusters List/Grid */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="clusters" className="space-y-4">
            <TabsList>
              <TabsTrigger value="clusters">Clusters ({filteredClusters.length})</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="clusters" className="space-y-4">
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredClusters.map(cluster => (
                    <ClusterCard key={cluster.id} cluster={cluster} />
                  ))}
                </div>
              )}
              
              {filteredClusters.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No clusters match your filters
                </div>
              )}
            </TabsContent>

            <TabsContent value="visualization" className="space-y-4">
              {/* Scatter Plot */}
              <Card>
                <CardHeader>
                  <CardTitle>Cluster Similarity vs Impact</CardTitle>
                  <CardDescription>
                    Bubble size represents cluster size
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={scatterData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="x" 
                        name="Similarity" 
                        unit="%" 
                        domain={[0, 100]}
                      />
                      <YAxis 
                        dataKey="y" 
                        name="Impact" 
                        unit="%"
                        domain={[0, 100]}
                      />
                      <ZAxis dataKey="z" range={[50, 400]} />
                      <RechartsTooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-3 shadow-lg">
                                <p className="font-medium">{data.cluster}</p>
                                <p className="text-sm">Similarity: {data.x.toFixed(1)}%</p>
                                <p className="text-sm">Impact: {data.y.toFixed(1)}%</p>
                                <p className="text-sm">Alerts: {data.z}</p>
                                <p className="text-sm">Urgency: {data.urgency}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter dataKey="y" fill="#3b82f6">
                        {scatterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getUrgencyColor(entry.urgency)} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Urgency Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={urgencyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="urgency" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="alerts" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Clustering Effectiveness */}
                <Card>
                  <CardHeader>
                    <CardTitle>Clustering Effectiveness</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Compression Ratio</span>
                        <span className="font-medium">{stats && (stats.compressionRatio * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={stats ? stats.compressionRatio * 100 : 0} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Quality Score</span>
                        <span className="font-medium">{stats && (stats.qualityScore * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={stats ? stats.qualityScore * 100 : 0} />
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Processing time: {stats?.processingTime}ms
                    </div>
                  </CardContent>
                </Card>

                {/* Top Clusters */}
                <Card>
                  <CardHeader>
                    <CardTitle>Largest Clusters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filteredClusters
                        .sort((a, b) => b.alerts.length - a.alerts.length)
                        .slice(0, 5)
                        .map(cluster => (
                          <div key={cluster.id} className="flex items-center justify-between text-sm">
                            <span className="truncate">{cluster.name}</span>
                            <Badge variant="outline">{cluster.alerts.length}</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Cluster Details Panel */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Cluster Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCluster ? (
                <ClusterDetails cluster={selectedCluster} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a cluster to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Mock data generators
function generateMockClusters(): AlertCluster[] {
  const clusters: AlertCluster[] = [];
  const clusterTypes = [
    'Suspicious Login Activity',
    'Malware Detection',
    'Network Anomalies',
    'Data Exfiltration',
    'Privilege Escalation',
    'Phishing Attempts'
  ];

  for (let i = 0; i < 12; i++) {
    const alertCount = Math.floor(Math.random() * 15) + 3;
    const alerts = Array.from({ length: alertCount }, (_, j) => generateMockAlert(i, j));
    
    clusters.push({
      id: `cluster-${i}`,
      name: `${clusterTypes[i % clusterTypes.length]} #${i + 1}`,
      description: `Cluster of ${alertCount} related security alerts`,
      alerts,
      representativeAlert: alerts[0],
      similarity: Math.random() * 0.4 + 0.6, // 0.6-1.0
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      clusteringMethod: ['dbscan', 'hierarchical', 'kmeans'][Math.floor(Math.random() * 3)],
      impactScore: Math.random() * 0.6 + 0.4, // 0.4-1.0
      urgency: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
      status: ['new', 'investigating', 'resolved', 'false_positive'][Math.floor(Math.random() * 4)] as any,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      tags: ['automated', 'ml-detected', 'correlation'].slice(0, Math.floor(Math.random() * 3) + 1)
    });
  }

  return clusters;
}

function generateMockAlert(clusterId: number, alertId: number): Alert {
  const severities = ['low', 'medium', 'high', 'critical'];
  const sources = ['EDR', 'SIEM', 'Network', 'Email', 'Web Proxy', 'Firewall'];
  
  return {
    id: `alert-${clusterId}-${alertId}`,
    title: `Security Alert ${clusterId}-${alertId}`,
    description: `Detailed description of security event detected by monitoring systems`,
    severity: severities[Math.floor(Math.random() * severities.length)] as any,
    source: sources[Math.floor(Math.random() * sources.length)],
    timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    ruleId: `rule-${Math.floor(Math.random() * 100)}`,
    ruleName: `Detection Rule ${Math.floor(Math.random() * 100)}`,
    riskScore: Math.random(),
    confidence: Math.random() * 0.4 + 0.6,
    indicators: {},
    mitreTactics: ['initial-access', 'execution', 'persistence'].slice(0, Math.floor(Math.random() * 2) + 1),
    mitreTechniques: ['T1078', 'T1059', 'T1055'].slice(0, Math.floor(Math.random() * 2) + 1)
  };
}

function generateMockStats(clusters: AlertCluster[]): ClusteringStats {
  const totalAlerts = clusters.reduce((sum, cluster) => sum + cluster.alerts.length, 0);
  
  return {
    totalAlerts,
    totalClusters: clusters.length,
    averageClusterSize: totalAlerts / clusters.length,
    compressionRatio: clusters.length / totalAlerts,
    processingTime: Math.floor(Math.random() * 1000) + 500,
    qualityScore: Math.random() * 0.3 + 0.7,
    unclusteredAlerts: Math.floor(Math.random() * 10)
  };
}