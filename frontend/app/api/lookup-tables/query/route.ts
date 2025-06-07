import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Mock lookup response
  return NextResponse.json({
    success: true,
    results: [
      {
        input: body.value || 'test-value',
        enrichment: {
          reputation: 'clean',
          category: 'benign',
          last_seen: new Date().toISOString(),
          source: 'mock-api'
        }
      }
    ],
    cache_hit: false,
    response_time_ms: 45
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get('table_id');
  
  return NextResponse.json({
    table_id: tableId,
    cached_entries: 0,
    total_queries: 0,
    cache_hit_rate: 0,
    last_updated: new Date().toISOString()
  });
}