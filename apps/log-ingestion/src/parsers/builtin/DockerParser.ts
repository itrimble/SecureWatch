// Docker Parser
// Handles Docker container and daemon logs with containerization metadata

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  DeviceInfo,
  ProcessInfo,
} from '../types';

export class DockerParser implements LogParser {
  id = 'docker';
  name = 'Docker Parser';
  vendor = 'Docker Inc.';
  logSource = 'docker';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'host' as const;
  priority = 70;
  enabled = true;

  private readonly severityMapping: Record<
    string,
    'low' | 'medium' | 'high' | 'critical'
  > = {
    debug: 'low',
    info: 'low',
    warn: 'medium',
    warning: 'medium',
    error: 'high',
    fatal: 'critical',
    panic: 'critical',
  };

  validate(rawLog: string): boolean {
    const patterns = [
      /time="[^"]+"\s+level=\w+\s+msg="/, // Docker daemon format
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/, // Container JSON format
      /\[docker\]/i,
      /container\s+(started|stopped|died|killed|created|removed)/i,
      /image\s+(pulled|pushed|built|removed)/i,
      /network\s+(created|removed|connected|disconnected)/i,
      /volume\s+(created|removed|mounted|unmounted)/i,
    ];

    return patterns.some((pattern) => pattern.test(rawLog));
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      // Try JSON format first (container logs)
      if (rawLog.trim().startsWith('{')) {
        return this.parseJSONFormat(rawLog);
      }

      // Try Docker daemon format
      if (rawLog.includes('level=')) {
        return this.parseDaemonFormat(rawLog);
      }

      // Fall back to general Docker log format
      return this.parseGeneralFormat(rawLog);
    } catch (error) {
      console.error('Docker parsing error:', error);
      return null;
    }
  }

  private parseJSONFormat(rawLog: string): ParsedEvent | null {
    try {
      const data = JSON.parse(rawLog);

      const event: ParsedEvent = {
        timestamp: new Date(data.time || data.timestamp || Date.now()),
        source: data.attrs?.name || data.container_name || 'docker',
        category: 'process',
        action: this.getActionFromMessage(data.log || data.message || rawLog),
        outcome: this.getOutcomeFromLevel(data.level || 'info'),
        severity: this.severityMapping[data.level?.toLowerCase()] || 'low',
        rawData: rawLog,
        custom: {
          container_id: data.id || data.container_id,
          container_name: data.attrs?.name || data.container_name,
          image: data.attrs?.image || data.image,
          image_id: data.attrs?.imageID || data.image_id,
          labels: data.attrs?.labels || data.labels,
          log_message: data.log || data.message,
          level: data.level,
          stream: data.stream,
          tag: data.tag,
        },
      };

      if (data.attrs) {
        event.device = this.extractDeviceInfo(data.attrs);
        event.process = this.extractProcessInfo(data.attrs);
      }

      return event;
    } catch {
      return null;
    }
  }

  private parseDaemonFormat(rawLog: string): ParsedEvent | null {
    // Parse Docker daemon log format: time="2024-01-01T10:00:00Z" level=info msg="message" key=value
    const timeMatch = rawLog.match(/time="([^"]+)"/);
    const levelMatch = rawLog.match(/level=(\w+)/);
    const msgMatch = rawLog.match(/msg="([^"]+)"/);

    const timestamp = timeMatch ? new Date(timeMatch[1]) : new Date();
    const level = levelMatch ? levelMatch[1].toLowerCase() : 'info';
    const message = msgMatch ? msgMatch[1] : rawLog;

    // Extract additional key-value pairs
    const kvPairs: Record<string, string> = {};
    const kvMatches = rawLog.matchAll(/(\w+)="?([^"\s]+)"?/g);
    for (const match of kvMatches) {
      if (!['time', 'level', 'msg'].includes(match[1])) {
        kvPairs[match[1]] = match[2];
      }
    }

    const event: ParsedEvent = {
      timestamp,
      source: 'docker-daemon',
      category: this.getCategoryFromMessage(message),
      action: this.getActionFromMessage(message),
      outcome: this.getOutcomeFromLevel(level),
      severity: this.severityMapping[level] || 'low',
      rawData: rawLog,
      custom: {
        level,
        message,
        daemon_action: this.extractDaemonAction(message),
        container_id: kvPairs.container || kvPairs.containerID,
        image: kvPairs.image,
        network: kvPairs.network,
        volume: kvPairs.volume,
        ...kvPairs,
      },
    };

    return event;
  }

  private parseGeneralFormat(rawLog: string): ParsedEvent | null {
    // Extract timestamp if present
    const timestampMatch = rawLog.match(
      /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/
    );
    const timestamp = timestampMatch ? new Date(timestampMatch[1]) : new Date();

    const event: ParsedEvent = {
      timestamp,
      source: 'docker',
      category: this.getCategoryFromMessage(rawLog),
      action: this.getActionFromMessage(rawLog),
      outcome: this.getOutcomeFromMessage(rawLog),
      severity: this.getSeverityFromMessage(rawLog),
      rawData: rawLog,
      custom: {
        message: rawLog,
        container_action: this.extractContainerAction(rawLog),
        image_action: this.extractImageAction(rawLog),
        network_action: this.extractNetworkAction(rawLog),
        volume_action: this.extractVolumeAction(rawLog),
      },
    };

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
      'event.provider': 'docker',
      'event.dataset': 'docker.container',
      'event.module': 'docker',

      // Host information
      'host.name': event.source,

      // Container information
      ...(event.custom?.container_id && {
        'container.id': event.custom.container_id,
        'container.name': event.custom.container_name,
        'container.image.name': event.custom.image,
        'container.image.tag': this.extractImageTag(
          event.custom.image as string
        ),
        'container.labels': event.custom.labels,
      }),

      // Process information (if available)
      ...(event.process && {
        'process.name': event.process.name,
        'process.pid': event.process.pid,
        'process.command_line': event.process.commandLine,
      }),

      // Docker-specific fields
      'docker.container.id': event.custom?.container_id,
      'docker.container.name': event.custom?.container_name,
      'docker.image.name': event.custom?.image,
      'docker.image.id': event.custom?.image_id,
      'docker.daemon.action': event.custom?.daemon_action,
      'docker.log.level': event.custom?.level,
      'docker.log.stream': event.custom?.stream,
      'docker.log.tag': event.custom?.tag,

      // SecureWatch fields
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': this.calculateConfidence(event),
      'securewatch.severity': event.severity,
      'securewatch.tags': this.getTagsForEvent(event),

      // Message and labels
      message:
        event.custom?.log_message ||
        event.custom?.message ||
        this.getMessageFromEvent(event),
      labels: {
        container_id: event.custom?.container_id,
        container_name: event.custom?.container_name,
        image: event.custom?.image,
        log_source: 'docker',
        docker_action: event.action,
      },

      // Related fields
      'related.hosts': [event.source],
    };

    return normalized;
  }

  private extractDeviceInfo(attrs: any): DeviceInfo {
    return {
      name: attrs.name || 'docker-container',
      hostname: attrs.hostname,
      type: 'server',
    };
  }

  private extractProcessInfo(attrs: any): ProcessInfo {
    return {
      name: attrs.name,
      pid: attrs.pid,
      commandLine: attrs.command,
    };
  }

  private getCategoryFromMessage(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('container')) return 'process';
    if (lowerMessage.includes('image')) return 'package';
    if (lowerMessage.includes('network')) return 'network';
    if (lowerMessage.includes('volume') || lowerMessage.includes('mount'))
      return 'file';

    return 'host';
  }

  private getActionFromMessage(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('start')) return 'start';
    if (lowerMessage.includes('stop')) return 'stop';
    if (lowerMessage.includes('kill')) return 'kill';
    if (lowerMessage.includes('create')) return 'create';
    if (lowerMessage.includes('remove') || lowerMessage.includes('delete'))
      return 'delete';
    if (lowerMessage.includes('pull')) return 'pull';
    if (lowerMessage.includes('push')) return 'push';
    if (lowerMessage.includes('build')) return 'build';
    if (lowerMessage.includes('connect')) return 'connect';
    if (lowerMessage.includes('disconnect')) return 'disconnect';
    if (lowerMessage.includes('mount')) return 'mount';
    if (lowerMessage.includes('unmount')) return 'unmount';
    if (lowerMessage.includes('died') || lowerMessage.includes('exit'))
      return 'exit';

    return 'info';
  }

  private getOutcomeFromLevel(
    level: string
  ): 'success' | 'failure' | 'unknown' {
    const lowerLevel = level.toLowerCase();

    if (['error', 'fatal', 'panic'].includes(lowerLevel)) return 'failure';
    if (['info', 'debug'].includes(lowerLevel)) return 'success';

    return 'unknown';
  }

  private getOutcomeFromMessage(
    message: string
  ): 'success' | 'failure' | 'unknown' {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('error') ||
      lowerMessage.includes('failed') ||
      lowerMessage.includes('fatal')
    ) {
      return 'failure';
    }

    if (
      lowerMessage.includes('success') ||
      lowerMessage.includes('completed') ||
      lowerMessage.includes('started')
    ) {
      return 'success';
    }

    return 'unknown';
  }

  private getSeverityFromMessage(
    message: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('fatal') || lowerMessage.includes('panic'))
      return 'critical';
    if (lowerMessage.includes('error')) return 'high';
    if (lowerMessage.includes('warn')) return 'medium';

    return 'low';
  }

  private extractDaemonAction(message: string): string | undefined {
    const patterns = [
      /daemon\s+(\w+)/i,
      /docker\s+(\w+)/i,
      /(starting|stopping|restarting|configuring)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1].toLowerCase();
    }

    return undefined;
  }

  private extractContainerAction(message: string): string | undefined {
    const containerPattern = /container\s+(\w+)/i;
    const match = message.match(containerPattern);
    return match ? match[1].toLowerCase() : undefined;
  }

  private extractImageAction(message: string): string | undefined {
    const imagePattern = /image\s+(\w+)/i;
    const match = message.match(imagePattern);
    return match ? match[1].toLowerCase() : undefined;
  }

  private extractNetworkAction(message: string): string | undefined {
    const networkPattern = /network\s+(\w+)/i;
    const match = message.match(networkPattern);
    return match ? match[1].toLowerCase() : undefined;
  }

  private extractVolumeAction(message: string): string | undefined {
    const volumePattern = /volume\s+(\w+)/i;
    const match = message.match(volumePattern);
    return match ? match[1].toLowerCase() : undefined;
  }

  private extractImageTag(image?: string): string | undefined {
    if (!image) return undefined;

    const parts = image.split(':');
    return parts.length > 1 ? parts[1] : 'latest';
  }

  private mapToECSCategory(category: string): string[] {
    const mapping: Record<string, string[]> = {
      process: ['process'],
      package: ['package'],
      network: ['network'],
      file: ['file'],
      host: ['host'],
    };
    return mapping[category] || ['host'];
  }

  private mapToECSType(action: string): string[] {
    const mapping: Record<string, string[]> = {
      start: ['start'],
      stop: ['end'],
      kill: ['end'],
      create: ['creation'],
      delete: ['deletion'],
      pull: ['access'],
      push: ['access'],
      build: ['creation'],
      connect: ['connection'],
      disconnect: ['end'],
      mount: ['creation'],
      unmount: ['deletion'],
      exit: ['end'],
      info: ['info'],
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

  private calculateConfidence(event: ParsedEvent): number {
    let confidence = 0.7;

    if (event.custom?.container_id) confidence += 0.1;
    if (event.custom?.image) confidence += 0.1;
    if (event.custom?.level) confidence += 0.05;
    if (event.timestamp) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  private getTagsForEvent(event: ParsedEvent): string[] {
    const tags = ['docker', 'container'];

    if (event.custom?.container_name) {
      tags.push(`container-${event.custom.container_name}`);
    }

    if (event.custom?.image) {
      const imageName = (event.custom.image as string).split(':')[0];
      tags.push(`image-${imageName.replace('/', '-')}`);
    }

    if (event.action) {
      tags.push(`action-${event.action}`);
    }

    return tags;
  }

  private getMessageFromEvent(event: ParsedEvent): string {
    const action = event.action;
    const containerName = event.custom?.container_name;
    const image = event.custom?.image;

    if (containerName && action) {
      return `Docker container "${containerName}" ${action}${image ? ` (image: ${image})` : ''}`;
    }

    if (image && action) {
      return `Docker image "${image}" ${action}`;
    }

    return `Docker ${action || 'event'}`;
  }
}
