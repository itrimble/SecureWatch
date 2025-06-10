// Kubernetes Audit Parser
// Handles Kubernetes audit logs in JSON format with container orchestration context

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  UserInfo,
  DeviceInfo,
  NetworkInfo,
} from '../types';

interface KubernetesAuditEvent {
  kind: string;
  apiVersion: string;
  level: 'Metadata' | 'Request' | 'RequestResponse';
  auditID: string;
  stage: 'RequestReceived' | 'ResponseStarted' | 'ResponseComplete' | 'Panic';
  requestURI: string;
  verb: string;
  user: {
    username: string;
    uid?: string;
    groups?: string[];
    extra?: Record<string, string[]>;
  };
  impersonatedUser?: {
    username: string;
    uid?: string;
    groups?: string[];
  };
  sourceIPs: string[];
  userAgent?: string;
  objectRef?: {
    resource: string;
    namespace?: string;
    name?: string;
    uid?: string;
    apiGroup?: string;
    apiVersion: string;
    resourceVersion?: string;
    subresource?: string;
  };
  responseStatus?: {
    metadata: any;
    status: string;
    message?: string;
    reason?: string;
    details?: any;
    code: number;
  };
  requestObject?: any;
  responseObject?: any;
  requestReceivedTimestamp: string;
  stageTimestamp: string;
  annotations?: Record<string, string>;
}

export class KubernetesAuditParser implements LogParser {
  id = 'kubernetes-audit';
  name = 'Kubernetes Audit Parser';
  vendor = 'Kubernetes';
  logSource = 'kubernetes';
  version = '1.0.0';
  format = 'json' as const;
  category = 'host' as const;
  priority = 80; // High priority for container orchestration events
  enabled = true;

  // Kubernetes verb to severity mapping
  private readonly severityMapping: Record<
    string,
    'low' | 'medium' | 'high' | 'critical'
  > = {
    get: 'low',
    list: 'low',
    watch: 'low',
    create: 'medium',
    update: 'medium',
    patch: 'medium',
    delete: 'high',
    deletecollection: 'high',
    proxy: 'medium',
    connect: 'medium',
    bind: 'high',
    escalate: 'critical',
    impersonate: 'critical',
  };

  // Sensitive resources that should be flagged as high risk
  private readonly sensitiveResources = [
    'secrets',
    'serviceaccounts',
    'roles',
    'rolebindings',
    'clusterroles',
    'clusterrolebindings',
    'pods',
    'nodes',
    'persistentvolumes',
    'namespaces',
  ];

  validate(rawLog: string): boolean {
    try {
      const data = JSON.parse(rawLog);

      // Must have required Kubernetes audit fields
      return !!(
        data.kind === 'Event' &&
        data.apiVersion &&
        data.auditID &&
        data.stage &&
        data.verb &&
        data.user &&
        data.requestURI &&
        data.requestReceivedTimestamp
      );
    } catch {
      return false;
    }
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      const auditEvent: KubernetesAuditEvent = JSON.parse(rawLog);

      const event: ParsedEvent = {
        timestamp: new Date(
          auditEvent.stageTimestamp || auditEvent.requestReceivedTimestamp
        ),
        source:
          this.extractSourceFromUserAgent(auditEvent.userAgent) ||
          'kubernetes-api',
        category: this.categorizeFromResource(auditEvent.objectRef?.resource),
        action: this.getActionFromVerb(auditEvent.verb),
        outcome: this.getOutcomeFromResponse(auditEvent.responseStatus),
        severity: this.getSeverityFromEvent(auditEvent),
        rawData: rawLog,
        custom: {
          audit_id: auditEvent.auditID,
          stage: auditEvent.stage,
          level: auditEvent.level,
          verb: auditEvent.verb,
          request_uri: auditEvent.requestURI,
          user_agent: auditEvent.userAgent,
          response_code: auditEvent.responseStatus?.code,
          response_status: auditEvent.responseStatus?.status,
          response_reason: auditEvent.responseStatus?.reason,
          resource: auditEvent.objectRef?.resource,
          namespace: auditEvent.objectRef?.namespace,
          resource_name: auditEvent.objectRef?.name,
          resource_uid: auditEvent.objectRef?.uid,
          api_group: auditEvent.objectRef?.apiGroup,
          api_version: auditEvent.objectRef?.apiVersion,
          subresource: auditEvent.objectRef?.subresource,
          annotations: auditEvent.annotations,
          impersonated_user: auditEvent.impersonatedUser?.username,
        },
      };

      // Extract user information
      event.user = this.extractUserInfo(auditEvent);

      // Extract device/source information
      event.device = this.extractDeviceInfo(auditEvent);

      // Extract network information
      if (auditEvent.sourceIPs && auditEvent.sourceIPs.length > 0) {
        event.network = this.extractNetworkInfo(auditEvent);
      }

      return event;
    } catch (error) {
      console.error('Kubernetes audit parsing error:', error);
      return null;
    }
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
      'event.provider': 'kubernetes',
      'event.dataset': 'kubernetes.audit',
      'event.module': 'kubernetes',

      // Host information (Kubernetes API server)
      'host.name': event.source,
      'host.hostname': event.source,

      // User information
      ...(event.user && {
        'user.name': event.user.name,
        'user.id': event.user.id,
        'user.group.name': event.user.groups,
      }),

      // Network information
      ...(event.network && {
        'source.ip': event.network.sourceIp,
        'network.direction': 'inbound',
      }),

      // HTTP/API information
      ...(event.custom?.request_uri && {
        'url.path': event.custom.request_uri,
      }),
      ...(event.custom?.verb && {
        'http.request.method': event.custom.verb.toUpperCase(),
      }),
      ...(event.custom?.response_code && {
        'http.response.status_code': event.custom.response_code,
      }),
      ...(event.custom?.user_agent && {
        'user_agent.original': event.custom.user_agent,
      }),

      // Kubernetes-specific fields
      'kubernetes.audit.id': event.custom?.audit_id,
      'kubernetes.audit.stage': event.custom?.stage,
      'kubernetes.audit.level': event.custom?.level,
      'kubernetes.audit.verb': event.custom?.verb,
      'kubernetes.audit.uri': event.custom?.request_uri,
      'kubernetes.audit.response.code': event.custom?.response_code,
      'kubernetes.audit.response.status': event.custom?.response_status,
      'kubernetes.audit.response.reason': event.custom?.response_reason,

      // Kubernetes resource information
      ...(event.custom?.resource && {
        'kubernetes.resource.type': event.custom.resource,
        'kubernetes.resource.namespace': event.custom.namespace,
        'kubernetes.resource.name': event.custom.resource_name,
        'kubernetes.resource.uid': event.custom.resource_uid,
        'kubernetes.resource.api_group': event.custom.api_group,
        'kubernetes.resource.api_version': event.custom.api_version,
        'kubernetes.resource.subresource': event.custom.subresource,
      }),

      // Impersonation information
      ...(event.custom?.impersonated_user && {
        'kubernetes.audit.impersonated_user': event.custom.impersonated_user,
      }),

      // Annotations
      ...(event.custom?.annotations && {
        'kubernetes.audit.annotations': event.custom.annotations,
      }),

      // SecureWatch fields
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': this.calculateConfidence(event),
      'securewatch.severity': event.severity,
      'securewatch.tags': this.getTagsForEvent(event),

      // Message and labels
      message: this.getMessageFromEvent(event),
      labels: {
        audit_id: event.custom?.audit_id,
        verb: event.custom?.verb,
        resource: event.custom?.resource,
        namespace: event.custom?.namespace || 'cluster-wide',
        log_source: 'kubernetes',
        k8s_action: event.action,
      },

      // Related fields for correlation
      'related.ip': this.getRelatedIPs(event),
      'related.user': this.getRelatedUsers(event),
      'related.hosts': [event.source],
    };

    return normalized;
  }

  private extractUserInfo(auditEvent: KubernetesAuditEvent): UserInfo {
    return {
      name: auditEvent.user.username,
      id: auditEvent.user.uid,
      groups: auditEvent.user.groups,
    };
  }

  private extractDeviceInfo(auditEvent: KubernetesAuditEvent): DeviceInfo {
    const source = this.extractSourceFromUserAgent(auditEvent.userAgent);

    return {
      name: source || 'kubernetes-client',
      hostname: source || 'kubernetes-client',
      type: this.getDeviceTypeFromUserAgent(auditEvent.userAgent),
    };
  }

  private extractNetworkInfo(auditEvent: KubernetesAuditEvent): NetworkInfo {
    return {
      sourceIp: auditEvent.sourceIPs[0], // Primary source IP
      protocol: 'https',
      direction: 'inbound',
    };
  }

  private extractSourceFromUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;

    // Extract common Kubernetes client sources
    if (userAgent.includes('kubectl')) return 'kubectl';
    if (userAgent.includes('kubelet')) return 'kubelet';
    if (userAgent.includes('kube-proxy')) return 'kube-proxy';
    if (userAgent.includes('kube-scheduler')) return 'kube-scheduler';
    if (userAgent.includes('kube-controller-manager'))
      return 'kube-controller-manager';
    if (userAgent.includes('helm')) return 'helm';
    if (userAgent.includes('terraform')) return 'terraform';
    if (userAgent.includes('dashboard')) return 'kubernetes-dashboard';

    // Extract custom client names
    const clientMatch = userAgent.match(/^([^/]+)/);
    return clientMatch ? clientMatch[1] : undefined;
  }

  private getDeviceTypeFromUserAgent(
    userAgent?: string
  ): 'desktop' | 'server' | 'unknown' {
    if (!userAgent) return 'unknown';

    const lowerAgent = userAgent.toLowerCase();

    if (lowerAgent.includes('kubectl') || lowerAgent.includes('helm'))
      return 'desktop';
    if (
      lowerAgent.includes('kubelet') ||
      lowerAgent.includes('kube-proxy') ||
      lowerAgent.includes('controller')
    )
      return 'server';

    return 'unknown';
  }

  private categorizeFromResource(resource?: string): string {
    if (!resource) return 'host';

    const resourceLower = resource.toLowerCase();

    if (
      [
        'secrets',
        'serviceaccounts',
        'roles',
        'rolebindings',
        'clusterroles',
        'clusterrolebindings',
      ].includes(resourceLower)
    ) {
      return 'iam';
    }

    if (
      [
        'pods',
        'deployments',
        'replicasets',
        'daemonsets',
        'statefulsets',
        'jobs',
        'cronjobs',
      ].includes(resourceLower)
    ) {
      return 'process';
    }

    if (
      ['services', 'endpoints', 'ingresses', 'networkpolicies'].includes(
        resourceLower
      )
    ) {
      return 'network';
    }

    if (
      ['persistentvolumes', 'persistentvolumeclaims', 'configmaps'].includes(
        resourceLower
      )
    ) {
      return 'file';
    }

    if (['nodes', 'namespaces', 'events'].includes(resourceLower)) {
      return 'host';
    }

    return 'host';
  }

  private getActionFromVerb(verb: string): string {
    const verbLower = verb.toLowerCase();

    const mapping: Record<string, string> = {
      get: 'read',
      list: 'list',
      watch: 'watch',
      create: 'create',
      update: 'update',
      patch: 'modify',
      delete: 'delete',
      deletecollection: 'delete_collection',
      proxy: 'proxy',
      connect: 'connect',
      bind: 'bind',
      escalate: 'escalate',
      impersonate: 'impersonate',
    };

    return mapping[verbLower] || verbLower;
  }

  private getOutcomeFromResponse(
    responseStatus?: any
  ): 'success' | 'failure' | 'unknown' {
    if (!responseStatus) return 'unknown';

    const code = responseStatus.code;

    if (code >= 200 && code < 400) return 'success';
    if (code >= 400) return 'failure';

    return 'unknown';
  }

  private getSeverityFromEvent(
    auditEvent: KubernetesAuditEvent
  ): 'low' | 'medium' | 'high' | 'critical' {
    let baseSeverity =
      this.severityMapping[auditEvent.verb.toLowerCase()] || 'low';

    // Increase severity for sensitive resources
    if (
      auditEvent.objectRef?.resource &&
      this.sensitiveResources.includes(
        auditEvent.objectRef.resource.toLowerCase()
      )
    ) {
      if (baseSeverity === 'low') baseSeverity = 'medium';
      else if (baseSeverity === 'medium') baseSeverity = 'high';
    }

    // Increase severity for impersonation
    if (auditEvent.impersonatedUser) {
      if (baseSeverity === 'low') baseSeverity = 'medium';
      else if (baseSeverity === 'medium') baseSeverity = 'high';
      else if (baseSeverity === 'high') baseSeverity = 'critical';
    }

    // Increase severity for failures
    if (auditEvent.responseStatus && auditEvent.responseStatus.code >= 400) {
      if (baseSeverity === 'low') baseSeverity = 'medium';
    }

    return baseSeverity;
  }

  private mapToECSCategory(category: string): string[] {
    const mapping: Record<string, string[]> = {
      iam: ['iam'],
      process: ['process'],
      network: ['network'],
      file: ['file'],
      host: ['host'],
    };
    return mapping[category] || ['host'];
  }

  private mapToECSType(action: string): string[] {
    const mapping: Record<string, string[]> = {
      read: ['access'],
      list: ['access'],
      watch: ['access'],
      create: ['creation'],
      update: ['change'],
      modify: ['change'],
      delete: ['deletion'],
      delete_collection: ['deletion'],
      proxy: ['access'],
      connect: ['connection'],
      bind: ['change'],
      escalate: ['change'],
      impersonate: ['start'],
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
    let riskScore = this.mapSeverityToNumber(event.severity);

    // Increase risk for sensitive resources
    const resource = event.custom?.resource as string;
    if (resource && this.sensitiveResources.includes(resource.toLowerCase())) {
      riskScore += 20;
    }

    // Increase risk for privileged operations
    const verb = event.custom?.verb as string;
    if (
      verb &&
      ['delete', 'escalate', 'impersonate', 'bind'].includes(verb.toLowerCase())
    ) {
      riskScore += 15;
    }

    // Increase risk for cluster-wide operations
    if (!event.custom?.namespace) {
      riskScore += 10;
    }

    // Increase risk for impersonation
    if (event.custom?.impersonated_user) {
      riskScore += 25;
    }

    // Increase risk for failures on sensitive operations
    if (event.outcome === 'failure' && riskScore > 50) {
      riskScore += 10;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  private calculateConfidence(event: ParsedEvent): number {
    let confidence = 0.9; // High confidence for structured Kubernetes audit logs

    // Full structured audit event
    if (event.custom?.audit_id && event.custom?.stage && event.custom?.verb) {
      confidence = 0.95;
    }

    return confidence;
  }

  private getTagsForEvent(event: ParsedEvent): string[] {
    const tags = ['kubernetes', 'k8s', 'audit', 'container-orchestration'];

    if (event.custom?.resource) {
      tags.push(`k8s-${event.custom.resource}`);
    }

    if (event.custom?.namespace) {
      tags.push(`namespace-${event.custom.namespace}`);
    } else {
      tags.push('cluster-wide');
    }

    if (event.custom?.verb) {
      tags.push(`verb-${event.custom.verb}`);
    }

    if (event.custom?.impersonated_user) {
      tags.push('impersonation');
    }

    const resource = event.custom?.resource as string;
    if (resource && this.sensitiveResources.includes(resource.toLowerCase())) {
      tags.push('sensitive-resource');
    }

    return tags;
  }

  private getMessageFromEvent(event: ParsedEvent): string {
    const user = event.user?.name || 'unknown';
    const verb = event.custom?.verb || 'unknown';
    const resource = event.custom?.resource || 'unknown';
    const resourceName = event.custom?.resource_name;
    const namespace = event.custom?.namespace;
    const impersonatedUser = event.custom?.impersonated_user;

    let message = `Kubernetes ${verb} ${resource}`;

    if (resourceName) {
      message += ` "${resourceName}"`;
    }

    if (namespace) {
      message += ` in namespace "${namespace}"`;
    } else {
      message += ' (cluster-wide)';
    }

    message += ` by user "${user}"`;

    if (impersonatedUser) {
      message += ` (impersonating "${impersonatedUser}")`;
    }

    if (event.outcome === 'failure') {
      const reason = event.custom?.response_reason;
      message += ` - FAILED${reason ? `: ${reason}` : ''}`;
    }

    return message;
  }

  private getRelatedIPs(event: ParsedEvent): string[] {
    const ips: string[] = [];

    if (event.network?.sourceIp) {
      ips.push(event.network.sourceIp);
    }

    return [...new Set(ips)];
  }

  private getRelatedUsers(event: ParsedEvent): string[] {
    const users: string[] = [];

    if (event.user?.name) {
      users.push(event.user.name);
    }

    if (event.custom?.impersonated_user) {
      users.push(event.custom.impersonated_user as string);
    }

    return [...new Set(users)];
  }
}
