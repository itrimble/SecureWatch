// Jenkins Parser
// Handles Jenkins audit trail and system logs with CI/CD pipeline context

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  UserInfo,
  DeviceInfo,
  ProcessInfo,
} from '../types';

interface JenkinsEvent {
  timestamp?: Date;
  level?: string;
  logger?: string;
  thread?: string;
  message?: string;
  user?: string;
  job?: string;
  build_number?: number;
  node?: string;
  executor?: string;
  duration?: number;
  result?: string;
  cause?: string;
  parameters?: Record<string, string>;
  scm_revision?: string;
  scm_branch?: string;
  workspace?: string;
  artifacts?: string[];
  exception?: string;
  stack_trace?: string;
}

export class JenkinsParser implements LogParser {
  id = 'jenkins';
  name = 'Jenkins Parser';
  vendor = 'CloudBees, Inc.';
  logSource = 'jenkins';
  version = '1.0.0';
  format = 'mixed' as const;
  category = 'host' as const;
  priority = 75; // High priority for CI/CD security events
  enabled = true;

  // Jenkins log levels to severity mapping
  private readonly severityMapping: Record<
    string,
    'low' | 'medium' | 'high' | 'critical'
  > = {
    TRACE: 'low',
    DEBUG: 'low',
    INFO: 'low',
    WARN: 'medium',
    WARNING: 'medium',
    ERROR: 'high',
    FATAL: 'critical',
    SEVERE: 'critical',
  };

  // Jenkins build results to outcome mapping
  private readonly resultMapping: Record<
    string,
    'success' | 'failure' | 'unknown'
  > = {
    SUCCESS: 'success',
    UNSTABLE: 'unknown',
    FAILURE: 'failure',
    NOT_BUILT: 'unknown',
    ABORTED: 'failure',
  };

  validate(rawLog: string): boolean {
    const patterns = [
      // Jenkins system log format
      /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+\+\d{4}\s+\[\w+\]/,
      // Jenkins audit log format
      /Jenkins\s+(started|stopped|shutdown)/i,
      /Job\s+[\w.-]+\s+(started|completed|failed)/i,
      /Build\s+#\d+\s+(started|completed|failed)/i,
      // User action patterns
      /User\s+[\w@.-]+\s+(logged\s+in|logged\s+out|created|deleted|modified)/i,
      // Build and job patterns
      /\b(Building|Built|Finished:|Started by)\b/i,
      /\b(SUCCESS|FAILURE|UNSTABLE|ABORTED|NOT_BUILT)\b/,
      // Security events
      /Authentication\s+(failed|succeeded)/i,
      /Permission\s+(denied|granted)/i,
      /Security\s+(violation|alert)/i,
      // Configuration changes
      /Configuration\s+(updated|changed|saved)/i,
      /Plugin\s+(installed|uninstalled|enabled|disabled)/i,
      // SCM patterns
      /\b(git|svn|mercurial|perforce)\b.*\b(checkout|commit|push|pull)\b/i,
    ];

    return patterns.some((pattern) => pattern.test(rawLog));
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      // Try different Jenkins log formats
      if (this.isSystemLogFormat(rawLog)) {
        return this.parseSystemLogFormat(rawLog);
      } else if (this.isAuditLogFormat(rawLog)) {
        return this.parseAuditLogFormat(rawLog);
      } else if (this.isBuildLogFormat(rawLog)) {
        return this.parseBuildLogFormat(rawLog);
      }

      // Fall back to general parsing
      return this.parseGeneralFormat(rawLog);
    } catch (error) {
      console.error('Jenkins parsing error:', error);
      return null;
    }
  }

  private isSystemLogFormat(rawLog: string): boolean {
    return /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+\+\d{4}\s+\[\w+\]/.test(
      rawLog
    );
  }

  private isAuditLogFormat(rawLog: string): boolean {
    return /\b(User|Job|Build|Plugin|Configuration)\b.*\b(created|deleted|modified|started|completed|failed)\b/i.test(
      rawLog
    );
  }

  private isBuildLogFormat(rawLog: string): boolean {
    return /\b(Building|Built|Finished:|Started by|Build #\d+)\b/i.test(rawLog);
  }

  private parseSystemLogFormat(rawLog: string): ParsedEvent | null {
    // Parse Jenkins system log: 2024-01-01 10:00:00.000 +0000 [id=123] INFO logger.class: message
    const systemLogMatch = rawLog.match(
      /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+[+-]\d{4})\s+\[([^\]]+)\]\s+(\w+)\s+([^:]+):\s*(.*)$/
    );

    if (!systemLogMatch) return null;

    const jenkinsEvent: JenkinsEvent = {
      timestamp: new Date(systemLogMatch[1]),
      thread: systemLogMatch[2],
      level: systemLogMatch[3],
      logger: systemLogMatch[4].trim(),
      message: systemLogMatch[5].trim(),
    };

    // Extract additional context from message
    this.enrichEventFromMessage(jenkinsEvent);

    return this.createEventFromJenkinsData(jenkinsEvent, rawLog);
  }

  private parseAuditLogFormat(rawLog: string): ParsedEvent | null {
    const jenkinsEvent: JenkinsEvent = {};

    // Extract timestamp if present
    const timestampMatch = rawLog.match(
      /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/
    );
    jenkinsEvent.timestamp = timestampMatch
      ? new Date(timestampMatch[1])
      : new Date();

    // Extract user information
    const userMatch = rawLog.match(/User\s+([\w@.-]+)/i);
    if (userMatch) {
      jenkinsEvent.user = userMatch[1];
    }

    // Extract job information
    const jobMatch = rawLog.match(/Job\s+([\w.-]+)/i);
    if (jobMatch) {
      jenkinsEvent.job = jobMatch[1];
    }

    // Extract build information
    const buildMatch = rawLog.match(/Build\s+#(\d+)/i);
    if (buildMatch) {
      jenkinsEvent.build_number = parseInt(buildMatch[1], 10);
    }

    jenkinsEvent.message = rawLog;
    this.enrichEventFromMessage(jenkinsEvent);

    return this.createEventFromJenkinsData(jenkinsEvent, rawLog);
  }

  private parseBuildLogFormat(rawLog: string): ParsedEvent | null {
    const jenkinsEvent: JenkinsEvent = {};

    // Extract timestamp
    const timestampMatch = rawLog.match(/^\[([^\]]+)\]/);
    if (timestampMatch) {
      jenkinsEvent.timestamp = new Date(timestampMatch[1]);
    } else {
      jenkinsEvent.timestamp = new Date();
    }

    // Extract build information
    const buildMatch = rawLog.match(/Build\s+#(\d+)/i);
    if (buildMatch) {
      jenkinsEvent.build_number = parseInt(buildMatch[1], 10);
    }

    // Extract job name from "Building project_name"
    const jobMatch = rawLog.match(/Building\s+([\w.-]+)/i);
    if (jobMatch) {
      jenkinsEvent.job = jobMatch[1];
    }

    // Extract executor and node information
    const executorMatch = rawLog.match(/on\s+executor\s+(\d+)/i);
    if (executorMatch) {
      jenkinsEvent.executor = executorMatch[1];
    }

    const nodeMatch = rawLog.match(/(?:on|node)\s+([\w.-]+)/i);
    if (nodeMatch && !executorMatch) {
      jenkinsEvent.node = nodeMatch[1];
    }

    // Extract duration from "Finished: SUCCESS in 1m 30s"
    const durationMatch = rawLog.match(/in\s+(?:(\d+)m\s*)?(?:(\d+)s)?/i);
    if (durationMatch) {
      const minutes = parseInt(durationMatch[1] || '0', 10);
      const seconds = parseInt(durationMatch[2] || '0', 10);
      jenkinsEvent.duration = minutes * 60 + seconds;
    }

    // Extract result
    const resultMatch = rawLog.match(
      /\b(SUCCESS|FAILURE|UNSTABLE|ABORTED|NOT_BUILT)\b/
    );
    if (resultMatch) {
      jenkinsEvent.result = resultMatch[1];
    }

    jenkinsEvent.message = rawLog;
    this.enrichEventFromMessage(jenkinsEvent);

    return this.createEventFromJenkinsData(jenkinsEvent, rawLog);
  }

  private parseGeneralFormat(rawLog: string): ParsedEvent | null {
    const jenkinsEvent: JenkinsEvent = {
      timestamp: new Date(),
      message: rawLog,
    };

    this.enrichEventFromMessage(jenkinsEvent);
    return this.createEventFromJenkinsData(jenkinsEvent, rawLog);
  }

  private enrichEventFromMessage(jenkinsEvent: JenkinsEvent): void {
    const message = jenkinsEvent.message || '';

    // Extract SCM information
    const scmRevisionMatch = message.match(
      /(?:commit|revision|hash)\s+([a-f0-9]{7,40})/i
    );
    if (scmRevisionMatch) {
      jenkinsEvent.scm_revision = scmRevisionMatch[1];
    }

    const scmBranchMatch = message.match(/(?:branch|ref)\s+([\w\/.-]+)/i);
    if (scmBranchMatch) {
      jenkinsEvent.scm_branch = scmBranchMatch[1];
    }

    // Extract workspace information
    const workspaceMatch = message.match(/workspace\s+(\/[^\s]+)/i);
    if (workspaceMatch) {
      jenkinsEvent.workspace = workspaceMatch[1];
    }

    // Extract cause information
    const causeMatch = message.match(/Started by\s+([^,\n]+)/i);
    if (causeMatch) {
      jenkinsEvent.cause = causeMatch[1].trim();
    }

    // Extract parameters
    const paramMatch = message.match(/Parameters:\s*([^\n]+)/i);
    if (paramMatch) {
      jenkinsEvent.parameters = this.parseParameters(paramMatch[1]);
    }

    // Extract exception information
    const exceptionMatch = message.match(/(Exception|Error):\s*([^\n]+)/);
    if (exceptionMatch) {
      jenkinsEvent.exception = exceptionMatch[2];
    }

    // Extract stack trace
    if (
      message.includes('at ') &&
      message.includes('(') &&
      message.includes('.java:')
    ) {
      jenkinsEvent.stack_trace = message;
    }
  }

  private parseParameters(paramString: string): Record<string, string> {
    const params: Record<string, string> = {};
    const paramPairs = paramString.split(',');

    for (const pair of paramPairs) {
      const [key, value] = pair.split('=', 2);
      if (key && value) {
        params[key.trim()] = value.trim();
      }
    }

    return params;
  }

  private createEventFromJenkinsData(
    jenkinsEvent: JenkinsEvent,
    rawLog: string
  ): ParsedEvent {
    const action = this.getActionFromEvent(jenkinsEvent);
    const severity = this.getSeverityFromEvent(jenkinsEvent);
    const outcome = this.getOutcomeFromEvent(jenkinsEvent);

    const event: ParsedEvent = {
      timestamp: jenkinsEvent.timestamp || new Date(),
      source: jenkinsEvent.node || 'jenkins',
      category: this.getCategoryFromEvent(jenkinsEvent),
      action,
      outcome,
      severity,
      rawData: rawLog,
      custom: {
        level: jenkinsEvent.level,
        logger: jenkinsEvent.logger,
        thread: jenkinsEvent.thread,
        user: jenkinsEvent.user,
        job: jenkinsEvent.job,
        build_number: jenkinsEvent.build_number,
        node: jenkinsEvent.node,
        executor: jenkinsEvent.executor,
        duration: jenkinsEvent.duration,
        result: jenkinsEvent.result,
        cause: jenkinsEvent.cause,
        parameters: jenkinsEvent.parameters,
        scm_revision: jenkinsEvent.scm_revision,
        scm_branch: jenkinsEvent.scm_branch,
        workspace: jenkinsEvent.workspace,
        exception: jenkinsEvent.exception,
        stack_trace: jenkinsEvent.stack_trace,
        message: jenkinsEvent.message,
      },
    };

    // Extract user information
    if (jenkinsEvent.user) {
      event.user = this.extractUserInfo(jenkinsEvent);
    }

    // Extract device information
    event.device = this.extractDeviceInfo(jenkinsEvent);

    // Extract process information for builds
    if (jenkinsEvent.job || jenkinsEvent.build_number) {
      event.process = this.extractProcessInfo(jenkinsEvent);
    }

    return event;
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': this.mapToECSCategory(event.category),
      'event.type': this.mapToECSType(event.action),
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.risk_score': this.calculateRiskScore(event),
      'event.provider': 'jenkins',
      'event.dataset': 'jenkins.audit',
      'event.module': 'jenkins',

      // Host information
      'host.name': event.source,

      // User information
      ...(event.user && {
        'user.name': event.user.name,
      }),

      // Process information (build context)
      ...(event.process && {
        'process.name': event.process.name,
        'process.pid': event.process.pid,
        'process.command_line': event.process.commandLine,
      }),

      // Jenkins-specific fields
      'jenkins.log.level': event.custom?.level,
      'jenkins.log.logger': event.custom?.logger,
      'jenkins.log.thread': event.custom?.thread,
      'jenkins.user.name': event.custom?.user,
      'jenkins.job.name': event.custom?.job,
      'jenkins.build.number': event.custom?.build_number,
      'jenkins.build.result': event.custom?.result,
      'jenkins.build.duration': event.custom?.duration,
      'jenkins.build.cause': event.custom?.cause,
      'jenkins.build.parameters': event.custom?.parameters,
      'jenkins.node.name': event.custom?.node,
      'jenkins.executor.id': event.custom?.executor,
      'jenkins.scm.revision': event.custom?.scm_revision,
      'jenkins.scm.branch': event.custom?.scm_branch,
      'jenkins.workspace.path': event.custom?.workspace,
      'jenkins.error.exception': event.custom?.exception,
      'jenkins.error.stack_trace': event.custom?.stack_trace,

      // SecureWatch fields
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': this.calculateConfidence(event),
      'securewatch.severity': event.severity,
      'securewatch.tags': this.getTagsForEvent(event),

      // Message and labels
      message: this.buildMessage(event),
      labels: {
        job_name: event.custom?.job,
        build_number: event.custom?.build_number?.toString(),
        result: event.custom?.result,
        user: event.custom?.user,
        node: event.custom?.node,
        log_source: 'jenkins',
      },

      // Related fields for correlation
      'related.user': this.getRelatedUsers(event),
      'related.hosts': [event.source],
    };

    return normalized;
  }

  private extractUserInfo(jenkinsEvent: JenkinsEvent): UserInfo {
    return {
      name: jenkinsEvent.user,
    };
  }

  private extractDeviceInfo(jenkinsEvent: JenkinsEvent): DeviceInfo {
    return {
      name: jenkinsEvent.node || 'jenkins-master',
      hostname: jenkinsEvent.node || 'jenkins',
      type: 'server',
    };
  }

  private extractProcessInfo(jenkinsEvent: JenkinsEvent): ProcessInfo {
    const processName = jenkinsEvent.job
      ? `jenkins-job-${jenkinsEvent.job}`
      : 'jenkins-build';
    const commandLine = this.buildCommandLine(jenkinsEvent);

    return {
      name: processName,
      commandLine,
      pid: jenkinsEvent.build_number,
    };
  }

  private buildCommandLine(jenkinsEvent: JenkinsEvent): string {
    let cmd = `jenkins build`;

    if (jenkinsEvent.job) {
      cmd += ` --job "${jenkinsEvent.job}"`;
    }

    if (jenkinsEvent.build_number) {
      cmd += ` --build ${jenkinsEvent.build_number}`;
    }

    if (jenkinsEvent.parameters) {
      for (const [key, value] of Object.entries(jenkinsEvent.parameters)) {
        cmd += ` --param ${key}="${value}"`;
      }
    }

    return cmd;
  }

  private getCategoryFromEvent(jenkinsEvent: JenkinsEvent): string {
    const message = jenkinsEvent.message?.toLowerCase() || '';

    if (
      message.includes('user') ||
      message.includes('login') ||
      message.includes('auth')
    ) {
      return 'authentication';
    }

    if (message.includes('build') || message.includes('job')) {
      return 'process';
    }

    if (message.includes('config') || message.includes('plugin')) {
      return 'configuration';
    }

    return 'host';
  }

  private getActionFromEvent(jenkinsEvent: JenkinsEvent): string {
    const message = jenkinsEvent.message?.toLowerCase() || '';

    if (message.includes('started') || message.includes('building'))
      return 'start';
    if (message.includes('finished') || message.includes('completed'))
      return 'completion';
    if (message.includes('failed') || message.includes('failure'))
      return 'failure';
    if (message.includes('aborted') || message.includes('cancelled'))
      return 'abort';
    if (message.includes('created')) return 'creation';
    if (message.includes('deleted') || message.includes('removed'))
      return 'deletion';
    if (message.includes('modified') || message.includes('updated'))
      return 'modification';
    if (message.includes('login') || message.includes('logged in'))
      return 'login';
    if (message.includes('logout') || message.includes('logged out'))
      return 'logout';
    if (message.includes('deployed') || message.includes('deploy'))
      return 'deployment';

    return 'jenkins_event';
  }

  private getSeverityFromEvent(
    jenkinsEvent: JenkinsEvent
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Use log level if available
    if (jenkinsEvent.level) {
      const mappedSeverity =
        this.severityMapping[jenkinsEvent.level.toUpperCase()];
      if (mappedSeverity) return mappedSeverity;
    }

    const message = jenkinsEvent.message?.toLowerCase() || '';

    // High severity for security events
    if (
      message.includes('security') ||
      message.includes('permission denied') ||
      message.includes('authentication failed')
    ) {
      return 'high';
    }

    // High severity for build failures
    if (jenkinsEvent.result === 'FAILURE' || message.includes('failed')) {
      return 'high';
    }

    // Medium severity for warnings and aborts
    if (
      jenkinsEvent.result === 'ABORTED' ||
      message.includes('warning') ||
      message.includes('abort')
    ) {
      return 'medium';
    }

    return 'low';
  }

  private getOutcomeFromEvent(
    jenkinsEvent: JenkinsEvent
  ): 'success' | 'failure' | 'unknown' {
    if (jenkinsEvent.result) {
      return this.resultMapping[jenkinsEvent.result] || 'unknown';
    }

    const message = jenkinsEvent.message?.toLowerCase() || '';

    if (
      message.includes('success') ||
      message.includes('completed successfully')
    ) {
      return 'success';
    }

    if (
      message.includes('failed') ||
      message.includes('error') ||
      message.includes('abort')
    ) {
      return 'failure';
    }

    return 'unknown';
  }

  private mapToECSCategory(category: string): string[] {
    const mapping: Record<string, string[]> = {
      authentication: ['authentication'],
      process: ['process'],
      configuration: ['configuration'],
      host: ['host'],
    };
    return mapping[category] || ['host'];
  }

  private mapToECSType(action: string): string[] {
    const mapping: Record<string, string[]> = {
      start: ['start'],
      completion: ['end'],
      failure: ['end'],
      abort: ['end'],
      creation: ['creation'],
      deletion: ['deletion'],
      modification: ['change'],
      login: ['start'],
      logout: ['end'],
      deployment: ['change'],
      jenkins_event: ['info'],
    };
    return mapping[action] || ['info'];
  }

  private mapSeverityToNumber(severity: string): number {
    const mapping: Record<string, number> = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 100,
    };
    return mapping[severity] || 25;
  }

  private calculateRiskScore(event: ParsedEvent): number {
    let riskScore = 20; // Base score for CI/CD events

    // Increase for failures
    if (event.outcome === 'failure') {
      riskScore += 30;
    }

    // Increase for security-related events
    if (
      event.category === 'authentication' ||
      event.custom?.message?.toLowerCase().includes('security')
    ) {
      riskScore += 25;
    }

    // Increase for production deployments
    if (
      event.custom?.job?.toLowerCase().includes('prod') ||
      event.custom?.scm_branch?.includes('main') ||
      event.custom?.scm_branch?.includes('master')
    ) {
      riskScore += 15;
    }

    // Increase for privileged operations
    if (
      event.custom?.cause?.includes('admin') ||
      event.custom?.user?.includes('admin')
    ) {
      riskScore += 10;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  private calculateConfidence(event: ParsedEvent): number {
    let confidence = 0.75; // Base confidence for Jenkins parsing

    // Increase for structured data
    if (event.custom?.job) confidence += 0.1;
    if (event.custom?.build_number) confidence += 0.05;
    if (event.custom?.user) confidence += 0.05;
    if (event.custom?.level) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  private getTagsForEvent(event: ParsedEvent): string[] {
    const tags = ['jenkins', 'ci-cd'];

    if (event.custom?.job) {
      tags.push(
        `job-${(event.custom.job as string).toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      );
    }

    if (event.custom?.result) {
      tags.push(`result-${(event.custom.result as string).toLowerCase()}`);
    }

    if (event.custom?.scm_branch) {
      tags.push(
        `branch-${(event.custom.scm_branch as string).toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      );
    }

    if (event.action?.includes('failure')) {
      tags.push('build-failure');
    }

    return tags;
  }

  private buildMessage(event: ParsedEvent): string {
    const job = event.custom?.job || 'unknown job';
    const buildNumber = event.custom?.build_number
      ? `#${event.custom.build_number}`
      : '';
    const result = event.custom?.result ? ` (${event.custom.result})` : '';
    const user = event.custom?.user ? ` by ${event.custom.user}` : '';

    return `Jenkins ${job} ${buildNumber}${result}${user}`;
  }

  private getRelatedUsers(event: ParsedEvent): string[] {
    const users: string[] = [];

    if (event.user?.name) users.push(event.user.name);
    if (event.custom?.user) users.push(event.custom.user as string);

    return [...new Set(users)];
  }
}
