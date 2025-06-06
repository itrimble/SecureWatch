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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');

    if (configId) {
      const result = await dbPool.query(
        'SELECT * FROM api_lookup_configs WHERE id = $1',
        [configId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'API configuration not found' },
          { status: 404 }
        );
      }

      // Remove sensitive information
      const config = result.rows[0];
      delete config.api_key;

      return NextResponse.json(config);
    }

    // List all configurations
    const result = await dbPool.query(`
      SELECT 
        id, name, description, base_url, rate_limit_requests, 
        rate_limit_window, timeout_ms, cache_ttl, is_active,
        created_at, updated_at, created_by
      FROM api_lookup_configs 
      ORDER BY name
    `);

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('External API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve API configurations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      baseUrl,
      apiKey,
      headers = {},
      queryParams = {},
      rateLimitRequests = 100,
      rateLimitWindow = 3600,
      timeoutMs = 5000,
      cacheTTL = 300,
      retryAttempts = 3,
      retryBackoff = 1000,
      fieldMapping,
      isActive = true,
      createdBy = 'current-user'
    } = body;

    // Validate required fields
    if (!name || !baseUrl || !fieldMapping) {
      return NextResponse.json(
        { error: 'Name, baseUrl, and fieldMapping are required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(baseUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid base URL' },
        { status: 400 }
      );
    }

    const result = await dbPool.query(`
      INSERT INTO api_lookup_configs (
        name, description, base_url, api_key, headers, query_params,
        rate_limit_requests, rate_limit_window, timeout_ms, cache_ttl,
        retry_attempts, retry_backoff, field_mapping, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      name, description, baseUrl, apiKey, JSON.stringify(headers), 
      JSON.stringify(queryParams), rateLimitRequests, rateLimitWindow,
      timeoutMs, cacheTTL, retryAttempts, retryBackoff,
      JSON.stringify(fieldMapping), isActive, createdBy
    ]);

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      message: `API configuration '${name}' created successfully`
    });

  } catch (error) {
    console.error('External API POST error:', error);
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'API configuration with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create API configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');

    if (!configId) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates: Record<string, any> = {};
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    const allowedFields = [
      'name', 'description', 'base_url', 'api_key', 'headers', 
      'query_params', 'rate_limit_requests', 'rate_limit_window',
      'timeout_ms', 'cache_ttl', 'retry_attempts', 'retry_backoff',
      'field_mapping', 'is_active'
    ];

    Object.entries(body).forEach(([key, value]) => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey) && value !== undefined) {
        updates[dbKey] = `$${paramIndex}`;
        
        if (dbKey === 'headers' || dbKey === 'query_params' || dbKey === 'field_mapping') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const setParts = Object.entries(updates).map(([key, placeholder]) => 
      `${key} = ${placeholder}`
    );
    setParts.push('updated_at = NOW()');
    values.push(configId);

    await dbPool.query(
      `UPDATE api_lookup_configs SET ${setParts.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return NextResponse.json({
      success: true,
      message: 'API configuration updated successfully'
    });

  } catch (error) {
    console.error('External API PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update API configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');

    if (!configId) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    // Check if configuration exists
    const checkResult = await dbPool.query(
      'SELECT name FROM api_lookup_configs WHERE id = $1',
      [configId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'API configuration not found' },
        { status: 404 }
      );
    }

    const configName = checkResult.rows[0].name;

    // Delete the configuration
    await dbPool.query(
      'DELETE FROM api_lookup_configs WHERE id = $1',
      [configId]
    );

    return NextResponse.json({
      success: true,
      message: `API configuration '${configName}' deleted successfully`
    });

  } catch (error) {
    console.error('External API DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete API configuration' },
      { status: 500 }
    );
  }
}