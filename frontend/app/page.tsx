"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search,
  Shield,
  Activity,
  Database,
  Heart,
  Bell,
  Sun,
  Moon,
  User,
  Star,
  FileText,
  ChevronRight,
  CheckCircle,
  XCircle,
  Zap,
  Globe,
  TrendingUp,
  Clock,
  AlertTriangle,
  Server,
  Eye,
  Target
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { FirstRunExperience } from '@/components/onboarding/first-run-experience';

// Mock data for demonstration
const mockAlertData = [
  { name: '00:00', critical: 2, high: 5, medium: 12 },
  { name: '04:00', critical: 1, high: 8, medium: 15 },
  { name: '08:00', critical: 4, high: 12, medium: 20 },
  { name: '12:00', critical: 3, high: 9, medium: 18 },
  { name: '16:00', critical: 6, high: 15, medium: 25 },
  { name: '20:00', critical: 2, high: 7, medium: 14 },
];

const mockEpsData = [
  { time: '23:45', eps: 1245 },
  { time: '23:50', eps: 1320 },
  { time: '23:55', eps: 1180 },
  { time: '00:00', eps: 1456 },
  { time: '00:05', eps: 1289 },
  { time: '00:10', eps: 1367 },
];

const mockThreatData = [
  { name: 'Malware', value: 45, color: '#ef4444' },
  { name: 'Phishing', value: 32, color: '#f97316' },
  { name: 'Suspicious', value: 28, color: '#eab308' },
  { name: 'Other', value: 15, color: '#6b7280' },
];

const mockRecentAlerts = [
  { id: 1, severity: 'critical', title: 'Multiple Failed Login Attempts', time: '2m ago', source: 'Windows DC' },
  { id: 2, severity: 'high', title: 'Suspicious PowerShell Execution', time: '5m ago', source: 'Endpoint-001' },
  { id: 3, severity: 'critical', title: 'Privilege Escalation Detected', time: '8m ago', source: 'Linux Server' },
  { id: 4, severity: 'high', title: 'Unusual Network Traffic', time: '12m ago', source: 'Firewall' },
  { id: 5, severity: 'critical', title: 'Malware Signature Match', time: '15m ago', source: 'Endpoint-045' },
];

const mockFavoriteDashboards = [
  { id: 1, name: 'Executive Summary', lastViewed: '1h ago' },
  { id: 2, name: 'Network Security Overview', lastViewed: '3h ago' },
  { id: 3, name: 'Endpoint Threat Analysis', lastViewed: '1d ago' },
  { id: 4, name: 'User Behavior Analytics', lastViewed: '2d ago' },
];

const mockSavedSearches = [
  { id: 1, name: 'Failed Windows Logins', query: 'EventID:4625' },
  { id: 2, name: 'PowerShell Executions', query: 'ProcessName:"powershell.exe"' },
  { id: 3, name: 'Network Anomalies', query: 'bytes_out > 1000000' },
  { id: 4, name: 'Admin Account Usage', query: 'user_type:"admin"' },
];

const mockServices = [
  { name: 'Log Ingestion', status: 'healthy', uptime: '99.9%' },
  { name: 'Correlation Engine', status: 'healthy', uptime: '99.8%' },
  { name: 'KQL Engine', status: 'healthy', uptime: '99.9%' },
  { name: 'Database', status: 'warning', uptime: '98.5%' },
  { name: 'Search API', status: 'healthy', uptime: '99.7%' },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize current time on client side only to avoid hydration mismatch
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explorer?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-alert-critical';
      case 'high': return 'text-alert-high';
      case 'medium': return 'text-alert-medium';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4 text-alert-critical" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-alert-high" />;
      default: return <AlertTriangle className="w-4 h-4 text-alert-medium" />;
    }
  };

  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-alert-success" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-alert-medium" />;
      case 'error': return <XCircle className="w-4 h-4 text-alert-critical" />;
      default: return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="bg-card border-b border-border px-6 py-4 main-navigation">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Global Search */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-foreground">SecureWatch</span>
            </div>
            
            <form onSubmit={handleSearch} className="flex items-center global-search">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search with KQL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 pl-10 bg-background border-border text-foreground placeholder-muted-foreground"
                />
              </div>
            </form>
          </div>

          {/* Right: Navigation & Controls */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/explorer')}>
              <Search className="w-4 h-4 mr-2" />
              Explore
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/visualizations')}>
              <Activity className="w-4 h-4 mr-2" />
              Dashboards
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/alerts')}>
              <Bell className="w-4 h-4 mr-2" />
              Alerts
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/settings')}>
              <Server className="w-4 h-4 mr-2" />
              Settings
            </Button>
            
            <div className="h-6 w-px bg-border" />
            
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
              <Badge variant="destructive" className="ml-1 text-xs">3</Badge>
            </Button>
            
            <ThemeToggle />
            
            <Button variant="ghost" size="sm">
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Security Operations Center</h1>
              <p className="text-gray-400">
                Welcome back! Current time: {currentTime ? currentTime.toLocaleString() : 'Loading...'}
              </p>
            </div>
            
            {/* Quick Start CTA */}
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white quick-start-cta">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div>
                    <h3 className="font-semibold text-sm">New to SecureWatch?</h3>
                    <p className="text-xs opacity-90">Start with our interactive guide</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => router.push('/quick-start')}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Quick Start
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Row 1: Key Security Posture & System Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Critical Alerts Today */}
          <Card className="bg-gray-800 border-gray-700 critical-alerts-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Shield className="w-5 h-5 mr-2 text-red-400" />
                Critical & High Alerts Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400">12</div>
                  <div className="text-sm text-gray-400">Critical</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">28</div>
                  <div className="text-sm text-gray-400">High</div>
                </div>
              </div>
              <div className="h-16 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockAlertData}>
                    <Bar dataKey="critical" fill="#ef4444" />
                    <Bar dataKey="high" fill="#f97316" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#374151',
                        border: '1px solid #4b5563',
                        borderRadius: '6px'
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => router.push('/alerts')}
              >
                View All Alerts
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Data Ingestion Status */}
          <Card className="bg-gray-800 border-gray-700 data-ingestion-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-400" />
                Data Ingestion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-blue-400">1,367</div>
                <div className="text-sm text-gray-400">Events Per Second</div>
              </div>
              <div className="h-16 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockEpsData}>
                    <Line 
                      type="monotone" 
                      dataKey="eps" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#374151',
                        border: '1px solid #4b5563',
                        borderRadius: '6px'
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Sources:</span>
                  <span className="text-green-400">15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">With Warnings:</span>
                  <span className="text-yellow-400">2</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => router.push('/settings/log-sources')}
              >
                Manage Log Sources
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Platform Health */}
          <Card className="bg-gray-800 border-gray-700 platform-health-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Heart className="w-5 h-5 mr-2 text-green-400" />
                Platform Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getServiceStatusIcon(service.status)}
                      <span className="text-sm">{service.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{service.uptime}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">System Resources</div>
                <div className="flex justify-between text-sm">
                  <span>CPU: Moderate</span>
                  <span>Memory: Normal</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => router.push('/settings/platform-status')}
              >
                System Monitor
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Recent Activity & Threat Intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Critical Alerts Feed */}
          <Card className="bg-gray-800 border-gray-700 recent-alerts-feed">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                Latest Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {mockRecentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded cursor-pointer">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{alert.title}</div>
                      <div className="text-xs text-gray-400">{alert.source}</div>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {alert.time}
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => router.push('/alerts')}
              >
                View All Alerts
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Threat Intelligence Overview */}
          <Card className="bg-gray-800 border-gray-700 threat-intelligence-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Globe className="w-5 h-5 mr-2 text-purple-400" />
                Threat Intelligence Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">1,247</div>
                  <div className="text-xs text-gray-400">New IOCs Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">89</div>
                  <div className="text-xs text-gray-400">Matches Found</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center mb-4">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockThreatData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={60}
                      >
                        {mockThreatData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#374151',
                          border: '1px solid #4b5563',
                          borderRadius: '6px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="space-y-1 text-xs">
                {mockThreatData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-gray-400">{item.value}%</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                Last Sync: {new Date().toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Favorite Dashboards */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-400" />
                Favorite Dashboards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockFavoriteDashboards.map((dashboard) => (
                  <div 
                    key={dashboard.id} 
                    className="flex items-center justify-between p-2 hover:bg-gray-700 rounded cursor-pointer"
                    onClick={() => router.push('/visualizations')}
                  >
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{dashboard.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">{dashboard.lastViewed}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Saved Searches */}
          <Card className="bg-gray-800 border-gray-700 quick-hunt-searches">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <FileText className="w-5 h-5 mr-2 text-green-400" />
                Quick Hunt Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockSavedSearches.map((search) => (
                  <div 
                    key={search.id} 
                    className="flex items-center justify-between p-2 hover:bg-gray-700 rounded cursor-pointer"
                    onClick={() => router.push(`/explorer?query=${encodeURIComponent(search.query)}`)}
                  >
                    <div>
                      <div className="text-sm font-medium">{search.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{search.query}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => router.push('/explorer')}
              >
                View All Searches
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* First Run Experience */}
      <FirstRunExperience />
    </div>
  );
}