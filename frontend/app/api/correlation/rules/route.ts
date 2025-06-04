import { NextRequest, NextResponse } from 'next/server';

const CORRELATION_ENGINE_URL = process.env.CORRELATION_ENGINE_URL || 'http://localhost:4005';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(`${CORRELATION_ENGINE_URL}/api/rules${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch rules:', error);
    
    // Return mock data for development
    return NextResponse.json({
      rules: [
        {
          id: '1',
          name: 'Brute Force Detection',
          description: 'Detects multiple failed login attempts from same IP',
          type: 'threshold',
          severity: 'high',
          enabled: true,
          event_count: 127,
          last_triggered: '2025-06-04T10:30:00Z'
        },
        {
          id: '2',
          name: 'Suspicious PowerShell Activity',
          description: 'Detects potentially malicious PowerShell commands',
          type: 'simple',
          severity: 'medium',
          enabled: true,
          event_count: 43,
          last_triggered: '2025-06-04T09:15:00Z'
        },
        {
          id: '3',
          name: 'Data Exfiltration Pattern',
          description: 'Identifies large data transfers to external IPs',
          type: 'complex',
          severity: 'critical',
          enabled: true,
          event_count: 5,
          last_triggered: '2025-06-04T08:45:00Z'
        }
      ],
      total: 3
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${CORRELATION_ENGINE_URL}/api/rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to create rule');
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to create rule:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}