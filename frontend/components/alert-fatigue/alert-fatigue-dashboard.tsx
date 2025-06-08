/**
 * Alert Fatigue Dashboard Component
 *
 * Comprehensive dashboard for managing alert fatigue reduction features,
 * including dynamic thresholds, clustering settings, and performance metrics.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Settings,
  Brain,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCcw,
  Info,
  Save,
  Activity,
  Gauge,
  Layers,
  Zap,
  Filter,
  Target,
  Cpu,
  Download,
  Upload,
  BarChart3,
  PieChartIcon,
  LineChartIcon
} from 'lucide-react';

interface ThresholdConfig {
  metricName: string;
  currentThreshold: number;
  baselineThreshold: number;
  minThreshold: number;
  maxThreshold: number;
  learningRate: number;
  enabled: boolean;
  lastUpdated: Date;
  confidenceScore: number;
}

interface ClusteringConfig {
  algorithm: 'dbscan' | 'hierarchical' | 'kmeans';
  similarityThreshold: number;
  minClusterSize: number;
  maxClusterSize: number;
  timeWindow: number;
  enabled: boolean;
}

interface FeedbackMetrics {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  accuracyScore: number;
  learningProgress: number;
}

interface PerformanceMetrics {
  alertVolume: Array<{ time: string; volume: number; reduced: number }>;
  falsePositiveRate: Array<{ date: string; rate: number }>;
  analystWorkload: Array<{ analyst: string; before: number; after: number }>;
  clusteringEfficiency: number;
  thresholdOptimization: number;
  overallReduction: number;
}

const AlertFatigueDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [thresholds, setThresholds] = useState<ThresholdConfig[]>([]);
  const [clusteringConfig, setClusteringConfig] = useState<ClusteringConfig>({
    algorithm: 'dbscan',
    similarityThreshold: 0.75,
    minClusterSize: 3,
    maxClusterSize: 50,
    timeWindow: 3600,
    enabled: true
  });
  const [feedbackMetrics, setFeedbackMetrics] = useState<FeedbackMetrics>({
    totalFeedback: 15234,
    positiveFeedback: 12891,
    negativeFeedback: 2343,
    accuracyScore: 84.6,
    learningProgress: 72
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Simulate loading data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setThresholds([
        {
          metricName: 'Failed Login Attempts',
          currentThreshold: 5,
          baselineThreshold: 10,
          minThreshold: 3,
          maxThreshold: 20,
          learningRate: 0.1,
          enabled: true,
          lastUpdated: new Date(),
          confidenceScore: 92
        },
        {
          metricName: 'Network Anomaly Score',
          currentThreshold: 75,
          baselineThreshold: 80,
          minThreshold: 50,
          maxThreshold: 100,
          learningRate: 0.05,
          enabled: true,
          lastUpdated: new Date(),
          confidenceScore: 87
        },
        {
          metricName: 'File Access Violations',
          currentThreshold: 3,
          baselineThreshold: 5,
          minThreshold: 1,
          maxThreshold: 10,
          learningRate: 0.15,
          enabled: true,
          lastUpdated: new Date(),
          confidenceScore: 78
        },
        {
          metricName: 'Malware Confidence',
          currentThreshold: 60,
          baselineThreshold: 70,
          minThreshold: 40,
          maxThreshold: 95,
          learningRate: 0.08,
          enabled: true,
          lastUpdated: new Date(),
          confidenceScore: 89
        }
      ]);

      setPerformanceMetrics({
        alertVolume: [
          { time: '00:00', volume: 450, reduced: 320 },
          { time: '04:00', volume: 280, reduced: 180 },
          { time: '08:00', volume: 820, reduced: 450 },
          { time: '12:00', volume: 950, reduced: 520 },
          { time: '16:00', volume: 780, reduced: 420 },
          { time: '20:00', volume: 550, reduced: 310 }
        ],
        falsePositiveRate: [
          { date: 'Mon', rate: 28 },
          { date: 'Tue', rate: 24 },
          { date: 'Wed', rate: 20 },
          { date: 'Thu', rate: 18 },
          { date: 'Fri', rate: 15 },
          { date: 'Sat', rate: 12 },
          { date: 'Sun', rate: 10 }
        ],
        analystWorkload: [
          { analyst: 'Sarah Chen', before: 120, after: 65 },
          { analyst: 'Mike Johnson', before: 150, after: 80 },
          { analyst: 'Lisa Wang', before: 135, after: 70 },
          { analyst: 'Tom Davis', before: 110, after: 55 },
          { analyst: 'Amy Lee', before: 140, after: 75 }
        ],
        clusteringEfficiency: 82,
        thresholdOptimization: 76,
        overallReduction: 42
      });

      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const updateThreshold = (metricName: string, field: keyof ThresholdConfig, value: any) => {
    setThresholds(prev => prev.map(t => 
      t.metricName === metricName ? { ...t, [field]: value, lastUpdated: new Date() } : t
    ));
    toast({
      title: 'Threshold Updated',
      description: `${metricName} ${field} updated successfully`
    });
  };

  const saveConfiguration = () => {
    toast({
      title: 'Configuration Saved',
      description: 'Alert fatigue reduction settings have been saved successfully'
    });
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alert Reduction</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics?.overallReduction}%</div>
            <p className="text-xs text-muted-foreground">vs. baseline volume</p>
            <Progress value={performanceMetrics?.overallReduction || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">False Positive Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10%</div>
            <p className="text-xs text-muted-foreground">-18% from last week</p>
            <Progress value={90} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clustering Efficiency</CardTitle>
            <Layers className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics?.clusteringEfficiency}%</div>
            <p className="text-xs text-muted-foreground">Alert deduplication rate</p>
            <Progress value={performanceMetrics?.clusteringEfficiency || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Progress</CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackMetrics.learningProgress}%</div>
            <p className="text-xs text-muted-foreground">Model optimization</p>
            <Progress value={feedbackMetrics.learningProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Alert Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Volume Reduction</CardTitle>
          <CardDescription>Original vs. reduced alert volume over 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceMetrics?.alertVolume || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="volume" 
                stackId="1"
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.6}
                name="Original Volume"
              />
              <Area 
                type="monotone" 
                dataKey="reduced" 
                stackId="2"
                stroke="#82ca9d" 
                fill="#82ca9d" 
                fillOpacity={0.6}
                name="After Reduction"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* False Positive Trend */}
        <Card>
          <CardHeader>
            <CardTitle>False Positive Rate Trend</CardTitle>
            <CardDescription>Weekly improvement in accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={performanceMetrics?.falsePositiveRate || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Analyst Workload */}
        <Card>
          <CardHeader>
            <CardTitle>Analyst Workload Reduction</CardTitle>
            <CardDescription>Alerts per analyst before/after optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={performanceMetrics?.analystWorkload || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="analyst" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="before" fill="#94a3b8" name="Before" />
                <Bar dataKey="after" fill="#22c55e" name="After" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderThresholds = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Dynamic Threshold Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure ML-powered dynamic thresholds for each metric
          </p>
        </div>
        <Button onClick={saveConfiguration}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {thresholds.map((threshold) => (
        <Card key={threshold.metricName}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base">{threshold.metricName}</CardTitle>
                <CardDescription>
                  Last updated: {threshold.lastUpdated.toLocaleString()}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant={threshold.confidenceScore > 80 ? 'default' : 'secondary'}>
                  {threshold.confidenceScore}% confidence
                </Badge>
                <Switch
                  checked={threshold.enabled}
                  onCheckedChange={(checked) => 
                    updateThreshold(threshold.metricName, 'enabled', checked)
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Current Threshold</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[threshold.currentThreshold]}
                    onValueChange={([value]) => 
                      updateThreshold(threshold.metricName, 'currentThreshold', value)
                    }
                    min={threshold.minThreshold}
                    max={threshold.maxThreshold}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={threshold.currentThreshold}
                    onChange={(e) => 
                      updateThreshold(threshold.metricName, 'currentThreshold', Number(e.target.value))
                    }
                    className="w-20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Learning Rate</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[threshold.learningRate * 100]}
                    onValueChange={([value]) => 
                      updateThreshold(threshold.metricName, 'learningRate', value / 100)
                    }
                    min={1}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12">{(threshold.learningRate * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Threshold Range</Label>
                <div className="flex items-center space-x-2 text-sm">
                  <Input
                    type="number"
                    value={threshold.minThreshold}
                    onChange={(e) => 
                      updateThreshold(threshold.metricName, 'minThreshold', Number(e.target.value))
                    }
                    className="w-20"
                    placeholder="Min"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    value={threshold.maxThreshold}
                    onChange={(e) => 
                      updateThreshold(threshold.metricName, 'maxThreshold', Number(e.target.value))
                    }
                    className="w-20"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Baseline: {threshold.baselineThreshold} | 
                Current: {threshold.currentThreshold} | 
                Adjustment: {((threshold.currentThreshold - threshold.baselineThreshold) / threshold.baselineThreshold * 100).toFixed(1)}%
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderClustering = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Alert Clustering Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure how similar alerts are grouped together
          </p>
        </div>
        <Button onClick={saveConfiguration}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clustering Algorithm Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Alert Clustering</Label>
              <p className="text-sm text-muted-foreground">
                Automatically group similar alerts to reduce noise
              </p>
            </div>
            <Switch
              checked={clusteringConfig.enabled}
              onCheckedChange={(checked) => 
                setClusteringConfig(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Clustering Algorithm</Label>
              <Select
                value={clusteringConfig.algorithm}
                onValueChange={(value) => 
                  setClusteringConfig(prev => ({ 
                    ...prev, 
                    algorithm: value as 'dbscan' | 'hierarchical' | 'kmeans' 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dbscan">DBSCAN (Density-Based)</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="kmeans">K-Means</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Window (seconds)</Label>
              <Input
                type="number"
                value={clusteringConfig.timeWindow}
                onChange={(e) => 
                  setClusteringConfig(prev => ({ ...prev, timeWindow: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Similarity Threshold</Label>
            <div className="flex items-center space-x-2">
              <Slider
                value={[clusteringConfig.similarityThreshold * 100]}
                onValueChange={([value]) => 
                  setClusteringConfig(prev => ({ ...prev, similarityThreshold: value / 100 }))
                }
                min={50}
                max={95}
                step={5}
                className="flex-1"
              />
              <span className="text-sm w-12">{(clusteringConfig.similarityThreshold * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Higher values create more specific clusters
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Minimum Cluster Size</Label>
              <Input
                type="number"
                value={clusteringConfig.minClusterSize}
                onChange={(e) => 
                  setClusteringConfig(prev => ({ ...prev, minClusterSize: Number(e.target.value) }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Minimum alerts to form a cluster
              </p>
            </div>

            <div className="space-y-2">
              <Label>Maximum Cluster Size</Label>
              <Input
                type="number"
                value={clusteringConfig.maxClusterSize}
                onChange={(e) => 
                  setClusteringConfig(prev => ({ ...prev, maxClusterSize: Number(e.target.value) }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum alerts per cluster
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clustering Performance Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Clustering Performance</CardTitle>
          <CardDescription>Real-time clustering metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold">247</div>
              <p className="text-sm text-muted-foreground">Active Clusters</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">3.8</div>
              <p className="text-sm text-muted-foreground">Avg Cluster Size</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">92%</div>
              <p className="text-sm text-muted-foreground">Deduplication Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFeedback = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Analyst Feedback & Learning</h3>
        <p className="text-sm text-muted-foreground">
          Monitor how analyst feedback improves the system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackMetrics.totalFeedback.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-sm">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-green-600">{feedbackMetrics.positiveFeedback.toLocaleString()}</span>
              <XCircle className="h-3 w-3 text-red-600 ml-2" />
              <span className="text-red-600">{feedbackMetrics.negativeFeedback.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Accuracy Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackMetrics.accuracyScore}%</div>
            <Progress value={feedbackMetrics.accuracyScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Learning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span className="text-sm">Model updating...</span>
            </div>
            <Progress value={feedbackMetrics.learningProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Feedback Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback by Alert Type</CardTitle>
          <CardDescription>Distribution of analyst feedback across different alert categories</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { category: 'Authentication', positive: 2450, negative: 180 },
                { category: 'Network', positive: 3200, negative: 420 },
                { category: 'Malware', positive: 1890, negative: 310 },
                { category: 'Data Access', positive: 2780, negative: 520 },
                { category: 'System', positive: 2571, negative: 913 }
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="positive" stackId="a" fill="#22c55e" name="Positive" />
              <Bar dataKey="negative" stackId="a" fill="#ef4444" name="Negative" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Learning Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Impact Analysis</CardTitle>
          <CardDescription>How feedback improves different aspects of the system</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart
              data={[
                { metric: 'False Positives', value: 85 },
                { metric: 'Alert Relevance', value: 78 },
                { metric: 'Clustering Accuracy', value: 82 },
                { metric: 'Threshold Optimization', value: 76 },
                { metric: 'Pattern Recognition', value: 88 },
                { metric: 'Anomaly Detection', value: 73 }
              ]}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Impact Score" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCcw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Alert Fatigue Reduction</h2>
        <p className="text-muted-foreground">
          Intelligent alert management powered by machine learning
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="thresholds">
            <Gauge className="h-4 w-4 mr-2" />
            Thresholds
          </TabsTrigger>
          <TabsTrigger value="clustering">
            <Layers className="h-4 w-4 mr-2" />
            Clustering
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <Brain className="h-4 w-4 mr-2" />
            Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="thresholds">
          {renderThresholds()}
        </TabsContent>

        <TabsContent value="clustering">
          {renderClustering()}
        </TabsContent>

        <TabsContent value="feedback">
          {renderFeedback()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlertFatigueDashboard;