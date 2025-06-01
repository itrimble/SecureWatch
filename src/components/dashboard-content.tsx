'use client';

import { useState, useEffect } from 'react';
import {
  ShieldExclamationIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  GlobeAltIcon,
  ServerIcon,
  BugAntIcon,
  FireIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CogIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';

interface SIEMStats {
  totalEvents: number;
  criticalAlerts: number;
  activeThreats: number;
  systemsMonitored: number;
  eventsPerSecond: number;
  uptime: string;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  eventId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  destination?: string;
  description: string;
  user?: string;
  mitreTactic?: string;
}

interface ThreatAlert {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  status: 'new' | 'investigating' | 'contained' | 'resolved';
  description: string;
  affectedAssets: number;
  assignedTo?: string;
}

interface AssetStatus {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  status: 'online' | 'offline' | 'warning' | 'critical';
  lastSeen: string;
  alertCount: number;
}

interface ThreatIntelligence {
  indicator: string;
  type: 'ip' | 'domain' | 'hash' | 'url';
  threatScore: number;
  lastSeen: string;
  description: string;
}

export default function DashboardContent() {
  const [stats, setStats] = useState<SIEMStats>({
    totalEvents: 0,
    criticalAlerts: 0,
    activeThreats: 0,
    systemsMonitored: 0,
    eventsPerSecond: 0,
    uptime: '99.9%'
  });

  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [threatAlerts, setThreatAlerts] = useState<ThreatAlert[]>([]);
  const [assetStatus, setAssetStatus] = useState<AssetStatus[]>([]);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence[]>([]);

  // Mock real-time data loading
  useEffect(() => {
    const loadDashboardData = () => {
      setStats({
        totalEvents: 2847293,
        criticalAlerts: 15,
        activeThreats: 7,
        systemsMonitored: 2847,
        eventsPerSecond: 1247,
        uptime: '99.97%'
      });

      setRecentEvents([
        {
          id: '1',
          timestamp: '2025-06-01 18:23:45',
          eventId: '4625',
          severity: 'high',
          source: '192.168.1.100',
          destination: 'DC01.company.local',
          description: 'Failed logon attempt - Account locked out',
          user: 'admin',
          mitreTactic: 'Credential Access'
        },
        {
          id: '2',
          timestamp: '2025-06-01 18:22:12',
          eventId: '7045',
          severity: 'critical',
          source: 'WS-FINANCE-05',
          description: 'Suspicious service installed: "Windows Update Helper"',
          user: 'SYSTEM',
          mitreTactic: 'Persistence'
        },
        {
          id: '3',
          timestamp: '2025-06-01 18:21:33',
          eventId: '4688',
          severity: 'medium',
          source: 'WS-DEV-12',
          description: 'Process creation: powershell.exe with encoded command',
          user: 'john.smith',
          mitreTactic: 'Execution'
        },
        {
          id: '4',
          timestamp: '2025-06-01 18:20:55',
          eventId: '5156',
          severity: 'medium',
          source: '10.0.1.45',
          destination: '8.8.8.8',
          description: 'Outbound connection allowed to suspicious IP',
          mitreTactic: 'Command and Control'
        },
        {
          id: '5',
          timestamp: '2025-06-01 18:19:18',
          eventId: '4624',
          severity: 'low',
          source: 'VPN-GATEWAY',
          description: 'Successful logon from unusual location',
          user: 'sarah.wilson',
          mitreTactic: 'Initial Access'
        }
      ]);

      setThreatAlerts([
        {
          id: '1',
          title: 'Advanced Persistent Threat Detected',
          severity: 'critical',
          timestamp: '2025-06-01 18:15:30',
          status: 'investigating',
          description: 'Coordinated attack across multiple endpoints with lateral movement',
          affectedAssets: 12,
          assignedTo: 'SOC Team Alpha'
        },
        {
          id: '2',
          title: 'Ransomware Signature Match',
          severity: 'critical',
          timestamp: '2025-06-01 17:45:22',
          status: 'contained',
          description: 'File encryption patterns consistent with LockBit ransomware',
          affectedAssets: 3,
          assignedTo: 'Incident Response Team'
        },
        {
          id: '3',
          title: 'Data Exfiltration Attempt',
          severity: 'high',
          timestamp: '2025-06-01 17:22:15',
          status: 'new',
          description: 'Large volume data transfer to external cloud storage',
          affectedAssets: 1,
          assignedTo: 'SOC Analyst 2'
        },
        {
          id: '4',
          title: 'Privilege Escalation Detected',
          severity: 'high',
          timestamp: '2025-06-01 16:58:44',
          status: 'resolved',
          description: 'User account granted unexpected administrative privileges',
          affectedAssets: 2,
          assignedTo: 'Security Engineer'
        }
      ]);

      setAssetStatus([
        {
          id: '1',
          hostname: 'DC01.company.local',
          ip: '10.0.1.10',
          os: 'Windows Server 2022',
          status: 'critical',
          lastSeen: '2 min ago',
          alertCount: 8
        },
        {
          id: '2',
          hostname: 'WS-FINANCE-05',
          ip: '10.0.2.45',
          os: 'Windows 11',
          status: 'warning',
          lastSeen: '1 min ago',
          alertCount: 3
        },
        {
          id: '3',
          hostname: 'MAIL-SERVER-01',
          ip: '10.0.1.25',
          os: 'Exchange 2019',
          status: 'online',
          lastSeen: '30 sec ago',
          alertCount: 0
        },
        {
          id: '4',
          hostname: 'FILE-SERVER-02',
          ip: '10.0.3.15',
          os: 'Windows Server 2019',
          status: 'offline',
          lastSeen: '15 min ago',
          alertCount: 1
        },
        {
          id: '5',
          hostname: 'WEB-PROXY-01',
          ip: '10.0.1.50',
          os: 'pfSense 2.7',
          status: 'online',
          lastSeen: '10 sec ago',
          alertCount: 2
        }
      ]);

      setThreatIntel([
        {
          indicator: '185.220.101.182',
          type: 'ip',
          threatScore: 95,
          lastSeen: '5 min ago',
          description: 'Known C2 server for APT group'
        },
        {
          indicator: 'malware-download.exe',
          type: 'hash',
          threatScore: 88,
          lastSeen: '12 min ago',
          description: 'Trojan downloader variant'
        },
        {
          indicator: 'evil-corp.net',
          type: 'domain',
          threatScore: 92,
          lastSeen: '8 min ago',
          description: 'Phishing domain infrastructure'
        },
        {
          indicator: 'http://bit.ly/malware123',
          type: 'url',
          threatScore: 78,
          lastSeen: '20 min ago',
          description: 'Shortened URL leading to exploit kit'
        }
      ]);
    };

    loadDashboardData();

    // Simulate real-time updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        totalEvents: prev.totalEvents + Math.floor(Math.random() * 100),
        eventsPerSecond: 1000 + Math.floor(Math.random() * 500)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-100 border-red-200';
      case 'high': return 'text-orange-500 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-500 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-500 bg-blue-100 border-blue-200';
      default: return 'text-gray-500 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': case 'offline': case 'critical': return 'text-red-600 bg-red-100';
      case 'investigating': case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'contained': case 'online': return 'text-green-600 bg-green-100';
      case 'resolved': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getThreatScoreColor = (score: number) => {
    if (score >= 90) return 'text-red-600 bg-red-100';
    if (score >= 70) return 'text-orange-600 bg-orange-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="space-y-6 p-6 bg-gray-800 min-h-screen">
      {/* SIEM Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Security Operations Center</h1>
            <p className="text-red-100">Real-time threat detection and incident response</p>
          </div>
          <div className="text-right">
            <p className="text-red-100 text-sm">System Uptime</p>
            <p className="text-2xl font-bold">{stats.uptime}</p>
          </div>
        </div>
      </div>

      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents.toLocaleString()}</p>
              <p className="text-xs text-blue-600">Last 24 hours</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</p>
              <p className="text-xs text-red-600 flex items-center">
                <BellAlertIcon className="h-3 w-3 mr-1" />
                Requires attention
              </p>
            </div>
            <ShieldExclamationIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Threats</p>
              <p className="text-2xl font-bold text-orange-600">{stats.activeThreats}</p>
              <p className="text-xs text-orange-600">Being investigated</p>
            </div>
            <BugAntIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assets Monitored</p>
              <p className="text-2xl font-bold text-gray-900">{stats.systemsMonitored.toLocaleString()}</p>
              <p className="text-xs text-green-600">All connected</p>
            </div>
            <ComputerDesktopIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Events/Second</p>
              <p className="text-2xl font-bold text-purple-600">{stats.eventsPerSecond.toLocaleString()}</p>
              <p className="text-xs text-purple-600">Real-time ingestion</p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Network Status</p>
              <p className="text-2xl font-bold text-green-600">Healthy</p>
              <p className="text-xs text-green-600">No anomalies</p>
            </div>
            <GlobeAltIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Security Events */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Security Events</h3>
              <button className="text-blue-600 text-sm hover:underline">View Event Explorer</button>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                  <div className={`px-2 py-1 rounded-full text-xs border ${getSeverityColor(event.severity)}`}>
                    {event.severity.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">Event ID: {event.eventId}</p>
                      {event.mitreTactic && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {event.mitreTactic}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1 space-x-4">
                      <span className="flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {event.timestamp}
                      </span>
                      <span>Source: {event.source}</span>
                      {event.destination && <span>Dest: {event.destination}</span>}
                      {event.user && <span>User: {event.user}</span>}
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800">
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Threat Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Active Threat Alerts</h3>
              <button className="text-blue-600 text-sm hover:underline">Alert Management</button>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {threatAlerts.map((alert) => (
                <div key={alert.id} className="border rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(alert.status)}`}>
                          {alert.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-2 space-x-4">
                        <span className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {alert.timestamp}
                        </span>
                        <span>{alert.affectedAssets} assets affected</span>
                        {alert.assignedTo && <span>Assigned: {alert.assignedTo}</span>}
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 ml-2">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Status and Threat Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Asset Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Critical Asset Status</h3>
              <button className="text-blue-600 text-sm hover:underline">Asset Inventory</button>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {assetStatus.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ServerIcon className="h-6 w-6 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">{asset.hostname}</p>
                      <p className="text-sm text-gray-600">{asset.ip} • {asset.os}</p>
                      <p className="text-xs text-gray-500">Last seen: {asset.lastSeen}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(asset.status)}`}>
                      {asset.status.toUpperCase()}
                    </span>
                    {asset.alertCount > 0 && (
                      <p className="text-xs text-red-600 mt-1">{asset.alertCount} alerts</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Threat Intelligence Feed */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Threat Intelligence Feed</h3>
              <button className="text-blue-600 text-sm hover:underline">IOC Management</button>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {threatIntel.map((intel, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded uppercase">
                        {intel.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getThreatScoreColor(intel.threatScore)}`}>
                        Score: {intel.threatScore}
                      </span>
                    </div>
                    <p className="font-mono text-sm text-gray-900 break-all">{intel.indicator}</p>
                    <p className="text-sm text-gray-600">{intel.description}</p>
                    <p className="text-xs text-gray-500 mt-1">Last seen: {intel.lastSeen}</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 ml-2">
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SIEM Quick Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SIEM Operations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <FireIcon className="h-8 w-8 text-red-500 mb-2" />
            <span className="text-sm text-gray-700">Incident Response</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <MagnifyingGlassIcon className="h-8 w-8 text-blue-500 mb-2" />
            <span className="text-sm text-gray-700">Threat Hunting</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <DocumentTextIcon className="h-8 w-8 text-green-500 mb-2" />
            <span className="text-sm text-gray-700">Compliance Reports</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <ChartBarIcon className="h-8 w-8 text-purple-500 mb-2" />
            <span className="text-sm text-gray-700">Analytics</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <CogIcon className="h-8 w-8 text-indigo-500 mb-2" />
            <span className="text-sm text-gray-700">Rule Management</span>
          </button>
          
          <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <GlobeAltIcon className="h-8 w-8 text-orange-500 mb-2" />
            <span className="text-sm text-gray-700">Network Monitoring</span>
          </button>
        </div>
      </div>
    </div>
  );
}