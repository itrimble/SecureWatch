'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Eye } from 'lucide-react';

export function RecentAlertsWidget() {
  const alerts = [
    {
      id: 'ALT-001',
      title: 'Suspicious Login Activity',
      description: 'Multiple failed login attempts from IP 192.168.1.100',
      severity: 'high',
      time: '2 minutes ago',
      status: 'open',
    },
    {
      id: 'ALT-002',
      title: 'Malware Detection',
      description: 'Trojan.Win32.Agent detected on workstation WS-045',
      severity: 'critical',
      time: '5 minutes ago',
      status: 'investigating',
    },
    {
      id: 'ALT-003',
      title: 'Unusual Network Traffic',
      description: 'High volume of outbound traffic to external IP',
      severity: 'medium',
      time: '12 minutes ago',
      status: 'open',
    },
    {
      id: 'ALT-004',
      title: 'Privilege Escalation Attempt',
      description: 'User account attempted to access admin resources',
      severity: 'high',
      time: '18 minutes ago',
      status: 'resolved',
    },
    {
      id: 'ALT-005',
      title: 'DDoS Attack Detected',
      description: 'Incoming traffic spike from multiple sources',
      severity: 'critical',
      time: '25 minutes ago',
      status: 'mitigated',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'mitigated':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Recent Security Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{alert.title}</span>
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {alert.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {alert.time}
                    </div>
                    <div className="flex items-center gap-1">
                      <span>ID: {alert.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={getStatusColor(alert.status)}
                  >
                    {alert.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      (window.location.href = `/incident-investigation?id=${alert.id}`)
                    }
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = '/alerts')}
          >
            View All Alerts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
