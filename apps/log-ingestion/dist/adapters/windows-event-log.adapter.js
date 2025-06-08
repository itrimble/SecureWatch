import { EventEmitter } from 'events';
import { LogSource } from '../types/log-event.types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
export class WindowsEventLogAdapter extends EventEmitter {
    config;
    producerPool;
    bufferManager;
    metrics;
    isRunning = false;
    pollIntervals = new Map();
    constructor(config, producerPool, bufferManager, metrics) {
        super();
        this.config = config;
        this.producerPool = producerPool;
        this.bufferManager = bufferManager;
        this.metrics = metrics;
    }
    async start() {
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
    async stop() {
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
    startChannelPolling(server, channel) {
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
    async pollEvents(server, channel) {
        try {
            const events = await this.queryWindowsEvents(server, channel);
            if (events.length > 0) {
                logger.debug(`Polled ${events.length} events from ${server}:${channel}`);
                await this.processEvents(events, server, channel);
            }
        }
        catch (error) {
            logger.error(`Error polling events from ${server}:${channel}`, error);
            this.metrics.incrementCounter('windows_event_log.poll_errors', {
                server,
                channel,
            });
        }
    }
    async queryWindowsEvents(server, channel) {
        // In a real implementation, this would use Windows APIs or WMI
        // For now, we'll simulate with mock data
        const mockEvents = [];
        // Simulate variable number of events
        const eventCount = Math.floor(Math.random() * 100);
        for (let i = 0; i < eventCount; i++) {
            const event = {
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
    shouldFilterEvent(event) {
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
                const hasKeyword = filter.keywords.some(keyword => event.keywords.includes(keyword));
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
    async processEvents(events, server, channel) {
        const rawEvents = [];
        for (const event of events) {
            const rawEvent = {
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
        this.metrics.incrementCounter('windows_event_log.events_received', { server, channel }, events.length);
        // Buffer events for batch processing
        await this.bufferManager.addEvents(rawEvents);
        // Process batches if ready
        const batches = await this.bufferManager.getBatches(this.config.batchSize);
        for (const batch of batches) {
            await this.sendToKafka(batch);
        }
    }
    async sendToKafka(events) {
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
            this.metrics.incrementCounter('windows_event_log.events_sent', {}, events.length);
            logger.debug(`Sent ${events.length} events to Kafka`);
        }
        catch (error) {
            logger.error('Error sending events to Kafka', error);
            this.metrics.incrementCounter('windows_event_log.kafka_errors');
            // Re-queue events for retry
            await this.bufferManager.requeueEvents(events);
        }
    }
    // Method to handle real Windows Event Log subscription (Windows only)
    async subscribeToWindowsEvents(server, channel) {
        // This would use Windows Event Log API or PowerShell remoting
        // Example implementation would use node-windows or edge-js
        // For production, consider using:
        // - Windows Event Forwarding (WEF)
        // - WMI Event Subscriptions
        // - PowerShell Remoting
        // - Windows Admin Center API
    }
    // Get adapter statistics
    getStats() {
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
//# sourceMappingURL=windows-event-log.adapter.js.map