// Generic Syslog Parser
// Fallback parser for standard syslog messages with JSON payload support
export class GenericSyslogParser {
    id = 'generic-syslog';
    name = 'Generic Syslog Parser';
    vendor = 'Generic';
    logSource = 'syslog';
    version = '1.0.0';
    format = 'syslog';
    category = 'network';
    priority = 10; // Low priority - fallback parser
    enabled = true;
    // Syslog facility mappings
    facilities = {
        0: 'kernel',
        1: 'user',
        2: 'mail',
        3: 'daemon',
        4: 'auth',
        5: 'syslog',
        6: 'lpr',
        7: 'news',
        8: 'uucp',
        9: 'cron',
        10: 'authpriv',
        11: 'ftp',
        16: 'local0',
        17: 'local1',
        18: 'local2',
        19: 'local3',
        20: 'local4',
        21: 'local5',
        22: 'local6',
        23: 'local7'
    };
    // Syslog severity mappings
    severities = {
        0: { name: 'emergency', level: 'critical' },
        1: { name: 'alert', level: 'critical' },
        2: { name: 'critical', level: 'critical' },
        3: { name: 'error', level: 'high' },
        4: { name: 'warning', level: 'medium' },
        5: { name: 'notice', level: 'medium' },
        6: { name: 'info', level: 'low' },
        7: { name: 'debug', level: 'low' }
    };
    validate(rawLog) {
        // RFC 3164 or RFC 5424 format detection
        // RFC 3164: <PRI>MMM DD HH:MM:SS hostname tag: message
        // RFC 5424: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID [SD] MSG
        const rfc3164Pattern = /^<\d+>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+/;
        const rfc5424Pattern = /^<\d+>\d+\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        const simplePattern = /^<\d+>/;
        return rfc3164Pattern.test(rawLog) || rfc5424Pattern.test(rawLog) || simplePattern.test(rawLog);
    }
    parse(rawLog) {
        try {
            const parsed = this.parseSyslogMessage(rawLog);
            if (!parsed)
                return null;
            // Check for JSON payload
            let jsonPayload = null;
            if (parsed.message.includes('JSON:')) {
                jsonPayload = this.extractJSONPayload(parsed.message);
            }
            const event = {
                timestamp: parsed.timestamp || new Date(),
                source: parsed.hostname || 'unknown',
                category: this.getCategoryFromFacility(parsed.facility),
                action: this.getActionFromMessage(parsed.message),
                outcome: this.getOutcomeFromMessage(parsed.message),
                severity: this.severities[parsed.severity]?.level || 'low',
                rawData: rawLog,
                custom: {
                    priority: parsed.priority,
                    facility: parsed.facility,
                    facilityName: this.facilities[parsed.facility] || 'unknown',
                    severity: parsed.severity,
                    severityName: this.severities[parsed.severity]?.name || 'unknown',
                    tag: parsed.tag,
                    pid: parsed.pid,
                    message: parsed.message,
                    jsonPayload: jsonPayload
                }
            };
            // Add device information
            event.device = this.extractDeviceInfo(parsed.hostname);
            // Add network information if available in JSON payload
            if (jsonPayload) {
                event.network = this.extractNetworkInfoFromJSON(jsonPayload);
                // Merge JSON payload fields into custom
                Object.assign(event.custom, jsonPayload);
            }
            return event;
        }
        catch (error) {
            console.error('Generic syslog parsing error:', error);
            return null;
        }
    }
    normalize(event) {
        const facility = event.custom?.facility;
        const severity = event.custom?.severity;
        const normalized = {
            '@timestamp': event.timestamp.toISOString(),
            'event.kind': 'event',
            'event.category': this.mapToECSCategory(event.category),
            'event.type': this.mapToECSType(event.action),
            'event.outcome': event.outcome,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'event.provider': 'syslog',
            'event.dataset': `syslog.${this.facilities[facility] || 'generic'}`,
            'event.module': 'syslog',
            // Host information
            'host.name': event.source,
            'host.hostname': event.source,
            // Syslog-specific fields
            'syslog.facility.code': facility,
            'syslog.facility.name': this.facilities[facility] || 'unknown',
            'syslog.severity.code': severity,
            'syslog.severity.name': this.severities[severity]?.name || 'unknown',
            'syslog.priority': event.custom?.priority,
            // Process information if available
            ...(event.custom?.tag && {
                'process.name': event.custom.tag,
                'process.pid': event.custom.pid
            }),
            // Network information
            ...(event.network && {
                'source.ip': event.network.sourceIp,
                'source.port': event.network.sourcePort,
                'destination.ip': event.network.destinationIp,
                'destination.port': event.network.destinationPort,
                'network.protocol': event.network.protocol
            }),
            // Message content
            'message': event.custom?.message,
            // SecureWatch metadata
            'securewatch.parser.id': this.id,
            'securewatch.parser.version': this.version,
            'securewatch.parser.name': this.name,
            'securewatch.confidence': this.calculateConfidence(event),
            'securewatch.severity': event.severity,
            'securewatch.tags': this.getTagsForEvent(facility, event.custom?.tag),
            // Labels for easier querying
            labels: {
                'facility': this.facilities[facility] || 'unknown',
                'severity': this.severities[severity]?.name || 'unknown',
                'log_source': 'syslog',
                'parser': this.id
            },
            // Related fields for correlation
            related: {
                hosts: [event.source]
            }
        };
        // Add any additional fields from JSON payload
        if (event.custom?.jsonPayload) {
            Object.keys(event.custom.jsonPayload).forEach(key => {
                if (!normalized[key] && key !== 'message') {
                    normalized[`syslog.${key}`] = event.custom.jsonPayload[key];
                }
            });
        }
        return normalized;
    }
    parseSyslogMessage(rawLog) {
        // Extract priority
        const priorityMatch = rawLog.match(/^<(\d+)>/);
        if (!priorityMatch)
            return null;
        const priority = parseInt(priorityMatch[1], 10);
        const facility = Math.floor(priority / 8);
        const severity = priority % 8;
        // Remove priority from message
        const withoutPriority = rawLog.substring(priorityMatch[0].length);
        // Try RFC 5424 format first
        const rfc5424Match = withoutPriority.match(/^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(?:\[([^\]]+)\]\s+)?(.*)$/);
        if (rfc5424Match) {
            const [, version, timestamp, hostname, appName, procId, msgId, structuredData, message] = rfc5424Match;
            return {
                priority,
                facility,
                severity,
                timestamp: this.parseTimestamp(timestamp),
                hostname: hostname === '-' ? null : hostname,
                tag: appName === '-' ? null : appName,
                pid: procId === '-' ? null : parseInt(procId, 10),
                message: message || ''
            };
        }
        // Try RFC 3164 format
        const rfc3164Match = withoutPriority.match(/^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^:\[\s]+)(?:\[(\d+)\])?:\s*(.*)$/);
        if (rfc3164Match) {
            const [, timestamp, hostname, tag, pid, message] = rfc3164Match;
            return {
                priority,
                facility,
                severity,
                timestamp: this.parseRFC3164Timestamp(timestamp),
                hostname,
                tag,
                pid: pid ? parseInt(pid, 10) : null,
                message: message || ''
            };
        }
        // Fallback - simple format
        const simpleMatch = withoutPriority.match(/^(.*)$/);
        if (simpleMatch) {
            return {
                priority,
                facility,
                severity,
                timestamp: new Date(),
                hostname: null,
                tag: null,
                pid: null,
                message: simpleMatch[1] || ''
            };
        }
        return null;
    }
    parseTimestamp(timestamp) {
        try {
            // ISO 8601 format
            if (timestamp.includes('T')) {
                return new Date(timestamp);
            }
            // Other formats can be added here
            return new Date(timestamp);
        }
        catch {
            return null;
        }
    }
    parseRFC3164Timestamp(timestamp) {
        try {
            // Format: MMM DD HH:MM:SS
            const currentYear = new Date().getFullYear();
            const fullTimestamp = `${currentYear} ${timestamp}`;
            return new Date(fullTimestamp);
        }
        catch {
            return null;
        }
    }
    extractJSONPayload(message) {
        try {
            const jsonStart = message.indexOf('JSON:');
            if (jsonStart === -1)
                return null;
            const jsonString = message.substring(jsonStart + 5);
            return JSON.parse(jsonString);
        }
        catch {
            return null;
        }
    }
    extractDeviceInfo(hostname) {
        if (!hostname)
            return undefined;
        return {
            name: hostname,
            hostname: hostname,
            type: 'server' // Default assumption for syslog sources
        };
    }
    extractNetworkInfoFromJSON(jsonPayload) {
        if (!jsonPayload)
            return undefined;
        return {
            sourceIp: jsonPayload.src_ip || jsonPayload.source_ip || jsonPayload.client_ip,
            sourcePort: jsonPayload.src_port || jsonPayload.source_port,
            destinationIp: jsonPayload.dst_ip || jsonPayload.dest_ip || jsonPayload.server_ip,
            destinationPort: jsonPayload.dst_port || jsonPayload.dest_port || jsonPayload.server_port,
            protocol: jsonPayload.protocol,
            bytes: jsonPayload.bytes,
            packets: jsonPayload.packets
        };
    }
    getCategoryFromFacility(facility) {
        const categoryMap = {
            0: 'host', // kernel
            1: 'host', // user
            2: 'email', // mail
            3: 'host', // daemon
            4: 'authentication', // auth
            5: 'host', // syslog
            6: 'host', // lpr
            7: 'host', // news
            8: 'host', // uucp
            9: 'host', // cron
            10: 'authentication', // authpriv
            11: 'file', // ftp
            16: 'application', // local0
            17: 'application', // local1
            18: 'application', // local2
            19: 'application', // local3
            20: 'application', // local4
            21: 'application', // local5
            22: 'application', // local6
            23: 'application' // local7
        };
        return categoryMap[facility] || 'host';
    }
    getActionFromMessage(message) {
        const lowerMessage = message.toLowerCase();
        // Authentication actions
        if (lowerMessage.includes('login') || lowerMessage.includes('logon'))
            return 'login';
        if (lowerMessage.includes('logout') || lowerMessage.includes('logoff'))
            return 'logout';
        if (lowerMessage.includes('failed') && lowerMessage.includes('auth'))
            return 'authentication_failed';
        // Network actions
        if (lowerMessage.includes('connection'))
            return 'connection';
        if (lowerMessage.includes('disconnect'))
            return 'disconnection';
        // File actions
        if (lowerMessage.includes('created'))
            return 'file_created';
        if (lowerMessage.includes('deleted'))
            return 'file_deleted';
        if (lowerMessage.includes('modified'))
            return 'file_modified';
        // Process actions
        if (lowerMessage.includes('started'))
            return 'process_started';
        if (lowerMessage.includes('stopped'))
            return 'process_stopped';
        // Generic actions
        if (lowerMessage.includes('error'))
            return 'error';
        if (lowerMessage.includes('warning'))
            return 'warning';
        if (lowerMessage.includes('info'))
            return 'info';
        return 'unknown';
    }
    getOutcomeFromMessage(message) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('failed') ||
            lowerMessage.includes('error') ||
            lowerMessage.includes('denied') ||
            lowerMessage.includes('rejected')) {
            return 'failure';
        }
        if (lowerMessage.includes('success') ||
            lowerMessage.includes('accepted') ||
            lowerMessage.includes('completed') ||
            lowerMessage.includes('started')) {
            return 'success';
        }
        return 'unknown';
    }
    mapToECSCategory(category) {
        const mapping = {
            'authentication': ['authentication'],
            'network': ['network'],
            'host': ['host'],
            'file': ['file'],
            'email': ['email'],
            'application': ['process']
        };
        return mapping[category] || ['host'];
    }
    mapToECSType(action) {
        const mapping = {
            'login': ['start'],
            'logout': ['end'],
            'authentication_failed': ['start'],
            'connection': ['connection'],
            'disconnection': ['end'],
            'file_created': ['creation'],
            'file_deleted': ['deletion'],
            'file_modified': ['change'],
            'process_started': ['start'],
            'process_stopped': ['end'],
            'error': ['error'],
            'warning': ['info'],
            'info': ['info']
        };
        return mapping[action] || ['info'];
    }
    mapSeverityToNumber(severity) {
        const mapping = {
            'low': 25,
            'medium': 50,
            'high': 75,
            'critical': 100
        };
        return mapping[severity] || 25;
    }
    calculateConfidence(event) {
        let confidence = 0.6; // Base confidence for generic parser
        // Increase confidence if we have structured data
        if (event.custom?.jsonPayload) {
            confidence += 0.2;
        }
        // Increase confidence if we have hostname
        if (event.source !== 'unknown') {
            confidence += 0.1;
        }
        // Increase confidence if we have process info
        if (event.custom?.tag) {
            confidence += 0.05;
        }
        // Decrease confidence if message is very short
        if (event.custom?.message && event.custom.message.length < 10) {
            confidence -= 0.1;
        }
        return Math.max(0.1, Math.min(1.0, confidence));
    }
    getTagsForEvent(facility, tag) {
        const baseTags = ['syslog', 'generic'];
        // Add facility-based tags
        const facilityName = this.facilities[facility];
        if (facilityName) {
            baseTags.push(facilityName);
        }
        // Add process-based tags
        if (tag) {
            baseTags.push(tag.toLowerCase());
        }
        return baseTags;
    }
}
//# sourceMappingURL=GenericSyslogParser.js.map