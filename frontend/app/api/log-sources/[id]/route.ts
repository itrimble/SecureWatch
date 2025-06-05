import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for log source updates
const UpdateLogSourceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  parser: z.string().optional(),
  tags: z.array(z.string()).optional(),
  config: z.record(z.any()).optional(),
  enabled: z.boolean().optional()
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
  config?: Record<string, any>;
  enabled: boolean;
}

// Mock data - in production, this would come from database
let logSources: LogSource[] = [
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
  }
];

// GET /api/log-sources/[id] - Get specific log source
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const source = logSources.find(s => s.id === id);
    
    if (!source) {
      return NextResponse.json(
        { error: 'Log source not found' },
        { status: 404 }
      );
    }
    
    // Include additional details for individual source view
    const detailedSource = {
      ...source,
      metrics: {
        avgEPS: source.eventsPerSecond,
        peakEPS: source.eventsPerSecond * 1.5,
        uptimePercentage: source.status === 'healthy' ? 99.8 : 85.2,
        lastError: source.status === 'error' ? 'Connection timeout' : null,
        configuredAt: source.createdAt,
        lastHealthCheck: new Date(Date.now() - 60000).toISOString()
      },
      health: {
        connectivity: source.status === 'healthy' ? 'connected' : 'disconnected',
        dataFlow: source.eventsPerSecond > 0 ? 'active' : 'inactive',
        parsingErrors: Math.floor(Math.random() * 5),
        backpressure: false
      }
    };
    
    return NextResponse.json(detailedSource, {
      headers: {
        'X-Data-Source': 'log-sources-api',
        'X-Source-ID': id
      }
    });
  } catch (error) {
    console.error('[API/LogSources] Error fetching log source:', error);
    return NextResponse.json(
      { error: 'Failed to fetch log source' },
      { status: 500 }
    );
  }
}

// PUT /api/log-sources/[id] - Update log source
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Validate request body
    const validatedData = UpdateLogSourceSchema.parse(body);
    
    const sourceIndex = logSources.findIndex(s => s.id === id);
    
    if (sourceIndex === -1) {
      return NextResponse.json(
        { error: 'Log source not found' },
        { status: 404 }
      );
    }
    
    // Update source
    logSources[sourceIndex] = {
      ...logSources[sourceIndex],
      ...validatedData,
      updatedAt: new Date().toISOString()
    };
    
    return NextResponse.json(logSources[sourceIndex], {
      headers: {
        'X-Data-Source': 'log-sources-api',
        'X-Source-ID': id,
        'X-Action': 'updated'
      }
    });
  } catch (error) {
    console.error('[API/LogSources] Error updating log source:', error);
    
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
      { error: 'Failed to update log source' },
      { status: 500 }
    );
  }
}

// DELETE /api/log-sources/[id] - Delete log source
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const sourceIndex = logSources.findIndex(s => s.id === id);
    
    if (sourceIndex === -1) {
      return NextResponse.json(
        { error: 'Log source not found' },
        { status: 404 }
      );
    }
    
    const deletedSource = logSources[sourceIndex];
    
    // Remove from sources array
    logSources.splice(sourceIndex, 1);
    
    return NextResponse.json(
      { 
        message: 'Log source deleted successfully',
        deletedSource: {
          id: deletedSource.id,
          name: deletedSource.name,
          type: deletedSource.type
        }
      },
      {
        headers: {
          'X-Data-Source': 'log-sources-api',
          'X-Source-ID': id,
          'X-Action': 'deleted'
        }
      }
    );
  } catch (error) {
    console.error('[API/LogSources] Error deleting log source:', error);
    return NextResponse.json(
      { error: 'Failed to delete log source' },
      { status: 500 }
    );
  }
}