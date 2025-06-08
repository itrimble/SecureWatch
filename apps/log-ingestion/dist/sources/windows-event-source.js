import { DataSource } from '../types/data-source.types';
export class WindowsEventSource extends DataSource {
    pollingInterval;
    isCollecting = false;
    lastBookmark;
    windowsConfig;
    constructor(config) {
        super(config);
        this.windowsConfig = this.parseWindowsConfig(config.collection.config);
    }
    async start() {
        if (this.status === 'active') {
            return;
        }
        try {
            await this.validateConfig();
            this.setStatus('active');
            this.startPolling();
        }
        catch (error) {
            this.setStatus('error');
            this.addHealthIssue('error', `Failed to start Windows Event source: ${error.message}`);
            throw error;
        }
    }
    async stop() {
        if (this.status === 'inactive') {
            return;
        }
        this.stopPolling();
        this.setStatus('inactive');
    }
    async restart() {
        await this.stop();
        await this.start();
    }
    async collect() {
        if (this.isCollecting) {
            return [];
        }
        this.isCollecting = true;
        const events = [];
        try {
            for (const server of this.windowsConfig.servers) {
                const serverEvents = await this.collectFromServer(server);
                events.push(...serverEvents);
            }
            // Update metrics
            this.updateCollectionMetrics(events.length);
        }
        catch (error) {
            this.addHealthIssue('error', `Collection failed: ${error.message}`);
            throw error;
        }
        finally {
            this.isCollecting = false;
        }
        return events;
    }
    async validateConfig() {
        const config = this.windowsConfig;
        // Validate servers
        if (!config.servers || config.servers.length === 0) {
            throw new Error('At least one server must be configured');
        }
        // Validate channels
        if (!config.channels || config.channels.length === 0) {
            throw new Error('At least one event log channel must be specified');
        }
        // Validate polling configuration
        if (!config.polling.intervalMs || config.polling.intervalMs < 1000) {
            throw new Error('Polling interval must be at least 1000ms');
        }
        if (!config.polling.maxEvents || config.polling.maxEvents < 1) {
            throw new Error('Max events must be at least 1');
        }
        // Validate format configuration
        if (!config.formats.primary) {
            throw new Error('Primary format must be specified');
        }
        // Test connection to servers (mock implementation)
        for (const server of config.servers) {
            const canConnect = await this.testServerConnection(server);
            if (!canConnect) {
                throw new Error(`Cannot connect to server: ${server.hostname}`);
            }
        }
        return true;
    }
    parseWindowsConfig(config) {
        return {
            servers: config.servers || [{ hostname: 'localhost' }],
            channels: config.channels || ['Application', 'System', 'Security'],
            eventIds: config.eventIds,
            levels: config.levels || ['Critical', 'Error', 'Warning', 'Information'],
            providers: config.providers,
            keywords: config.keywords,
            timeRange: config.timeRange,
            polling: {
                intervalMs: config.polling?.intervalMs || 30000,
                maxEvents: config.polling?.maxEvents || 1000,
                bookmark: config.polling?.bookmark
            },
            formats: {
                primary: config.formats?.primary || 'json',
                fallback: config.formats?.fallback || ['xml', 'evtx']
            }
        };
    }
    startPolling() {
        this.pollingInterval = setInterval(async () => {
            try {
                const events = await this.collect();
                if (events.length > 0) {
                    this.emit('events', events);
                }
            }
            catch (error) {
                this.addHealthIssue('error', `Polling error: ${error.message}`);
            }
        }, this.windowsConfig.polling.intervalMs);
    }
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = undefined;
        }
    }
    async collectFromServer(server) {
        const events = [];
        try {
            for (const channel of this.windowsConfig.channels) {
                const channelEvents = await this.collectFromChannel(server, channel);
                events.push(...channelEvents);
            }
        }
        catch (error) {
            this.addHealthIssue('warning', `Failed to collect from server ${server.hostname}: ${error.message}`);
        }
        return events;
    }
    async collectFromChannel(server, channel) {
        // Mock implementation - in real implementation, this would use Windows Event Log APIs
        const mockEvents = await this.generateMockWindowsEvents(server.hostname, channel);
        return mockEvents.map(event => this.convertToLogEvent(event));
    }
    async generateMockWindowsEvents(hostname, channel) {
        // Mock data generation for demonstration
        const eventIds = this.windowsConfig.eventIds || [4624, 4625, 4648, 4672, 1074, 7040];
        const levels = ['Information', 'Warning', 'Error', 'Critical'];
        const providers = ['Microsoft-Windows-Security-Auditing', 'Service Control Manager', 'System'];
        const events = [];
        const numEvents = Math.floor(Math.random() * 10) + 1;
        for (let i = 0; i < numEvents; i++) {
            const eventId = eventIds[Math.floor(Math.random() * eventIds.length)];
            const level = levels[Math.floor(Math.random() * levels.length)];
            const provider = providers[Math.floor(Math.random() * providers.length)];
            const event = {
                eventId,
                level,
                provider,
                channel,
                computer: hostname,
                timeCreated: new Date(Date.now() - Math.random() * 3600000), // Last hour
                keywords: this.generateKeywords(eventId),
                data: this.generateEventData(eventId),
                message: this.generateEventMessage(eventId)
            };
            // Add format-specific data based on primary format
            switch (this.windowsConfig.formats.primary) {
                case 'xml':
                    event.rawXml = this.convertToXML(event);
                    break;
                case 'json':
                    event.rawJson = JSON.stringify(event);
                    break;
                case 'evtx':
                    // EVTX would be binary format, represented as base64 string in real implementation
                    break;
            }
            events.push(event);
        }
        return events;
    }
    generateKeywords(eventId) {
        const keywordMap = {
            4624: ['Audit Success', 'Logon'],
            4625: ['Audit Failure', 'Logon'],
            4648: ['Audit Success', 'Logon', 'Process and Thread Management'],
            4672: ['Audit Success', 'Privilege Use'],
            1074: ['Classic'],
            7040: ['Classic']
        };
        return keywordMap[eventId] || ['Classic'];
    }
    generateEventData(eventId) {
        const dataMap = {
            4624: () => ({
                SubjectUserSid: 'S-1-5-18',
                SubjectUserName: 'SYSTEM',
                SubjectDomainName: 'NT AUTHORITY',
                TargetUserSid: 'S-1-5-21-1234567890-1234567890-1234567890-1001',
                TargetUserName: 'user123',
                TargetDomainName: 'WORKGROUP',
                LogonType: '2',
                LogonProcessName: 'User32',
                AuthenticationPackageName: 'Negotiate',
                WorkstationName: 'DESKTOP-ABC123',
                LogonGuid: '{12345678-1234-1234-1234-123456789012}',
                ProcessId: '0x1234',
                ProcessName: 'C:\\Windows\\System32\\winlogon.exe'
            }),
            4625: () => ({
                SubjectUserSid: 'S-1-0-0',
                SubjectUserName: '-',
                SubjectDomainName: '-',
                TargetUserName: 'administrator',
                TargetDomainName: 'WORKGROUP',
                Status: '0xC000006D',
                FailureReason: '%%2313',
                SubStatus: '0xC0000064',
                LogonType: '2',
                LogonProcessName: 'User32',
                AuthenticationPackageName: 'Negotiate',
                WorkstationName: 'DESKTOP-ABC123',
                ProcessId: '0x1234',
                ProcessName: 'C:\\Windows\\System32\\winlogon.exe'
            }),
            7040: () => ({
                param1: 'Windows Update',
                param2: 'auto start',
                param3: 'demand start'
            })
        };
        const generator = dataMap[eventId];
        return generator ? generator() : { eventId, timestamp: new Date().toISOString() };
    }
    generateEventMessage(eventId) {
        const messageMap = {
            4624: 'An account was successfully logged on.',
            4625: 'An account failed to log on.',
            4648: 'A logon was attempted using explicit credentials.',
            4672: 'Special privileges assigned to new logon.',
            1074: 'The system has been shut down by a user or process.',
            7040: 'The start type of a service was changed.'
        };
        return messageMap[eventId] || `Windows Event ${eventId} occurred.`;
    }
    convertToXML(event) {
        return `
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="${event.provider}" />
    <EventID>${event.eventId}</EventID>
    <Level>${this.getLevelNumber(event.level)}</Level>
    <Task>0</Task>
    <Keywords>${event.keywords.join(',')}</Keywords>
    <TimeCreated SystemTime="${event.timeCreated.toISOString()}" />
    <Computer>${event.computer}</Computer>
    <Channel>${event.channel}</Channel>
  </System>
  <EventData>
    ${Object.entries(event.data).map(([key, value]) => `<Data Name="${key}">${value}</Data>`).join('\n    ')}
  </EventData>
</Event>`.trim();
    }
    getLevelNumber(level) {
        const levelMap = {
            'Critical': 1,
            'Error': 2,
            'Warning': 3,
            'Information': 4,
            'Verbose': 5
        };
        return levelMap[level] || 4;
    }
    convertToLogEvent(winEvent) {
        return {
            id: `${winEvent.computer}-${winEvent.channel}-${winEvent.eventId}-${winEvent.timeCreated.getTime()}`,
            timestamp: winEvent.timeCreated,
            source: {
                type: 'windows_event',
                name: `${winEvent.computer}:${winEvent.channel}`,
                version: '1.0'
            },
            event: {
                id: winEvent.eventId.toString(),
                category: this.mapEventCategory(winEvent.eventId),
                type: winEvent.level.toLowerCase(),
                severity: this.mapSeverity(winEvent.level),
                action: this.mapEventAction(winEvent.eventId),
                outcome: winEvent.level === 'Critical' || winEvent.level === 'Error' ? 'failure' : 'success'
            },
            host: {
                name: winEvent.computer,
                hostname: winEvent.computer,
                os: {
                    family: 'windows',
                    platform: 'windows'
                }
            },
            message: winEvent.message,
            labels: {
                provider: winEvent.provider,
                channel: winEvent.channel,
                keywords: winEvent.keywords.join(',')
            },
            metadata: {
                raw: {
                    xml: winEvent.rawXml,
                    json: winEvent.rawJson
                },
                parsed: winEvent.data,
                enriched: {}
            }
        };
    }
    mapEventCategory(eventId) {
        const categoryMap = {
            4624: 'authentication',
            4625: 'authentication',
            4648: 'authentication',
            4672: 'iam',
            1074: 'host',
            7040: 'configuration'
        };
        return categoryMap[eventId] || 'system';
    }
    mapSeverity(level) {
        const severityMap = {
            'Critical': 1,
            'Error': 2,
            'Warning': 3,
            'Information': 4,
            'Verbose': 5
        };
        return severityMap[level] || 4;
    }
    mapEventAction(eventId) {
        const actionMap = {
            4624: 'logon-success',
            4625: 'logon-failure',
            4648: 'explicit-logon',
            4672: 'privilege-assignment',
            1074: 'shutdown',
            7040: 'service-config-change'
        };
        return actionMap[eventId] || 'unknown';
    }
    async testServerConnection(server) {
        // Mock connection test - in real implementation, would test WMI/Event Log API connectivity
        try {
            // Simulate connection test delay
            await new Promise(resolve => setTimeout(resolve, 100));
            // Mock: 95% success rate for testing
            return Math.random() > 0.05;
        }
        catch {
            return false;
        }
    }
    updateCollectionMetrics(eventCount) {
        const now = new Date();
        const metrics = this.getMetrics();
        // Update statistics
        metrics.statistics.totalEvents += eventCount;
        metrics.statistics.eventsToday += eventCount; // Simplified - should check date
        metrics.statistics.lastEventTime = eventCount > 0 ? now : metrics.statistics.lastEventTime;
        // Update health metrics
        const health = this.getHealth();
        health.metrics.eventsPerSecond = eventCount / (this.windowsConfig.polling.intervalMs / 1000);
        health.lastCheck = now;
    }
}
export default WindowsEventSource;
//# sourceMappingURL=windows-event-source.js.map