import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for log source creation
const LogSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  description: z.string().optional(),
  parser: z.string().min(1, 'Parser is required'),
  tags: z.array(z.string()).default([]),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().default(true)
});

interface LogSource {
  id: string;
  name: string;
  type: string;
  description?: string;
  status: 'healthy' | 'warning' | 'error' | 'offline' | 'pending';
  eventsPerSecond: number;
  lastEventReceived: string;
  totalEvents: number;
  parser: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  config?: Record<string, unknown>;
  enabled: boolean;
}

// Mock data - in production, this would come from database
const logSources: LogSource[] = [
  {
    id: '1',
    name: 'Primary Domain Controller',
    type: 'Windows Event Logs',
    description: 'Main domain controller for corporate network',
    status: 'healthy',
    eventsPerSecond: 45.2,
    lastEventReceived: new Date().toISOString(),
    totalEvents: 156789,
    parser: 'windows-event-parser',
    tags: ['production', 'critical', 'windows'],
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: new Date().toISOString(),
    enabled: true
  },
  {
    id: '2',
    name: 'macOS Security Events',
    type: 'macOS Agent',
    description: 'Security and system events from macOS endpoints',
    status: 'healthy',
    eventsPerSecond: 12.8,
    lastEventReceived: new Date(Date.now() - 30000).toISOString(),
    totalEvents: 45623,
    parser: 'macos-unified-logs',
    tags: ['production', 'macos', 'endpoint'],
    createdAt: '2025-06-02T14:30:00Z',
    updatedAt: new Date().toISOString(),
    enabled: true
  },
  {
    id: '3',
    name: 'AWS CloudTrail - Production',
    type: 'AWS CloudTrail',
    description: 'API activity logs from production AWS environment',
    status: 'warning',
    eventsPerSecond: 23.1,
    lastEventReceived: new Date(Date.now() - 300000).toISOString(),
    totalEvents: 89456,
    parser: 'aws-cloudtrail',
    tags: ['production', 'aws', 'cloud'],
    createdAt: '2025-06-01T16:15:00Z',
    updatedAt: new Date().toISOString(),
    enabled: true
  },
  {
    id: '4',
    name: 'Firewall Logs',
    type: 'Syslog',
    description: 'Network firewall security events',
    status: 'error',
    eventsPerSecond: 0,
    lastEventReceived: new Date(Date.now() - 3600000).toISOString(),
    totalEvents: 234567,
    parser: 'cisco-asa-syslog',
    tags: ['network', 'firewall', 'security'],
    createdAt: '2025-05-28T09:00:00Z',
    updatedAt: new Date().toISOString(),
    enabled: true
  }
];

// GET /api/log-sources - List all log sources
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    let filtered = logSources;

    // Apply filters
    if (status && status !== 'all') {
      filtered = filtered.filter(source => source.status === status);
    }

    if (type && type !== 'all') {
      filtered = filtered.filter(source => source.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(source =>
        source.name.toLowerCase().includes(searchLower) ||
        source.type.toLowerCase().includes(searchLower) ||
        source.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Calculate summary statistics
    const summary = {
      total: logSources.length,
      active: logSources.filter(s => s.status === 'healthy').length,
      warning: logSources.filter(s => s.status === 'warning').length,
      error: logSources.filter(s => s.status === 'error').length,
      offline: logSources.filter(s => s.status === 'offline').length,
      totalEPS: logSources.reduce((sum, s) => sum + s.eventsPerSecond, 0)
    };

    return NextResponse.json({
      sources: filtered,
      summary,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'X-Data-Source': 'log-sources-api',
        'X-Total-Count': filtered.length.toString()
      }
    });
  } catch (error) {
    console.error('[API/LogSources] Error fetching log sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch log sources' },
      { status: 500 }
    );
  }
}

// POST /api/log-sources - Create new log source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = LogSourceSchema.parse(body);
    
    // Generate new ID
    const newId = (Math.max(...logSources.map(s => parseInt(s.id))) + 1).toString();
    
    // Create new log source
    const newSource: LogSource = {
      id: newId,
      ...validatedData,
      status: 'pending',
      eventsPerSecond: 0,
      lastEventReceived: new Date().toISOString(),
      totalEvents: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to sources array
    logSources.push(newSource);
    
    // Simulate deployment process
    setTimeout(() => {
      const sourceIndex = logSources.findIndex(s => s.id === newId);
      if (sourceIndex !== -1) {
        logSources[sourceIndex].status = 'healthy';
        logSources[sourceIndex].eventsPerSecond = Math.random() * 50;
        logSources[sourceIndex].updatedAt = new Date().toISOString();
      }
    }, 5000); // Simulate 5 second deployment
    
    return NextResponse.json(newSource, {
      status: 201,
      headers: {
        'X-Data-Source': 'log-sources-api',
        'X-Source-ID': newId
      }
    });
  } catch (error) {
    console.error('[API/LogSources] Error creating log source:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create log source' },
      { status: 500 }
    );
  }
}