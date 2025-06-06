import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { LookupService } from '@securewatch/lookup-service';
import { CSVProcessor } from '@securewatch/lookup-service';
import { Redis } from 'redis';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

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
const csvProcessor = new CSVProcessor(dbPool);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('id');
    const statsOnly = searchParams.get('stats') === 'true';

    if (statsOnly) {
      const stats = await lookupService.getStats();
      return NextResponse.json(stats);
    }

    if (tableId) {
      const table = await lookupService.getTableInfo(tableId);
      if (!table) {
        return NextResponse.json(
          { error: 'Lookup table not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(table);
    }

    // List all tables
    const tables = await lookupService.listTables();
    return NextResponse.json(tables);

  } catch (error) {
    console.error('Lookup tables GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve lookup tables' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const keyField = formData.get('keyField') as string;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;
    const delimiter = formData.get('delimiter') as string;
    const hasHeader = formData.get('hasHeader') === 'true';
    const createdBy = formData.get('createdBy') as string || 'anonymous';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!keyField) {
      return NextResponse.json(
        { error: 'Key field is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    // Save file temporarily
    const tempDir = tmpdir();
    const tempFilePath = join(tempDir, `lookup_${Date.now()}_${file.name}`);
    
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(tempFilePath, buffer);

      // Process the CSV
      const uploadOptions = {
        filename: file.name,
        keyField,
        description,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        delimiter: delimiter || ',',
        hasHeader,
        skipEmptyLines: true,
        encoding: 'utf8'
      };

      const lookupTable = await csvProcessor.processCSVUpload(
        tempFilePath,
        uploadOptions,
        createdBy
      );

      // Clean up temp file
      await unlink(tempFilePath);

      return NextResponse.json({
        success: true,
        table: lookupTable,
        message: `Successfully uploaded lookup table '${lookupTable.name}' with ${lookupTable.recordCount} records`
      });

    } catch (processingError) {
      // Clean up temp file on error
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Failed to clean up temp file:', unlinkError);
      }
      throw processingError;
    }

  } catch (error) {
    console.error('Lookup table upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process lookup table upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('id');
    const tableName = searchParams.get('name');

    if (!tableId && !tableName) {
      return NextResponse.json(
        { error: 'Table ID or name is required' },
        { status: 400 }
      );
    }

    // Get table info first
    const table = tableId 
      ? await lookupService.getTableInfo(tableId)
      : await lookupService.listTables().then(tables => 
          tables.find(t => t.name === tableName)
        );

    if (!table) {
      return NextResponse.json(
        { error: 'Lookup table not found' },
        { status: 404 }
      );
    }

    // Drop the actual data table
    const dbTableName = `lookup_${table.name}`;
    await dbPool.query(`DROP TABLE IF EXISTS ${dbTableName}`);

    // Remove metadata
    await dbPool.query(
      'DELETE FROM lookup_tables WHERE id = $1',
      [table.id]
    );

    // Clear cache
    await lookupService.clearCache(table.name);

    return NextResponse.json({
      success: true,
      message: `Lookup table '${table.name}' deleted successfully`
    });

  } catch (error) {
    console.error('Lookup table delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lookup table' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('id');
    const action = searchParams.get('action');

    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }

    if (action === 'clear-cache') {
      const table = await lookupService.getTableInfo(tableId);
      if (!table) {
        return NextResponse.json(
          { error: 'Lookup table not found' },
          { status: 404 }
        );
      }

      await lookupService.clearCache(table.name);
      
      return NextResponse.json({
        success: true,
        message: `Cache cleared for lookup table '${table.name}'`
      });
    }

    if (action === 'toggle-active') {
      const body = await request.json();
      const { isActive } = body;

      await dbPool.query(
        'UPDATE lookup_tables SET is_active = $1, updated_at = NOW() WHERE id = $2',
        [isActive, tableId]
      );

      return NextResponse.json({
        success: true,
        message: `Lookup table ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    }

    // Default update
    const body = await request.json();
    const { description, tags } = body;

    await dbPool.query(
      'UPDATE lookup_tables SET description = $1, tags = $2, updated_at = NOW() WHERE id = $3',
      [description, JSON.stringify(tags), tableId]
    );

    return NextResponse.json({
      success: true,
      message: 'Lookup table updated successfully'
    });

  } catch (error) {
    console.error('Lookup table update error:', error);
    return NextResponse.json(
      { error: 'Failed to update lookup table' },
      { status: 500 }
    );
  }
}