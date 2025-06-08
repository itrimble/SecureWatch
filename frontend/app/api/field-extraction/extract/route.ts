import { NextRequest, NextResponse } from 'next/server';

interface ExtractedField {
  name: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'email' | 'url';
  regex: string;
  confidence: number;
  position: { start: number; end: number };
  ruleId?: string;
}

interface FieldExtractionRule {
  id: string;
  name: string;
  regex: string;
  fieldName: string;
  fieldType: string;
  enabled: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      text, 
      rules = [], 
      enableAutoDetection = true,
      extractionMode = 'all' // 'all', 'rules-only', 'auto-only'
    } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required for field extraction' },
        { status: 400 }
      );
    }

    const extractedFields: ExtractedField[] = [];

    // Apply user-defined rules
    if (extractionMode === 'all' || extractionMode === 'rules-only') {
      for (const rule of rules.filter((r: FieldExtractionRule) => r.enabled)) {
        try {
          const regex = new RegExp(rule.regex, 'g');
          let match;
          
          while ((match = regex.exec(text)) !== null) {
            extractedFields.push({
              name: rule.fieldName,
              value: match[1] || match[0],
              type: rule.fieldType as any,
              regex: rule.regex,
              confidence: 0.95, // High confidence for user-defined rules
              position: { 
                start: match.index, 
                end: match.index + match[0].length 
              },
              ruleId: rule.id
            });
          }
        } catch (error) {
          console.error(`Error applying rule ${rule.name}:`, error);
        }
      }
    }

    // Auto-detection patterns
    if (enableAutoDetection && (extractionMode === 'all' || extractionMode === 'auto-only')) {
      const autoFields = performAutoDetection(text);
      
      // Merge auto-detected fields, avoiding duplicates from rules
      for (const autoField of autoFields) {
        const isDuplicate = extractedFields.some(existingField => 
          Math.abs(existingField.position.start - autoField.position.start) < 5 &&
          existingField.value === autoField.value
        );
        
        if (!isDuplicate) {
          extractedFields.push(autoField);
        }
      }
    }

    // Sort by confidence and position
    extractedFields.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return a.position.start - b.position.start;
    });

    return NextResponse.json({
      fields: extractedFields,
      statistics: {
        totalFields: extractedFields.length,
        rulesApplied: rules.filter((r: FieldExtractionRule) => r.enabled).length,
        autoDetectionEnabled: enableAutoDetection,
        extractionMode
      }
    });

  } catch (error) {
    console.error('Field extraction error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to extract fields',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function performAutoDetection(text: string): ExtractedField[] {
  const fields: ExtractedField[] = [];
  
  // IP addresses (IPv4)
  const ipRegex = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
  let match;
  while ((match = ipRegex.exec(text)) !== null) {
    // Validate IP ranges
    const parts = match[1].split('.').map(Number);
    if (parts.every(part => part >= 0 && part <= 255)) {
      fields.push({
        name: 'ip_address',
        value: match[1],
        type: 'ip',
        regex: ipRegex.source,
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }
  
  // Email addresses
  const emailRegex = /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g;
  while ((match = emailRegex.exec(text)) !== null) {
    fields.push({
      name: 'email_address',
      value: match[1],
      type: 'email',
      regex: emailRegex.source,
      confidence: 0.95,
      position: { start: match.index, end: match.index + match[0].length }
    });
  }
  
  // URLs
  const urlRegex = /\b(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
  while ((match = urlRegex.exec(text)) !== null) {
    fields.push({
      name: 'url',
      value: match[1],
      type: 'url',
      regex: urlRegex.source,
      confidence: 0.9,
      position: { start: match.index, end: match.index + match[0].length }
    });
  }
  
  // Timestamps (multiple formats)
  const timestampFormats = [
    // ISO 8601
    { regex: /\b(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)\b/g, name: 'iso_timestamp' },
    // RFC 3164 (syslog)
    { regex: /\b([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\b/g, name: 'syslog_timestamp' },
    // Apache/Nginx common log format
    { regex: /\[(\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s[+-]\d{4})\]/g, name: 'apache_timestamp' }
  ];
  
  for (const format of timestampFormats) {
    while ((match = format.regex.exec(text)) !== null) {
      fields.push({
        name: format.name,
        value: match[1],
        type: 'date',
        regex: format.regex.source,
        confidence: 0.85,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }
  
  // MAC addresses
  const macRegex = /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g;
  while ((match = macRegex.exec(text)) !== null) {
    fields.push({
      name: 'mac_address',
      value: match[0],
      type: 'string',
      regex: macRegex.source,
      confidence: 0.9,
      position: { start: match.index, end: match.index + match[0].length }
    });
  }
  
  // File paths (Unix and Windows)
  const filePathRegex = /\b([\/\\]?(?:[a-zA-Z0-9\s_@\-^!#$%&+={}\[\]]+[\/\\])*[a-zA-Z0-9\s_@\-^!#$%&+={}]+\.[a-zA-Z0-9]+)\b/g;
  while ((match = filePathRegex.exec(text)) !== null) {
    if (match[1].length > 3 && (match[1].includes('/') || match[1].includes('\\'))) {
      fields.push({
        name: 'file_path',
        value: match[1],
        type: 'string',
        regex: filePathRegex.source,
        confidence: 0.7,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }
  
  // Process IDs
  const pidRegex = /\bpid[:\s]*(\d+)\b/gi;
  while ((match = pidRegex.exec(text)) !== null) {
    fields.push({
      name: 'process_id',
      value: match[1],
      type: 'number',
      regex: pidRegex.source,
      confidence: 0.8,
      position: { start: match.index, end: match.index + match[0].length }
    });
  }
  
  // Port numbers
  const portRegex = /\bport[:\s]*(\d{1,5})\b/gi;
  while ((match = portRegex.exec(text)) !== null) {
    const port = parseInt(match[1]);
    if (port > 0 && port <= 65535) {
      fields.push({
        name: 'port_number',
        value: match[1],
        type: 'number',
        regex: portRegex.source,
        confidence: 0.85,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }
  
  // HTTP status codes
  const httpStatusRegex = /\b([1-5]\d{2})\b/g;
  while ((match = httpStatusRegex.exec(text)) !== null) {
    const status = parseInt(match[1]);
    if (status >= 100 && status <= 599) {
      // Check if it's in a likely HTTP context
      const context = text.substring(Math.max(0, match.index - 20), match.index + 20);
      if (/HTTP|status|response|request/i.test(context)) {
        fields.push({
          name: 'http_status_code',
          value: match[1],
          type: 'number',
          regex: httpStatusRegex.source,
          confidence: 0.8,
          position: { start: match.index, end: match.index + match[0].length }
        });
      }
    }
  }
  
  // Key-value pairs (flexible format)
  const kvRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)[=:]([^\s,;|&<>"'`]+)/g;
  while ((match = kvRegex.exec(text)) !== null) {
    // Skip if already captured by other patterns
    const isOverlapping = fields.some(field => 
      match.index >= field.position.start && match.index < field.position.end
    );
    
    if (!isOverlapping && match[2].length > 0) {
      fields.push({
        name: match[1],
        value: match[2],
        type: inferValueType(match[2]),
        regex: kvRegex.source,
        confidence: 0.75,
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }
  
  return fields;
}

function inferValueType(value: string): 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'email' | 'url' {
  // Number
  if (/^\d+$/.test(value)) return 'number';
  if (/^\d*\.\d+$/.test(value)) return 'number';
  
  // Boolean
  if (/^(true|false|yes|no|on|off|enabled|disabled)$/i.test(value)) return 'boolean';
  
  // IP address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
    const parts = value.split('.').map(Number);
    if (parts.every(part => part >= 0 && part <= 255)) return 'ip';
  }
  
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
  
  // URL
  if (/^https?:\/\//.test(value)) return 'url';
  
  // Date/time patterns
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return 'date';
  
  return 'string';
}