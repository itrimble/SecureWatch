import { NextResponse } from 'next/server';

const mockInsiderThreatData = {
  totalUsers: 1247,
  riskUsers: 23,
  anomalousActivities: 156,
  riskScore: 5.4,
  criticalAlerts: 8,
  userRiskDistribution: [
    { risk: 'High', count: 8, percentage: 0.6 },
    { risk: 'Medium', count: 15, percentage: 1.2 },
    { risk: 'Low', count: 89, percentage: 7.1 },
    { risk: 'Normal', count: 1135, percentage: 91.0 }
  ],
  behaviorAnalytics: [
    { behavior: 'Unusual file access', count: 45, trend: 'up' },
    { behavior: 'Off-hours activity', count: 32, trend: 'down' },
    { behavior: 'Large data downloads', count: 28, trend: 'up' },
    { behavior: 'Multiple failed logins', count: 19, trend: 'stable' }
  ],
  topRiskUsers: [
    { user: 'jane.contractor', riskScore: 8.5, department: 'IT', lastActivity: '2025-06-05T01:30:00Z' },
    { user: 'temp.user123', riskScore: 7.2, department: 'Finance', lastActivity: '2025-06-05T00:45:00Z' },
    { user: 'john.departing', riskScore: 6.8, department: 'Sales', lastActivity: '2025-06-04T23:15:00Z' }
  ]
};

export async function GET() {
  return NextResponse.json(mockInsiderThreatData, {
    headers: { 'X-Data-Source': 'mock-data', 'X-Dashboard-Type': 'insider_threat' }
  });
}