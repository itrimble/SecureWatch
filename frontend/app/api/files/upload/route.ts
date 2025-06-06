import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define supported file types and their processors
const SUPPORTED_FILE_TYPES = {
  'text/csv': {
    extensions: ['.csv', '.tsv'],
    processor: 'csv',
    maxSize: 100 * 1024 * 1024, // 100MB
    description: 'CSV/TSV log files'
  },
  'application/json': {
    extensions: ['.json', '.jsonl', '.ndjson'],
    processor: 'json',
    maxSize: 100 * 1024 * 1024, // 100MB
    description: 'JSON log files'
  },
  'text/xml': {
    extensions: ['.xml'],
    processor: 'xml',
    maxSize: 100 * 1024 * 1024, // 100MB
    description: 'XML log files'
  },
  'application/xml': {
    extensions: ['.xml'],
    processor: 'xml',
    maxSize: 100 * 1024 * 1024, // 100MB
    description: 'XML log files'
  },
  'text/plain': {
    extensions: ['.log', '.txt'],
    processor: 'text',
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'Plain text log files'
  },
  'application/octet-stream': {
    extensions: ['.evtx'],
    processor: 'evtx',
    maxSize: 200 * 1024 * 1024, // 200MB
    description: 'Windows Event Log files'
  }
};

interface FileUploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  processor: string;
  uploadPath: string;
  processingStatus: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
  error?: string;
}

interface ProcessingRequest {
  fileId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  processor: string;
  options?: {
    delimiter?: string;
    hasHeaders?: boolean;
    timestampField?: string;
    timestampFormat?: string;
    source?: string;
    sourcetype?: string;
    index?: string;
  };
}

/**
 * Handle file upload for ad-hoc log analysis
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const data = await request.formData();
    const file = data.get('file') as File;
    const options = data.get('options') ? JSON.parse(data.get('options') as string) : {};

    // Validate file presence
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate file size
    const fileSize = file.size;
    if (fileSize === 0) {
      return NextResponse.json({
        success: false,
        error: 'Empty file provided'
      }, { status: 400 });
    }

    // Determine file type and validate
    const fileType = file.type || 'application/octet-stream';
    const fileName = file.name;
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

    // Find matching file type configuration
    let matchedConfig = SUPPORTED_FILE_TYPES[fileType as keyof typeof SUPPORTED_FILE_TYPES];
    
    // If no exact match, try to match by extension
    if (!matchedConfig) {
      for (const [type, config] of Object.entries(SUPPORTED_FILE_TYPES)) {
        if (config.extensions.includes(fileExtension)) {
          matchedConfig = config;
          break;
        }
      }
    }

    if (!matchedConfig) {
      return NextResponse.json({
        success: false,
        error: `Unsupported file type: ${fileType}. Supported types: ${Object.values(SUPPORTED_FILE_TYPES).map(c => c.description).join(', ')}`
      }, { status: 400 });
    }

    // Validate file size against limits
    if (fileSize > matchedConfig.maxSize) {
      return NextResponse.json({
        success: false,
        error: `File size ${fileSize} bytes exceeds maximum allowed size ${matchedConfig.maxSize} bytes for ${matchedConfig.description}`
      }, { status: 413 });
    }

    // Generate unique file ID and create upload directory
    const fileId = uuidv4();
    const uploadDir = join(process.cwd(), 'uploads', 'adhoc', fileId);
    await mkdir(uploadDir, { recursive: true });

    // Save the file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadPath = join(uploadDir, fileName);
    await writeFile(uploadPath, buffer);

    // Create processing metadata
    const processingRequest: ProcessingRequest = {
      fileId,
      filePath: uploadPath,
      fileName,
      fileType,
      processor: matchedConfig.processor,
      options: {
        source: options.source || `adhoc:${fileName}`,
        sourcetype: options.sourcetype || matchedConfig.processor,
        index: options.index || 'adhoc_analysis',
        ...options
      }
    };

    // Save processing metadata
    const metadataPath = join(uploadDir, 'metadata.json');
    await writeFile(metadataPath, JSON.stringify({
      ...processingRequest,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'api', // In production, extract from auth
      originalSize: fileSize,
      status: 'queued'
    }, null, 2));

    // Queue file for processing
    const processingResult = await queueFileProcessing(processingRequest);

    const result: FileUploadResult = {
      success: true,
      fileId,
      fileName,
      fileSize,
      fileType,
      processor: matchedConfig.processor,
      uploadPath: `uploads/adhoc/${fileId}/${fileName}`,
      processingStatus: 'queued',
      message: 'File uploaded successfully and queued for processing'
    };

    console.log('File upload successful:', {
      fileId,
      fileName,
      fileSize,
      processor: matchedConfig.processor,
      processingQueued: processingResult.success
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during file upload'
    }, { status: 500 });
  }
}

/**
 * Get upload status and supported file types
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const fileId = url.searchParams.get('fileId');

    if (fileId) {
      // Return status for specific file
      return getFileStatus(fileId);
    }

    // Return supported file types and limits
    return NextResponse.json({
      success: true,
      supportedTypes: Object.entries(SUPPORTED_FILE_TYPES).map(([mimeType, config]) => ({
        mimeType,
        extensions: config.extensions,
        processor: config.processor,
        maxSize: config.maxSize,
        description: config.description,
        maxSizeMB: Math.round(config.maxSize / (1024 * 1024))
      })),
      limits: {
        maxFiles: 10, // Maximum concurrent uploads
        maxTotalSize: 1024 * 1024 * 1024, // 1GB total
        supportedProcessors: ['csv', 'json', 'xml', 'text', 'evtx']
      }
    });

  } catch (error) {
    console.error('GET file upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve file upload information'
    }, { status: 500 });
  }
}

/**
 * Queue file for processing by appropriate adapter
 */
async function queueFileProcessing(request: ProcessingRequest): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Send to log ingestion service for processing
    const logIngestionUrl = process.env.LOG_INGESTION_URL || 'http://localhost:4002';
    
    const response = await fetch(`${logIngestionUrl}/process-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Log ingestion service responded with status ${response.status}`);
    }

    const result = await response.json();
    return { success: true, message: 'File queued for processing' };

  } catch (error) {
    console.error('Failed to queue file processing:', error);
    
    // Fallback: Save to processing queue directory for manual processing
    try {
      const queueDir = join(process.cwd(), 'uploads', 'queue');
      await mkdir(queueDir, { recursive: true });
      
      const queueFile = join(queueDir, `${request.fileId}.json`);
      await writeFile(queueFile, JSON.stringify({
        ...request,
        queuedAt: new Date().toISOString(),
        priority: 'normal'
      }, null, 2));

      return { success: true, message: 'File queued for manual processing' };
    } catch (queueError) {
      console.error('Failed to queue file for manual processing:', queueError);
      return { 
        success: false, 
        error: 'Failed to queue file for processing' 
      };
    }
  }
}

/**
 * Get processing status for a specific file
 */
async function getFileStatus(fileId: string): Promise<NextResponse> {
  try {
    const metadataPath = join(process.cwd(), 'uploads', 'adhoc', fileId, 'metadata.json');
    
    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
      
      // Check processing status from log ingestion service
      const logIngestionUrl = process.env.LOG_INGESTION_URL || 'http://localhost:4002';
      
      try {
        const response = await fetch(`${logIngestionUrl}/processing-status/${fileId}`);
        if (response.ok) {
          const status = await response.json();
          metadata.processingStatus = status.status;
          metadata.processingResult = status.result;
        }
      } catch (statusError) {
        console.warn('Could not fetch processing status:', statusError);
      }

      return NextResponse.json({
        success: true,
        data: metadata
      });

    } catch (fileError) {
      return NextResponse.json({
        success: false,
        error: 'File not found or metadata unavailable'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error getting file status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve file status'
    }, { status: 500 });
  }
}

// Import readFile for getFileStatus
import { readFile } from 'fs/promises';