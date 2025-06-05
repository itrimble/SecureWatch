import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@opensearch-project/opensearch';
import { KQLParser } from '@securewatch/kql-engine';
import { KQLToOpenSearchTranslator } from '@securewatch/kql-engine/translators/kql-to-opensearch';

// Configuration
const OPENSEARCH_NODE = process.env.OPENSEARCH_NODE || 'http://localhost:9200';
const OPENSEARCH_USERNAME = process.env.OPENSEARCH_USERNAME || 'admin';
const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD || 'admin';
const USE_OPENSEARCH = process.env.USE_OPENSEARCH === 'true';
const SEARCH_API_URL = process.env.SEARCH_API_URL || 'http://localhost:4004';

// Initialize OpenSearch client
const opensearchClient = new Client({
  node: OPENSEARCH_NODE,
  auth: {
    username: OPENSEARCH_USERNAME,
    password: OPENSEARCH_PASSWORD
  },
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize KQL components
const kqlParser = new KQLParser();
const kqlTranslator = new KQLToOpenSearchTranslator();

interface QueryRequest {
  query: string;
  backend?: 'opensearch' | 'postgres' | 'auto';
  filters?: Record<string, any>;
  timeRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
  aggregations?: boolean;
}

interface QueryResponse {
  results: any[];
  total: number;
  aggregations?: any;
  executionTime: number;
  query: string;
  backend: string;
}

/**
 * Execute query against OpenSearch
 */
async function executeOpenSearchQuery(queryRequest: QueryRequest): Promise<QueryResponse> {
  const startTime = Date.now();
  
  try {
    // Parse KQL query to AST
    const ast = kqlParser.parse(queryRequest.query);
    
    // Translate AST to OpenSearch DSL
    const opensearchQuery = kqlTranslator.translate(ast);
    
    // Add time range filter if provided
    if (queryRequest.timeRange) {
      const timeRangeFilter = {
        range: {
          timestamp: {
            gte: queryRequest.timeRange.start,
            lte: queryRequest.timeRange.end
          }
        }
      };
      
      if (!opensearchQuery.query.bool) {
        opensearchQuery.query = {
          bool: {
            must: [opensearchQuery.query, timeRangeFilter]
          }
        };
      } else {
        opensearchQuery.query.bool.must = [
          ...(Array.isArray(opensearchQuery.query.bool.must) 
            ? opensearchQuery.query.bool.must 
            : [opensearchQuery.query.bool.must]),
          timeRangeFilter
        ].filter(Boolean);
      }
    }
    
    // Set size and from for pagination
    opensearchQuery.size = queryRequest.limit || 100;
    opensearchQuery.from = queryRequest.offset || 0;
    
    console.log('[OpenSearch Query]', JSON.stringify(opensearchQuery, null, 2));
    
    // Execute query
    const response = await opensearchClient.search({
      index: 'securewatch-logs',
      body: opensearchQuery
    });
    
    const executionTime = Date.now() - startTime;
    
    // Format results
    const results = response.body.hits.hits.map((hit: any) => ({
      _id: hit._id,
      _score: hit._score,
      ...hit._source
    }));
    
    return {
      results,
      total: response.body.hits.total.value,
      aggregations: response.body.aggregations,
      executionTime,
      query: queryRequest.query,
      backend: 'opensearch'
    };
  } catch (error) {
    console.error('[OpenSearch Query Error]', error);
    throw new Error(`OpenSearch query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute query against PostgreSQL via Search API
 */
async function executePostgresQuery(queryRequest: QueryRequest): Promise<QueryResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  
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
      throw new Error(`Search API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return {
      ...data,
      backend: 'postgres'
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Automatically choose the best backend based on query type
 */
function selectBackend(query: string): 'opensearch' | 'postgres' {
  const lowerQuery = query.toLowerCase();
  
  // Use OpenSearch for:
  // - Full-text search queries
  // - Large time range queries
  // - Aggregation-heavy queries
  // - Pattern matching queries
  if (
    lowerQuery.includes('contains') ||
    lowerQuery.includes('match') ||
    lowerQuery.includes('summarize') ||
    lowerQuery.includes('group by') ||
    lowerQuery.includes('count by') ||
    lowerQuery.includes('wildcard') ||
    lowerQuery.includes('regex')
  ) {
    return 'opensearch';
  }
  
  // Use PostgreSQL for:
  // - Simple lookups
  // - Exact matches
  // - Recent data queries
  // - Structured queries
  return 'postgres';
}

export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json();
    
    // Validate request
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: query is required' },
        { status: 400 }
      );
    }
    
    console.log(`[API/query] Executing query: ${body.query.substring(0, 100)}...`);
    
    // Determine which backend to use
    let backend = body.backend || 'auto';
    if (backend === 'auto') {
      backend = USE_OPENSEARCH ? selectBackend(body.query) : 'postgres';
    }
    
    let result: QueryResponse;
    
    try {
      if (backend === 'opensearch') {
        console.log('[API/query] Using OpenSearch backend');
        result = await executeOpenSearchQuery(body);
      } else {
        console.log('[API/query] Using PostgreSQL backend');
        result = await executePostgresQuery(body);
      }
      
      return NextResponse.json(result, {
        headers: {
          'X-Data-Source': 'live-backend',
          'X-Backend': backend,
          'X-Execution-Time': result.executionTime.toString()
        }
      });
    } catch (backendError) {
      console.error(`[API/query] ${backend} backend failed:`, backendError);
      
      // Try fallback to other backend
      if (backend === 'opensearch' && !body.backend) {
        console.log('[API/query] Falling back to PostgreSQL');
        result = await executePostgresQuery(body);
        return NextResponse.json(result, {
          headers: {
            'X-Data-Source': 'live-backend',
            'X-Backend': 'postgres-fallback',
            'X-Execution-Time': result.executionTime.toString()
          }
        });
      }
      
      throw backendError;
    }
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

// Support GET requests
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
    const backend = searchParams.get('backend') as 'opensearch' | 'postgres' | 'auto' | null;
    
    // Convert to POST request format
    const postRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ 
        query, 
        limit,
        backend: backend || 'auto'
      })
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