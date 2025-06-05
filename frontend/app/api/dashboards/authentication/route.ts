import { NextResponse } from 'next/server';

// Mock authentication dashboard data
const mockAuthData = {
  totalLogins: 15847,
  successfulLogins: 14923,
  failedLogins: 924,
  successRate: 94.2,
  topUsers: [
    { user: 'admin', logins: 1247, failed: 12 },
    { user: 'john.doe', logins: 892, failed: 5 },
    { user: 'jane.smith', logins: 756, failed: 8 },
    { user: 'system', logins: 2341, failed: 0 },
    { user: 'service_account', logins: 1834, failed: 3 }
  ],
  loginTrends: [
    { hour: '00:00', successful: 45, failed: 2 },
    { hour: '01:00', successful: 32, failed: 1 },
    { hour: '02:00', successful: 28, failed: 0 },
    { hour: '03:00', successful: 31, failed: 1 },
    { hour: '04:00', successful: 29, failed: 0 },
    { hour: '05:00', successful: 38, failed: 1 },
    { hour: '06:00', successful: 67, failed: 3 },
    { hour: '07:00', successful: 124, failed: 8 },
    { hour: '08:00', successful: 198, failed: 15 },
    { hour: '09:00', successful: 234, failed: 18 },
    { hour: '10:00', successful: 287, failed: 22 },
    { hour: '11:00', successful: 301, failed: 19 },
    { hour: '12:00', successful: 289, failed: 16 },
    { hour: '13:00', successful: 276, failed: 14 },
    { hour: '14:00', successful: 298, failed: 21 },
    { hour: '15:00', successful: 312, failed: 25 },
    { hour: '16:00', successful: 289, failed: 19 },
    { hour: '17:00', successful: 187, failed: 12 },
    { hour: '18:00', successful: 98, failed: 6 },
    { hour: '19:00', successful: 76, failed: 4 },
    { hour: '20:00', successful: 54, failed: 2 },
    { hour: '21:00', successful: 43, failed: 1 },
    { hour: '22:00', successful: 39, failed: 1 },
    { hour: '23:00', successful: 41, failed: 2 }
  ],
  authenticationMethods: [
    { method: 'Password', count: 8934, percentage: 59.4 },
    { method: 'SSH Key', count: 3421, percentage: 22.7 },
    { method: 'MFA', count: 2156, percentage: 14.3 },
    { method: 'Certificate', count: 536, percentage: 3.6 }
  ],
  recentFailures: [
    {
      timestamp: '2025-06-05T01:30:15Z',
      user: 'admin',
      sourceIp: '192.168.1.200',
      reason: 'Invalid password',
      attempts: 3
    },
    {
      timestamp: '2025-06-05T01:25:42Z',
      user: 'external_user',
      sourceIp: '203.45.67.89',
      reason: 'Account locked',
      attempts: 5
    },
    {
      timestamp: '2025-06-05T01:20:33Z',
      user: 'test_account',
      sourceIp: '10.0.0.45',
      reason: 'Expired credentials',
      attempts: 1
    }
  ]
};

export async function GET() {
  try {
    console.log('[API/dashboards/authentication] Returning authentication dashboard data');
    
    return NextResponse.json(mockAuthData, {
      headers: {
        'X-Data-Source': 'mock-data',
        'X-Dashboard-Type': 'authentication'
      }
    });
  } catch (error) {
    console.error('[API/dashboards/authentication] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch authentication dashboard data' },
      { status: 500 }
    );
  }
}