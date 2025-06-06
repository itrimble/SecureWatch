// Apache Access Log Parser
// Comprehensive parser for Apache HTTP server access logs

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  NetworkInfo,
  URLInfo,
  UserInfo,
  ThreatInfo,
  MitreTechnique,
  MitreTactic
} from '../types';

export class ApacheAccessLogParser implements LogParser {
  id = 'apache-access-log';
  name = 'Apache Access Log Parser';
  vendor = 'Apache Software Foundation';
  logSource = 'apache:access';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'web' as const;
  priority = 80;
  enabled = true;

  // Apache log format patterns
  private readonly formatPatterns: Array<{
    name: string;
    regex: RegExp;
    fields: string[];
  }> = [
    {
      name: 'common',
      regex: /^(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\S+)$/,
      fields: ['client_ip', 'ident', 'user', 'timestamp', 'request', 'status', 'size']
    },
    {
      name: 'combined',
      regex: /^(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\S+) "([^"]*)" "([^"]*)"$/,
      fields: ['client_ip', 'ident', 'user', 'timestamp', 'request', 'status', 'size', 'referer', 'user_agent']
    },
    {
      name: 'vhost_combined',
      regex: /^(\S+):(\d+) (\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\S+) "([^"]*)" "([^"]*)"$/,
      fields: ['vhost', 'port', 'client_ip', 'ident', 'user', 'timestamp', 'request', 'status', 'size', 'referer', 'user_agent']
    }
  ];

  // HTTP status code mappings
  private readonly statusCategories: Record<number, { category: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = {
    200: { category: 'success', severity: 'low' },
    201: { category: 'success', severity: 'low' },
    204: { category: 'success', severity: 'low' },
    301: { category: 'redirect', severity: 'low' },
    302: { category: 'redirect', severity: 'low' },
    304: { category: 'redirect', severity: 'low' },
    400: { category: 'client_error', severity: 'medium' },
    401: { category: 'unauthorized', severity: 'high' },
    403: { category: 'forbidden', severity: 'high' },
    404: { category: 'not_found', severity: 'medium' },
    405: { category: 'method_not_allowed', severity: 'medium' },
    500: { category: 'server_error', severity: 'high' },
    502: { category: 'bad_gateway', severity: 'high' },
    503: { category: 'service_unavailable', severity: 'high' },
    504: { category: 'gateway_timeout', severity: 'high' }
  };

  // Attack pattern detection
  private readonly attackPatterns: Record<string, { techniques: MitreTechnique[]; pattern: RegExp; description: string }> = {
    'sql_injection': {
      techniques: [{ id: 'T1190', name: 'Exploit Public-Facing Application', confidence: 0.8 }],
      pattern: /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\bor\b\s+\d+\s*=\s*\d+|'|\b0x[0-9a-f]+)/i,
      description: 'SQL injection attempt detected'
    },
    'xss_attack': {
      techniques: [{ id: 'T1190', name: 'Exploit Public-Facing Application', confidence: 0.7 }],
      pattern: /<script|javascript:|onload=|onerror=|alert\(|eval\(|document\.cookie/i,
      description: 'Cross-site scripting attempt detected'
    },
    'lfi_attack': {
      techniques: [{ id: 'T1190', name: 'Exploit Public-Facing Application', confidence: 0.8 }],
      pattern: /\.\.\//,
      description: 'Local file inclusion attempt detected'
    },
    'rfi_attack': {
      techniques: [{ id: 'T1190', name: 'Exploit Public-Facing Application', confidence: 0.8 }],
      pattern: /http:\/\/|https:\/\/|ftp:\/\//,
      description: 'Remote file inclusion attempt detected'
    },
    'command_injection': {
      techniques: [{ id: 'T1190', name: 'Exploit Public-Facing Application', confidence: 0.9 }],
      pattern: /;|\||&|`|\$\(|%0a|%0d|nc\s|netcat|wget|curl/i,
      description: 'Command injection attempt detected'
    },
    'directory_traversal': {
      techniques: [{ id: 'T1190', name: 'Exploit Public-Facing Application', confidence: 0.7 }],
      pattern: /\.\.[\/\\]|%2e%2e[\/\\]|%252e%252e[\/\\]/i,
      description: 'Directory traversal attempt detected'
    },
    'scanner_activity': {
      techniques: [{ id: 'T1595', name: 'Active Scanning', confidence: 0.6 }],
      pattern: /nmap|nikto|dirb|gobuster|wpscan|sqlmap|burp|acunetix/i,
      description: 'Security scanner activity detected'
    },
    'brute_force': {
      techniques: [{ id: 'T1110', name: 'Brute Force', confidence: 0.7 }],
      pattern: /wp-login|admin|login|signin/i,
      description: 'Potential brute force attack'
    }
  };

  // Suspicious user agents
  private readonly suspiciousUserAgents = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|python|perl|ruby/i,
    /sqlmap|nikto|nmap|dirb|gobuster/i,
    /masscan|zmap|nessus|acunetix/i
  ];

  validate(rawLog: string): boolean {
    // Check if it matches any Apache log format
    return this.formatPatterns.some(pattern => pattern.regex.test(rawLog.trim()));
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      const logData = this.parseLogLine(rawLog.trim());
      if (!logData) return null;

      const timestamp = this.parseTimestamp(logData.timestamp);
      const request = this.parseRequest(logData.request);
      const statusCode = parseInt(logData.status, 10);
      const size = logData.size === '-' ? 0 : parseInt(logData.size, 10);

      const event: ParsedEvent = {
        timestamp: timestamp || new Date(),
        source: logData.client_ip || 'unknown',
        category: 'web',
        action: this.getActionFromRequest(request),
        outcome: this.getOutcomeFromStatus(statusCode),
        severity: this.getSeverityFromStatus(statusCode),
        rawData: rawLog,
        custom: {
          ...logData,
          status_code: statusCode,
          response_size: size,
          method: request.method,
          path: request.path,
          protocol: request.protocol,
          query_string: request.queryString
        }
      };

      // Add network information
      event.network = this.extractNetworkInfo(logData);

      // Add URL information
      event.url = this.extractURLInfo(request, logData.vhost);

      // Add user information if available
      if (logData.user && logData.user !== '-') {
        event.user = { name: logData.user };
      }

      // Detect threats
      event.threat = this.detectThreats(request, logData);

      return event;

    } catch (error) {
      console.error('Apache access log parsing error:', error);
      return null;
    }
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const statusCode = event.custom?.status_code as number;
    const method = event.custom?.method as string;

    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['web'],
      'event.type': this.mapToECSType(method, statusCode),
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.provider': 'apache',
      'event.dataset': 'apache.access',
      'event.module': 'apache',

      // HTTP fields
      'http.request.method': method,
      'http.response.status_code': statusCode,
      'http.response.body.bytes': event.custom?.response_size || 0,
      'http.version': event.custom?.protocol?.replace('HTTP/', '') || '1.1',

      // URL fields
      'url.full': event.url?.full,
      'url.path': event.url?.path,
      'url.query': event.url?.query,
      'url.domain': event.url?.domain,

      // Source/Client fields
      'source.ip': event.custom?.client_ip,
      'client.ip': event.custom?.client_ip,

      // User agent
      'user_agent.original': event.custom?.user_agent,

      // User information
      ...(event.user && {
        'user.name': event.user.name
      }),

      // Referer information
      ...(event.custom?.referer && event.custom.referer !== '-' && {
        'http.request.referrer': event.custom.referer
      }),

      // Virtual host information
      ...(event.custom?.vhost && {
        'destination.domain': event.custom.vhost,
        'destination.port': event.custom?.port ? parseInt(event.custom.port, 10) : 80
      }),

      // MITRE ATT&CK mapping
      ...(event.threat?.techniques && {
        'threat.technique.id': event.threat.techniques.map(t => t.id),
        'threat.technique.name': event.threat.techniques.map(t => t.name)
      }),
      ...(event.threat?.tactics && {
        'threat.tactic.id': event.threat.tactics.map(t => t.id),
        'threat.tactic.name': event.threat.tactics.map(t => t.name)
      }),

      // SecureWatch metadata
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': this.calculateConfidence(event),
      'securewatch.severity': event.severity,
      'securewatch.tags': this.getTagsForEvent(statusCode, method, event.threat),

      // Apache-specific fields
      'apache.access.ident': event.custom?.ident,
      'apache.access.response_size': event.custom?.response_size,

      // Labels for easier querying
      labels: {
        'status_code': statusCode.toString(),
        'method': method,
        'log_source': 'apache_access',
        'parser': this.id
      },

      // Related fields for correlation
      related: {
        ip: [event.custom?.client_ip].filter(Boolean),
        user: event.user?.name ? [event.user.name] : undefined
      }
    };

    return normalized;
  }

  private parseLogLine(rawLog: string): Record<string, string> | null {
    for (const pattern of this.formatPatterns) {
      const match = rawLog.match(pattern.regex);
      if (match) {
        const result: Record<string, string> = {};
        for (let i = 0; i < pattern.fields.length; i++) {
          result[pattern.fields[i]] = match[i + 1] || '';
        }
        return result;
      }
    }
    return null;
  }

  private parseTimestamp(timestamp: string): Date | null {
    try {
      // Apache format: [DD/MMM/YYYY:HH:MM:SS +ZZZZ]
      const cleanTimestamp = timestamp.replace(/[\[\]]/g, '');
      return new Date(cleanTimestamp);
    } catch {
      return null;
    }
  }

  private parseRequest(requestLine: string): {
    method: string;
    path: string;
    queryString?: string;
    protocol: string;
  } {
    const parts = requestLine.split(' ');
    const method = parts[0] || 'GET';
    const fullPath = parts[1] || '/';
    const protocol = parts[2] || 'HTTP/1.1';

    const [path, queryString] = fullPath.split('?', 2);

    return {
      method,
      path: decodeURIComponent(path),
      queryString,
      protocol
    };
  }

  private extractNetworkInfo(logData: Record<string, string>): NetworkInfo {
    return {
      sourceIp: logData.client_ip,
      destinationPort: logData.port ? parseInt(logData.port, 10) : 80,
      protocol: 'http'
    };
  }

  private extractURLInfo(request: any, vhost?: string): URLInfo {
    const scheme = vhost && vhost.includes(':443') ? 'https' : 'http';
    const domain = vhost ? vhost.split(':')[0] : 'localhost';
    const port = vhost && vhost.includes(':') ? parseInt(vhost.split(':')[1], 10) : (scheme === 'https' ? 443 : 80);

    let full = `${scheme}://${domain}`;
    if ((scheme === 'http' && port !== 80) || (scheme === 'https' && port !== 443)) {
      full += `:${port}`;
    }
    full += request.path;
    if (request.queryString) {
      full += `?${request.queryString}`;
    }

    return {
      full,
      scheme,
      domain,
      port,
      path: request.path,
      query: request.queryString
    };
  }

  private detectThreats(request: any, logData: Record<string, string>): ThreatInfo | undefined {
    const detectedTechniques: MitreTechnique[] = [];
    const detectedTactics: Set<MitreTactic> = new Set();

    const searchText = `${request.path} ${request.queryString || ''} ${logData.user_agent || ''}`;

    // Check against attack patterns
    for (const [patternName, pattern] of Object.entries(this.attackPatterns)) {
      if (pattern.pattern.test(searchText)) {
        pattern.techniques.forEach(technique => {
          if (!detectedTechniques.find(t => t.id === technique.id)) {
            detectedTechniques.push(technique);
          }
        });
      }
    }

    // Check for suspicious user agents
    if (logData.user_agent) {
      const isSuspicious = this.suspiciousUserAgents.some(pattern => pattern.test(logData.user_agent));
      if (isSuspicious) {
        detectedTechniques.push({
          id: 'T1595',
          name: 'Active Scanning',
          confidence: 0.6
        });
      }
    }

    // Check for multiple 404s (potential scanning)
    const statusCode = parseInt(logData.status, 10);
    if (statusCode === 404 && request.path.length > 50) {
      detectedTechniques.push({
        id: 'T1595',
        name: 'Active Scanning',
        confidence: 0.5
      });
    }

    // Map techniques to tactics
    detectedTechniques.forEach(technique => {
      const tactics = this.getTacticsForTechnique(technique.id);
      tactics.forEach(tactic => detectedTactics.add(tactic));
    });

    if (detectedTechniques.length === 0) {
      return undefined;
    }

    return {
      techniques: detectedTechniques,
      tactics: Array.from(detectedTactics),
      severity: this.calculateThreatSeverity(detectedTechniques),
      confidence: Math.max(...detectedTechniques.map(t => t.confidence))
    };
  }

  private getTacticsForTechnique(techniqueId: string): MitreTactic[] {
    const techniqueToTactics: Record<string, MitreTactic[]> = {
      'T1190': [{ id: 'TA0001', name: 'Initial Access' }],
      'T1595': [{ id: 'TA0043', name: 'Reconnaissance' }],
      'T1110': [{ id: 'TA0006', name: 'Credential Access' }]
    };

    return techniqueToTactics[techniqueId] || [];
  }

  private calculateThreatSeverity(techniques: MitreTechnique[]): 'low' | 'medium' | 'high' | 'critical' {
    const maxConfidence = Math.max(...techniques.map(t => t.confidence));
    
    if (maxConfidence >= 0.8) return 'high';
    if (maxConfidence >= 0.6) return 'medium';
    return 'low';
  }

  private getActionFromRequest(request: any): string {
    return `http_${request.method.toLowerCase()}`;
  }

  private getOutcomeFromStatus(statusCode: number): 'success' | 'failure' | 'unknown' {
    if (statusCode >= 200 && statusCode < 400) return 'success';
    if (statusCode >= 400) return 'failure';
    return 'unknown';
  }

  private getSeverityFromStatus(statusCode: number): 'low' | 'medium' | 'high' | 'critical' {
    const category = this.statusCategories[statusCode];
    return category?.severity || 'low';
  }

  private mapToECSType(method: string, statusCode: number): string[] {
    if (statusCode >= 400) {
      return ['denied'];
    }
    
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      return ['change'];
    }
    
    if (method === 'DELETE') {
      return ['deletion'];
    }
    
    return ['access'];
  }

  private mapSeverityToNumber(severity: string): number {
    const mapping: Record<string, number> = {
      'low': 25,
      'medium': 50,
      'high': 75,
      'critical': 100
    };

    return mapping[severity] || 25;
  }

  private calculateConfidence(event: ParsedEvent): number {
    let confidence = 0.85; // Base confidence for Apache parser

    // Increase confidence if we have user agent
    if (event.custom?.user_agent && event.custom.user_agent !== '-') {
      confidence += 0.05;
    }

    // Increase confidence if we have referer
    if (event.custom?.referer && event.custom.referer !== '-') {
      confidence += 0.05;
    }

    // Increase confidence if we detect threats
    if (event.threat && event.threat.techniques.length > 0) {
      confidence += 0.05;
    }

    return Math.min(1.0, confidence);
  }

  private getTagsForEvent(statusCode: number, method: string, threat?: ThreatInfo): string[] {
    const tags = ['apache', 'web', 'access-log', method.toLowerCase()];
    
    // Add status category tags
    if (statusCode >= 200 && statusCode < 300) tags.push('success');
    else if (statusCode >= 300 && statusCode < 400) tags.push('redirect');
    else if (statusCode >= 400 && statusCode < 500) tags.push('client-error');
    else if (statusCode >= 500) tags.push('server-error');

    // Add threat tags
    if (threat && threat.techniques.length > 0) {
      tags.push('security', 'threat-detected');
    }

    return tags;
  }
}