import { NextRequest, NextResponse } from 'next/server';

interface HealthMetric {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  eventsPerSecond: number;
  lastEventReceived: string;
  connectivity: 'connected' | 'disconnected' | 'intermittent';
  parsingErrors: number;
  backpressure: boolean;
  uptimePercentage: number;
  avgLatency: number;
}

// Mock health data
const generateHealthData = (): HealthMetric[] => {
  const baseTime = Date.now();
  
  return [
    {
      id: '1',
      name: 'Primary Domain Controller',
      status: 'healthy',
      eventsPerSecond: 45.2 + (Math.random() - 0.5) * 10,
      lastEventReceived: new Date(baseTime - Math.random() * 30000).toISOString(),
      connectivity: 'connected',
      parsingErrors: 0,
      backpressure: false,
      uptimePercentage: 99.8,
      avgLatency: 12
    },
    {
      id: '2',
      name: 'macOS Security Events',
      status: 'healthy',
      eventsPerSecond: 12.8 + (Math.random() - 0.5) * 5,
      lastEventReceived: new Date(baseTime - Math.random() * 60000).toISOString(),
      connectivity: 'connected',
      parsingErrors: 1,
      backpressure: false,
      uptimePercentage: 98.9,
      avgLatency: 8
    },
    {
      id: '3',
      name: 'AWS CloudTrail - Production',
      status: Math.random() > 0.3 ? 'warning' : 'healthy',
      eventsPerSecond: 23.1 + (Math.random() - 0.5) * 15,
      lastEventReceived: new Date(baseTime - Math.random() * 300000).toISOString(),
      connectivity: Math.random() > 0.2 ? 'connected' : 'intermittent',
      parsingErrors: Math.floor(Math.random() * 3),
      backpressure: Math.random() > 0.8,
      uptimePercentage: 96.5,
      avgLatency: 156
    },
    {
      id: '4',
      name: 'Firewall Logs',
      status: 'error',
      eventsPerSecond: 0,
      lastEventReceived: new Date(baseTime - 3600000).toISOString(),
      connectivity: 'disconnected',
      parsingErrors: 0,
      backpressure: false,
      uptimePercentage: 45.2,
      avgLatency: 0
    }
  ];
};

// GET /api/log-sources/health - Get real-time health metrics
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sourceId = url.searchParams.get('sourceId');
    const includeHistory = url.searchParams.get('includeHistory') === 'true';
    
    const healthData = generateHealthData();
    
    // Filter by specific source if requested
    const filteredData = sourceId 
      ? healthData.filter(metric => metric.id === sourceId)
      : healthData;
    
    if (sourceId && filteredData.length === 0) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }
    
    // Calculate overall system health
    const overallHealth = {
      totalSources: healthData.length,
      healthySources: healthData.filter(m => m.status === 'healthy').length,
      warningSources: healthData.filter(m => m.status === 'warning').length,
      errorSources: healthData.filter(m => m.status === 'error').length,
      offlineSources: healthData.filter(m => m.status === 'offline').length,
      totalEPS: healthData.reduce((sum, m) => sum + m.eventsPerSecond, 0),
      avgUptime: healthData.reduce((sum, m) => sum + m.uptimePercentage, 0) / healthData.length,
      lastUpdated: new Date().toISOString()
    };
    
    const response: any = {
      sources: filteredData,
      overall: overallHealth,
      timestamp: new Date().toISOString()
    };
    
    // Include historical data if requested (mock data)
    if (includeHistory) {
      const now = Date.now();
      const history = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(now - (23 - i) * 3600000).toISOString(),
        totalEPS: Math.random() * 100 + 50,
        healthyCount: Math.floor(Math.random() * 2) + 3,
        errorCount: Math.floor(Math.random() * 2),
        avgLatency: Math.random() * 50 + 20
      }));
      
      response.history = history;
    }
    
    return NextResponse.json(response, {
      headers: {
        'X-Data-Source': 'health-monitoring',
        'X-Refresh-Interval': '30',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('[API/LogSources/Health] Error fetching health metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health metrics' },
      { status: 500 }
    );
  }
}

// POST /api/log-sources/health - Trigger health check for specific source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId } = body;
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }
    
    // Simulate health check process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const healthResult = {
      sourceId,
      status: Math.random() > 0.8 ? 'error' : 'healthy',
      connectivity: Math.random() > 0.9 ? 'disconnected' : 'connected',
      latency: Math.random() * 100 + 10,
      lastCheck: new Date().toISOString(),
      issues: Math.random() > 0.7 ? [
        'High latency detected',
        'Intermittent connection drops'
      ] : []
    };
    
    return NextResponse.json({
      message: 'Health check completed',
      result: healthResult
    }, {
      headers: {
        'X-Data-Source': 'health-check',
        'X-Source-ID': sourceId
      }
    });
  } catch (error) {
    console.error('[API/LogSources/Health] Error performing health check:', error);
    return NextResponse.json(
      { error: 'Failed to perform health check' },
      { status: 500 }
    );
  }
}