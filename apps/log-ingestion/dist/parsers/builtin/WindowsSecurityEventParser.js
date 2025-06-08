// Windows Security Event Parser
// Comprehensive parser for Windows Security Event Logs with MITRE ATT&CK mapping
export class WindowsSecurityEventParser {
    id = 'windows-security-events';
    name = 'Windows Security Event Log Parser';
    vendor = 'Microsoft';
    logSource = 'WinEventLog:Security';
    version = '2.0.0';
    format = 'xml';
    category = 'endpoint';
    priority = 90;
    enabled = true;
    // Common Windows logon types
    logonTypes = {
        2: 'Interactive',
        3: 'Network',
        4: 'Batch',
        5: 'Service',
        7: 'Unlock',
        8: 'NetworkCleartext',
        9: 'NewCredentials',
        10: 'RemoteInteractive',
        11: 'CachedInteractive'
    };
    // Event ID to MITRE ATT&CK mappings
    mitreMapping = {
        4624: {
            techniques: [{ id: 'T1078', name: 'Valid Accounts', confidence: 0.3 }],
            tactics: [{ id: 'TA0001', name: 'Initial Access' }]
        },
        4625: {
            techniques: [
                { id: 'T1110', name: 'Brute Force', confidence: 0.6 },
                { id: 'T1078', name: 'Valid Accounts', confidence: 0.4 }
            ],
            tactics: [
                { id: 'TA0006', name: 'Credential Access' },
                { id: 'TA0001', name: 'Initial Access' }
            ]
        },
        4648: {
            techniques: [
                { id: 'T1078', name: 'Valid Accounts', confidence: 0.7 },
                { id: 'T1021', name: 'Remote Services', confidence: 0.5 }
            ],
            tactics: [
                { id: 'TA0008', name: 'Lateral Movement' },
                { id: 'TA0001', name: 'Initial Access' }
            ]
        },
        4672: {
            techniques: [{ id: 'T1134', name: 'Access Token Manipulation', confidence: 0.4 }],
            tactics: [{ id: 'TA0005', name: 'Defense Evasion' }]
        },
        4688: {
            techniques: [{ id: 'T1059', name: 'Command and Scripting Interpreter', confidence: 0.3 }],
            tactics: [{ id: 'TA0002', name: 'Execution' }]
        },
        4720: {
            techniques: [{ id: 'T1136', name: 'Create Account', confidence: 0.8 }],
            tactics: [{ id: 'TA0003', name: 'Persistence' }]
        },
        4722: {
            techniques: [{ id: 'T1078', name: 'Valid Accounts', confidence: 0.6 }],
            tactics: [{ id: 'TA0003', name: 'Persistence' }]
        },
        4728: {
            techniques: [{ id: 'T1098', name: 'Account Manipulation', confidence: 0.7 }],
            tactics: [{ id: 'TA0003', name: 'Persistence' }]
        },
        4732: {
            techniques: [{ id: 'T1098', name: 'Account Manipulation', confidence: 0.8 }],
            tactics: [{ id: 'TA0003', name: 'Persistence' }]
        },
        4756: {
            techniques: [{ id: 'T1098', name: 'Account Manipulation', confidence: 0.7 }],
            tactics: [{ id: 'TA0003', name: 'Persistence' }]
        },
        4768: {
            techniques: [{ id: 'T1558', name: 'Steal or Forge Kerberos Tickets', confidence: 0.3 }],
            tactics: [{ id: 'TA0006', name: 'Credential Access' }]
        },
        4769: {
            techniques: [{ id: 'T1558', name: 'Steal or Forge Kerberos Tickets', confidence: 0.3 }],
            tactics: [{ id: 'TA0006', name: 'Credential Access' }]
        },
        4771: {
            techniques: [
                { id: 'T1558', name: 'Steal or Forge Kerberos Tickets', confidence: 0.6 },
                { id: 'T1110', name: 'Brute Force', confidence: 0.7 }
            ],
            tactics: [{ id: 'TA0006', name: 'Credential Access' }]
        }
    };
    validate(rawLog) {
        // Check for Windows Event Log XML format
        return rawLog.includes('<Event xmlns') &&
            (rawLog.includes('Microsoft-Windows-Security-Auditing') || rawLog.includes('Security'));
    }
    parse(rawLog) {
        try {
            // Simple XML parsing for event data
            const eventId = this.extractEventId(rawLog);
            if (!eventId)
                return null;
            const timestamp = this.extractTimestamp(rawLog);
            const computer = this.extractComputer(rawLog);
            const eventData = this.extractEventData(rawLog);
            const event = {
                timestamp: timestamp || new Date(),
                source: computer || 'unknown',
                category: this.getCategoryForEventId(eventId),
                action: this.getActionForEventId(eventId),
                outcome: this.getOutcomeForEventId(eventId, eventData),
                severity: this.getSeverityForEventId(eventId),
                rawData: rawLog,
                custom: {
                    eventId: eventId,
                    channel: 'Security',
                    provider: 'Microsoft-Windows-Security-Auditing',
                    ...eventData
                }
            };
            // Add user information
            event.user = this.extractUserInfo(eventData);
            // Add device information
            event.device = this.extractDeviceInfo(computer, eventData);
            // Add authentication information
            event.authentication = this.extractAuthenticationInfo(eventId, eventData);
            // Add threat information
            event.threat = this.extractThreatInfo(eventId, eventData);
            return event;
        }
        catch (error) {
            console.error('Windows Security Event parsing error:', error);
            return null;
        }
    }
    normalize(event) {
        const eventId = event.custom?.eventId;
        const normalized = {
            '@timestamp': event.timestamp.toISOString(),
            'event.kind': 'event',
            'event.category': this.mapToECSCategory(event.category),
            'event.type': this.mapToECSType(eventId, event.action),
            'event.outcome': event.outcome,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'event.provider': 'Microsoft-Windows-Security-Auditing',
            'event.dataset': 'windows.security',
            'event.module': 'windows',
            // Host information
            'host.name': event.source,
            'host.hostname': event.source,
            'host.os.family': 'windows',
            'host.os.name': 'Windows',
            // User information
            ...(event.user && {
                'user.name': event.user.name,
                'user.domain': event.user.domain,
                'user.id': event.user.sid,
                'user.full_name': event.user.fullName
            }),
            // Authentication information
            ...(event.authentication && {
                'authentication.type': event.authentication.type,
                'authentication.success': event.authentication.success,
                'authentication.failure_reason': event.authentication.failureReason,
                'authentication.method': event.authentication.method
            }),
            // MITRE ATT&CK mapping
            ...(event.threat?.techniques && {
                'threat.technique.id': event.threat.techniques.map(t => t.id),
                'threat.technique.name': event.threat.techniques.map(t => t.name)
            }),
            ...(event.threat?.tactics && {
                'threat.tactic.id': event.threat.tactics.map(t => t.id),
                'threat.tactic.name': event.threat.tactics.map(t => t.name)
            }),
            // SecureWatch metadata
            'securewatch.parser.id': this.id,
            'securewatch.parser.version': this.version,
            'securewatch.parser.name': this.name,
            'securewatch.confidence': 0.9,
            'securewatch.severity': event.severity,
            'securewatch.tags': this.getTagsForEventId(eventId),
            // Windows-specific fields
            'windows.event.id': eventId,
            'windows.event.channel': 'Security',
            'windows.event.provider': 'Microsoft-Windows-Security-Auditing',
            ...(event.custom?.logonType && {
                'windows.logon.type': event.custom.logonType,
                'windows.logon.type_name': this.logonTypes[event.custom.logonType]
            }),
            // Labels for easier querying
            labels: {
                'event_id': eventId.toString(),
                'log_source': 'windows_security',
                'parser': this.id
            },
            // Related fields for correlation
            related: {
                user: event.user?.name ? [event.user.name] : undefined,
                hosts: [event.source]
            }
        };
        return normalized;
    }
    // Helper methods for parsing XML
    extractEventId(xml) {
        const match = xml.match(/<EventID[^>]*>(\d+)<\/EventID>/);
        return match ? parseInt(match[1], 10) : null;
    }
    extractTimestamp(xml) {
        const match = xml.match(/TimeCreated SystemTime="([^"]+)"/);
        return match ? new Date(match[1]) : null;
    }
    extractComputer(xml) {
        const match = xml.match(/<Computer>([^<]+)<\/Computer>/);
        return match ? match[1] : null;
    }
    extractEventData(xml) {
        const data = {};
        // Extract Data elements
        const dataMatches = xml.matchAll(/<Data Name="([^"]+)">([^<]*)<\/Data>/g);
        for (const match of dataMatches) {
            const [, name, value] = match;
            data[name] = value;
        }
        return data;
    }
    extractUserInfo(eventData) {
        const userName = eventData.TargetUserName || eventData.SubjectUserName;
        const userDomain = eventData.TargetDomainName || eventData.SubjectDomainName;
        const userSid = eventData.TargetUserSid || eventData.SubjectUserSid;
        if (!userName)
            return undefined;
        return {
            name: userName,
            domain: userDomain,
            sid: userSid,
            id: userSid
        };
    }
    extractDeviceInfo(computer, eventData) {
        if (!computer)
            return undefined;
        return {
            name: computer,
            hostname: computer,
            os: {
                family: 'windows',
                name: 'Windows'
            },
            type: 'desktop'
        };
    }
    extractAuthenticationInfo(eventId, eventData) {
        if (![4624, 4625, 4648, 4768, 4769, 4771].includes(eventId)) {
            return undefined;
        }
        const isSuccess = eventId === 4624 || eventId === 4648 || eventId === 4768 || eventId === 4769;
        const logonType = eventData.LogonType ? parseInt(eventData.LogonType, 10) : undefined;
        return {
            success: isSuccess,
            type: logonType ? this.logonTypes[logonType] : undefined,
            method: this.getAuthMethodForEventId(eventId),
            failureReason: eventData.FailureReason || eventData.Status,
            logonType: logonType
        };
    }
    extractThreatInfo(eventId, eventData) {
        const mapping = this.mitreMapping[eventId];
        if (!mapping)
            return undefined;
        // Adjust confidence based on context
        const techniques = mapping.techniques.map(technique => ({
            ...technique,
            confidence: this.adjustTechniqueConfidence(technique, eventId, eventData)
        }));
        return {
            techniques,
            tactics: mapping.tactics,
            severity: this.getSeverityForEventId(eventId),
            confidence: Math.max(...techniques.map(t => t.confidence))
        };
    }
    adjustTechniqueConfidence(technique, eventId, eventData) {
        let confidence = technique.confidence;
        // Increase confidence for suspicious patterns
        if (eventId === 4625) { // Failed logon
            const failureReason = eventData.Status || eventData.SubStatus;
            if (failureReason === '0xC000006A' || failureReason === '0xC0000064') {
                confidence += 0.2; // Wrong password or user not found
            }
        }
        if (eventId === 4648) { // Explicit credentials
            const processName = eventData.ProcessName?.toLowerCase();
            if (processName?.includes('rundll32') || processName?.includes('powershell')) {
                confidence += 0.3; // Suspicious process using explicit credentials
            }
        }
        if (eventId === 4688) { // Process creation
            const commandLine = eventData.CommandLine?.toLowerCase();
            if (commandLine?.includes('mimikatz') || commandLine?.includes('procdump')) {
                confidence += 0.4; // Credential dumping tools
            }
        }
        return Math.min(1.0, confidence);
    }
    getCategoryForEventId(eventId) {
        const categories = {
            4624: 'authentication',
            4625: 'authentication',
            4648: 'authentication',
            4672: 'authorization',
            4688: 'process',
            4720: 'iam',
            4722: 'iam',
            4728: 'iam',
            4732: 'iam',
            4756: 'iam',
            4768: 'authentication',
            4769: 'authentication',
            4771: 'authentication'
        };
        return categories[eventId] || 'security';
    }
    getActionForEventId(eventId) {
        const actions = {
            4624: 'logon',
            4625: 'logon_failed',
            4648: 'logon_explicit',
            4672: 'privilege_assigned',
            4688: 'process_created',
            4720: 'user_created',
            4722: 'user_enabled',
            4728: 'group_member_added',
            4732: 'local_group_member_added',
            4756: 'universal_group_member_added',
            4768: 'kerberos_ticket_requested',
            4769: 'kerberos_service_ticket_requested',
            4771: 'kerberos_preauth_failed'
        };
        return actions[eventId] || 'unknown';
    }
    getOutcomeForEventId(eventId, eventData) {
        // Failed events
        if ([4625, 4771].includes(eventId)) {
            return 'failure';
        }
        // Success events
        if ([4624, 4648, 4672, 4688, 4720, 4722, 4728, 4732, 4756, 4768, 4769].includes(eventId)) {
            return 'success';
        }
        return 'unknown';
    }
    getSeverityForEventId(eventId) {
        const severityMap = {
            4624: 'low', // Normal logon
            4625: 'medium', // Failed logon
            4648: 'medium', // Explicit credentials
            4672: 'high', // Special privileges
            4688: 'low', // Process creation
            4720: 'high', // User created
            4722: 'medium', // User enabled
            4728: 'high', // Group member added
            4732: 'high', // Local group member added
            4756: 'high', // Universal group member added
            4768: 'low', // Kerberos ticket
            4769: 'low', // Kerberos service ticket
            4771: 'medium' // Kerberos pre-auth failed
        };
        return severityMap[eventId] || 'low';
    }
    mapToECSCategory(category) {
        const mapping = {
            'authentication': ['authentication'],
            'authorization': ['iam'],
            'process': ['process'],
            'iam': ['iam'],
            'security': ['host']
        };
        return mapping[category] || ['host'];
    }
    mapToECSType(eventId, action) {
        const typeMap = {
            4624: ['start'],
            4625: ['start'],
            4648: ['start'],
            4672: ['admin'],
            4688: ['start'],
            4720: ['creation'],
            4722: ['change'],
            4728: ['change'],
            4732: ['change'],
            4756: ['change'],
            4768: ['start'],
            4769: ['start'],
            4771: ['start']
        };
        return typeMap[eventId] || ['info'];
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
    getAuthMethodForEventId(eventId) {
        const methods = {
            4624: 'interactive',
            4625: 'interactive',
            4648: 'network',
            4768: 'kerberos',
            4769: 'kerberos',
            4771: 'kerberos'
        };
        return methods[eventId];
    }
    getTagsForEventId(eventId) {
        const tags = {
            4624: ['logon', 'authentication', 'success'],
            4625: ['logon', 'authentication', 'failure', 'security'],
            4648: ['logon', 'authentication', 'explicit-credentials'],
            4672: ['privilege', 'elevation', 'security'],
            4688: ['process', 'execution'],
            4720: ['user-management', 'creation', 'security'],
            4722: ['user-management', 'activation', 'security'],
            4728: ['group-management', 'security'],
            4732: ['group-management', 'local', 'security'],
            4756: ['group-management', 'universal', 'security'],
            4768: ['kerberos', 'authentication'],
            4769: ['kerberos', 'service-ticket'],
            4771: ['kerberos', 'authentication', 'failure']
        };
        return tags[eventId] || ['windows', 'security'];
    }
}
//# sourceMappingURL=WindowsSecurityEventParser.js.map