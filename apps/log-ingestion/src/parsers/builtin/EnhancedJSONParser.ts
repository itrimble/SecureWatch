import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  UserInfo,
  DeviceInfo,
  NetworkInfo,
  ProcessInfo,
  FileInfo
} from '../types';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { JSONPath } from 'jsonpath-plus';

/**
 * Enhanced JSON Parser with JSONPath support and JSON Schema validation
 * Handles complex JSON log structures with configurable field extraction
 */
export class EnhancedJSONParser implements LogParser {
  id = 'enhanced-json-parser';
  name = 'Enhanced JSON Parser with Schema Validation';
  vendor = 'SecureWatch';
  logSource = 'json-logs';
  version = '2.0.0';
  format = 'json' as const;
  category = 'application' as const;
  priority = 85; // High priority for JSON parsing
  enabled = true;

  private ajv: Ajv;
  private defaultSchema: object;

  constructor() {
    // Initialize AJV with format validation
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    
    // Default JSON log schema
    this.defaultSchema = {
      type: 'object',
      properties: {
        timestamp: {
          oneOf: [
            { type: 'string', format: 'date-time' },
            { type: 'string', pattern: '^\\d{10}$' }, // Unix timestamp
            { type: 'string', pattern: '^\\d{13}$' }, // Unix timestamp ms
            { type: 'number' }
          ]
        },
        level: { type: 'string' },
        message: { type: 'string' },
        logger: { type: 'string' },
        source: { type: 'string' },
        host: { type: 'string' },
        service: { type: 'string' }
      },
      additionalProperties: true
    };
  }

  validate(rawLog: string): boolean {
    try {
      const parsed = JSON.parse(rawLog);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      const jsonData = JSON.parse(rawLog);
      
      // Validate against schema if available
      const isValid = this.validateSchema(jsonData);
      if (!isValid) {
        console.warn('JSON validation failed, proceeding with best-effort parsing');
      }

      // Extract core fields using JSONPath
      const timestamp = this.extractTimestamp(jsonData);
      const source = this.extractSource(jsonData);
      const action = this.extractAction(jsonData);
      const outcome = this.extractOutcome(jsonData);
      const severity = this.extractSeverity(jsonData);

      // Extract entity information
      const user = this.extractUser(jsonData);
      const device = this.extractDevice(jsonData);
      const network = this.extractNetwork(jsonData);
      const process = this.extractProcess(jsonData);
      const file = this.extractFile(jsonData);

      const event: ParsedEvent = {
        timestamp,
        source,
        category: this.determineCategory(jsonData),
        action,
        outcome,
        severity,
        rawData: rawLog,
        custom: {
          json: jsonData,
          validation: {
            valid: isValid,
            errors: isValid ? [] : this.ajv.errors
          }
        }
      };

      // Add optional fields if extracted
      if (user) event.user = user;
      if (device) event.device = device;
      if (network) event.network = network;
      if (process) event.process = process;
      if (file) event.file = file;

      return event;
    } catch (error) {
      console.error('JSON parsing failed:', error);
      return null;
    }
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const jsonData = event.custom?.json || {};
    
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': this.mapToECSCategory(event.category),
      'event.type': this.mapToECSType(jsonData),
      'event.action': event.action,
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.provider': jsonData.source || jsonData.logger || 'json-logs',
      'event.dataset': jsonData.service || 'json-application',
      'event.module': 'json',

      // Log-specific fields
      'log.level': jsonData.level || jsonData.severity,
      'log.logger': jsonData.logger || jsonData.name,

      // Service fields
      'service.name': jsonData.service || jsonData.serviceName,
      'service.version': jsonData.version || jsonData.serviceVersion,
      'service.environment': jsonData.environment || jsonData.env,

      // Message
      'message': jsonData.message || jsonData.msg || jsonData.text || event.rawData,

      // User fields (if extracted)
      'user.name': event.user?.name,
      'user.id': event.user?.id,
      'user.email': event.user?.email,
      'user.domain': event.user?.domain,

      // Host fields (if extracted)
      'host.name': event.device?.name || jsonData.hostname || jsonData.host,
      'host.ip': event.device?.ip,

      // Source/Destination fields (if extracted)
      'source.ip': event.network?.sourceIp,
      'source.port': event.network?.sourcePort,
      'destination.ip': event.network?.destinationIp,
      'destination.port': event.network?.destinationPort,
      'network.protocol': event.network?.protocol,

      // Process fields (if extracted)
      'process.name': event.process?.name,
      'process.pid': event.process?.pid,
      'process.command_line': event.process?.commandLine,

      // File fields (if extracted)
      'file.name': event.file?.name,
      'file.path': event.file?.path,
      'file.size': event.file?.size,

      // URL fields
      'url.full': jsonData.url || jsonData.uri,
      'url.path': jsonData.path || jsonData.endpoint,
      'url.query': jsonData.query || jsonData.queryString,

      // HTTP fields
      'http.request.method': jsonData.method || jsonData.httpMethod,
      'http.response.status_code': this.parseNumber(jsonData.status || jsonData.statusCode || jsonData.responseCode),
      'http.response.body.bytes': this.parseNumber(jsonData.responseSize || jsonData.contentLength),
      'user_agent.original': jsonData.userAgent || jsonData.user_agent,

      // Error fields
      'error.message': jsonData.error || jsonData.errorMessage,
      'error.code': jsonData.errorCode || jsonData.code,
      'error.stack_trace': jsonData.stack || jsonData.stackTrace,

      // Custom fields from JSONPath extractions
      ...this.extractCustomFields(jsonData),

      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': event.custom?.validation?.valid ? 0.95 : 0.75,
      'securewatch.severity': event.severity,

      // Labels for categorization
      'labels': {
        json_valid: event.custom?.validation?.valid,
        log_level: jsonData.level,
        service: jsonData.service,
        environment: jsonData.environment
      }
    };

    // Clean up undefined fields
    Object.keys(normalized).forEach(key => (normalized[key] === undefined) && delete normalized[key]);

    return normalized;
  }

  private validateSchema(data: any, customSchema?: object): boolean {
    const schema = customSchema || this.defaultSchema;
    const validate = this.ajv.compile(schema);
    return validate(data);
  }

  private extractTimestamp(data: any): Date {
    // Try various JSONPath expressions for timestamp
    const timestampPaths = [
      '$.timestamp', '$.@timestamp', '$.time', '$.ts', '$.eventTime',
      '$.created', '$.occurred', '$.logged', '$.datetime'
    ];

    for (const path of timestampPaths) {
      const result = JSONPath({ path, json: data, wrap: false });
      if (result) {
        const parsed = this.parseTimestamp(result);
        if (parsed) return parsed;
      }
    }

    return new Date(); // Fallback to current time
  }

  private extractSource(data: any): string {
    const sourcePaths = [
      '$.source', '$.logger', '$.host', '$.hostname', '$.service',
      '$.application', '$.component', '$.module'
    ];

    for (const path of sourcePaths) {
      const result = JSONPath({ path, json: data, wrap: false });
      if (result && typeof result === 'string') return result;
    }

    return 'json-logs';
  }

  private extractAction(data: any): string {
    const actionPaths = [
      '$.action', '$.event', '$.operation', '$.method', '$.type',
      '$.eventType', '$.activity', '$.command'
    ];

    for (const path of actionPaths) {
      const result = JSONPath({ path, json: data, wrap: false });
      if (result && typeof result === 'string') return result;
    }

    return 'unknown';
  }

  private extractOutcome(data: any): 'success' | 'failure' | 'unknown' {
    const outcomePaths = [
      '$.outcome', '$.result', '$.status', '$.success', '$.failed',
      '$.error', '$.level'
    ];

    for (const path of outcomePaths) {
      const result = JSONPath({ path, json: data, wrap: false });
      if (result) {
        const outcome = this.parseOutcome(result);
        if (outcome !== 'unknown') return outcome;
      }
    }

    return 'unknown';
  }

  private extractSeverity(data: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityPaths = [
      '$.severity', '$.level', '$.priority', '$.criticality'
    ];

    for (const path of severityPaths) {
      const result = JSONPath({ path, json: data, wrap: false });
      if (result) {
        const severity = this.parseSeverity(result);
        if (severity) return severity;
      }
    }

    return 'medium';
  }

  private extractUser(data: any): UserInfo | undefined {
    const userPaths = {
      name: ['$.user', '$.username', '$.userId', '$.user.name', '$.user.username'],
      id: ['$.user.id', '$.userId', '$.uid', '$.user.uid'],
      email: ['$.user.email', '$.email', '$.userEmail'],
      domain: ['$.user.domain', '$.domain', '$.userDomain']
    };

    const user: Partial<UserInfo> = {};
    let hasUserData = false;

    for (const [field, paths] of Object.entries(userPaths)) {
      for (const path of paths) {
        const result = JSONPath({ path, json: data, wrap: false });
        if (result) {
          user[field as keyof UserInfo] = result.toString();
          hasUserData = true;
          break;
        }
      }
    }

    return hasUserData ? user as UserInfo : undefined;
  }

  private extractDevice(data: any): DeviceInfo | undefined {
    const devicePaths = {
      name: ['$.host', '$.hostname', '$.device', '$.server', '$.computer'],
      ip: ['$.host.ip', '$.hostIP', '$.serverIP', '$.ip']
    };

    const device: Partial<DeviceInfo> = {};
    let hasDeviceData = false;

    for (const [field, paths] of Object.entries(devicePaths)) {
      for (const path of paths) {
        const result = JSONPath({ path, json: data, wrap: false });
        if (result) {
          if (field === 'ip') {
            device.ip = Array.isArray(result) ? result : [result.toString()];
          } else {
            device[field as keyof DeviceInfo] = result.toString();
          }
          hasDeviceData = true;
          break;
        }
      }
    }

    return hasDeviceData ? device as DeviceInfo : undefined;
  }

  private extractNetwork(data: any): NetworkInfo | undefined {
    const networkPaths = {
      sourceIp: ['$.src.ip', '$.source.ip', '$.srcIP', '$.clientIP'],
      sourcePort: ['$.src.port', '$.source.port', '$.srcPort', '$.clientPort'],
      destinationIp: ['$.dst.ip', '$.destination.ip', '$.dstIP', '$.serverIP'],
      destinationPort: ['$.dst.port', '$.destination.port', '$.dstPort', '$.serverPort'],
      protocol: ['$.protocol', '$.proto', '$.network.protocol']
    };

    const network: Partial<NetworkInfo> = {};
    let hasNetworkData = false;

    for (const [field, paths] of Object.entries(networkPaths)) {
      for (const path of paths) {
        const result = JSONPath({ path, json: data, wrap: false });
        if (result) {
          if (field.includes('Port')) {
            network[field as keyof NetworkInfo] = this.parseNumber(result);
          } else {
            network[field as keyof NetworkInfo] = result.toString();
          }
          hasNetworkData = true;
          break;
        }
      }
    }

    return hasNetworkData ? network as NetworkInfo : undefined;
  }

  private extractProcess(data: any): ProcessInfo | undefined {
    const processPaths = {
      name: ['$.process', '$.processName', '$.proc', '$.command'],
      pid: ['$.pid', '$.processId', '$.process.pid'],
      commandLine: ['$.commandLine', '$.cmd', '$.command', '$.process.command']
    };

    const process: Partial<ProcessInfo> = {};
    let hasProcessData = false;

    for (const [field, paths] of Object.entries(processPaths)) {
      for (const path of paths) {
        const result = JSONPath({ path, json: data, wrap: false });
        if (result) {
          if (field === 'pid') {
            process.pid = this.parseNumber(result);
          } else {
            process[field as keyof ProcessInfo] = result.toString();
          }
          hasProcessData = true;
          break;
        }
      }
    }

    return hasProcessData ? process as ProcessInfo : undefined;
  }

  private extractFile(data: any): FileInfo | undefined {
    const filePaths = {
      name: ['$.file', '$.fileName', '$.filename'],
      path: ['$.filePath', '$.path', '$.file.path'],
      size: ['$.fileSize', '$.size', '$.file.size']
    };

    const file: Partial<FileInfo> = {};
    let hasFileData = false;

    for (const [field, paths] of Object.entries(filePaths)) {
      for (const path of paths) {
        const result = JSONPath({ path, json: data, wrap: false });
        if (result) {
          if (field === 'size') {
            file.size = this.parseNumber(result);
          } else {
            file[field as keyof FileInfo] = result.toString();
          }
          hasFileData = true;
          break;
        }
      }
    }

    return hasFileData ? file as FileInfo : undefined;
  }

  private extractCustomFields(data: any): Record<string, any> {
    const customFields: Record<string, any> = {};
    
    // Extract common custom fields
    const customPaths = [
      { key: 'request_id', paths: ['$.requestId', '$.request_id', '$.correlationId'] },
      { key: 'session_id', paths: ['$.sessionId', '$.session_id', '$.sid'] },
      { key: 'trace_id', paths: ['$.traceId', '$.trace_id', '$.tid'] },
      { key: 'span_id', paths: ['$.spanId', '$.span_id'] },
      { key: 'transaction_id', paths: ['$.transactionId', '$.txnId', '$.transaction_id'] }
    ];

    for (const { key, paths } of customPaths) {
      for (const path of paths) {
        const result = JSONPath({ path, json: data, wrap: false });
        if (result) {
          customFields[key] = result;
          break;
        }
      }
    }

    return customFields;
  }

  private determineCategory(data: any): string {
    // Determine category based on JSON content
    if (data.category) return data.category;
    
    const level = (data.level || '').toLowerCase();
    const message = (data.message || '').toLowerCase();
    const service = (data.service || '').toLowerCase();

    if (level.includes('auth') || message.includes('login') || message.includes('auth')) {
      return 'authentication';
    }
    if (service.includes('web') || data.method || data.url) {
      return 'web';
    }
    if (data.src && data.dst) {
      return 'network';
    }
    if (data.file || data.fileName) {
      return 'file';
    }
    if (data.process || data.pid) {
      return 'process';
    }

    return 'application';
  }

  private parseTimestamp(value: any): Date | null {
    if (!value) return null;

    // Unix timestamp (seconds)
    if (typeof value === 'number' || /^\d{10}$/.test(value)) {
      const timestamp = new Date(Number(value) * 1000);
      return isNaN(timestamp.getTime()) ? null : timestamp;
    }

    // Unix timestamp (milliseconds)
    if (/^\d{13}$/.test(value)) {
      const timestamp = new Date(Number(value));
      return isNaN(timestamp.getTime()) ? null : timestamp;
    }

    // ISO string or other date formats
    const timestamp = new Date(value);
    return isNaN(timestamp.getTime()) ? null : timestamp;
  }

  private parseOutcome(value: any): 'success' | 'failure' | 'unknown' {
    if (!value) return 'unknown';

    const str = value.toString().toLowerCase();
    
    if (str.includes('success') || str.includes('ok') || str.includes('pass') ||
        str === 'true' || str === '200' || str.startsWith('2')) {
      return 'success';
    }
    
    if (str.includes('fail') || str.includes('error') || str.includes('deny') ||
        str === 'false' || str.startsWith('4') || str.startsWith('5')) {
      return 'failure';
    }

    return 'unknown';
  }

  private parseSeverity(value: any): 'low' | 'medium' | 'high' | 'critical' | null {
    if (!value) return null;

    const str = value.toString().toLowerCase();
    
    if (str.includes('critical') || str.includes('fatal') || str.includes('emergency')) {
      return 'critical';
    }
    if (str.includes('high') || str.includes('error') || str.includes('alert')) {
      return 'high';
    }
    if (str.includes('medium') || str.includes('warn') || str.includes('notice')) {
      return 'medium';
    }
    if (str.includes('low') || str.includes('info') || str.includes('debug')) {
      return 'low';
    }

    return null;
  }

  private mapSeverityToNumber(severity: string): number {
    switch (severity) {
      case 'critical': return 90;
      case 'high': return 75;
      case 'medium': return 50;
      case 'low': return 25;
      default: return 50;
    }
  }

  private mapToECSCategory(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'authentication': ['authentication'],
      'web': ['web'],
      'network': ['network'],
      'file': ['file'],
      'process': ['process'],
      'application': ['web', 'application'],
      'database': ['database']
    };

    return categoryMap[category] || ['application'];
  }

  private mapToECSType(data: any): string[] {
    const types: string[] = [];
    
    if (data.method) types.push('access');
    if (data.error) types.push('error');
    if (data.start || data.started) types.push('start');
    if (data.end || data.finished) types.push('end');
    if (data.change || data.update) types.push('change');
    if (data.create || data.created) types.push('creation');
    if (data.delete || data.deleted) types.push('deletion');

    return types.length > 0 ? types : ['info'];
  }

  private parseNumber(value: any): number | undefined {
    if (typeof value === 'number') return value;
    if (!value) return undefined;
    
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
}