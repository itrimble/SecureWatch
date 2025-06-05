import { NextRequest, NextResponse } from 'next/server';

// Try to use live backend services, fallback to mock results
const SEARCH_API_URL = process.env.SEARCH_API_URL || 'http://localhost:4004';

interface QueryRequest {
  query: string;
  filters?: Record<string, any>;
  timeRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
}

// Mock query results for development
const mockQueryResults = [
  {
    timestamp: '2025-06-05T01:33:56.000Z',
    event_type: 'authentication',
    user: 'admin',
    source_ip: '192.168.1.100',
    status: 'success',
    details: 'User authentication successful'
  },
  {
    timestamp: '2025-06-05T01:32:45.000Z',
    event_type: 'system',
    user: 'system',
    source_ip: '127.0.0.1',
    status: 'info',
    details: 'System process started'
  },
  {
    timestamp: '2025-06-05T01:31:30.000Z',
    event_type: 'security',
    user: 'john.doe',
    source_ip: '192.168.1.150',
    status: 'warning',
    details: 'Failed login attempt detected'
  }
];

async function executeQuery(queryRequest: QueryRequest): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
  
  try {
    const response = await fetch(`${SEARCH_API_URL}/api/v1/search/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client': 'frontend-query'
      },
      body: JSON.stringify(queryRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Query API responded with status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('[API/query] Request timeout to live backend');
        throw new Error('Query timeout');
      } else if (error.message.includes('fetch')) {
        console.log('[API/query] Network error to live backend:', error.message);
        throw new Error('Query backend network error');
      }
    }
    
    console.log('[API/query] Live backend unavailable:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API/query] Received query request');
    
    const body: QueryRequest = await request.json();
    
    // Validate request
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: query is required' },
        { status: 400 }
      );
    }

    console.log(`[API/query] Executing query: ${body.query.substring(0, 100)}...`);
    
    // Try to execute on live backend first
    try {
      const liveResults = await executeQuery(body);
      console.log(`[API/query] Returning results from live backend`);
      return NextResponse.json(liveResults, {
        headers: {
          'X-Data-Source': 'live-backend',
          'X-Search-API': SEARCH_API_URL
        }
      });
    } catch (backendError) {
      console.warn('[API/query] Live backend failed, falling back to mock data:', backendError);
    }
    
    // Fallback to mock data
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing time
    
    // Filter mock results based on query content
    let results = mockQueryResults;
    const query = body.query.toLowerCase();
    
    if (query.includes('auth')) {
      results = results.filter(r => r.event_type === 'authentication');
    } else if (query.includes('security')) {
      results = results.filter(r => r.event_type === 'security');
    } else if (query.includes('system')) {
      results = results.filter(r => r.event_type === 'system');
    }
    
    if (body.limit) {
      results = results.slice(0, body.limit);
    }
    
    console.log(`[API/query] Returning ${results.length} mock results`);
    
    return NextResponse.json({
      results,
      total: results.length,
      executionTime: 75,
      query: body.query
    }, {
      headers: {
        'X-Data-Source': 'mock-data',
        'X-Fallback-Reason': 'live-backend-unavailable'
      }
    });
  } catch (error) {
    console.error('[API/query] Error executing query:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute query', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Support GET requests for simple queries
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('query');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter required' },
        { status: 400 }
      );
    }

    const limit = parseInt(searchParams.get('limit') || '100');
    
    // Convert to POST request format
    const postRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ query, limit })
    });
    
    return await POST(postRequest);
  } catch (error) {
    console.error('[API/query] Error handling GET request:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}