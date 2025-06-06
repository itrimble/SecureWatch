'use client';

// Content Management UI - Manage community-sourced detection rules
// Provides interface for importing, enabling/disabling, and monitoring community rules

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Download, Shield, AlertTriangle, CheckCircle, Clock, BarChart3 } from 'lucide-react';

interface RuleSource {
  name: string;
  type: 'sigma' | 'elastic' | 'ossec' | 'suricata' | 'splunk' | 'chronicle';
  description: string;
  url: string;
  enabled: boolean;
}

interface CommunityRule {
  id: string;
  rule_id: string;
  title: string;
  description: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  severity: number;
  source_type: string;
  category: string;
  enabled: boolean;
  mitre_attack_techniques: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface ImportResult {
  source: string;
  success: boolean;
  importResult?: {
    total_rules: number;
    successful_imports: number;
    failed_imports: number;
    skipped_rules: number;
    import_duration: number;
  };
  error?: string;
  duration: number;
}

interface RuleStatistics {
  total_rules: number;
  enabled_rules: number;
  disabled_rules: number;
  rules_by_source: Record<string, number>;
  rules_by_level: Record<string, number>;
  rules_by_category: Record<string, number>;
  last_import?: string;
  avg_import_duration?: number;
}

const RULE_INGESTOR_API = process.env.NEXT_PUBLIC_RULE_INGESTOR_URL || 'http://localhost:4007';

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sources, setSources] = useState<RuleSource[]>([]);
  const [rules, setRules] = useState<CommunityRule[]>([]);
  const [statistics, setStatistics] = useState<RuleStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 50;

  // Load data on component mount
  useEffect(() => {
    loadSources();
    loadStatistics();
    loadRules();
  }, []);

  // Load available rule sources
  const loadSources = async () => {
    try {
      const response = await fetch(`${RULE_INGESTOR_API}/api/sources`);
      const data = await response.json();
      if (data.status === 'success') {
        setSources(data.sources);
      }
    } catch (error) {
      console.error('Failed to load sources:', error);
      setError('Failed to load rule sources');
    }
  };

  // Load rule statistics
  const loadStatistics = async () => {
    try {
      const response = await fetch(`${RULE_INGESTOR_API}/api/rules/stats`);
      const data = await response.json();
      if (data.status === 'success') {
        setStatistics(data.stats);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  // Load community rules with filters
  const loadRules = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      });

      if (searchQuery) params.append('query', searchQuery);
      if (selectedSource !== 'all') params.append('source_type', selectedSource);
      if (selectedLevel !== 'all') params.append('level', selectedLevel);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const response = await fetch(`${RULE_INGESTOR_API}/api/rules/search?${params}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setRules(data.rules);
      }
    } catch (error) {
      console.error('Failed to load rules:', error);
      setError('Failed to load community rules');
    } finally {
      setLoading(false);
    }
  };

  // Trigger import from specific source
  const importFromSource = async (sourceName: string, forceUpdate: boolean = false) => {
    setImporting(prev => ({ ...prev, [sourceName]: true }));
    setError(null);

    try {
      const response = await fetch(`${RULE_INGESTOR_API}/api/import/${sourceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceUpdate })
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setImportResults(prev => [data.result, ...prev.slice(0, 9)]); // Keep last 10 results
        await loadStatistics();
        await loadRules();
      } else {
        setError(`Import failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      setError('Import request failed');
    } finally {
      setImporting(prev => ({ ...prev, [sourceName]: false }));
    }
  };

  // Import from all sources
  const importFromAllSources = async (forceUpdate: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${RULE_INGESTOR_API}/api/import/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceUpdate })
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setImportResults(data.results);
        await loadStatistics();
        await loadRules();
      } else {
        setError(`Full import failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Full import failed:', error);
      setError('Full import request failed');
    } finally {
      setLoading(false);
    }
  };

  // Toggle rule enabled status
  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`${RULE_INGESTOR_API}/api/rules/${ruleId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        // Update local state
        setRules(prev => prev.map(rule => 
          rule.rule_id === ruleId ? { ...rule, enabled } : rule
        ));
        await loadStatistics();
      } else {
        setError('Failed to toggle rule status');
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      setError('Failed to toggle rule status');
    }
  };

  // Get severity badge color
  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get source type badge color
  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case 'sigma': return 'bg-blue-500';
      case 'elastic': return 'bg-purple-500';
      case 'ossec': return 'bg-green-600';
      case 'suricata': return 'bg-orange-600';
      case 'splunk': return 'bg-black';
      case 'chronicle': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  // Reload rules when filters change
  useEffect(() => {
    loadRules();
  }, [searchQuery, selectedSource, selectedLevel, selectedCategory, currentPage]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">
            Manage community-sourced detection rules from Sigma, Elastic, OSSEC, and other sources
          </p>
        </div>
        <Button 
          onClick={() => importFromAllSources(false)}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Import All Sources
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Rule Sources</TabsTrigger>
          <TabsTrigger value="rules">Community Rules</TabsTrigger>
          <TabsTrigger value="imports">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.total_rules || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.enabled_rules || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disabled Rules</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.disabled_rules || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Import</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {statistics?.last_import 
                    ? new Date(statistics.last_import).toLocaleDateString()
                    : 'Never'
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rules by Source Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Rules by Source</CardTitle>
              <CardDescription>Distribution of community rules by source type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statistics && Object.entries(statistics.rules_by_source).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getSourceColor(source)}>{source}</Badge>
                      <span className="capitalize">{source}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(count / statistics.total_rules) * 100} 
                        className="w-20" 
                      />
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rules by Severity */}
          <Card>
            <CardHeader>
              <CardTitle>Rules by Severity</CardTitle>
              <CardDescription>Distribution of rules by severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statistics && Object.entries(statistics.rules_by_level).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(level)}>{level}</Badge>
                      <span className="capitalize">{level}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(count / statistics.total_rules) * 100} 
                        className="w-20" 
                      />
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rule Sources</CardTitle>
              <CardDescription>
                Manage community rule repositories and trigger imports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sources.map((source) => (
                  <div key={source.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{source.name}</h3>
                        <Badge className={getSourceColor(source.type)}>{source.type}</Badge>
                        {source.enabled ? (
                          <Badge variant="outline" className="text-green-600">Enabled</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">Disabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{source.description}</p>
                      <p className="text-xs text-muted-foreground">{source.url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => importFromSource(source.name, false)}
                        disabled={!source.enabled || importing[source.name]}
                      >
                        {importing[source.name] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Import
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => importFromSource(source.name, true)}
                        disabled={!source.enabled || importing[source.name]}
                      >
                        Force Update
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="sigma">Sigma</SelectItem>
                    <SelectItem value="elastic">Elastic</SelectItem>
                    <SelectItem value="ossec">OSSEC</SelectItem>
                    <SelectItem value="suricata">Suricata</SelectItem>
                    <SelectItem value="splunk">Splunk</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="process">Process</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="registry">Registry</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Rules Table */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>MITRE ATT&CK</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.rule_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rule.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {rule.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSourceColor(rule.source_type)}>
                            {rule.source_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(rule.level)}>
                            {rule.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{rule.category}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {rule.mitre_attack_techniques.slice(0, 3).map((technique) => (
                              <Badge key={technique} variant="outline" className="text-xs">
                                {technique}
                              </Badge>
                            ))}
                            {rule.mitre_attack_techniques.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{rule.mitre_attack_techniques.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(enabled) => toggleRule(rule.rule_id, enabled)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Imports</CardTitle>
              <CardDescription>History of rule imports from community sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {importResults.map((result, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{result.source}</h3>
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Duration: {(result.duration / 1000).toFixed(1)}s
                      </span>
                    </div>
                    
                    {result.success && result.importResult ? (
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <span className="ml-1 font-medium">{result.importResult.total_rules}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Successful:</span>
                          <span className="ml-1 font-medium text-green-600">
                            {result.importResult.successful_imports}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Failed:</span>
                          <span className="ml-1 font-medium text-red-600">
                            {result.importResult.failed_imports}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Skipped:</span>
                          <span className="ml-1 font-medium text-yellow-600">
                            {result.importResult.skipped_rules}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">{result.error}</p>
                    )}
                  </div>
                ))}
                
                {importResults.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No import history available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}