import { KafkaStreamProcessor, StreamProcessorConfig, WindowedEvent } from './kafka-streams-processor';
import { EnrichedLogEvent } from '../types/log-event.types';
import { performance } from 'perf_hooks';
import logger from '../utils/logger';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  condition: (event: EnrichedLogEvent) => boolean;
  windowCondition?: (events: EnrichedLogEvent[]) => boolean;
  windowSizeMs?: number;
  throttleMs?: number;
  enabled: boolean;
  tags: string[];
  metadata: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  title: string;
  description: string;
  timestamp: string;
  sourceEvent: {
    id: string;
    timestamp: string;
    source: string;
    message: string;
  };
  enrichments: {
    riskScore: number;
    geoIP?: any;
    threatIntel?: any;
    userActivity?: any;
  };
  tags: string[];
  metadata: Record<string, any>;
}

export class RealTimeAlertingProcessor extends KafkaStreamProcessor {
  private alertRules: Map<string, AlertRule> = new Map();
  private ruleThrottles: Map<string, number> = new Map();
  private windowEvents: Map<string, EnrichedLogEvent[]> = new Map();
  private alertsGenerated: number = 0;

  constructor(config: StreamProcessorConfig) {
    super(config);
    this.initializeDefaultAlertRules();
  }

  async initialize(): Promise<void> {
    await super.initialize();
    
    // Start throttle cleanup
    this.startThrottleCleanup();
    
    logger.info('Real-time alerting processor initialized', {
      ruleCount: this.alertRules.size
    });
  }

  protected async processEvent(event: EnrichedLogEvent): Promise<Alert[]> {
    const startTime = performance.now();
    const alerts: Alert[] = [];

    try {
      // Process each alert rule
      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) continue;

        try {
          const alert = await this.evaluateRule(rule, event);
          if (alert) {
            alerts.push(alert);
          }
        } catch (error) {
          logger.error('Alert rule evaluation failed', {
            ruleId: rule.id,
            eventId: event.id,
            error: error.message
          });
        }
      }

      const processingTime = performance.now() - startTime;
      
      if (alerts.length > 0) {
        this.alertsGenerated += alerts.length;
        logger.info('Alerts generated', {
          eventId: event.id,
          alertCount: alerts.length,
          processingTimeMs: processingTime,
          totalAlertsGenerated: this.alertsGenerated
        });
      }

      return alerts;

    } catch (error) {
      logger.error('Alert processing failed', error);
      throw error;
    }
  }

  protected async processWindow(window: WindowedEvent): Promise<Alert[]> {
    // For windowed processing, evaluate rules that require multiple events
    const windowAlerts: Alert[] = [];
    
    // Convert raw events to enriched events (assuming they're already enriched)
    const enrichedEvents = window.events as unknown as EnrichedLogEvent[];

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || !rule.windowCondition) continue;

      try {
        if (rule.windowCondition(enrichedEvents)) {
          // Generate window-based alert
          const alert = this.generateWindowAlert(rule, enrichedEvents, window);
          if (alert) {
            windowAlerts.push(alert);
          }
        }
      } catch (error) {
        logger.error('Window alert rule evaluation failed', {
          ruleId: rule.id,
          windowStart: window.windowStart,
          error: error.message
        });
      }
    }

    if (windowAlerts.length > 0) {
      this.alertsGenerated += windowAlerts.length;
      logger.info('Window alerts generated', {
        windowStart: new Date(window.windowStart).toISOString(),
        alertCount: windowAlerts.length,
        eventCount: enrichedEvents.length
      });
    }

    return windowAlerts;
  }

  private async evaluateRule(rule: AlertRule, event: EnrichedLogEvent): Promise<Alert | null> {
    // Check throttling
    if (this.isRuleThrottled(rule)) {
      return null;
    }

    // Evaluate single-event condition
    if (!rule.condition(event)) {
      return null;
    }

    // For rules with window conditions, store event and evaluate window
    if (rule.windowCondition && rule.windowSizeMs) {
      return await this.evaluateWindowRule(rule, event);
    }

    // Generate immediate alert
    const alert = this.generateAlert(rule, event);
    
    // Apply throttling
    if (rule.throttleMs) {
      this.ruleThrottles.set(rule.id, Date.now());
    }

    return alert;
  }

  private async evaluateWindowRule(rule: AlertRule, event: EnrichedLogEvent): Promise<Alert | null> {
    const windowKey = `${rule.id}-${this.getWindowStart(Date.now(), rule.windowSizeMs!)}`;
    
    // Get or create window events array
    let windowEvents = this.windowEvents.get(windowKey);
    if (!windowEvents) {
      windowEvents = [];
      this.windowEvents.set(windowKey, windowEvents);
    }

    // Add current event to window
    windowEvents.push(event);

    // Clean old events from window
    const windowStart = Date.now() - rule.windowSizeMs!;
    const filteredEvents = windowEvents.filter(e => 
      new Date(e.timestamp).getTime() >= windowStart
    );
    this.windowEvents.set(windowKey, filteredEvents);

    // Evaluate window condition
    if (rule.windowCondition!(filteredEvents)) {
      // Generate alert and apply throttling
      const alert = this.generateAlert(rule, event, filteredEvents);
      
      if (rule.throttleMs) {
        this.ruleThrottles.set(rule.id, Date.now());
      }

      return alert;
    }

    return null;
  }

  private generateAlert(
    rule: AlertRule, 
    triggerEvent: EnrichedLogEvent, 
    windowEvents?: EnrichedLogEvent[]
  ): Alert {
    const alertId = this.generateAlertId();
    
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      title: this.generateAlertTitle(rule, triggerEvent),
      description: this.generateAlertDescription(rule, triggerEvent, windowEvents),
      timestamp: new Date().toISOString(),
      sourceEvent: {
        id: triggerEvent.id,
        timestamp: triggerEvent.timestamp,
        source: triggerEvent.source,
        message: triggerEvent.message
      },
      enrichments: {
        riskScore: triggerEvent.enrichments?.riskScore || 0,
        geoIP: triggerEvent.enrichments?.geoIP,
        threatIntel: triggerEvent.enrichments?.threatIntel,
        userActivity: triggerEvent.enrichments?.userActivity
      },
      tags: [...rule.tags, ...(triggerEvent.tags || [])],
      metadata: {
        ...rule.metadata,
        windowEventCount: windowEvents?.length || 1,
        processingLatencyMs: Date.now() - new Date(triggerEvent.timestamp).getTime()
      }
    };

    return alert;
  }

  private generateWindowAlert(
    rule: AlertRule,
    events: EnrichedLogEvent[],
    window: WindowedEvent
  ): Alert {
    const alertId = this.generateAlertId();
    const triggerEvent = events[events.length - 1]; // Use latest event as trigger
    
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      title: `${rule.name} (Window Alert)`,
      description: `Window-based alert: ${rule.description}. ${events.length} events in window.`,
      timestamp: new Date().toISOString(),
      sourceEvent: {
        id: triggerEvent.id,
        timestamp: triggerEvent.timestamp,
        source: triggerEvent.source,
        message: triggerEvent.message
      },
      enrichments: {
        riskScore: Math.max(...events.map(e => e.enrichments?.riskScore || 0)),
        geoIP: triggerEvent.enrichments?.geoIP,
        threatIntel: triggerEvent.enrichments?.threatIntel,
        userActivity: triggerEvent.enrichments?.userActivity
      },
      tags: [...rule.tags, 'window_alert'],
      metadata: {
        ...rule.metadata,
        windowStart: new Date(window.windowStart).toISOString(),
        windowEnd: new Date(window.windowEnd).toISOString(),
        windowEventCount: events.length,
        uniqueUsers: new Set(events.map(e => e.fields.user).filter(Boolean)).size,
        uniqueIPs: new Set(events.map(e => e.fields.sourceIP).filter(Boolean)).size
      }
    };

    return alert;
  }

  private isRuleThrottled(rule: AlertRule): boolean {
    if (!rule.throttleMs) return false;
    
    const lastTriggered = this.ruleThrottles.get(rule.id);
    if (!lastTriggered) return false;
    
    return (Date.now() - lastTriggered) < rule.throttleMs;
  }

  private getWindowStart(timestamp: number, windowSizeMs: number): number {
    return Math.floor(timestamp / windowSizeMs) * windowSizeMs;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertTitle(rule: AlertRule, event: EnrichedLogEvent): string {
    return `${rule.name}: ${event.source}`;
  }

  private generateAlertDescription(
    rule: AlertRule, 
    event: EnrichedLogEvent, 
    windowEvents?: EnrichedLogEvent[]
  ): string {
    let description = rule.description;
    
    if (windowEvents && windowEvents.length > 1) {
      description += ` (${windowEvents.length} events in window)`;
    }
    
    if (event.fields.user) {
      description += ` User: ${event.fields.user}`;
    }
    
    if (event.fields.sourceIP) {
      description += ` IP: ${event.fields.sourceIP}`;
    }

    return description;
  }

  private startThrottleCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredRules: string[] = [];

      for (const [ruleId, lastTriggered] of this.ruleThrottles) {
        const rule = this.alertRules.get(ruleId);
        if (!rule || !rule.throttleMs) {
          expiredRules.push(ruleId);
          continue;
        }

        if (now - lastTriggered > rule.throttleMs) {
          expiredRules.push(ruleId);
        }
      }

      for (const ruleId of expiredRules) {
        this.ruleThrottles.delete(ruleId);
      }

      // Clean old window events
      const windowKeys = Array.from(this.windowEvents.keys());
      for (const key of windowKeys) {
        const events = this.windowEvents.get(key) || [];
        const validEvents = events.filter(event => {
          const eventTime = new Date(event.timestamp).getTime();
          return now - eventTime < 300000; // Keep events for 5 minutes max
        });

        if (validEvents.length === 0) {
          this.windowEvents.delete(key);
        } else {
          this.windowEvents.set(key, validEvents);
        }
      }

    }, 60000); // Cleanup every minute
  }

  private initializeDefaultAlertRules(): void {
    // Failed authentication attempts
    this.alertRules.set('multiple-failed-logins', {
      id: 'multiple-failed-logins',
      name: 'Multiple Failed Login Attempts',
      description: 'Multiple failed login attempts detected from the same IP',
      severity: 'high',
      condition: (event) => 
        event.message.toLowerCase().includes('failed') && 
        event.message.toLowerCase().includes('login') &&
        !!event.fields.sourceIP,
      windowCondition: (events) => {
        const ipCounts = new Map<string, number>();
        for (const event of events) {
          if (event.fields.sourceIP) {
            const count = ipCounts.get(event.fields.sourceIP) || 0;
            ipCounts.set(event.fields.sourceIP, count + 1);
          }
        }
        return Array.from(ipCounts.values()).some(count => count >= 5);
      },
      windowSizeMs: 300000, // 5 minutes
      throttleMs: 600000, // 10 minutes
      enabled: true,
      tags: ['authentication', 'brute_force'],
      metadata: { category: 'security' }
    });

    // High-risk events
    this.alertRules.set('high-risk-event', {
      id: 'high-risk-event',
      name: 'High Risk Event Detected',
      description: 'Event with high risk score detected',
      severity: 'critical',
      condition: (event) => (event.enrichments?.riskScore || 0) >= 80,
      throttleMs: 300000, // 5 minutes per rule
      enabled: true,
      tags: ['high_risk', 'security'],
      metadata: { category: 'risk_management' }
    });

    // Malicious IP activity
    this.alertRules.set('malicious-ip', {
      id: 'malicious-ip',
      name: 'Malicious IP Activity',
      description: 'Activity from known malicious IP address',
      severity: 'high',
      condition: (event) => 
        event.enrichments?.threatIntel?.isMalicious === true,
      throttleMs: 1800000, // 30 minutes
      enabled: true,
      tags: ['threat_intel', 'malicious_ip'],
      metadata: { category: 'threat_intelligence' }
    });

    // Privileged access
    this.alertRules.set('admin-after-hours', {
      id: 'admin-after-hours',
      name: 'Admin Access After Hours',
      description: 'Administrative access detected outside business hours',
      severity: 'medium',
      condition: (event) => {
        const hour = new Date(event.timestamp).getHours();
        const isAfterHours = hour < 8 || hour > 18;
        const isAdmin = event.fields.user?.toLowerCase().includes('admin') ||
                       event.message.toLowerCase().includes('administrator');
        return isAfterHours && isAdmin;
      },
      throttleMs: 3600000, // 1 hour
      enabled: true,
      tags: ['privileged_access', 'after_hours'],
      metadata: { category: 'compliance' }
    });

    // Data exfiltration detection
    this.alertRules.set('large-data-transfer', {
      id: 'large-data-transfer',
      name: 'Large Data Transfer',
      description: 'Unusually large data transfer detected',
      severity: 'medium',
      condition: (event) => {
        const bytes = parseInt(event.fields.bytes || '0');
        return bytes > 100 * 1024 * 1024; // 100MB
      },
      windowCondition: (events) => {
        const totalBytes = events.reduce((sum, event) => {
          return sum + parseInt(event.fields.bytes || '0');
        }, 0);
        return totalBytes > 1024 * 1024 * 1024; // 1GB in window
      },
      windowSizeMs: 1800000, // 30 minutes
      throttleMs: 3600000, // 1 hour
      enabled: true,
      tags: ['data_exfiltration', 'large_transfer'],
      metadata: { category: 'data_protection' }
    });

    logger.info('Default alert rules initialized', {
      ruleCount: this.alertRules.size
    });
  }

  // Public methods for rule management
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.info('Alert rule added', { 
      ruleId: rule.id, 
      ruleName: rule.name,
      severity: rule.severity 
    });
  }

  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      this.ruleThrottles.delete(ruleId);
      logger.info('Alert rule removed', { ruleId });
    }
    return removed;
  }

  enableAlertRule(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      logger.info('Alert rule enabled', { ruleId });
      return true;
    }
    return false;
  }

  disableAlertRule(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      logger.info('Alert rule disabled', { ruleId });
      return true;
    }
    return false;
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  getAlertingMetrics() {
    return {
      totalAlertsGenerated: this.alertsGenerated,
      activeRules: Array.from(this.alertRules.values()).filter(r => r.enabled).length,
      totalRules: this.alertRules.size,
      throttledRules: this.ruleThrottles.size,
      activeWindows: this.windowEvents.size
    };
  }

  clearThrottles(): void {
    this.ruleThrottles.clear();
    logger.info('All rule throttles cleared');
  }
}