import logger from '../utils/logger';

export interface FieldExtractionOptions {
  delimiter?: string;
  kvDelimiter?: string;
  quotedValues?: boolean;
  trimValues?: boolean;
  caseSensitive?: boolean;
  allowDuplicateKeys?: boolean;
}

export interface ExtractedField {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'email' | 'url';
  confidence: number;
}

export class FieldExtractor {
  private defaultOptions: FieldExtractionOptions = {
    delimiter: ' ',
    kvDelimiter: '=',
    quotedValues: true,
    trimValues: true,
    caseSensitive: false,
    allowDuplicateKeys: false,
  };

  /**
   * Extract structured fields from a raw message string
   */
  extractFromMessage(message: string, options: Partial<FieldExtractionOptions> = {}): Record<string, any> {
    const opts = { ...this.defaultOptions, ...options };
    const fields: Record<string, any> = {};

    try {
      // Try JSON parsing first
      const jsonFields = this.tryJsonParsing(message);
      if (jsonFields) {
        return jsonFields;
      }

      // Try key-value parsing
      const kvFields = this.extractKeyValuePairs(message, opts);
      if (Object.keys(kvFields).length > 0) {
        Object.assign(fields, kvFields);
      }

      // Extract common patterns (IPs, emails, URLs, etc.)
      const patternFields = this.extractCommonPatterns(message);
      Object.assign(fields, patternFields);

      // Extract quoted strings
      const quotedFields = this.extractQuotedStrings(message);
      Object.assign(fields, quotedFields);

    } catch (error) {
      logger.warn('Error extracting fields from message', { error, message: message.substring(0, 100) });
    }

    return fields;
  }

  /**
   * Parse key-value pairs from a string
   */
  extractKeyValuePairs(input: string, options: FieldExtractionOptions): Record<string, any> {
    const fields: Record<string, any> = {};
    const kvDelimiter = options.kvDelimiter || '=';
    
    try {
      // Handle different KV formats
      const kvPairs = this.parseKeyValueString(input, kvDelimiter, options);
      
      for (const pair of kvPairs) {
        const key = options.caseSensitive ? pair.key : pair.key.toLowerCase();
        
        if (!options.allowDuplicateKeys && fields[key] !== undefined) {
          // Handle duplicate keys by creating arrays
          if (Array.isArray(fields[key])) {
            fields[key].push(pair.value);
          } else {
            fields[key] = [fields[key], pair.value];
          }
        } else {
          fields[key] = this.inferType(pair.value);
        }
      }
    } catch (error) {
      logger.debug('Error parsing key-value pairs', { error, input: input.substring(0, 100) });
    }

    return fields;
  }

  /**
   * Try to parse the entire message as JSON
   */
  private tryJsonParsing(message: string): Record<string, any> | null {
    try {
      const trimmed = message.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        return JSON.parse(trimmed);
      }
    } catch {
      // Not valid JSON, continue with other parsing methods
    }
    return null;
  }

  /**
   * Parse key-value pairs with various formats
   */
  private parseKeyValueString(input: string, kvDelimiter: string, options: FieldExtractionOptions): Array<{key: string, value: any}> {
    const pairs: Array<{key: string, value: any}> = [];
    
    // Multiple KV parsing strategies
    const strategies = [
      () => this.parseSpaceSeparatedKV(input, kvDelimiter, options),
      () => this.parseQuotedKV(input, kvDelimiter, options),
      () => this.parseCommaDelimitedKV(input, kvDelimiter, options),
      () => this.parseLogstashKV(input, kvDelimiter, options),
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result.length > 0) {
          pairs.push(...result);
          break; // Use the first successful strategy
        }
      } catch (error) {
        logger.debug('KV parsing strategy failed', { error });
        continue;
      }
    }

    return pairs;
  }

  /**
   * Parse space-separated key-value pairs: key1=value1 key2=value2
   */
  private parseSpaceSeparatedKV(input: string, kvDelimiter: string, options: FieldExtractionOptions): Array<{key: string, value: any}> {
    const pairs: Array<{key: string, value: any}> = [];
    const regex = new RegExp(`([\\w\\.-]+)${this.escapeRegex(kvDelimiter)}([^\\s]+|"[^"]*"|'[^']*')`, 'g');
    
    let match;
    while ((match = regex.exec(input)) !== null) {
      const key = match[1];
      let value = match[2];
      
      // Remove quotes if present
      if (options.quotedValues && ((value.startsWith('"') && value.endsWith('"')) || 
                                   (value.startsWith("'") && value.endsWith("'")))) {
        value = value.slice(1, -1);
      }
      
      if (options.trimValues) {
        value = value.trim();
      }
      
      pairs.push({ key, value });
    }
    
    return pairs;
  }

  /**
   * Parse quoted key-value pairs: "key1"="value1" "key2"="value2"
   */
  private parseQuotedKV(input: string, kvDelimiter: string, options: FieldExtractionOptions): Array<{key: string, value: any}> {
    const pairs: Array<{key: string, value: any}> = [];
    const regex = new RegExp(`"([^"]+)"${this.escapeRegex(kvDelimiter)}"([^"]*)"`, 'g');
    
    let match;
    while ((match = regex.exec(input)) !== null) {
      const key = match[1];
      const value = options.trimValues ? match[2].trim() : match[2];
      pairs.push({ key, value });
    }
    
    return pairs;
  }

  /**
   * Parse comma-delimited key-value pairs: key1=value1, key2=value2
   */
  private parseCommaDelimitedKV(input: string, kvDelimiter: string, options: FieldExtractionOptions): Array<{key: string, value: any}> {
    const pairs: Array<{key: string, value: any}> = [];
    const segments = input.split(',');
    
    for (const segment of segments) {
      const trimmedSegment = segment.trim();
      const delimiterIndex = trimmedSegment.indexOf(kvDelimiter);
      
      if (delimiterIndex > 0) {
        const key = trimmedSegment.substring(0, delimiterIndex).trim();
        let value = trimmedSegment.substring(delimiterIndex + kvDelimiter.length);
        
        if (options.trimValues) {
          value = value.trim();
        }
        
        // Remove quotes if present
        if (options.quotedValues && ((value.startsWith('"') && value.endsWith('"')) || 
                                     (value.startsWith("'") && value.endsWith("'")))) {
          value = value.slice(1, -1);
        }
        
        pairs.push({ key, value });
      }
    }
    
    return pairs;
  }

  /**
   * Parse Logstash-style key-value pairs with complex quoting
   */
  private parseLogstashKV(input: string, kvDelimiter: string, options: FieldExtractionOptions): Array<{key: string, value: any}> {
    const pairs: Array<{key: string, value: any}> = [];
    let i = 0;
    
    while (i < input.length) {
      // Skip whitespace
      while (i < input.length && /\s/.test(input[i])) {
        i++;
      }
      
      if (i >= input.length) break;
      
      // Extract key
      const keyStart = i;
      while (i < input.length && /[\w\.-]/.test(input[i])) {
        i++;
      }
      
      if (i >= input.length || input[i] !== kvDelimiter) {
        i++;
        continue;
      }
      
      const key = input.substring(keyStart, i);
      i++; // Skip delimiter
      
      // Extract value
      let value = '';
      if (i < input.length) {
        if (input[i] === '"') {
          // Quoted value
          i++; // Skip opening quote
          const valueStart = i;
          while (i < input.length && input[i] !== '"') {
            if (input[i] === '\\' && i + 1 < input.length) {
              i += 2; // Skip escaped character
            } else {
              i++;
            }
          }
          value = input.substring(valueStart, i);
          if (i < input.length) i++; // Skip closing quote
        } else {
          // Unquoted value
          const valueStart = i;
          while (i < input.length && !/\s/.test(input[i])) {
            i++;
          }
          value = input.substring(valueStart, i);
        }
      }
      
      if (options.trimValues) {
        value = value.trim();
      }
      
      pairs.push({ key, value });
    }
    
    return pairs;
  }

  /**
   * Extract common patterns like IPs, emails, URLs from text
   */
  private extractCommonPatterns(input: string): Record<string, any> {
    const patterns: Record<string, any> = {};
    
    // IP addresses
    const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    const ips = input.match(ipRegex);
    if (ips && ips.length > 0) {
      patterns.detected_ips = [...new Set(ips)];
    }
    
    // Email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = input.match(emailRegex);
    if (emails && emails.length > 0) {
      patterns.detected_emails = [...new Set(emails)];
    }
    
    // URLs
    const urlRegex = /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?/g;
    const urls = input.match(urlRegex);
    if (urls && urls.length > 0) {
      patterns.detected_urls = [...new Set(urls)];
    }
    
    // MAC addresses
    const macRegex = /\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b/g;
    const macs = input.match(macRegex);
    if (macs && macs.length > 0) {
      patterns.detected_macs = [...new Set(macs)];
    }
    
    // Timestamps (various formats)
    const timestampRegex = /\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?\b/g;
    const timestamps = input.match(timestampRegex);
    if (timestamps && timestamps.length > 0) {
      patterns.detected_timestamps = [...new Set(timestamps)];
    }
    
    return patterns;
  }

  /**
   * Extract quoted strings from input
   */
  private extractQuotedStrings(input: string): Record<string, any> {
    const quotes: Record<string, any> = {};
    
    // Double quoted strings
    const doubleQuotedRegex = /"([^"]*)"/g;
    const doubleQuoted = [];
    let match;
    while ((match = doubleQuotedRegex.exec(input)) !== null) {
      doubleQuoted.push(match[1]);
    }
    if (doubleQuoted.length > 0) {
      quotes.quoted_strings = doubleQuoted;
    }
    
    return quotes;
  }

  /**
   * Infer the type of a value and convert it appropriately
   */
  private inferType(value: string): any {
    const trimmed = value.trim();
    
    // Boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    
    // Number
    if (/^-?\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }
    if (/^-?\d*\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }
    
    // Date (ISO format)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Default to string
    return trimmed;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extract fields with confidence scoring
   */
  extractFieldsWithConfidence(message: string, options: Partial<FieldExtractionOptions> = {}): ExtractedField[] {
    const fields: ExtractedField[] = [];
    const extractedData = this.extractFromMessage(message, options);
    
    for (const [key, value] of Object.entries(extractedData)) {
      const field: ExtractedField = {
        key,
        value,
        type: this.determineFieldType(value),
        confidence: this.calculateConfidence(key, value, message),
      };
      fields.push(field);
    }
    
    return fields.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Determine the semantic type of a field value
   */
  private determineFieldType(value: any): ExtractedField['type'] {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    
    if (typeof value === 'string') {
      // IP address
      if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value)) {
        return 'ip';
      }
      
      // Email
      if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/.test(value)) {
        return 'email';
      }
      
      // URL
      if (/^https?:\/\//.test(value)) {
        return 'url';
      }
    }
    
    return 'string';
  }

  /**
   * Calculate confidence score for extracted field
   */
  private calculateConfidence(key: string, value: any, originalMessage: string): number {
    let confidence = 0.5; // Base confidence
    
    // Key quality factors
    if (key.length > 1 && /^[a-zA-Z]/.test(key)) confidence += 0.2;
    if (key.includes('_') || key.includes('.')) confidence += 0.1;
    
    // Value quality factors
    if (value !== null && value !== undefined && value !== '') confidence += 0.2;
    if (typeof value !== 'string' || value.length > 1) confidence += 0.1;
    
    // Context factors
    const keyInOriginal = originalMessage.toLowerCase().includes(key.toLowerCase());
    if (keyInOriginal) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
}

export default FieldExtractor;