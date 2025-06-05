import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  try {
    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.evtx')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload an EVTX file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Save file to temporary location
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempFilePath = join(tmpdir(), `evtx_${Date.now()}_${file.name}`);
    
    await writeFile(tempFilePath, buffer);

    try {
      // Execute Python EVTX parser
      const pythonScript = join(process.cwd(), 'scripts', 'evtx_parser.py');
      const result = await executeEVTXParser(pythonScript, tempFilePath);
      
      // Clean up temporary file
      await unlink(tempFilePath);
      
      return NextResponse.json(result);
      
    } catch (parseError) {
      // Clean up temporary file on error
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Failed to clean up temp file:', unlinkError);
      }
      
      console.error('EVTX parsing error:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: parseError instanceof Error ? parseError.message : 'Failed to parse EVTX file' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('EVTX upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      },
      { status: 500 }
    );
  }
}

function executeEVTXParser(scriptPath: string, evtxFilePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = [
      scriptPath,
      evtxFilePath,
      '--dry-run', // Parse only, don't send to ingestion
      '--batch-size', '100'
    ];

    console.log('Executing EVTX parser:', 'python3', args.join(' '));

    const python = spawn('python3', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: join(process.cwd(), 'scripts') }
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      console.log('Python parser finished with code:', code);
      console.log('Parser stdout:', stdout);
      if (stderr) {
        console.log('Parser stderr:', stderr);
      }

      if (code === 0) {
        try {
          // Parse the JSON output from the Python script
          const result = JSON.parse(stdout);
          
          // Add success indicator
          result.success = true;
          
          resolve(result);
        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
          reject(new Error(`Failed to parse parser output: ${parseError}`));
        }
      } else {
        const errorMessage = stderr || `Parser exited with code ${code}`;
        reject(new Error(`EVTX parsing failed: ${errorMessage}`));
      }
    });

    python.on('error', (error) => {
      console.error('Failed to spawn Python parser:', error);
      reject(new Error(`Failed to execute EVTX parser: ${error.message}`));
    });

    // Set a timeout to prevent hanging
    setTimeout(() => {
      python.kill('SIGTERM');
      reject(new Error('EVTX parsing timed out after 5 minutes'));
    }, 5 * 60 * 1000); // 5 minutes timeout
  });
}

// Add OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}