import { DataSource } from '../types/data-source.types';
export class NetworkSecuritySource extends DataSource {
    pollingInterval;
    isCollecting = false;
    networkConfig;
    connectionPool = new Map();
    constructor(config) {
        super(config);
        this.networkConfig = this.parseNetworkConfig(config.collection.config);
    }
    async start() {
        if (this.status === 'active') {
            return;
        }
        try {
            await this.validateConfig();
            await this.initializeConnections();
            this.setStatus('active');
            this.startPolling();
        }
        catch (error) {
            this.setStatus('error');
            this.addHealthIssue('error', `Failed to start Network Security source: ${error.message}`);
            throw error;
        }
    }
    async stop() {
        if (this.status === 'inactive') {
            return;
        }
        this.stopPolling();
        await this.closeConnections();
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
            const networkEvents = await this.collectNetworkEvents();
            events.push(...networkEvents.map(event => this.convertToLogEvent(event)));
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
        const config = this.networkConfig;
        // Validate device type and vendor combination
        if (!['firewall', 'ids', 'ips', 'netflow', 'router', 'switch', 'load_balancer'].includes(config.deviceType)) {
            throw new Error('Invalid device type');
        }
        if (!['cisco', 'palo_alto', 'fortinet', 'juniper', 'checkpoint', 'snort', 'suricata', 'generic'].includes(config.vendor)) {
            throw new Error('Invalid vendor');
        }
        // Validate collection method
        if (!['syslog', 'snmp', 'api', 'file', 'netflow'].includes(config.collection.method)) {
            throw new Error('Invalid collection method');
        }
        // Validate endpoint
        if (!config.collection.endpoint) {
            throw new Error('Collection endpoint is required');
        }
        // Validate polling configuration
        if (config.polling.intervalMs < 10000) {
            throw new Error('Polling interval must be at least 10 seconds');
        }
        // Test connectivity
        const canConnect = await this.testDeviceConnection();
        if (!canConnect) {
            throw new Error(`Cannot connect to device at ${config.collection.endpoint}`);
        }
        return true;
    }
    parseNetworkConfig(config) {
        return {
            deviceType: config.deviceType || 'firewall',
            vendor: config.vendor || 'generic',
            collection: {
                method: config.collection?.method || 'syslog',
                endpoint: config.collection?.endpoint || 'localhost',
                port: config.collection?.port || 514,
                protocol: config.collection?.protocol || 'udp',
                authentication: config.collection?.authentication
            },
            parsing: {
                format: config.parsing?.format || 'syslog',
                customRegex: config.parsing?.customRegex,
                fieldMappings: config.parsing?.fieldMappings
            },
            filtering: config.filtering,
            polling: {
                intervalMs: config.polling?.intervalMs || 30000,
                maxEvents: config.polling?.maxEvents || 1000,
                lookbackMs: config.polling?.lookbackMs || 300000
            }
        };
    }
    async initializeConnections() {
        // Mock connection initialization
        const connectionKey = `${this.networkConfig.collection.endpoint}:${this.networkConfig.collection.port}`;
        this.connectionPool.set(connectionKey, {
            connected: true,
            lastUsed: new Date()
        });
    }
    async closeConnections() {
        this.connectionPool.clear();
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
        }, this.networkConfig.polling.intervalMs);
    }
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = undefined;
        }
    }
    async collectNetworkEvents() {
        switch (this.networkConfig.collection.method) {
            case 'syslog':
                return this.collectSyslogEvents();
            case 'snmp':
                return this.collectSnmpEvents();
            case 'api':
                return this.collectApiEvents();
            case 'netflow':
                return this.collectNetflowEvents();
            case 'file':
                return this.collectFileEvents();
            default:
                throw new Error(`Unsupported collection method: ${this.networkConfig.collection.method}`);
        }
    }
    async collectSyslogEvents() {
        // Mock syslog events based on device type and vendor
        const events = [];
        const numEvents = Math.floor(Math.random() * 50) + 1;
        for (let i = 0; i < numEvents; i++) {
            const event = this.generateMockEvent();
            events.push(event);
        }
        return events;
    }
    async collectSnmpEvents() {
        // Mock SNMP trap/poll events
        return this.generateMockSnmpEvents();
    }
    async collectApiEvents() {
        // Mock API events from security devices
        return this.generateMockApiEvents();
    }
    async collectNetflowEvents() {
        // Mock NetFlow/sFlow events
        return this.generateMockNetflowEvents();
    }
    async collectFileEvents() {
        // Mock file-based log collection
        return this.generateMockFileEvents();
    }
    generateMockEvent() {
        const actions = ['allow', 'deny', 'drop', 'alert', 'block', 'monitor'];
        const protocols = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'SSH', 'FTP', 'DNS'];
        const severities = ['Low', 'Medium', 'High', 'Critical'];
        const eventTypes = ['connection', 'intrusion', 'malware', 'policy_violation', 'anomaly'];
        const sourceIp = this.generateRandomIP();
        const destIp = this.generateRandomIP();
        const action = actions[Math.floor(Math.random() * actions.length)];
        const protocol = protocols[Math.floor(Math.random() * protocols.length)];
        const event = {
            id: `net-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(Date.now() - Math.random() * this.networkConfig.polling.lookbackMs),
            deviceName: `${this.networkConfig.vendor}-${this.networkConfig.deviceType}-01`,
            deviceIp: this.networkConfig.collection.endpoint,
            eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
            severity: severities[Math.floor(Math.random() * severities.length)],
            action,
            sourceIp,
            sourcePort: Math.floor(Math.random() * 65535) + 1,
            destIp,
            destPort: this.getCommonPort(),
            protocol,
            bytes: Math.floor(Math.random() * 1000000),
            packets: Math.floor(Math.random() * 1000),
            duration: Math.floor(Math.random() * 300),
            rule: `rule-${Math.floor(Math.random() * 1000)}`,
            rawLog: ''
        };
        // Add threat information for IDS/IPS events
        if (this.networkConfig.deviceType === 'ids' || this.networkConfig.deviceType === 'ips') {
            event.threat = {
                category: this.getThreatCategory(),
                name: this.getThreatName(),
                severity: event.severity,
                confidence: Math.floor(Math.random() * 100)
            };
            event.signature = `SID:${Math.floor(Math.random() * 100000)}`;
        }
        // Add geo information
        event.geo = {
            sourceCountry: this.getRandomCountry(),
            destCountry: this.getRandomCountry(),
            sourceCity: this.getRandomCity(),
            destCity: this.getRandomCity()
        };
        // Add application information for some events
        if (Math.random() > 0.5) {
            event.application = this.getRandomApplication();
        }
        // Generate raw log based on vendor format
        event.rawLog = this.generateRawLog(event);
        return event;
    }
    async generateMockSnmpEvents() {
        // Simplified SNMP event generation
        const events = [];
        const numEvents = Math.floor(Math.random() * 10) + 1;
        for (let i = 0; i < numEvents; i++) {
            events.push(this.generateMockEvent());
        }
        return events;
    }
    async generateMockApiEvents() {
        // Simplified API event generation
        const events = [];
        const numEvents = Math.floor(Math.random() * 20) + 1;
        for (let i = 0; i < numEvents; i++) {
            events.push(this.generateMockEvent());
        }
        return events;
    }
    async generateMockNetflowEvents() {
        // Simplified NetFlow event generation
        const events = [];
        const numEvents = Math.floor(Math.random() * 100) + 10; // NetFlow typically has high volume
        for (let i = 0; i < numEvents; i++) {
            const event = this.generateMockEvent();
            event.eventType = 'flow';
            event.action = 'monitor';
            events.push(event);
        }
        return events;
    }
    async generateMockFileEvents() {
        // Simplified file-based event generation
        const events = [];
        const numEvents = Math.floor(Math.random() * 30) + 1;
        for (let i = 0; i < numEvents; i++) {
            events.push(this.generateMockEvent());
        }
        return events;
    }
    generateRandomIP() {
        // Generate more realistic IP ranges
        const ranges = [
            () => `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            () => `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            () => `172.${16 + Math.floor(Math.random() * 16)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            () => `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        ];
        const range = ranges[Math.floor(Math.random() * ranges.length)];
        return range();
    }
    getCommonPort() {
        const commonPorts = [80, 443, 22, 21, 25, 53, 110, 143, 993, 995, 3389, 5432, 3306, 1433];
        return commonPorts[Math.floor(Math.random() * commonPorts.length)];
    }
    getThreatCategory() {
        const categories = [
            'Malware', 'Trojan', 'Botnet', 'Phishing', 'Exploit', 'Backdoor',
            'Spyware', 'Adware', 'Ransomware', 'Command and Control', 'Data Exfiltration'
        ];
        return categories[Math.floor(Math.random() * categories.length)];
    }
    getThreatName() {
        const names = [
            'Zeus Banking Trojan', 'Conficker Worm', 'SQL Injection Attack',
            'Cross-Site Scripting', 'DDoS Attack', 'Port Scan',
            'Brute Force Login', 'Suspicious File Download', 'Data Leak'
        ];
        return names[Math.floor(Math.random() * names.length)];
    }
    getRandomCountry() {
        const countries = ['US', 'CN', 'RU', 'DE', 'GB', 'FR', 'JP', 'KR', 'BR', 'IN'];
        return countries[Math.floor(Math.random() * countries.length)];
    }
    getRandomCity() {
        const cities = [
            'New York', 'London', 'Tokyo', 'Beijing', 'Moscow', 'Berlin',
            'Paris', 'Seoul', 'São Paulo', 'Mumbai'
        ];
        return cities[Math.floor(Math.random() * cities.length)];
    }
    getRandomApplication() {
        const apps = [
            'HTTP', 'HTTPS', 'SSH', 'FTP', 'SMTP', 'DNS', 'Skype',
            'BitTorrent', 'YouTube', 'Facebook', 'WhatsApp', 'Zoom'
        ];
        return apps[Math.floor(Math.random() * apps.length)];
    }
    generateRawLog(event) {
        switch (this.networkConfig.vendor) {
            case 'cisco':
                return this.generateCiscoLog(event);
            case 'palo_alto':
                return this.generatePaloAltoLog(event);
            case 'fortinet':
                return this.generateFortinetLog(event);
            case 'checkpoint':
                return this.generateCheckpointLog(event);
            case 'snort':
            case 'suricata':
                return this.generateSnortLog(event);
            default:
                return this.generateGenericLog(event);
        }
    }
    generateCiscoLog(event) {
        return `%ASA-${this.getSeverityLevel(event.severity)}-${event.rule}: ${event.action.toUpperCase()} ${event.protocol} src ${event.sourceIp}:${event.sourcePort} dst ${event.destIp}:${event.destPort}`;
    }
    generatePaloAltoLog(event) {
        const fields = [
            '1', event.timestamp.toISOString(), event.deviceName, 'TRAFFIC',
            event.action.toUpperCase(), event.sourceIp, event.destIp,
            event.sourcePort?.toString() || '', event.destPort?.toString() || '',
            event.protocol, event.application || '', event.bytes?.toString() || ''
        ];
        return fields.join(',');
    }
    generateFortinetLog(event) {
        return `date=${event.timestamp.toISOString().split('T')[0]} time=${event.timestamp.toTimeString().split(' ')[0]} devname="${event.deviceName}" devid="FG100D" logid="0000000013" type="traffic" subtype="forward" level="${event.severity.toLowerCase()}" vd="root" eventtime=${Math.floor(event.timestamp.getTime() / 1000)} srcip=${event.sourceIp} srcport=${event.sourcePort} srcintf="port1" dstip=${event.destIp} dstport=${event.destPort} dstintf="port2" policyid=1 sessionid=123456 proto=6 action="${event.action}" policyname="policy1" service="${event.application || 'tcp'}" sentbyte=${event.bytes} rcvdbyte=${event.bytes}`;
    }
    generateCheckpointLog(event) {
        return `[${event.timestamp.toISOString()}] ${event.deviceName} Log: Action="${event.action}"; Src=${event.sourceIp}; Dst=${event.destIp}; Proto=${event.protocol}; Rule="${event.rule}"; Service_id="${event.destPort}";`;
    }
    generateSnortLog(event) {
        if (event.threat) {
            return `[**] [${event.signature}] ${event.threat.name} [**] [Classification: ${event.threat.category}] [Priority: ${this.getSeverityLevel(event.severity)}] ${event.timestamp.toISOString()} ${event.sourceIp}:${event.sourcePort} -> ${event.destIp}:${event.destPort}`;
        }
        return `${event.timestamp.toISOString()} ${event.sourceIp}:${event.sourcePort} -> ${event.destIp}:${event.destPort} ${event.protocol}`;
    }
    generateGenericLog(event) {
        return `${event.timestamp.toISOString()} ${event.deviceName} ${event.severity} ${event.action} ${event.sourceIp}:${event.sourcePort} -> ${event.destIp}:${event.destPort} ${event.protocol}`;
    }
    getSeverityLevel(severity) {
        const levelMap = {
            'Low': 6,
            'Medium': 4,
            'High': 2,
            'Critical': 1
        };
        return levelMap[severity] || 4;
    }
    async testDeviceConnection() {
        // Mock connection test
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            return Math.random() > 0.1; // 90% success rate
        }
        catch {
            return false;
        }
    }
    convertToLogEvent(networkEvent) {
        return {
            id: networkEvent.id,
            timestamp: networkEvent.timestamp,
            source: {
                type: 'network_security',
                name: `${networkEvent.deviceName}`,
                version: '1.0'
            },
            event: {
                id: networkEvent.signature || networkEvent.rule || 'unknown',
                category: 'network',
                type: networkEvent.eventType,
                severity: this.mapSeverityToNumber(networkEvent.severity),
                action: networkEvent.action,
                outcome: networkEvent.action === 'allow' ? 'success' : 'failure'
            },
            host: {
                name: networkEvent.deviceName,
                hostname: networkEvent.deviceName,
                ip: networkEvent.deviceIp
            },
            source_ip: networkEvent.sourceIp,
            destination: {
                ip: networkEvent.destIp,
                port: networkEvent.destPort
            },
            network: {
                protocol: networkEvent.protocol.toLowerCase(),
                bytes: networkEvent.bytes,
                packets: networkEvent.packets,
                duration: networkEvent.duration
            },
            threat: networkEvent.threat ? {
                framework: 'custom',
                technique: {
                    name: networkEvent.threat.name,
                    id: networkEvent.signature || 'unknown'
                }
            } : undefined,
            message: this.generateNetworkEventMessage(networkEvent),
            labels: {
                device_type: this.networkConfig.deviceType,
                vendor: this.networkConfig.vendor,
                rule: networkEvent.rule,
                application: networkEvent.application,
                source_country: networkEvent.geo?.sourceCountry,
                dest_country: networkEvent.geo?.destCountry
            },
            metadata: {
                raw: networkEvent.rawLog,
                parsed: {
                    geo: networkEvent.geo,
                    threat: networkEvent.threat,
                    application: networkEvent.application,
                    user: networkEvent.user
                },
                enriched: {}
            }
        };
    }
    mapSeverityToNumber(severity) {
        const severityMap = {
            'Low': 4,
            'Medium': 3,
            'High': 2,
            'Critical': 1
        };
        return severityMap[severity] || 3;
    }
    generateNetworkEventMessage(event) {
        const action = event.action.toUpperCase();
        const threat = event.threat ? ` (${event.threat.name})` : '';
        return `${this.networkConfig.deviceType.toUpperCase()} ${action}: ${event.sourceIp}:${event.sourcePort} -> ${event.destIp}:${event.destPort} ${event.protocol}${threat}`;
    }
    updateCollectionMetrics(eventCount) {
        const metrics = this.getMetrics();
        const health = this.getHealth();
        metrics.statistics.totalEvents += eventCount;
        metrics.statistics.eventsToday += eventCount;
        metrics.statistics.lastEventTime = eventCount > 0 ? new Date() : metrics.statistics.lastEventTime;
        health.metrics.eventsPerSecond = eventCount / (this.networkConfig.polling.intervalMs / 1000);
        health.lastCheck = new Date();
    }
}
export default NetworkSecuritySource;
//# sourceMappingURL=network-security-source.js.map