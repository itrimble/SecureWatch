import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { LookupService, EnrichmentEngine } from '@securewatch/lookup-service';
import { Redis } from 'redis';

// Try to use live backend services, fallback to mock results
const SEARCH_API_URL = process.env.SEARCH_API_URL || 'http://localhost:4004';

// Database connection for enrichment
const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'securewatch',
  user: process.env.DB_USER || 'securewatch',
  password: process.env.DB_PASSWORD || 'securewatch_dev',
});

// Redis connection for enrichment
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'securewatch_dev',
});

const lookupService = new LookupService(dbPool, redis);
const enrichmentEngine = new EnrichmentEngine(dbPool, lookupService);

interface KQLQueryRequest {
  query: string;
  timeRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
  organizationId?: string;
  enrichment?: {
    enabled?: boolean;
    rules?: string[];
    externalLookups?: boolean;
  };
}

// Mock KQL query results for development
const mockKQLResults = {
  columns: [
    { name: 'timestamp', type: 'datetime', nullable: false },
    { name: 'source_identifier', type: 'string', nullable: false },
    { name: 'message', type: 'string', nullable: false },
    { name: 'hostname', type: 'string', nullable: true },
    { name: 'process_name', type: 'string', nullable: true },
    { name: 'event_id', type: 'string', nullable: false }
  ],
  rows: [
    [
      '2025-06-05T01:33:56.000Z',
      'macos_install_events',
      'loginwindow[170]: +[SUOSULoginCredentialPolicy currentLoginCredentialPolicy] = 0',
      'Ians-Mac-Mini-M4',
      'loginwindow',
      'LOG_ENTRY'
    ],
    [
      '2025-06-05T01:33:56.000Z',
      'macos_install_events', 
      'softwareupdated[75240]: SUOSULoginCredentialPolicyManager: No update downloaded and prepared.',
      'Ians-Mac-Mini-M4',
      'softwareupdated',
      'LOG_ENTRY'
    ],
    [
      '2025-06-05T01:33:56.000Z',
      'macos_auth_events',
      'Security event: user authentication attempted',
      'Ians-Mac-Mini-M4',
      'securityd',
      'AUTH_EVENT'
    ]
  ],
  metadata: {
    totalRows: 3,
    scannedRows: 1500,
    executionTime: 45,
    fromCache: false,
    totalTime: 47
  }
};

async function executeKQLSearch(queryRequest: KQLQueryRequest): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(`${SEARCH_API_URL}/api/v1/search/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client': 'frontend-kql',
        'X-Organization-ID': queryRequest.organizationId || 'default'
      },
      body: JSON.stringify({
        query: queryRequest.query,
        timeRange: queryRequest.timeRange,
        maxRows: queryRequest.limit || 1000,
        timeout: 30000,
        cache: true
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`KQL API responded with status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.columns || !data.rows) {
      throw new Error('Invalid KQL response format from Search API');
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('[API/KQL] Request timeout to live backend');
        throw new Error('KQL query timeout');
      } else if (error.message.includes('fetch')) {
        console.log('[API/KQL] Network error to live backend:', error.message);
        throw new Error('KQL backend network error');
      }
    }
    
    console.log('[API/KQL] Live backend unavailable:', error);
    throw error;
  }
}

/**
 * Apply enrichment to search results
 */
async function applyEnrichment(
  searchResults: any,
  enrichmentConfig?: {
    enabled?: boolean;
    rules?: string[];
    externalLookups?: boolean;
  }
): Promise<any> {
  // Skip enrichment if not enabled
  if (!enrichmentConfig?.enabled) {
    return searchResults;
  }

  try {
    // Convert column-row format to object format for enrichment
    const records = searchResults.rows.map((row: any[]) => {
      const record: Record<string, any> = {};
      searchResults.columns.forEach((col: any, index: number) => {
        record[col.name] = row[index];
      });
      return record;
    });

    // Apply enrichment
    const enrichmentResult = await enrichmentEngine.enrichData({
      data: records,
      rules: enrichmentConfig.rules,
      enableExternalLookups: enrichmentConfig.externalLookups || false
    });

    // Convert back to column-row format
    const enrichedColumns = [...searchResults.columns];
    const enrichedColumnNames = new Set(enrichedColumns.map(c => c.name));

    // Add new columns from enrichment
    if (enrichmentResult.enrichedData.length > 0) {
      const sampleRecord = enrichmentResult.enrichedData[0];
      Object.keys(sampleRecord).forEach(key => {
        if (!enrichedColumnNames.has(key)) {
          enrichedColumns.push({
            name: key,
            type: inferColumnType(sampleRecord[key]),
            nullable: true,
            enriched: true
          });
        }
      });
    }

    // Convert enriched records back to rows
    const enrichedRows = enrichmentResult.enrichedData.map(record => {
      return enrichedColumns.map(col => record[col.name] || null);
    });

    return {
      ...searchResults,
      columns: enrichedColumns,
      rows: enrichedRows,
      enrichment: {
        applied: true,
        statistics: {
          appliedRules: enrichmentResult.appliedRules,
          totalLookups: enrichmentResult.lookupCount,
          externalLookups: enrichmentResult.externalLookupCount,
          processingTime: enrichmentResult.processingTime,
          errorCount: enrichmentResult.errors.length
        },
        errors: enrichmentResult.errors.length > 0 ? enrichmentResult.errors : undefined
      }
    };

  } catch (error) {
    console.error('Enrichment failed:', error);
    
    // Return original results with error info
    return {
      ...searchResults,
      enrichment: {
        applied: false,
        error: error instanceof Error ? error.message : 'Unknown enrichment error'
      }
    };
  }
}

/**
 * Infer column type from value
 */
function inferColumnType(value: any): string {
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'datetime';
  if (typeof value === 'string') {
    // Check for common patterns
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'datetime';
    if (/^\d+\.\d+\.\d+\.\d+$/.test(value)) return 'ip';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
  }
  return 'string';
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API/KQL] Received KQL search request');
    
    const body: KQLQueryRequest = await request.json();
    
    // Validate request
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: query is required' },
        { status: 400 }
      );
    }

    console.log(`[API/KQL] Executing query: ${body.query.substring(0, 100)}...`);
    
    // Try to execute on live backend first
    try {
      const liveResults = await executeKQLSearch(body);
      console.log(`[API/KQL] Returning ${liveResults.totalCount} results from live backend`);
      
      // Apply enrichment if requested
      const enrichedResults = await applyEnrichment(liveResults, body.enrichment);
      
      return NextResponse.json(enrichedResults, {
        headers: {
          'X-Data-Source': 'live-backend',
          'X-Search-API': SEARCH_API_URL,
          'X-Query-Type': 'kql',
          'X-Enrichment-Applied': body.enrichment?.enabled ? 'true' : 'false'
        }
      });
    } catch (backendError) {
      console.warn('[API/KQL] Live backend failed, falling back to mock data:', backendError);
    }
    
    // Fallback to mock data
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
    
    // Modify mock results based on query content for more realistic response
    let modifiedResults = JSON.parse(JSON.stringify(mockKQLResults)); // Deep copy
    
    const queryLower = body.query.toLowerCase();
    
    if (queryLower.includes('auth')) {
      modifiedResults.rows = modifiedResults.rows.filter(row => 
        row[1].includes('auth') || row[2].toLowerCase().includes('auth')
      );
      modifiedResults.metadata.totalRows = modifiedResults.rows.length;
    }
    
    if (queryLower.includes('mac') || queryLower.includes('macos')) {
      modifiedResults.rows = modifiedResults.rows.filter(row => 
        row[1].includes('macos') || row[2].toLowerCase().includes('mac')
      );
      modifiedResults.metadata.totalRows = modifiedResults.rows.length;
    }
    
    if (body.limit) {
      modifiedResults.rows = modifiedResults.rows.slice(0, body.limit);
    }
    
    console.log(`[API/KQL] Returning ${modifiedResults.metadata.totalRows} mock results`);
    
    // Apply enrichment if requested
    const enrichedResults = await applyEnrichment(modifiedResults, body.enrichment);
    
    return NextResponse.json(enrichedResults, {
      headers: {
        'X-Data-Source': 'mock-data',
        'X-Fallback-Reason': 'live-backend-unavailable',
        'X-Query-Type': 'kql',
        'X-Enrichment-Applied': body.enrichment?.enabled ? 'true' : 'false'
      }
    });
  } catch (error) {
    console.error('[API/KQL] Error executing KQL search:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute KQL query', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}