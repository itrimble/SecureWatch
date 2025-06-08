import { NextRequest, NextResponse } from 'next/server';
// import { Pool } from 'pg';
// import { LookupService, EnrichmentEngine } from '@securewatch/lookup-service';
// import { Redis } from 'redis';

// TODO: Implement these services when packages are available
// const dbPool = new Pool({...});
// const redis = new Redis({...});
// const lookupService = new LookupService(dbPool, redis);
// const enrichmentEngine = new EnrichmentEngine(dbPool, lookupService);

interface ExtractedField {
  name: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'email' | 'url';
  regex: string;
  confidence: number;
  position: { start: number; end: number };
}

interface ExtractionOptions {
  autoDetect?: boolean;
  patterns?: string[];
  confidence?: number;
}

// Field extraction function
function extractFieldsFromMessage(message: string, options: ExtractionOptions = {}): ExtractedField[] {
  const fields: ExtractedField[] = [];
  
  // IP addresses
  const ipRegex = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
  let match;
  while ((match = ipRegex.exec(message)) !== null) {
    fields.push({
      name: 'ip_address',
      value: match[1],
      type: 'ip',
      regex: ipRegex.source,
      confidence: 0.9,
      position: { start: match.index, end: match.index + match[0].length }
    });
  }
  
  // Email addresses
  const emailRegex = /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g;
  while ((match = emailRegex.exec(message)) !== null) {
    fields.push({
      name: 'email',
      value: match[1],
      type: 'email',
      regex: emailRegex.source,
      confidence: 0.95,
      position: { start: match.index, end: match.index + match[0].length }
    });
  }
  
  // URLs
  const urlRegex = /\b(https?:\/\/[^\s]+)\b/g;
  while ((match = urlRegex.exec(message)) !== null) {
    fields.push({
      name: 'url',
      value: match[1],
      type: 'url',
      regex: urlRegex.source,
      confidence: 0.9,
      position: { start: match.index, end: match.index + match[0].length }
    });
  }
  
  // Timestamps (ISO format)
  const timestampRegex = /\b(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)\b/g;
  while ((match = timestampRegex.exec(message)) !== null) {
    fields.push({
      name: 'timestamp',
      value: match[1],
      type: 'date',
      regex: timestampRegex.source,
      confidence: 0.95,
      position: { start: match.index, end: match.index + match[0].length }
    });
  }
  
  // Quoted strings
  const quotedRegex = /"([^"]*)"/g;
  while ((match = quotedRegex.exec(message)) !== null) {
    if (match[1].length > 0) {
      fields.push({
        name: 'quoted_string',
        value: match[1],
        type: 'string',
        regex: quotedRegex.source,
        confidence: 0.8,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }
  
  // Numbers
  const numberRegex = /\b(\d+)\b/g;
  while ((match = numberRegex.exec(message)) !== null) {
    // Skip if already captured as part of IP or timestamp
    const isPartOfOtherField = fields.some(field => 
      match.index >= field.position.start && match.index < field.position.end
    );
    
    if (!isPartOfOtherField) {
      fields.push({
        name: 'number',
        value: match[1],
        type: 'number',
        regex: numberRegex.source,
        confidence: 0.7,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }
  
  // Key-value pairs (key=value or key:value)
  const kvRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)[=:]([^\s,;]+)/g;
  while ((match = kvRegex.exec(message)) !== null) {
    const isPartOfOtherField = fields.some(field => 
      match.index >= field.position.start && match.index < field.position.end
    );
    
    if (!isPartOfOtherField) {
      fields.push({
        name: match[1],
        value: match[2],
        type: inferType(match[2]),
        regex: kvRegex.source,
        confidence: 0.85,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }
  
  return fields.sort((a, b) => b.confidence - a.confidence);
}

function inferType(value: string): 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'email' | 'url' {
  if (/^\d+$/.test(value)) return 'number';
  if (/^(true|false)$/i.test(value)) return 'boolean';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) return 'ip';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
  if (/^https?:\/\//.test(value)) return 'url';
  return 'string';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      data, 
      enableExternalLookups = false,
      message,
      options = {}
    } = body;

    // Handle field extraction for interactive field extractor
    if (message && typeof message === 'string') {
      const extractedFields = extractFieldsFromMessage(message, options);
      return NextResponse.json({ fields: extractedFields });
    }

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data array or message is required' },
        { status: 400 }
      );
    }

    interface SearchResult {
      [key: string]: unknown;
    }

    // Mock enrichment response for search results
    const enrichedData = data.map((item: SearchResult, index: number) => ({
      ...item,
      _enrichment: {
        reputation: index % 3 === 0 ? 'malicious' : 'clean',
        geo_location: 'US',
        threat_type: index % 2 === 0 ? 'malware' : null,
        enriched_at: new Date().toISOString()
      }
    }));

    return NextResponse.json({
      enrichedData,
      statistics: {
        originalRecords: data.length,
        enrichedRecords: enrichedData.length,
        appliedRules: ['geo_lookup', 'threat_intel'],
        totalLookups: data.length,
        totalExternalLookups: enableExternalLookups ? Math.floor(data.length * 0.3) : 0,
        errorCount: 0
      }
    });

  } catch (error) {
    console.error('Search enrichment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to enrich search results',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'rules') {
      return NextResponse.json([
        {
          id: '1',
          name: 'IP Geolocation',
          description: 'Enrich IP addresses with location data',
          field_pattern: 'src_ip|dest_ip',
          is_active: true
        },
        {
          id: '2',
          name: 'Threat Intelligence',
          description: 'Check IPs against threat feeds',
          field_pattern: '.*_ip',
          is_active: true
        }
      ]);
    }

    if (action === 'api-configs') {
      return NextResponse.json([
        {
          id: '1',
          name: 'VirusTotal',
          description: 'File and URL analysis',
          baseUrl: 'https://www.virustotal.com/vtapi/v2/',
          rateLimit: 4,
          timeout: 30000
        }
      ]);
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Enrichment GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve enrichment information' },
      { status: 500 }
    );
  }
}