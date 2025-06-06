import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { LookupService } from '@securewatch/lookup-service';
import { Redis } from 'redis';

// Database connection
const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'securewatch',
  user: process.env.DB_USER || 'securewatch',
  password: process.env.DB_PASSWORD || 'securewatch_dev',
});

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'securewatch_dev',
});

const lookupService = new LookupService(dbPool, redis);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queries, single } = body;

    // Validate input
    if (single) {
      const { tableName, keyField, keyValue, returnFields } = body;
      
      if (!tableName || !keyField || keyValue === undefined) {
        return NextResponse.json(
          { error: 'tableName, keyField, and keyValue are required for single lookup' },
          { status: 400 }
        );
      }

      const result = await lookupService.lookup({
        tableName,
        keyField,
        keyValue: String(keyValue),
        returnFields
      });

      // Log the query
      await logLookupQuery(result, false);

      return NextResponse.json(result);
    }

    // Batch lookup
    if (!queries || !Array.isArray(queries)) {
      return NextResponse.json(
        { error: 'queries array is required for batch lookup' },
        { status: 400 }
      );
    }

    if (queries.length > 1000) {
      return NextResponse.json(
        { error: 'Maximum 1000 queries allowed per batch' },
        { status: 400 }
      );
    }

    // Validate each query
    for (const query of queries) {
      if (!query.tableName || !query.keyField || query.keyValue === undefined) {
        return NextResponse.json(
          { error: 'Each query must have tableName, keyField, and keyValue' },
          { status: 400 }
        );
      }
      // Ensure keyValue is string
      query.keyValue = String(query.keyValue);
    }

    const results = await lookupService.batchLookup(queries);

    // Log batch queries
    await Promise.all(results.map(result => logLookupQuery(result, false)));

    return NextResponse.json({
      results,
      totalQueries: queries.length,
      successfulLookups: results.filter(r => r.found).length
    });

  } catch (error) {
    console.error('Lookup query error:', error);
    return NextResponse.json(
      { error: 'Failed to execute lookup query' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const keyField = searchParams.get('keyField');
    const keyValue = searchParams.get('keyValue');
    const returnFields = searchParams.get('returnFields');

    if (!tableName || !keyField || !keyValue) {
      return NextResponse.json(
        { error: 'table, keyField, and keyValue parameters are required' },
        { status: 400 }
      );
    }

    const result = await lookupService.lookup({
      tableName,
      keyField,
      keyValue,
      returnFields: returnFields ? returnFields.split(',') : undefined
    });

    // Log the query
    await logLookupQuery(result, false);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Lookup query error:', error);
    return NextResponse.json(
      { error: 'Failed to execute lookup query' },
      { status: 500 }
    );
  }
}

async function logLookupQuery(
  result: any, 
  cacheHit: boolean, 
  queryTimeMs?: number,
  errorMessage?: string
): Promise<void> {
  try {
    await dbPool.query(`
      INSERT INTO lookup_query_log (
        table_name, key_field, key_value, result_found, 
        query_time_ms, cache_hit, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      result.tableName,
      result.keyField,
      result.keyValue,
      result.found,
      queryTimeMs || 0,
      cacheHit,
      errorMessage
    ]);
  } catch (error) {
    console.error('Failed to log lookup query:', error);
  }
}