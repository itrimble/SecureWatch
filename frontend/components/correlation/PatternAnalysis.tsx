'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Network,
  Clock,
  Target,
  Zap,
  Eye,
  Activity
} from 'lucide-react';

interface AttackPattern {
  id: string;
  name: string;
  technique: string;
  tactic: string;
  confidence: number;
  frequency: number;
  lastSeen: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedAssets: string[];
  mitreId: string;
}

interface TrendData {
  date: string;
  attacks: number;
  detections: number;
  false_positives: number;
}

interface TacticData {
  name: string;
  count: number;
  color: string;
}

export function PatternAnalysis() {
  const [patterns, setPatterns] = useState<AttackPattern[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [tactics, setTactics] = useState<TacticData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  // Mock data for development
  const mockPatterns: AttackPattern[] = [
    {
      id: '1',
      name: 'Credential Dumping Chain',
      technique: 'OS Credential Dumping',
      tactic: 'Credential Access',
      confidence: 92,
      frequency: 15,
      lastSeen: '2 hours ago',
      severity: 'critical',
      description: 'Pattern of LSASS memory access followed by credential extraction tools',
      affectedAssets: ['DC-01', 'WS-USER-05', 'SRV-FILE-02'],
      mitreId: 'T1003'
    },
    {
      id: '2',
      name: 'Lateral Movement Sequence',
      technique: 'Remote Services',
      tactic: 'Lateral Movement',
      confidence: 87,
      frequency: 8,
      lastSeen: '4 hours ago',
      severity: 'high',
      description: 'Sequential RDP connections across multiple systems with privilege escalation',
      affectedAssets: ['WS-ADMIN-01', 'SRV-DB-01', 'SRV-WEB-02'],
      mitreId: 'T1021'
    },
    {
      id: '3',
      name: 'Data Staging and Exfiltration',
      technique: 'Data Staged',
      tactic: 'Exfiltration',
      confidence: 78,
      frequency: 3,
      lastSeen: '1 day ago',
      severity: 'critical',
      description: 'Large file compression followed by external network transfers',
      affectedAssets: ['FS-PRIMARY', 'GW-EXTERNAL'],
      mitreId: 'T1074'
    },
    {
      id: '4',
      name: 'Persistence Establishment',
      technique: 'Registry Run Keys',
      tactic: 'Persistence',
      confidence: 94,
      frequency: 12,
      lastSeen: '6 hours ago',
      severity: 'high',
      description: 'Modification of registry autorun keys with suspicious executables',
      affectedAssets: ['WS-USER-12', 'WS-USER-08'],
      mitreId: 'T1547.001'
    },
    {
      id: '5',
      name: 'Command and Control',
      technique: 'Web Protocols',
      tactic: 'Command and Control',
      confidence: 85,
      frequency: 22,
      lastSeen: '30 minutes ago',
      severity: 'medium',
      description: 'Periodic HTTP beacon traffic to suspicious domains',
      affectedAssets: ['WS-USER-03', 'PROXY-01'],
      mitreId: 'T1071.001'
    }
  ];

  const mockTrends: TrendData[] = [
    { date: '2024-01-14', attacks: 12, detections: 10, false_positives: 2 },
    { date: '2024-01-15', attacks: 18, detections: 15, false_positives: 3 },
    { date: '2024-01-16', attacks: 8, detections: 7, false_positives: 1 },
    { date: '2024-01-17', attacks: 24, detections: 20, false_positives: 4 },
    { date: '2024-01-18', attacks: 15, detections: 13, false_positives: 2 },
    { date: '2024-01-19', attacks: 31, detections: 27, false_positives: 4 },
    { date: '2024-01-20', attacks: 19, detections: 17, false_positives: 2 }
  ];

  const mockTactics: TacticData[] = [
    { name: 'Initial Access', count: 8, color: '#ff6b6b' },
    { name: 'Credential Access', count: 15, color: '#4ecdc4' },
    { name: 'Lateral Movement', count: 12, color: '#45b7d1' },
    { name: 'Persistence', count: 10, color: '#96ceb4' },
    { name: 'Exfiltration', count: 6, color: '#feca57' },
    { name: 'Command & Control', count: 14, color: '#ff9ff3' }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setPatterns(mockPatterns);
      setTrends(mockTrends);
      setTactics(mockTactics);
      setLoading(false);
    }, 1000);
  }, [timeRange]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Patterns</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.length}</div>
            <p className="text-xs text-muted-foreground">
              +3 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {patterns.filter(p => p.confidence >= 90).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Above 90% confidence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Patterns</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {patterns.filter(p => p.severity === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detection Rate</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">
              Successful detections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {['1d', '7d', '30d'].map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            {range === '1d' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
          </Button>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Attack Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Attack Pattern Trends
            </CardTitle>
            <CardDescription>
              Daily attack pattern detection over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="attacks" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Attack Patterns"
                />
                <Line 
                  type="monotone" 
                  dataKey="detections" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Successful Detections"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MITRE ATT&CK Tactics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              MITRE ATT&CK Tactics
            </CardTitle>
            <CardDescription>
              Distribution of attack tactics detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tactics}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {tactics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detected Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Detected Attack Patterns
          </CardTitle>
          <CardDescription>
            AI-identified attack patterns and sequences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patterns.map((pattern) => (
              <div key={pattern.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{pattern.name}</h3>
                      <Badge className={`${getSeverityColor(pattern.severity)} text-white`}>
                        {pattern.severity}
                      </Badge>
                      <Badge variant="outline">
                        {pattern.mitreId}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {pattern.description}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Technique:</span>
                        <div className="text-muted-foreground">{pattern.technique}</div>
                      </div>
                      <div>
                        <span className="font-medium">Tactic:</span>
                        <div className="text-muted-foreground">{pattern.tactic}</div>
                      </div>
                      <div>
                        <span className="font-medium">Frequency:</span>
                        <div className="text-muted-foreground">{pattern.frequency} times</div>
                      </div>
                      <div>
                        <span className="font-medium">Last Seen:</span>
                        <div className="text-muted-foreground">{pattern.lastSeen}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium mb-1">Confidence</div>
                    <div className={`text-2xl font-bold ${getConfidenceColor(pattern.confidence)}`}>
                      {pattern.confidence}%
                    </div>
                    <Progress value={pattern.confidence} className="w-20 mt-1" />
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Affected Assets: </span>
                      <div className="flex gap-1 mt-1">
                        {pattern.affectedAssets.map((asset) => (
                          <Badge key={asset} variant="secondary" className="text-xs">
                            {asset}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Investigate
                      </Button>
                      <Button variant="outline" size="sm">
                        <Activity className="h-4 w-4 mr-1" />
                        Create Rule
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}