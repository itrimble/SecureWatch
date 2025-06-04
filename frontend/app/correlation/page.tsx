'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Activity, AlertTriangle, Shield, Brain } from 'lucide-react';
import { RulesList } from '@/components/correlation/RulesList';
import { RuleEditor } from '@/components/correlation/RuleEditor';
import { IncidentsList } from '@/components/correlation/IncidentsList';
import { PatternAnalysis } from '@/components/correlation/PatternAnalysis';
import { CorrelationDashboard } from '@/components/correlation/CorrelationDashboard';

export default function CorrelationPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [stats, setStats] = useState({
    activeRules: 0,
    openIncidents: 0,
    detectedPatterns: 0,
    riskScore: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/correlation/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch correlation stats:', error);
    }
  };

  const handleCreateRule = () => {
    setSelectedRule(null);
    setShowRuleEditor(true);
  };

  const handleEditRule = (rule: any) => {
    setSelectedRule(rule);
    setShowRuleEditor(true);
  };

  const handleCloseEditor = () => {
    setShowRuleEditor(false);
    setSelectedRule(null);
    fetchStats();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Correlation & Rules Engine</h1>
          <p className="text-muted-foreground mt-2">
            Real-time event correlation and automated threat detection
          </p>
        </div>
        <Button onClick={handleCreateRule} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRules}</div>
            <p className="text-xs text-muted-foreground">
              Monitoring events in real-time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.openIncidents}</div>
            <p className="text-xs text-muted-foreground">
              Requiring investigation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detected Patterns</CardTitle>
            <Brain className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.detectedPatterns}</div>
            <p className="text-xs text-muted-foreground">
              Attack chains identified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.riskScore}</div>
            <p className="text-xs text-muted-foreground">
              Overall security posture
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <CorrelationDashboard />
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <RulesList onEditRule={handleEditRule} />
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <IncidentsList />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <PatternAnalysis />
        </TabsContent>
      </Tabs>

      {/* Rule Editor Modal */}
      {showRuleEditor && (
        <RuleEditor
          rule={selectedRule}
          onClose={handleCloseEditor}
          onSave={(rule) => {
            console.log('Saving rule:', rule);
            handleCloseEditor();
          }}
        />
      )}
    </div>
  );
}