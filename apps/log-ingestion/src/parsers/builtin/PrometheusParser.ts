// Prometheus Parser
// Handles Prometheus AlertManager events with monitoring and alerting context

import { LogParser, ParsedEvent, NormalizedEvent, DeviceInfo } from '../types';

interface PrometheusAlert {
  timestamp?: Date;
  alert_name?: string;
  status?: string;
  severity?: string;
  instance?: string;
  job?: string;
  description?: string;
  summary?: string;
  runbook_url?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  generator_url?: string;
  fingerprint?: string;
  starts_at?: string;
  ends_at?: string;
  value?: number;
  threshold?: number;
  for_duration?: string;
  group_key?: string;
  group_labels?: Record<string, string>;
  common_labels?: Record<string, string>;
  common_annotations?: Record<string, string>;
  external_url?: string;
  receiver?: string;
  silence_id?: string;
}

export class PrometheusParser implements LogParser {
  id = 'prometheus';
  name = 'Prometheus Parser';
  vendor = 'Prometheus';
  logSource = 'prometheus';
  version = '1.0.0';
  format = 'json' as const;
  category = 'host' as const;
  priority = 75; // High priority for monitoring alerts
  enabled = true;

  // Prometheus alert severity to SIEM severity mapping
  private readonly severityMapping: Record<
    string,
    'low' | 'medium' | 'high' | 'critical'
  > = {
    info: 'low',
    warning: 'medium',
    critical: 'critical',
    error: 'high',
    none: 'low',
  };

  // Alert status to outcome mapping
  private readonly statusMapping: Record<
    string,
    'success' | 'failure' | 'unknown'
  > = {
    firing: 'failure',
    resolved: 'success',
    pending: 'unknown',
    inactive: 'success',
  };

  validate(rawLog: string): boolean {
    // Check for Prometheus AlertManager webhook format
    try {
      const data = JSON.parse(rawLog);

      // Check for AlertManager webhook structure
      if (data.alerts && Array.isArray(data.alerts)) {
        return true;
      }

      // Check for single alert structure
      if (data.alertname || data.status || data.labels) {
        return true;
      }

      return false;
    } catch {
      // Check for text-based Prometheus logs
      const patterns = [
        /alertmanager\[/i,
        /prometheus\[/i,
        /level=(info|warn|error|debug)/i,
        /\balert\s*=\s*[\w.-]+/i,
        /firing|resolved|pending/i,
        /severity=(info|warning|critical|error)/i,
        /instance=[\w.-:]+/i,
        /job=[\w.-]+/i,
      ];

      return patterns.some((pattern) => pattern.test(rawLog));
    }
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      // Try JSON format first (AlertManager webhook)
      if (rawLog.trim().startsWith('{') || rawLog.trim().startsWith('[')) {
        return this.parseJSONFormat(rawLog);
      }

      // Fall back to text log format
      return this.parseTextFormat(rawLog);
    } catch (error) {
      console.error('Prometheus parsing error:', error);
      return null;
    }
  }

  private parseJSONFormat(rawLog: string): ParsedEvent | null {
    try {
      const data = JSON.parse(rawLog);

      // Handle AlertManager webhook format
      if (data.alerts && Array.isArray(data.alerts)) {
        return this.parseAlertManagerWebhook(data, rawLog);
      }

      // Handle single alert format
      return this.parseSingleAlert(data, rawLog);
    } catch {
      return null;
    }
  }

  private parseAlertManagerWebhook(
    data: any,
    rawLog: string
  ): ParsedEvent | null {
    // Process the first alert (could be extended to handle multiple)
    const alert = data.alerts[0];
    if (!alert) return null;

    const prometheusAlert: PrometheusAlert = {
      timestamp: new Date(alert.startsAt || alert.endsAt || Date.now()),
      alert_name: alert.labels?.alertname,
      status: data.status || alert.status,
      severity: alert.labels?.severity,
      instance: alert.labels?.instance,
      job: alert.labels?.job,
      description: alert.annotations?.description,
      summary: alert.annotations?.summary,
      runbook_url: alert.annotations?.runbook_url,
      labels: alert.labels,
      annotations: alert.annotations,
      generator_url: alert.generatorURL,
      fingerprint: alert.fingerprint,
      starts_at: alert.startsAt,
      ends_at: alert.endsAt,
      group_key: data.groupKey,
      group_labels: data.groupLabels,
      common_labels: data.commonLabels,
      common_annotations: data.commonAnnotations,
      external_url: data.externalURL,
      receiver: data.receiver,
    };

    return this.createEventFromPrometheusData(prometheusAlert, rawLog);
  }

  private parseSingleAlert(data: any, rawLog: string): ParsedEvent | null {
    const prometheusAlert: PrometheusAlert = {
      timestamp: new Date(),
      alert_name: data.alertname || data.alert_name,
      status: data.status,
      severity: data.severity || data.labels?.severity,
      instance: data.instance || data.labels?.instance,
      job: data.job || data.labels?.job,
      description: data.description || data.annotations?.description,
      summary: data.summary || data.annotations?.summary,
      labels: data.labels,
      annotations: data.annotations,
      value: data.value,
      threshold: data.threshold,
    };

    return this.createEventFromPrometheusData(prometheusAlert, rawLog);
  }

  private parseTextFormat(rawLog: string): ParsedEvent | null {
    const prometheusAlert: PrometheusAlert = {};

    // Extract timestamp
    const timestampMatch = rawLog.match(/ts=([^\s]+)/);
    if (timestampMatch) {
      prometheusAlert.timestamp = new Date(timestampMatch[1]);
    } else {
      const dateMatch = rawLog.match(
        /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/
      );
      prometheusAlert.timestamp = dateMatch
        ? new Date(dateMatch[1])
        : new Date();
    }

    // Extract level/severity
    const levelMatch = rawLog.match(/level=(info|warn|error|debug)/i);
    if (levelMatch) {
      prometheusAlert.severity = levelMatch[1].toLowerCase();
    }

    // Extract alert name
    const alertMatch =
      rawLog.match(/alert=([^\s,]+)/i) || rawLog.match(/alertname=([^\s,]+)/i);
    if (alertMatch) {
      prometheusAlert.alert_name = alertMatch[1];
    }

    // Extract instance
    const instanceMatch = rawLog.match(/instance=([^\s,]+)/i);
    if (instanceMatch) {
      prometheusAlert.instance = instanceMatch[1];
    }

    // Extract job
    const jobMatch = rawLog.match(/job=([^\s,]+)/i);
    if (jobMatch) {
      prometheusAlert.job = jobMatch[1];
    }

    // Extract status
    const statusMatch = rawLog.match(/\b(firing|resolved|pending|inactive)\b/i);
    if (statusMatch) {
      prometheusAlert.status = statusMatch[1].toLowerCase();
    }

    // Extract description from message
    const msgMatch = rawLog.match(/msg="([^"]+)"/);
    if (msgMatch) {
      prometheusAlert.description = msgMatch[1];
    }

    return this.createEventFromPrometheusData(prometheusAlert, rawLog);
  }

  private createEventFromPrometheusData(
    prometheusAlert: PrometheusAlert,
    rawLog: string
  ): ParsedEvent {
    const action = this.getActionFromAlert(prometheusAlert);
    const severity = this.getSeverityFromAlert(prometheusAlert);
    const outcome = this.getOutcomeFromAlert(prometheusAlert);

    const event: ParsedEvent = {
      timestamp: prometheusAlert.timestamp || new Date(),
      source: prometheusAlert.instance || 'prometheus',
      category: this.getCategoryFromAlert(prometheusAlert),
      action,
      outcome,
      severity,
      rawData: rawLog,
      custom: {
        alert_name: prometheusAlert.alert_name,
        status: prometheusAlert.status,
        severity: prometheusAlert.severity,
        instance: prometheusAlert.instance,
        job: prometheusAlert.job,
        description: prometheusAlert.description,
        summary: prometheusAlert.summary,
        runbook_url: prometheusAlert.runbook_url,
        labels: prometheusAlert.labels,
        annotations: prometheusAlert.annotations,
        generator_url: prometheusAlert.generator_url,
        fingerprint: prometheusAlert.fingerprint,
        starts_at: prometheusAlert.starts_at,
        ends_at: prometheusAlert.ends_at,
        value: prometheusAlert.value,
        threshold: prometheusAlert.threshold,
        for_duration: prometheusAlert.for_duration,
        group_key: prometheusAlert.group_key,
        group_labels: prometheusAlert.group_labels,
        common_labels: prometheusAlert.common_labels,
        receiver: prometheusAlert.receiver,
      },
    };

    // Extract device information
    event.device = this.extractDeviceInfo(prometheusAlert);

    return event;
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'alert',
      'event.category': this.mapToECSCategory(event.category),
      'event.type': this.mapToECSType(event.action),
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.risk_score': this.calculateRiskScore(event),
      'event.provider': 'prometheus',
      'event.dataset': 'prometheus.alerts',
      'event.module': 'prometheus',

      // Host information
      'host.name': event.source,
      'host.hostname': event.custom?.instance,

      // Alert information
      'rule.name': event.custom?.alert_name,
      'rule.description': event.custom?.description || event.custom?.summary,

      // Prometheus-specific fields
      'prometheus.alert.name': event.custom?.alert_name,
      'prometheus.alert.status': event.custom?.status,
      'prometheus.alert.severity': event.custom?.severity,
      'prometheus.alert.instance': event.custom?.instance,
      'prometheus.alert.job': event.custom?.job,
      'prometheus.alert.description': event.custom?.description,
      'prometheus.alert.summary': event.custom?.summary,
      'prometheus.alert.runbook_url': event.custom?.runbook_url,
      'prometheus.alert.generator_url': event.custom?.generator_url,
      'prometheus.alert.fingerprint': event.custom?.fingerprint,
      'prometheus.alert.starts_at': event.custom?.starts_at,
      'prometheus.alert.ends_at': event.custom?.ends_at,
      'prometheus.alert.value': event.custom?.value,
      'prometheus.alert.threshold': event.custom?.threshold,
      'prometheus.alert.group_key': event.custom?.group_key,
      'prometheus.alert.receiver': event.custom?.receiver,
      'prometheus.labels': event.custom?.labels,
      'prometheus.annotations': event.custom?.annotations,
      'prometheus.group_labels': event.custom?.group_labels,
      'prometheus.common_labels': event.custom?.common_labels,

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
        alert_name: event.custom?.alert_name,
        status: event.custom?.status,
        severity: event.custom?.severity,
        instance: event.custom?.instance,
        job: event.custom?.job,
        log_source: 'prometheus',
      },

      // Related fields for correlation
      'related.hosts': this.getRelatedHosts(event),
    };

    return normalized;
  }

  private extractDeviceInfo(prometheusAlert: PrometheusAlert): DeviceInfo {
    const hostname = prometheusAlert.instance || 'prometheus-server';

    return {
      name: hostname.split(':')[0], // Remove port if present
      hostname: hostname,
      type: 'server',
    };
  }

  private getCategoryFromAlert(prometheusAlert: PrometheusAlert): string {
    const alertName = prometheusAlert.alert_name?.toLowerCase() || '';

    if (alertName.includes('security') || alertName.includes('intrusion')) {
      return 'intrusion_detection';
    }

    if (alertName.includes('auth') || alertName.includes('login')) {
      return 'authentication';
    }

    if (alertName.includes('network') || alertName.includes('connection')) {
      return 'network';
    }

    if (alertName.includes('disk') || alertName.includes('filesystem')) {
      return 'file';
    }

    return 'host';
  }

  private getActionFromAlert(prometheusAlert: PrometheusAlert): string {
    const status = prometheusAlert.status?.toLowerCase();

    switch (status) {
      case 'firing':
        return 'alert_triggered';
      case 'resolved':
        return 'alert_resolved';
      case 'pending':
        return 'alert_pending';
      case 'inactive':
        return 'alert_inactive';
      default:
        return 'monitoring_event';
    }
  }

  private getSeverityFromAlert(
    prometheusAlert: PrometheusAlert
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (prometheusAlert.severity) {
      const mappedSeverity =
        this.severityMapping[prometheusAlert.severity.toLowerCase()];
      if (mappedSeverity) return mappedSeverity;
    }

    // Determine severity from alert name
    const alertName = prometheusAlert.alert_name?.toLowerCase() || '';

    if (
      alertName.includes('critical') ||
      alertName.includes('down') ||
      alertName.includes('error')
    ) {
      return 'critical';
    }

    if (alertName.includes('high') || alertName.includes('warning')) {
      return 'high';
    }

    if (alertName.includes('medium') || alertName.includes('warn')) {
      return 'medium';
    }

    return 'low';
  }

  private getOutcomeFromAlert(
    prometheusAlert: PrometheusAlert
  ): 'success' | 'failure' | 'unknown' {
    if (prometheusAlert.status) {
      const mappedOutcome =
        this.statusMapping[prometheusAlert.status.toLowerCase()];
      if (mappedOutcome) return mappedOutcome;
    }

    return 'unknown';
  }

  private mapToECSCategory(category: string): string[] {
    const mapping: Record<string, string[]> = {
      intrusion_detection: ['intrusion_detection'],
      authentication: ['authentication'],
      network: ['network'],
      file: ['file'],
      host: ['host'],
    };
    return mapping[category] || ['host'];
  }

  private mapToECSType(action: string): string[] {
    const mapping: Record<string, string[]> = {
      alert_triggered: ['start'],
      alert_resolved: ['end'],
      alert_pending: ['info'],
      alert_inactive: ['end'],
      monitoring_event: ['info'],
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
    let riskScore = 30; // Base score for monitoring alerts

    // Increase for firing alerts
    if (event.custom?.status === 'firing') {
      riskScore += 25;
    }

    // Increase for critical/high severity
    if (event.severity === 'critical') {
      riskScore += 30;
    } else if (event.severity === 'high') {
      riskScore += 20;
    }

    // Increase for security-related alerts
    const alertName = (event.custom?.alert_name as string)?.toLowerCase() || '';
    if (
      alertName.includes('security') ||
      alertName.includes('intrusion') ||
      alertName.includes('auth') ||
      alertName.includes('breach')
    ) {
      riskScore += 25;
    }

    // Increase for infrastructure alerts
    if (
      alertName.includes('down') ||
      alertName.includes('outage') ||
      alertName.includes('unavailable')
    ) {
      riskScore += 15;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  private calculateConfidence(event: ParsedEvent): number {
    let confidence = 0.8; // Base confidence for Prometheus alerts

    // Increase for structured data
    if (event.custom?.alert_name) confidence += 0.1;
    if (event.custom?.labels) confidence += 0.05;
    if (event.custom?.annotations) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  private getTagsForEvent(event: ParsedEvent): string[] {
    const tags = ['prometheus', 'monitoring', 'alertmanager'];

    if (event.custom?.alert_name) {
      tags.push(
        `alert-${(event.custom.alert_name as string).toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      );
    }

    if (event.custom?.job) {
      tags.push(
        `job-${(event.custom.job as string).toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      );
    }

    if (event.custom?.status) {
      tags.push(`status-${event.custom.status}`);
    }

    if (event.custom?.severity) {
      tags.push(`severity-${event.custom.severity}`);
    }

    return tags;
  }

  private buildMessage(event: ParsedEvent): string {
    const alertName = event.custom?.alert_name || 'Unknown Alert';
    const status = event.custom?.status || 'unknown';
    const instance = event.custom?.instance || '';
    const description =
      event.custom?.description || event.custom?.summary || '';

    let message = `Prometheus alert "${alertName}" is ${status}`;

    if (instance) {
      message += ` on ${instance}`;
    }

    if (description) {
      message += `: ${description}`;
    }

    return message;
  }

  private getRelatedHosts(event: ParsedEvent): string[] {
    const hosts: string[] = [];

    if (event.source) hosts.push(event.source);
    if (event.custom?.instance) {
      const hostname = (event.custom.instance as string).split(':')[0];
      hosts.push(hostname);
    }

    return [...new Set(hosts)];
  }
}
