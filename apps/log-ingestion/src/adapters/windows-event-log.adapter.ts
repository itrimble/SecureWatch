import { EventEmitter } from 'events';
import { RawLogEvent, LogSource, WindowsEventLog } from '../types/log-event.types';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

interface WindowsEventLogConfig {
  channels: string[];
  servers: string[];
  batchSize: number;
  pollInterval: number;
  includeEventData: boolean;
  filters?: EventFilter[];
}

interface EventFilter {
  eventIds?: number[];
  levels?: number[];
  providers?: string[];
  keywords?: string[];
}

export class WindowsEventLogAdapter extends EventEmitter {
  private config: WindowsEventLogConfig;
  private producerPool: KafkaProducerPool;
  private bufferManager: BufferManager;
  private metrics: MetricsCollector;
  private isRunning: boolean = false;
  private pollIntervals: Map<string, NodeJS.Timer> = new Map();

  constructor(
    config: WindowsEventLogConfig,
    producerPool: KafkaProducerPool,
    bufferManager: BufferManager,
    metrics: MetricsCollector
  ) {
    super();
    this.config = config;
    this.producerPool = producerPool;
    this.bufferManager = bufferManager;
    this.metrics = metrics;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Windows Event Log adapter is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Windows Event Log adapter', {
      channels: this.config.channels,
      servers: this.config.servers,
    });

    // Start polling for each server and channel combination
    for (const server of this.config.servers) {
      for (const channel of this.config.channels) {
        this.startChannelPolling(server, channel);
      }
    }

    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping Windows Event Log adapter');

    // Clear all polling intervals
    for (const [key, interval] of this.pollIntervals) {
      clearInterval(interval);
    }
    this.pollIntervals.clear();

    // Flush any remaining buffered events
    await this.bufferManager.flush();

    this.emit('stopped');
  }

  private startChannelPolling(server: string, channel: string): void {
    const key = `${server}:${channel}`;
    
    // Initial poll
    this.pollEvents(server, channel);

    // Set up interval polling
    const interval = setInterval(() => {
      if (this.isRunning) {
        this.pollEvents(server, channel);
      }
    }, this.config.pollInterval);

    this.pollIntervals.set(key, interval);
  }

  private async pollEvents(server: string, channel: string): Promise<void> {
    try {
      const events = await this.queryWindowsEvents(server, channel);
      
      if (events.length > 0) {
        logger.debug(`Polled ${events.length} events from ${server}:${channel}`);
        await this.processEvents(events, server, channel);
      }
    } catch (error) {
      logger.error(`Error polling events from ${server}:${channel}`, error);
      this.metrics.incrementCounter('windows_event_log.poll_errors', {
        server,
        channel,
      });
    }
  }

  private async queryWindowsEvents(
    server: string,
    channel: string
  ): Promise<WindowsEventLog[]> {
    // In a real implementation, this would use Windows APIs or WMI
    // For now, we'll simulate with mock data
    const mockEvents: WindowsEventLog[] = [];
    
    // Simulate variable number of events
    const eventCount = Math.floor(Math.random() * 100);
    
    for (let i = 0; i < eventCount; i++) {
      const event: WindowsEventLog = {
        eventId: Math.floor(Math.random() * 10000),
        eventRecordId: Date.now() + i,
        level: Math.floor(Math.random() * 5) + 1,
        task: Math.floor(Math.random() * 100),
        opcode: Math.floor(Math.random() * 10),
        keywords: ['Security', 'Audit'],
        channel,
        provider: {
          name: 'Microsoft-Windows-Security-Auditing',
          guid: '54849625-5478-4994-a5ba-3e3b0328c30d',
        },
        computer: server,
        security: {
          userId: `S-1-5-21-${Math.random().toString().slice(2, 12)}`,
        },
        eventData: {
          SubjectUserName: 'testuser',
          SubjectDomainName: 'DOMAIN',
          TargetUserName: 'targetuser',
          LogonType: '3',
          IpAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        },
      };

      // Apply filters if configured
      if (this.shouldFilterEvent(event)) {
        continue;
      }

      mockEvents.push(event);
    }

    return mockEvents;
  }

  private shouldFilterEvent(event: WindowsEventLog): boolean {
    if (!this.config.filters || this.config.filters.length === 0) {
      return false;
    }

    for (const filter of this.config.filters) {
      // Check event ID filter
      if (filter.eventIds && !filter.eventIds.includes(event.eventId)) {
        continue;
      }

      // Check level filter
      if (filter.levels && !filter.levels.includes(event.level)) {
        continue;
      }

      // Check provider filter
      if (filter.providers && !filter.providers.includes(event.provider.name)) {
        continue;
      }

      // Check keywords filter
      if (filter.keywords) {
        const hasKeyword = filter.keywords.some(keyword => 
          event.keywords.includes(keyword)
        );
        if (!hasKeyword) {
          continue;
        }
      }

      // Event matches this filter, don't filter it out
      return false;
    }

    // Event doesn't match any filter, filter it out
    return true;
  }

  private async processEvents(
    events: WindowsEventLog[],
    server: string,
    channel: string
  ): Promise<void> {
    const rawEvents: RawLogEvent[] = [];

    for (const event of events) {
      const rawEvent: RawLogEvent = {
        id: uuidv4(),
        source: LogSource.WINDOWS_EVENT_LOG,
        timestamp: new Date(),
        rawData: JSON.stringify(event),
        metadata: {
          ingestionId: uuidv4(),
          ingestionTime: new Date(),
          collector: 'windows-event-log-adapter',
          collectorVersion: '1.0.0',
          organizationId: process.env.ORGANIZATION_ID || 'default',
          environment: process.env.ENVIRONMENT || 'production',
          retention: {
            tier: 'hot',
            days: 7,
            compressed: false,
            encrypted: false,
          },
        },
        receivedAt: new Date(),
      };

      rawEvents.push(rawEvent);
    }

    // Update metrics
    this.metrics.incrementCounter('windows_event_log.events_received', 
      { server, channel },
      events.length
    );

    // Buffer events for batch processing
    await this.bufferManager.addEvents(rawEvents);

    // Process batches if ready
    const batches = await this.bufferManager.getBatches(this.config.batchSize);
    
    for (const batch of batches) {
      await this.sendToKafka(batch);
    }
  }

  private async sendToKafka(events: RawLogEvent[]): Promise<void> {
    try {
      const messages = events.map(event => ({
        key: event.metadata.organizationId,
        value: JSON.stringify(event),
        timestamp: event.timestamp.toISOString(),
        headers: {
          source: LogSource.WINDOWS_EVENT_LOG,
          ingestionId: event.metadata.ingestionId,
        },
      }));

      await this.producerPool.sendBatch('log-events-raw', messages);

      this.metrics.incrementCounter('windows_event_log.events_sent', 
        {},
        events.length
      );

      logger.debug(`Sent ${events.length} events to Kafka`);
    } catch (error) {
      logger.error('Error sending events to Kafka', error);
      this.metrics.incrementCounter('windows_event_log.kafka_errors');
      
      // Re-queue events for retry
      await this.bufferManager.requeueEvents(events);
    }
  }

  // Method to handle real Windows Event Log subscription (Windows only)
  private async subscribeToWindowsEvents(
    server: string,
    channel: string
  ): Promise<void> {
    // This would use Windows Event Log API or PowerShell remoting
    // Example implementation would use node-windows or edge-js
    
    // For production, consider using:
    // - Windows Event Forwarding (WEF)
    // - WMI Event Subscriptions
    // - PowerShell Remoting
    // - Windows Admin Center API
  }

  // Get adapter statistics
  getStats(): object {
    return {
      isRunning: this.isRunning,
      channels: this.config.channels,
      servers: this.config.servers,
      activePollers: this.pollIntervals.size,
      bufferSize: this.bufferManager.getSize(),
      metrics: this.metrics.getMetrics(),
    };
  }
}