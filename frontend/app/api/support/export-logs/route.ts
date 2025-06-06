import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@opensearch-project/opensearch';
import { LogExporter, LogExportOptions } from '@securewatch/support-bundle-service';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';

// OpenSearch configuration
const OPENSEARCH_NODE = process.env.OPENSEARCH_NODE || 'http://localhost:9200';
const OPENSEARCH_USERNAME = process.env.OPENSEARCH_USERNAME || 'admin';
const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD || 'admin';

// Initialize OpenSearch client for log export
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

interface ExportRequest {
  startTime: string;
  endTime: string;
  services?: string[];
  logLevels?: ('error' | 'warn' | 'info' | 'debug')[];
  maxDocuments?: number;
  includeStackTraces?: boolean;
}

/**
 * Validate the export request
 */
function validateExportRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.startTime) {
    errors.push('startTime is required');
  } else if (isNaN(Date.parse(body.startTime))) {
    errors.push('startTime must be a valid ISO date string');
  }

  if (!body.endTime) {
    errors.push('endTime is required');
  } else if (isNaN(Date.parse(body.endTime))) {
    errors.push('endTime must be a valid ISO date string');
  }

  if (body.startTime && body.endTime) {
    const start = new Date(body.startTime);
    const end = new Date(body.endTime);
    
    if (start >= end) {
      errors.push('startTime must be before endTime');
    }

    // Check if time range is reasonable (not more than 30 days)
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      errors.push('Time range cannot exceed 30 days');
    }

    // Check if time range is not too far in the future
    if (end > new Date()) {
      errors.push('endTime cannot be in the future');
    }
  }

  if (body.services && !Array.isArray(body.services)) {
    errors.push('services must be an array');
  }

  if (body.logLevels && !Array.isArray(body.logLevels)) {
    errors.push('logLevels must be an array');
  }

  if (body.maxDocuments && (typeof body.maxDocuments !== 'number' || body.maxDocuments < 1 || body.maxDocuments > 1000000)) {
    errors.push('maxDocuments must be a number between 1 and 1,000,000');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate filename for the export bundle
 */
function generateBundleFilename(startTime: Date, endTime: Date): string {
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const startDate = formatDate(startTime);
  const endDate = formatDate(endTime);
  
  if (startDate === endDate) {
    return `securewatch-logs-${startDate}.zip`;
  } else {
    return `securewatch-logs-${startDate}-to-${endDate}.zip`;
  }
}

/**
 * Stream file to client
 */
function streamFileToResponse(filePath: string, filename: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      
      const response = new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': buffer.length.toString(),
          'X-Export-Status': 'success'
        }
      });

      resolve(response);
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}

export async function POST(request: NextRequest) {
  const requestId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[API/support/export-logs] Starting log export request ${requestId}`);

  try {
    // Parse and validate request body
    const body: ExportRequest = await request.json();
    const validation = validateExportRequest(body);
    
    if (!validation.valid) {
      console.log(`[API/support/export-logs] Validation failed for request ${requestId}:`, validation.errors);
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    // Convert request to export options
    const exportOptions: LogExportOptions = {
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      services: body.services,
      logLevels: body.logLevels,
      maxDocuments: body.maxDocuments || 50000,
      includeStackTraces: body.includeStackTraces || false
    };

    console.log(`[API/support/export-logs] Export options for ${requestId}:`, {
      timeRange: `${exportOptions.startTime.toISOString()} to ${exportOptions.endTime.toISOString()}`,
      services: exportOptions.services?.length || 'all',
      logLevels: exportOptions.logLevels?.length || 'all',
      maxDocuments: exportOptions.maxDocuments
    });

    // Check OpenSearch connection
    const logExporter = new LogExporter(opensearchClient);
    const healthCheck = await logExporter.healthCheck();
    
    if (!healthCheck.healthy) {
      console.error(`[API/support/export-logs] OpenSearch health check failed for ${requestId}:`, healthCheck.details);
      return NextResponse.json(
        { 
          error: 'OpenSearch service unavailable',
          details: 'Cannot connect to logging backend. Please try again later.'
        },
        { status: 503 }
      );
    }

    // Execute the log export
    console.log(`[API/support/export-logs] Starting log export process for ${requestId}`);
    const exportResult = await logExporter.exportLogs(exportOptions);
    
    console.log(`[API/support/export-logs] Export completed for ${requestId}:`, {
      totalDocuments: exportResult.totalDocuments,
      bundleSize: exportResult.bundleSize,
      exportDuration: exportResult.exportDuration,
      services: exportResult.services
    });

    // Generate appropriate filename
    const filename = generateBundleFilename(exportOptions.startTime, exportOptions.endTime);
    
    // Stream the file to the client
    const response = await streamFileToResponse(exportResult.bundlePath, filename);
    
    // Clean up the bundle file after streaming (fire and forget)
    fs.unlink(exportResult.bundlePath).catch(error => {
      console.warn(`[API/support/export-logs] Failed to cleanup bundle file for ${requestId}:`, error.message);
    });

    console.log(`[API/support/export-logs] Successfully served bundle for ${requestId}`);
    return response;

  } catch (error) {
    console.error(`[API/support/export-logs] Export failed for ${requestId}:`, error);
    
    // Determine appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        return NextResponse.json(
          { 
            error: 'Export timeout',
            details: 'The log export took too long to complete. Try reducing the time range or applying more filters.'
          },
          { status: 408 }
        );
      }
      
      if (error.message.includes('no_such_index') || error.message.includes('index_not_found')) {
        return NextResponse.json(
          { 
            error: 'No logs available',
            details: 'No log indices found for the specified time range.'
          },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Export failed',
        details: 'An unexpected error occurred during log export. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  try {
    const logExporter = new LogExporter(opensearchClient);
    const health = await logExporter.healthCheck();
    
    return NextResponse.json({
      service: 'log-export',
      status: health.healthy ? 'healthy' : 'unhealthy',
      opensearch: health.details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        service: 'log-export',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}