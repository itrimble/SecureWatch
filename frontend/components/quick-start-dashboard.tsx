"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Play,
  BookOpen,
  Shield,
  Activity,
  Search,
  AlertTriangle,
  TrendingUp,
  Users,
  Globe,
  Database,
  FileText,
  Target,
  Zap,
  Lock,
  Eye,
  ChevronRight,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";
import { LineChart as RechartsLineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/use-onboarding';

// Demo data for quick-start experience
const demoSecurityEvents = [
  { time: '09:00', failed_logins: 12, malware_detections: 3, network_anomalies: 7 },
  { time: '10:00', failed_logins: 18, malware_detections: 1, network_anomalies: 5 },
  { time: '11:00', failed_logins: 8, malware_detections: 2, network_anomalies: 12 },
  { time: '12:00', failed_logins: 22, malware_detections: 5, network_anomalies: 8 },
  { time: '13:00', failed_logins: 15, malware_detections: 2, network_anomalies: 15 },
  { time: '14:00', failed_logins: 28, malware_detections: 7, network_anomalies: 6 },
];

const demoThreatsByType = [
  { name: 'Malware', value: 35, color: '#ef4444' },
  { name: 'Phishing', value: 25, color: '#f97316' },
  { name: 'Brute Force', value: 20, color: '#eab308' },
  { name: 'Anomalous Traffic', value: 15, color: '#8b5cf6' },
  { name: 'Other', value: 5, color: '#6b7280' },
];

const demoTopUsers = [
  { user: 'admin@company.com', events: 245, risk_score: 85 },
  { user: 'john.doe@company.com', events: 189, risk_score: 42 },
  { user: 'service_account_1', events: 156, risk_score: 67 },
  { user: 'mary.smith@company.com', events: 134, risk_score: 28 },
  { user: 'backup_service', events: 98, risk_score: 71 },
];

const demoNetworkTraffic = [
  { time: '09:00', inbound: 1200, outbound: 800, suspicious: 45 },
  { time: '10:00', inbound: 1350, outbound: 920, suspicious: 38 },
  { time: '11:00', inbound: 1100, outbound: 750, suspicious: 62 },
  { time: '12:00', inbound: 1500, outbound: 1100, suspicious: 28 },
  { time: '13:00', inbound: 1250, outbound: 850, suspicious: 55 },
  { time: '14:00', inbound: 1400, outbound: 950, suspicious: 41 },
];

const demoLearningModules = [
  {
    id: 1,
    title: 'KQL Fundamentals',
    description: 'Learn the basics of Kusto Query Language for threat hunting',
    duration: '15 min',
    difficulty: 'Beginner',
    icon: <Search className="w-5 h-5" />,
    completed: false
  },
  {
    id: 2,
    title: 'Incident Response Workflow',
    description: 'Master the complete incident response process',
    duration: '25 min',
    difficulty: 'Intermediate',
    icon: <Shield className="w-5 h-5" />,
    completed: false
  },
  {
    id: 3,
    title: 'Threat Intelligence Analysis',
    description: 'Understand IOC enrichment and threat correlation',
    duration: '20 min',
    difficulty: 'Intermediate',
    icon: <Globe className="w-5 h-5" />,
    completed: false
  },
  {
    id: 4,
    title: 'Dashboard Creation',
    description: 'Build custom security dashboards and visualizations',
    duration: '30 min',
    difficulty: 'Advanced',
    icon: <BarChart3 className="w-5 h-5" />,
    completed: false
  }
];

const demoScenarios = [
  {
    id: 1,
    title: 'Investigating Lateral Movement',
    description: 'Detect and analyze lateral movement techniques in a simulated enterprise network',
    type: 'Hands-on Lab',
    estimatedTime: '45 min',
    difficulty: 'Intermediate',
    tags: ['MITRE ATT&CK', 'Network Analysis', 'Windows Events']
  },
  {
    id: 2,
    title: 'Phishing Campaign Analysis',
    description: 'Investigate a multi-stage phishing attack from initial delivery to data exfiltration',
    type: 'Scenario',
    estimatedTime: '30 min',
    difficulty: 'Beginner',
    tags: ['Email Security', 'IOC Analysis', 'Timeline Reconstruction']
  },
  {
    id: 3,
    title: 'Ransomware Detection',
    description: 'Hunt for ransomware indicators and understand encryption patterns',
    type: 'Hands-on Lab',
    estimatedTime: '60 min',
    difficulty: 'Advanced',
    tags: ['Behavioral Analysis', 'File System Monitoring', 'Recovery']
  }
];

interface QuickStartDashboardProps {
  className?: string;
}

export function QuickStartDashboard({ className }: QuickStartDashboardProps) {
  const router = useRouter();
  const { markFeatureAsSeen } = useOnboarding();
  const [activeTab, setActiveTab] = useState('overview');

  const handleStartLearning = (moduleId: number) => {
    markFeatureAsSeen('quick-start-learning');
    // For demo purposes - would integrate with actual learning system
    console.log(`Starting learning module: ${moduleId}`);
  };

  const handleStartScenario = (scenarioId: number) => {
    markFeatureAsSeen('quick-start-scenario');
    // For demo purposes - would integrate with actual lab environment
    console.log(`Starting scenario: ${scenarioId}`);
  };

  const handleExploreData = () => {
    markFeatureAsSeen('first-search');
    router.push('/explorer?query=EventID:4624 OR EventID:4625&demo=true');
  };

  return (
    <div className={className}>
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center">
                <Target className="w-6 h-6 mr-3 text-blue-600" />
                Quick Start Learning Center
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Explore sample security data and learn SecureWatch capabilities
              </p>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Demo Environment
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Demo Data</TabsTrigger>
              <TabsTrigger value="learn">Learning Modules</TabsTrigger>
              <TabsTrigger value="scenarios">Practice Scenarios</TabsTrigger>
              <TabsTrigger value="progress">Your Progress</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Security Events Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-green-600" />
                      Sample Security Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={demoSecurityEvents}>
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="failed_logins" stroke="#ef4444" name="Failed Logins" />
                          <Line type="monotone" dataKey="malware_detections" stroke="#f97316" name="Malware" />
                          <Line type="monotone" dataKey="network_anomalies" stroke="#8b5cf6" name="Network Anomalies" />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={handleExploreData}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Explore This Data
                    </Button>
                  </CardContent>
                </Card>

                {/* Threat Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <PieChart className="w-5 h-5 mr-2 text-purple-600" />
                      Threat Type Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={demoThreatsByType}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                          >
                            {demoThreatsByType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => router.push('/correlation?demo=true')}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      View Threat Analysis
                    </Button>
                  </CardContent>
                </Card>

                {/* High-Risk Users */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Users className="w-5 h-5 mr-2 text-orange-600" />
                      User Risk Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {demoTopUsers.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{user.user}</div>
                            <div className="text-xs text-muted-foreground">{user.events} events</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-16">
                              <Progress value={user.risk_score} className="h-2" />
                            </div>
                            <Badge 
                              variant={user.risk_score > 70 ? 'destructive' : user.risk_score > 40 ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {user.risk_score}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => router.push('/visualizations?type=ueba&demo=true')}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      User Behavior Analytics
                    </Button>
                  </CardContent>
                </Card>

                {/* Network Traffic */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Globe className="w-5 h-5 mr-2 text-blue-600" />
                      Network Traffic Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demoNetworkTraffic}>
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="inbound" fill="#3b82f6" name="Inbound (MB)" />
                          <Bar dataKey="outbound" fill="#10b981" name="Outbound (MB)" />
                          <Bar dataKey="suspicious" fill="#ef4444" name="Suspicious" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => router.push('/explorer?query=source_type:"network" AND suspicious:true&demo=true')}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Investigate Network Events
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="learn" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {demoLearningModules.map((module) => (
                  <Card key={module.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            {module.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{module.title}</CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {module.difficulty}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {module.duration}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm mb-4">
                        {module.description}
                      </p>
                      <Button 
                        className="w-full"
                        onClick={() => handleStartLearning(module.id)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Learning
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="scenarios" className="mt-6">
              <div className="space-y-4">
                {demoScenarios.map((scenario) => (
                  <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold">{scenario.title}</h3>
                            <Badge variant="outline">{scenario.type}</Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">{scenario.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                            <span>⏱️ {scenario.estimatedTime}</span>
                            <span>📊 {scenario.difficulty}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {scenario.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button 
                          className="ml-4"
                          onClick={() => handleStartScenario(scenario.id)}
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Start Scenario
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="progress" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                      Learning Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">25%</div>
                      <Progress value={25} className="h-2 mb-2" />
                      <div className="text-sm text-muted-foreground">1 of 4 modules completed</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Target className="w-5 h-5 mr-2 text-green-600" />
                      Scenarios Completed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">0</div>
                      <Progress value={0} className="h-2 mb-2" />
                      <div className="text-sm text-muted-foreground">0 of 3 scenarios completed</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-purple-600" />
                      Skill Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600 mb-2">Beginner</div>
                      <Badge variant="outline" className="mb-2">
                        Getting Started
                      </Badge>
                      <div className="text-sm text-muted-foreground">Continue learning to advance</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Next Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Search className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Complete KQL Fundamentals</div>
                          <div className="text-sm text-muted-foreground">Learn basic query syntax</div>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('learn')}>
                        Continue
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium">Try First Investigation</div>
                          <div className="text-sm text-muted-foreground">Practice with demo scenario</div>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('scenarios')}>
                        Start
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}