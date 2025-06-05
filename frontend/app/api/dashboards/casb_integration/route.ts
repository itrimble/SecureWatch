import { NextResponse } from 'next/server';

const mockCASBData = {
  totalCloudApps: 234,
  sanctionedApps: 187,
  unsanctionedApps: 47,
  riskScore: 6.8,
  dataExfiltrationEvents: 12,
  policyViolations: 89,
  appsByRisk: [
    { app: 'Slack', users: 1245, risk: 'Low', violations: 2 },
    { app: 'Dropbox', users: 892, risk: 'Medium', violations: 8 },
    { app: 'GitHub', users: 567, risk: 'Low', violations: 1 },
    { app: 'Unknown Cloud Storage', users: 34, risk: 'High', violations: 15 }
  ],
  activityTrend: [
    { date: '06-01', uploads: 456, downloads: 789, violations: 12 },
    { date: '06-02', uploads: 523, downloads: 834, violations: 8 },
    { date: '06-03', uploads: 487, downloads: 756, violations: 15 },
    { date: '06-04', uploads: 612, downloads: 923, violations: 23 },
    { date: '06-05', uploads: 445, downloads: 567, violations: 7 }
  ]
};

export async function GET() {
  return NextResponse.json(mockCASBData, {
    headers: { 'X-Data-Source': 'mock-data', 'X-Dashboard-Type': 'casb_integration' }
  });
}