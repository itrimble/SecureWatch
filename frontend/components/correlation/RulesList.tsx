'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Rule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'disabled';
  triggers: number;
  lastTriggered: string;
  createdBy: string;
  createdAt: string;
  category: string;
}

interface RulesListProps {
  onEditRule: (rule: Rule) => void;
}

export function RulesList({ onEditRule }: RulesListProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [filteredRules, setFilteredRules] = useState<Rule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Mock data for development
  const mockRules: Rule[] = useMemo(() => [
    {
      id: '1',
      name: 'Multiple Failed Logins',
      description: 'Detects multiple failed login attempts from the same IP',
      severity: 'high',
      status: 'active',
      triggers: 23,
      lastTriggered: '2 hours ago',
      createdBy: 'Security Team',
      createdAt: '2024-01-15',
      category: 'Authentication'
    },
    {
      id: '2',
      name: 'Suspicious PowerShell Execution',
      description: 'Identifies encoded or obfuscated PowerShell commands',
      severity: 'critical',
      status: 'active',
      triggers: 5,
      lastTriggered: '15 minutes ago',
      createdBy: 'SOC Analyst',
      createdAt: '2024-01-12',
      category: 'Endpoint'
    },
    {
      id: '3',
      name: 'Data Exfiltration Pattern',
      description: 'Large data transfers to external IPs during off-hours',
      severity: 'critical',
      status: 'paused',
      triggers: 1,
      lastTriggered: '3 days ago',
      createdBy: 'Threat Hunter',
      createdAt: '2024-01-10',
      category: 'Network'
    },
    {
      id: '4',
      name: 'Privilege Escalation Attempt',
      description: 'Detects attempts to gain elevated privileges',
      severity: 'high',
      status: 'active',
      triggers: 12,
      lastTriggered: '1 hour ago',
      createdBy: 'Security Team',
      createdAt: '2024-01-08',
      category: 'Access Control'
    }
  ], []);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setRules(mockRules);
      setFilteredRules(mockRules);
      setLoading(false);
    }, 1000);
  }, [mockRules]);

  useEffect(() => {
    let filtered = rules;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(rule =>
        rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(rule => rule.status === filterStatus);
    }

    setFilteredRules(filtered);
  }, [rules, searchTerm, filterStatus]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'disabled': return <Clock className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const toggleRuleStatus = (ruleId: string) => {
    setRules(prevRules =>
      prevRules.map(rule =>
        rule.id === ruleId
          ? { ...rule, status: rule.status === 'active' ? 'paused' : 'active' }
          : rule
      )
    );
  };

  const deleteRule = (ruleId: string) => {
    setRules(prevRules => prevRules.filter(rule => rule.id !== ruleId));
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
    <Card>
      <CardHeader>
        <CardTitle>Correlation Rules</CardTitle>
        <CardDescription>
          Manage detection rules for automated threat correlation
        </CardDescription>
        
        {/* Search and Filter Controls */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border rounded-md bg-background"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredRules.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Rules Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all'
                ? 'No rules match your current filters.'
                : 'Create your first correlation rule to get started.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Triggers</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {rule.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getSeverityColor(rule.severity)} text-white`}>
                      {rule.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(rule.status)}
                      <span className="capitalize">{rule.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">{rule.triggers}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{rule.lastTriggered}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRuleStatus(rule.id)}
                        title={rule.status === 'active' ? 'Pause Rule' : 'Activate Rule'}
                      >
                        {rule.status === 'active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditRule(rule)}
                        title="Edit Rule"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                        title="Delete Rule"
                        className="text-red-500 hover:text-red-700"
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
  );
}