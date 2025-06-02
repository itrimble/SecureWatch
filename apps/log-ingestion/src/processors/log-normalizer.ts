import {
  RawLogEvent,
  NormalizedLogEvent,
  LogSource,
  LogSeverity,
  LogCategory,
  WindowsEventLog,
  SyslogEvent,
  HostInfo,
  ProcessInfo,
  UserInfo,
  NetworkInfo,
  FileInfo,
} from '../types/log-event.types';
import { FieldExtractor } from '../parsers/field-extractor';
import { SeverityMapper } from '../utils/severity-mapper';
import { CategoryClassifier } from '../utils/category-classifier';
import logger from '../utils/logger';

export class LogNormalizer {
  private fieldExtractor: FieldExtractor;
  private severityMapper: SeverityMapper;
  private categoryClassifier: CategoryClassifier;

  constructor() {
    this.fieldExtractor = new FieldExtractor();
    this.severityMapper = new SeverityMapper();
    this.categoryClassifier = new CategoryClassifier();
  }

  async normalize(rawEvent: RawLogEvent): Promise<NormalizedLogEvent> {
    try {
      switch (rawEvent.source) {
        case LogSource.WINDOWS_EVENT_LOG:
          return this.normalizeWindowsEvent(rawEvent);
        case LogSource.SYSLOG:
          return this.normalizeSyslogEvent(rawEvent);
        case LogSource.AWS_CLOUDTRAIL:
          return this.normalizeCloudTrailEvent(rawEvent);
        case LogSource.AZURE_ACTIVITY:
          return this.normalizeAzureActivityEvent(rawEvent);
        case LogSource.GCP_LOGGING:
          return this.normalizeGCPLoggingEvent(rawEvent);
        default:
          return this.normalizeGenericEvent(rawEvent);
      }
    } catch (error) {
      logger.error('Error normalizing event', { eventId: rawEvent.id, error });
      throw error;
    }
  }

  private normalizeWindowsEvent(rawEvent: RawLogEvent): NormalizedLogEvent {
    const winEvent: WindowsEventLog = JSON.parse(rawEvent.rawData.toString());
    
    // Map Windows event levels to our severity
    const severity = this.severityMapper.mapWindowsLevel(winEvent.level);
    
    // Classify event category based on event ID and channel
    const category = this.categoryClassifier.classifyWindowsEvent(
      winEvent.eventId,
      winEvent.channel,
      winEvent.provider.name
    );

    // Extract structured fields
    const fields = this.extractWindowsFields(winEvent);
    
    // Build normalized event
    const normalized: NormalizedLogEvent = {
      id: rawEvent.id,
      timestamp: rawEvent.timestamp,
      source: rawEvent.source,
      severity,
      category,
      message: this.buildWindowsMessage(winEvent),
      fields,
      tags: this.buildWindowsTags(winEvent),
      host: {
        hostname: winEvent.computer,
        ip: [],
        domain: this.extractDomain(winEvent.computer),
      },
      metadata: rawEvent.metadata,
      rawEvent: rawEvent.rawData.toString(),
    };

    // Add optional fields if present
    if (winEvent.security?.userId) {
      normalized.user = {
        username: winEvent.security.userId,
        userId: winEvent.security.userSid,
      };
    }

    // Extract process info if available
    const processInfo = this.extractWindowsProcessInfo(winEvent);
    if (processInfo) {
      normalized.process = processInfo;
    }

    // Extract network info if available
    const networkInfo = this.extractWindowsNetworkInfo(winEvent);
    if (networkInfo) {
      normalized.network = networkInfo;
    }

    return normalized;
  }

  private normalizeSyslogEvent(rawEvent: RawLogEvent): NormalizedLogEvent {
    const syslogEvent: SyslogEvent = JSON.parse(rawEvent.rawData.toString());
    
    const severity = this.severityMapper.mapSyslogSeverity(syslogEvent.severity);
    const category = this.categoryClassifier.classifySyslogEvent(
      syslogEvent.facility,
      syslogEvent.appName || '',
      syslogEvent.message
    );

    const fields = this.fieldExtractor.extractFromMessage(syslogEvent.message);
    
    return {
      id: rawEvent.id,
      timestamp: syslogEvent.timestamp,
      source: rawEvent.source,
      severity,
      category,
      message: syslogEvent.message,
      fields: {
        ...fields,
        facility: syslogEvent.facility,
        facilityName: this.getFacilityName(syslogEvent.facility),
        ...(syslogEvent.structuredData || {}),
      },
      tags: this.buildSyslogTags(syslogEvent),
      host: {
        hostname: syslogEvent.hostname,
        ip: [],
      },
      process: syslogEvent.appName ? {
        pid: syslogEvent.procId ? parseInt(syslogEvent.procId, 10) : 0,
        name: syslogEvent.appName,
      } : undefined,
      metadata: rawEvent.metadata,
      rawEvent: rawEvent.rawData.toString(),
    };
  }

  private normalizeCloudTrailEvent(rawEvent: RawLogEvent): NormalizedLogEvent {
    const cloudTrailEvent = JSON.parse(rawEvent.rawData.toString());
    
    return {
      id: rawEvent.id,
      timestamp: new Date(cloudTrailEvent.eventTime),
      source: rawEvent.source,
      severity: this.determineCloudTrailSeverity(cloudTrailEvent),
      category: LogCategory.AUDIT,
      message: `${cloudTrailEvent.eventName} by ${cloudTrailEvent.userIdentity?.principalId || 'unknown'}`,
      fields: {
        eventVersion: cloudTrailEvent.eventVersion,
        eventName: cloudTrailEvent.eventName,
        eventSource: cloudTrailEvent.eventSource,
        awsRegion: cloudTrailEvent.awsRegion,
        sourceIPAddress: cloudTrailEvent.sourceIPAddress,
        userAgent: cloudTrailEvent.userAgent,
        errorCode: cloudTrailEvent.errorCode,
        errorMessage: cloudTrailEvent.errorMessage,
        requestParameters: cloudTrailEvent.requestParameters,
        responseElements: cloudTrailEvent.responseElements,
      },
      tags: [
        'aws',
        'cloudtrail',
        cloudTrailEvent.eventType,
        cloudTrailEvent.readOnly ? 'read-only' : 'write',
      ].filter(Boolean),
      host: {
        hostname: cloudTrailEvent.recipientAccountId,
        ip: cloudTrailEvent.sourceIPAddress ? [cloudTrailEvent.sourceIPAddress] : [],
      },
      user: this.extractCloudTrailUser(cloudTrailEvent.userIdentity),
      network: {
        sourceIp: cloudTrailEvent.sourceIPAddress,
      },
      metadata: rawEvent.metadata,
      rawEvent: rawEvent.rawData.toString(),
    };
  }

  private normalizeAzureActivityEvent(rawEvent: RawLogEvent): NormalizedLogEvent {
    const azureEvent = JSON.parse(rawEvent.rawData.toString());
    
    return {
      id: rawEvent.id,
      timestamp: new Date(azureEvent.time),
      source: rawEvent.source,
      severity: this.mapAzureLevel(azureEvent.level),
      category: this.classifyAzureCategory(azureEvent.category),
      message: azureEvent.operationName,
      fields: {
        correlationId: azureEvent.correlationId,
        subscriptionId: azureEvent.subscriptionId,
        resourceGroupName: azureEvent.resourceGroupName,
        resourceProviderName: azureEvent.resourceProviderName,
        resourceId: azureEvent.resourceId,
        operationId: azureEvent.operationId,
        operationName: azureEvent.operationName,
        status: azureEvent.status,
        subStatus: azureEvent.subStatus,
        claims: azureEvent.claims,
        properties: azureEvent.properties,
      },
      tags: [
        'azure',
        azureEvent.category,
        azureEvent.resourceProviderName,
      ].filter(Boolean),
      host: {
        hostname: azureEvent.resourceId,
        ip: [],
      },
      user: azureEvent.caller ? {
        username: azureEvent.caller,
      } : undefined,
      metadata: rawEvent.metadata,
      rawEvent: rawEvent.rawData.toString(),
    };
  }

  private normalizeGCPLoggingEvent(rawEvent: RawLogEvent): NormalizedLogEvent {
    const gcpEvent = JSON.parse(rawEvent.rawData.toString());
    
    return {
      id: rawEvent.id,
      timestamp: new Date(gcpEvent.timestamp),
      source: rawEvent.source,
      severity: this.mapGCPSeverity(gcpEvent.severity),
      category: this.classifyGCPCategory(gcpEvent),
      message: gcpEvent.textPayload || gcpEvent.jsonPayload?.message || JSON.stringify(gcpEvent.jsonPayload),
      fields: {
        logName: gcpEvent.logName,
        resource: gcpEvent.resource,
        insertId: gcpEvent.insertId,
        labels: gcpEvent.labels,
        operation: gcpEvent.operation,
        trace: gcpEvent.trace,
        spanId: gcpEvent.spanId,
        traceSampled: gcpEvent.traceSampled,
        sourceLocation: gcpEvent.sourceLocation,
        ...(gcpEvent.jsonPayload || {}),
      },
      tags: [
        'gcp',
        gcpEvent.resource?.type,
        ...(gcpEvent.labels ? Object.keys(gcpEvent.labels) : []),
      ].filter(Boolean),
      host: {
        hostname: gcpEvent.resource?.labels?.instance_id || gcpEvent.resource?.labels?.project_id || 'unknown',
        ip: [],
      },
      metadata: rawEvent.metadata,
      rawEvent: rawEvent.rawData.toString(),
    };
  }

  private normalizeGenericEvent(rawEvent: RawLogEvent): NormalizedLogEvent {
    const message = rawEvent.rawData.toString();
    const fields = this.fieldExtractor.extractFromMessage(message);
    
    return {
      id: rawEvent.id,
      timestamp: rawEvent.timestamp,
      source: rawEvent.source,
      severity: LogSeverity.INFO,
      category: LogCategory.APPLICATION,
      message,
      fields,
      tags: [],
      host: {
        hostname: 'unknown',
        ip: [],
      },
      metadata: rawEvent.metadata,
      rawEvent: message,
    };
  }

  // Helper methods
  private extractWindowsFields(event: WindowsEventLog): Record<string, any> {
    return {
      eventId: event.eventId,
      eventRecordId: event.eventRecordId,
      level: event.level,
      task: event.task,
      opcode: event.opcode,
      keywords: event.keywords,
      channel: event.channel,
      provider: event.provider,
      ...(event.eventData || {}),
      ...(event.userDefinedData || {}),
    };
  }

  private buildWindowsMessage(event: WindowsEventLog): string {
    // Build a human-readable message from Windows event
    const baseMessage = `Event ${event.eventId} from ${event.provider.name}`;
    
    // Add common event descriptions
    const descriptions: Record<number, string> = {
      4624: 'An account was successfully logged on',
      4625: 'An account failed to log on',
      4634: 'An account was logged off',
      4648: 'A logon was attempted using explicit credentials',
      4672: 'Special privileges assigned to new logon',
      4688: 'A new process has been created',
      4689: 'A process has exited',
      4698: 'A scheduled task was created',
      4699: 'A scheduled task was deleted',
      4700: 'A scheduled task was enabled',
      4701: 'A scheduled task was disabled',
      4702: 'A scheduled task was updated',
    };

    return descriptions[event.eventId] || baseMessage;
  }

  private buildWindowsTags(event: WindowsEventLog): string[] {
    const tags: string[] = ['windows'];
    
    // Add channel as tag
    tags.push(event.channel.toLowerCase().replace(/\s+/g, '-'));
    
    // Add keywords as tags
    tags.push(...event.keywords.map(k => k.toLowerCase().replace(/\s+/g, '-')));
    
    // Add security-related tags
    if (event.channel === 'Security' || event.keywords.includes('Audit')) {
      tags.push('security', 'audit');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  private extractDomain(hostname: string): string | undefined {
    const parts = hostname.split('.');
    if (parts.length > 1) {
      return parts.slice(1).join('.');
    }
    return undefined;
  }

  private extractWindowsProcessInfo(event: WindowsEventLog): ProcessInfo | undefined {
    const eventData = event.eventData;
    if (!eventData) return undefined;

    if (eventData.ProcessId || eventData.NewProcessId) {
      return {
        pid: parseInt(eventData.ProcessId || eventData.NewProcessId, 10),
        name: eventData.ProcessName || eventData.NewProcessName || 'unknown',
        path: eventData.ProcessPath,
        commandLine: eventData.CommandLine,
        parentPid: eventData.ParentProcessId ? parseInt(eventData.ParentProcessId, 10) : undefined,
        parentName: eventData.ParentProcessName,
        user: eventData.SubjectUserName,
      };
    }

    return undefined;
  }

  private extractWindowsNetworkInfo(event: WindowsEventLog): NetworkInfo | undefined {
    const eventData = event.eventData;
    if (!eventData || !eventData.IpAddress) return undefined;

    return {
      sourceIp: eventData.IpAddress,
      sourcePort: eventData.IpPort ? parseInt(eventData.IpPort, 10) : undefined,
      direction: 'inbound',
    };
  }

  private buildSyslogTags(event: SyslogEvent): string[] {
    const tags: string[] = ['syslog'];
    
    if (event.appName) {
      tags.push(event.appName.toLowerCase());
    }
    
    tags.push(this.getFacilityName(event.facility));
    tags.push(this.getSeverityName(event.severity));
    
    return tags;
  }

  private getFacilityName(facility: number): string {
    const facilities = [
      'kern', 'user', 'mail', 'daemon', 'auth', 'syslog', 'lpr', 'news',
      'uucp', 'cron', 'authpriv', 'ftp', 'ntp', 'security', 'console', 'solaris-cron',
      'local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7'
    ];
    return facilities[facility] || `facility${facility}`;
  }

  private getSeverityName(severity: number): string {
    const severities = [
      'emerg', 'alert', 'crit', 'err', 'warning', 'notice', 'info', 'debug'
    ];
    return severities[severity] || `severity${severity}`;
  }

  private determineCloudTrailSeverity(event: any): LogSeverity {
    if (event.errorCode || event.errorMessage) {
      return LogSeverity.HIGH;
    }
    
    const sensitiveActions = [
      'DeleteBucket', 'PutBucketPolicy', 'DeleteTrail', 'StopLogging',
      'DeleteAccessKey', 'CreateAccessKey', 'AttachUserPolicy', 'DetachUserPolicy',
      'PutUserPolicy', 'DeleteUserPolicy', 'CreateUser', 'DeleteUser',
      'AssumeRole', 'AssumeRoleWithSAML', 'AssumeRoleWithWebIdentity'
    ];
    
    if (sensitiveActions.includes(event.eventName)) {
      return LogSeverity.MEDIUM;
    }
    
    return LogSeverity.INFO;
  }

  private extractCloudTrailUser(userIdentity: any): UserInfo | undefined {
    if (!userIdentity) return undefined;

    return {
      username: userIdentity.userName || userIdentity.principalId,
      userId: userIdentity.accountId,
      groups: userIdentity.sessionContext?.sessionIssuer?.type ? 
        [userIdentity.sessionContext.sessionIssuer.type] : undefined,
    };
  }

  private mapAzureLevel(level: string): LogSeverity {
    const mapping: Record<string, LogSeverity> = {
      'Critical': LogSeverity.CRITICAL,
      'Error': LogSeverity.HIGH,
      'Warning': LogSeverity.MEDIUM,
      'Informational': LogSeverity.INFO,
      'Verbose': LogSeverity.DEBUG,
    };
    return mapping[level] || LogSeverity.INFO;
  }

  private classifyAzureCategory(category: string): LogCategory {
    const mapping: Record<string, LogCategory> = {
      'Administrative': LogCategory.AUDIT,
      'Security': LogCategory.SECURITY,
      'ServiceHealth': LogCategory.SYSTEM,
      'Alert': LogCategory.THREAT,
      'Autoscale': LogCategory.SYSTEM,
      'Policy': LogCategory.COMPLIANCE,
      'Recommendation': LogCategory.SYSTEM,
    };
    return mapping[category] || LogCategory.APPLICATION;
  }

  private mapGCPSeverity(severity: string): LogSeverity {
    const mapping: Record<string, LogSeverity> = {
      'EMERGENCY': LogSeverity.CRITICAL,
      'ALERT': LogSeverity.CRITICAL,
      'CRITICAL': LogSeverity.CRITICAL,
      'ERROR': LogSeverity.HIGH,
      'WARNING': LogSeverity.MEDIUM,
      'NOTICE': LogSeverity.LOW,
      'INFO': LogSeverity.INFO,
      'DEBUG': LogSeverity.DEBUG,
    };
    return mapping[severity] || LogSeverity.INFO;
  }

  private classifyGCPCategory(event: any): LogCategory {
    if (event.logName?.includes('audit')) {
      return LogCategory.AUDIT;
    }
    if (event.resource?.type === 'gce_instance' || event.resource?.type === 'k8s_cluster') {
      return LogCategory.SYSTEM;
    }
    if (event.logName?.includes('security')) {
      return LogCategory.SECURITY;
    }
    return LogCategory.APPLICATION;
  }
}