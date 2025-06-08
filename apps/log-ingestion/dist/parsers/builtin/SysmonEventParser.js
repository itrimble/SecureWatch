// Sysmon Event Parser
// Enhanced parser for Sysmon events with comprehensive MITRE ATT&CK detection
export class SysmonEventParser {
    id = 'sysmon-events';
    name = 'Sysmon Event Parser';
    vendor = 'Microsoft';
    logSource = 'Microsoft-Windows-Sysmon/Operational';
    version = '2.0.0';
    format = 'xml';
    category = 'endpoint';
    priority = 95;
    enabled = true;
    // Sysmon Event ID mappings
    eventIdMapping = {
        1: 'Process Creation',
        2: 'Process Changed File Creation Time',
        3: 'Network Connection',
        4: 'Sysmon Service State Changed',
        5: 'Process Terminated',
        6: 'Driver Loaded',
        7: 'Image Loaded',
        8: 'CreateRemoteThread',
        9: 'RawAccessRead',
        10: 'ProcessAccess',
        11: 'FileCreate',
        12: 'RegistryEvent (Object create and delete)',
        13: 'RegistryEvent (Value Set)',
        14: 'RegistryEvent (Key and Value Rename)',
        15: 'FileCreateStreamHash',
        16: 'ServiceConfigurationChange',
        17: 'PipeEvent (Pipe Created)',
        18: 'PipeEvent (Pipe Connected)',
        19: 'WmiEvent (WmiEventFilter activity detected)',
        20: 'WmiEvent (WmiEventConsumer activity detected)',
        21: 'WmiEvent (WmiEventConsumerToFilter activity detected)',
        22: 'DNSEvent (DNS query)',
        23: 'FileDelete (File Delete archived)',
        24: 'ClipboardChange (New content in the clipboard)',
        25: 'ProcessTampering (Process image change)',
        26: 'FileDeleteDetected (File Delete logged)',
        27: 'FileBlockExecutable (File Block Executable)',
        28: 'FileBlockShredding (File Block Shredding)',
        29: 'FileExecutableDetected (File Executable Detected)'
    };
    // MITRE ATT&CK technique detection patterns
    attackPatterns = {
        'powershell_execution': {
            techniques: [{ id: 'T1059.001', name: 'PowerShell', confidence: 0.8 }],
            pattern: /powershell\.exe|pwsh\.exe/i,
            description: 'PowerShell execution detected'
        },
        'cmd_execution': {
            techniques: [{ id: 'T1059.003', name: 'Windows Command Shell', confidence: 0.7 }],
            pattern: /cmd\.exe.*\/[Cc]/,
            description: 'Command shell execution'
        },
        'wmi_execution': {
            techniques: [{ id: 'T1047', name: 'Windows Management Instrumentation', confidence: 0.9 }],
            pattern: /wmic\.exe|winmgmt\.exe/i,
            description: 'WMI execution detected'
        },
        'credential_dumping': {
            techniques: [{ id: 'T1003', name: 'OS Credential Dumping', confidence: 0.95 }],
            pattern: /mimikatz|procdump|lsass|sekurlsa/i,
            description: 'Credential dumping activity'
        },
        'process_injection': {
            techniques: [{ id: 'T1055', name: 'Process Injection', confidence: 0.8 }],
            pattern: /CreateRemoteThread|SetWindowsHookEx|QueueUserAPC/i,
            description: 'Process injection technique'
        },
        'dll_injection': {
            techniques: [{ id: 'T1055.001', name: 'Dynamic-link Library Injection', confidence: 0.85 }],
            pattern: /LoadLibrary|LdrLoadDll|NtMapViewOfSection/i,
            description: 'DLL injection detected'
        },
        'registry_persistence': {
            techniques: [{ id: 'T1547.001', name: 'Registry Run Keys / Startup Folder', confidence: 0.8 }],
            pattern: /CurrentVersion\\Run|CurrentVersion\\RunOnce/i,
            description: 'Registry persistence mechanism'
        },
        'scheduled_task': {
            techniques: [{ id: 'T1053.005', name: 'Scheduled Task', confidence: 0.8 }],
            pattern: /schtasks\.exe|taskschd\.dll/i,
            description: 'Scheduled task manipulation'
        },
        'service_persistence': {
            techniques: [{ id: 'T1543.003', name: 'Windows Service', confidence: 0.8 }],
            pattern: /sc\.exe.*create|net\.exe.*start/i,
            description: 'Service-based persistence'
        },
        'uac_bypass': {
            techniques: [{ id: 'T1548.002', name: 'Bypass User Account Control', confidence: 0.9 }],
            pattern: /eventvwr\.exe|fodhelper\.exe|computerdefaults\.exe/i,
            description: 'UAC bypass technique'
        },
        'lateral_movement_psexec': {
            techniques: [{ id: 'T1021.002', name: 'SMB/Windows Admin Shares', confidence: 0.9 }],
            pattern: /psexec|paexec/i,
            description: 'PsExec lateral movement'
        },
        'lateral_movement_wmi': {
            techniques: [{ id: 'T1021.003', name: 'Distributed Component Object Model', confidence: 0.8 }],
            pattern: /wmiexec|wmiprvse/i,
            description: 'WMI lateral movement'
        },
        'defense_evasion_masquerading': {
            techniques: [{ id: 'T1036', name: 'Masquerading', confidence: 0.7 }],
            pattern: /svchost\.exe.*-k.*DcomLaunch/i,
            description: 'Process masquerading'
        },
        'privilege_escalation_token': {
            techniques: [{ id: 'T1134', name: 'Access Token Manipulation', confidence: 0.8 }],
            pattern: /SeDebugPrivilege|SeTcbPrivilege|SeAssignPrimaryTokenPrivilege/i,
            description: 'Token manipulation for privilege escalation'
        },
        'collection_clipboard': {
            techniques: [{ id: 'T1115', name: 'Clipboard Data', confidence: 0.9 }],
            pattern: /GetClipboardData|OpenClipboard/i,
            description: 'Clipboard data collection'
        }
    };
    // Suspicious process patterns
    suspiciousProcesses = {
        'mimikatz.exe': 0.95,
        'procdump.exe': 0.8,
        'psexec.exe': 0.7,
        'wce.exe': 0.9,
        'gsecdump.exe': 0.9,
        'cachedump.exe': 0.9,
        'pwdump.exe': 0.9,
        'fgdump.exe': 0.9,
        'wmiexec.py': 0.8,
        'smbexec.py': 0.8,
        'dcsync.exe': 0.9,
        'bloodhound.exe': 0.7,
        'sharphound.exe': 0.7,
        'rubeus.exe': 0.8,
        'kekeo.exe': 0.8,
        'cobalt strike': 0.95,
        'meterpreter': 0.95
    };
    validate(rawLog) {
        return rawLog.includes('<Event xmlns') &&
            rawLog.includes('Microsoft-Windows-Sysmon') &&
            rawLog.includes('Provider Name="Microsoft-Windows-Sysmon"');
    }
    parse(rawLog) {
        try {
            const eventId = this.extractEventId(rawLog);
            if (!eventId || !this.eventIdMapping[eventId])
                return null;
            const timestamp = this.extractTimestamp(rawLog);
            const computer = this.extractComputer(rawLog);
            const eventData = this.extractEventData(rawLog);
            const ruleName = this.extractRuleName(rawLog);
            const event = {
                timestamp: timestamp || new Date(),
                source: computer || 'unknown',
                category: this.getCategoryForEventId(eventId),
                action: this.getActionForEventId(eventId),
                outcome: 'success', // Sysmon events are observational
                severity: this.getSeverityForEventId(eventId, eventData, ruleName),
                rawData: rawLog,
                custom: {
                    eventId: eventId,
                    eventName: this.eventIdMapping[eventId],
                    channel: 'Microsoft-Windows-Sysmon/Operational',
                    provider: 'Microsoft-Windows-Sysmon',
                    ruleName: ruleName,
                    ...eventData
                }
            };
            // Add specific data based on event type
            if ([1, 5].includes(eventId)) {
                event.process = this.extractProcessInfo(eventData);
            }
            if (eventId === 3) {
                event.network = this.extractNetworkInfo(eventData);
            }
            if ([11, 23, 26].includes(eventId)) {
                event.file = this.extractFileInfo(eventData);
            }
            if ([12, 13, 14].includes(eventId)) {
                event.registry = this.extractRegistryInfo(eventData);
            }
            // Detect threats and techniques
            event.threat = this.detectThreats(eventId, eventData, ruleName);
            return event;
        }
        catch (error) {
            console.error('Sysmon event parsing error:', error);
            return null;
        }
    }
    normalize(event) {
        const eventId = event.custom?.eventId;
        const normalized = {
            '@timestamp': event.timestamp.toISOString(),
            'event.kind': 'event',
            'event.category': this.mapToECSCategory(event.category, eventId),
            'event.type': this.mapToECSType(eventId),
            'event.outcome': event.outcome,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'event.provider': 'Microsoft-Windows-Sysmon',
            'event.dataset': 'windows.sysmon',
            'event.module': 'sysmon',
            // Host information
            'host.name': event.source,
            'host.hostname': event.source,
            'host.os.family': 'windows',
            'host.os.name': 'Windows',
            // Process information
            ...(event.process && {
                'process.name': event.process.name,
                'process.pid': event.process.pid,
                'process.ppid': event.process.ppid,
                'process.command_line': event.process.commandLine,
                'process.executable': event.process.executable,
                'process.hash.md5': event.process.hashes?.md5,
                'process.hash.sha1': event.process.hashes?.sha1,
                'process.hash.sha256': event.process.hashes?.sha256,
                'process.parent.name': event.process.parent?.name,
                'process.parent.pid': event.process.parent?.pid,
                'process.parent.command_line': event.process.parent?.commandLine
            }),
            // Network information
            ...(event.network && {
                'source.ip': event.network.sourceIp,
                'source.port': event.network.sourcePort,
                'destination.ip': event.network.destinationIp,
                'destination.port': event.network.destinationPort,
                'network.protocol': event.network.protocol,
                'network.transport': event.network.transport,
                'network.direction': event.network.direction
            }),
            // File information
            ...(event.file && {
                'file.name': event.file.name,
                'file.path': event.file.path,
                'file.directory': event.file.directory,
                'file.size': event.file.size,
                'file.hash.md5': event.file.hashes?.md5,
                'file.hash.sha1': event.file.hashes?.sha1,
                'file.hash.sha256': event.file.hashes?.sha256
            }),
            // Registry information
            ...(event.registry && {
                'registry.key': event.registry.key,
                'registry.value.name': event.registry.valueName,
                'registry.value.data': event.registry.valueData,
                'registry.value.type': event.registry.valueType
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
            'securewatch.confidence': this.calculateEventConfidence(event),
            'securewatch.severity': event.severity,
            'securewatch.tags': this.getTagsForEvent(eventId, event.custom?.ruleName),
            'securewatch.rule_name': event.custom?.ruleName,
            // Sysmon-specific fields
            'sysmon.event.id': eventId,
            'sysmon.event.name': this.eventIdMapping[eventId],
            'sysmon.rule_name': event.custom?.ruleName,
            // Labels for easier querying
            labels: {
                'event_id': eventId.toString(),
                'log_source': 'sysmon',
                'parser': this.id
            },
            // Related fields for correlation
            related: {
                ip: this.extractRelatedIPs(event),
                user: this.extractRelatedUsers(event),
                hash: this.extractRelatedHashes(event),
                hosts: [event.source]
            }
        };
        return normalized;
    }
    // Helper methods for parsing
    extractEventId(xml) {
        const match = xml.match(/<EventID>(\d+)<\/EventID>/);
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
    extractRuleName(xml) {
        const match = xml.match(/<Data Name="RuleName">([^<]*)<\/Data>/);
        return match ? match[1] : null;
    }
    extractEventData(xml) {
        const data = {};
        const dataMatches = xml.matchAll(/<Data Name="([^"]+)">([^<]*)<\/Data>/g);
        for (const match of dataMatches) {
            const [, name, value] = match;
            data[name] = value;
        }
        return data;
    }
    extractProcessInfo(eventData) {
        return {
            name: this.getFileName(eventData.Image),
            pid: eventData.ProcessId ? parseInt(eventData.ProcessId, 10) : undefined,
            ppid: eventData.ParentProcessId ? parseInt(eventData.ParentProcessId, 10) : undefined,
            commandLine: eventData.CommandLine,
            executable: eventData.Image,
            workingDirectory: eventData.CurrentDirectory,
            user: eventData.User,
            hashes: {
                md5: eventData.MD5 || eventData.Hashes?.split(',').find((h) => h.includes('MD5'))?.split('=')[1],
                sha1: eventData.SHA1 || eventData.Hashes?.split(',').find((h) => h.includes('SHA1'))?.split('=')[1],
                sha256: eventData.SHA256 || eventData.Hashes?.split(',').find((h) => h.includes('SHA256'))?.split('=')[1]
            },
            parent: eventData.ParentImage ? {
                name: this.getFileName(eventData.ParentImage),
                pid: eventData.ParentProcessId ? parseInt(eventData.ParentProcessId, 10) : undefined,
                commandLine: eventData.ParentCommandLine
            } : undefined
        };
    }
    extractNetworkInfo(eventData) {
        return {
            sourceIp: eventData.SourceIp,
            sourcePort: eventData.SourcePort ? parseInt(eventData.SourcePort, 10) : undefined,
            sourceDomain: eventData.SourceHostname,
            destinationIp: eventData.DestinationIp,
            destinationPort: eventData.DestinationPort ? parseInt(eventData.DestinationPort, 10) : undefined,
            destinationDomain: eventData.DestinationHostname,
            protocol: eventData.Protocol,
            direction: this.getNetworkDirection(eventData.SourceIp, eventData.DestinationIp)
        };
    }
    extractFileInfo(eventData) {
        const filePath = eventData.TargetFilename || eventData.Image;
        return {
            name: this.getFileName(filePath),
            path: filePath,
            directory: this.getDirectoryName(filePath),
            size: eventData.FileSize ? parseInt(eventData.FileSize, 10) : undefined,
            created: eventData.CreationUtcTime ? new Date(eventData.CreationUtcTime) : undefined,
            hashes: {
                md5: eventData.MD5,
                sha1: eventData.SHA1,
                sha256: eventData.SHA256
            }
        };
    }
    extractRegistryInfo(eventData) {
        return {
            key: eventData.TargetObject,
            valueName: eventData.Details,
            valueData: eventData.NewValue || eventData.Details,
            valueType: eventData.ValueType
        };
    }
    detectThreats(eventId, eventData, ruleName) {
        const detectedTechniques = [];
        const detectedTactics = new Set();
        // Check for rule-based detection first
        if (ruleName) {
            const ruleDetection = this.detectFromRuleName(ruleName);
            if (ruleDetection) {
                detectedTechniques.push(...ruleDetection.techniques);
                ruleDetection.tactics.forEach(tactic => detectedTactics.add(tactic));
            }
        }
        // Pattern-based detection
        const commandLine = eventData.CommandLine || eventData.Image || '';
        const processName = eventData.Image || '';
        const targetFile = eventData.TargetFilename || '';
        const registryKey = eventData.TargetObject || '';
        // Check against attack patterns
        for (const [patternName, pattern] of Object.entries(this.attackPatterns)) {
            const searchText = `${commandLine} ${processName} ${targetFile} ${registryKey}`;
            if (pattern.pattern.test(searchText)) {
                pattern.techniques.forEach(technique => {
                    // Avoid duplicates
                    if (!detectedTechniques.find(t => t.id === technique.id)) {
                        detectedTechniques.push(technique);
                    }
                });
            }
        }
        // Check for suspicious processes
        const fileName = this.getFileName(processName).toLowerCase();
        if (this.suspiciousProcesses[fileName]) {
            detectedTechniques.push({
                id: 'T1055', // Generic process injection/execution
                name: 'Process Injection',
                confidence: this.suspiciousProcesses[fileName]
            });
        }
        // Map techniques to tactics
        detectedTechniques.forEach(technique => {
            const tactics = this.getTacticsForTechnique(technique.id);
            tactics.forEach(tactic => detectedTactics.add(tactic));
        });
        if (detectedTechniques.length === 0) {
            return undefined;
        }
        return {
            techniques: detectedTechniques,
            tactics: Array.from(detectedTactics),
            severity: this.calculateThreatSeverity(detectedTechniques),
            confidence: Math.max(...detectedTechniques.map(t => t.confidence))
        };
    }
    detectFromRuleName(ruleName) {
        const ruleMapping = {
            'technique_id=T1055': {
                techniques: [{ id: 'T1055', name: 'Process Injection', confidence: 0.9 }],
                tactics: [{ id: 'TA0005', name: 'Defense Evasion' }]
            },
            'technique_id=T1003': {
                techniques: [{ id: 'T1003', name: 'OS Credential Dumping', confidence: 0.95 }],
                tactics: [{ id: 'TA0006', name: 'Credential Access' }]
            },
            'technique_id=T1059': {
                techniques: [{ id: 'T1059.001', name: 'PowerShell', confidence: 0.8 }],
                tactics: [{ id: 'TA0002', name: 'Execution' }]
            }
        };
        // Check for direct technique ID in rule name
        for (const [pattern, mapping] of Object.entries(ruleMapping)) {
            if (ruleName.includes(pattern)) {
                return mapping;
            }
        }
        return null;
    }
    getTacticsForTechnique(techniqueId) {
        const techniqueToTactics = {
            'T1055': [{ id: 'TA0005', name: 'Defense Evasion' }, { id: 'TA0004', name: 'Privilege Escalation' }],
            'T1003': [{ id: 'TA0006', name: 'Credential Access' }],
            'T1059.001': [{ id: 'TA0002', name: 'Execution' }],
            'T1059.003': [{ id: 'TA0002', name: 'Execution' }],
            'T1047': [{ id: 'TA0002', name: 'Execution' }],
            'T1547.001': [{ id: 'TA0003', name: 'Persistence' }, { id: 'TA0004', name: 'Privilege Escalation' }],
            'T1053.005': [{ id: 'TA0003', name: 'Persistence' }, { id: 'TA0004', name: 'Privilege Escalation' }],
            'T1543.003': [{ id: 'TA0003', name: 'Persistence' }, { id: 'TA0004', name: 'Privilege Escalation' }],
            'T1548.002': [{ id: 'TA0005', name: 'Defense Evasion' }, { id: 'TA0004', name: 'Privilege Escalation' }],
            'T1021.002': [{ id: 'TA0008', name: 'Lateral Movement' }],
            'T1021.003': [{ id: 'TA0008', name: 'Lateral Movement' }],
            'T1036': [{ id: 'TA0005', name: 'Defense Evasion' }],
            'T1134': [{ id: 'TA0005', name: 'Defense Evasion' }, { id: 'TA0004', name: 'Privilege Escalation' }],
            'T1115': [{ id: 'TA0009', name: 'Collection' }]
        };
        return techniqueToTactics[techniqueId] || [];
    }
    calculateThreatSeverity(techniques) {
        const maxConfidence = Math.max(...techniques.map(t => t.confidence));
        if (maxConfidence >= 0.9)
            return 'critical';
        if (maxConfidence >= 0.7)
            return 'high';
        if (maxConfidence >= 0.5)
            return 'medium';
        return 'low';
    }
    calculateEventConfidence(event) {
        let confidence = 0.8; // Base confidence for Sysmon
        // Increase confidence if we have threat indicators
        if (event.threat && event.threat.techniques.length > 0) {
            confidence += 0.1;
        }
        // Increase confidence if we have rule name
        if (event.custom?.ruleName) {
            confidence += 0.05;
        }
        // Increase confidence for process creation with command line
        if (event.custom?.eventId === 1 && event.process?.commandLine) {
            confidence += 0.05;
        }
        return Math.min(1.0, confidence);
    }
    // Helper utility methods
    getFileName(filePath) {
        if (!filePath)
            return '';
        return filePath.split('\\').pop() || filePath.split('/').pop() || filePath;
    }
    getDirectoryName(filePath) {
        if (!filePath)
            return '';
        const parts = filePath.split('\\').length > 1 ? filePath.split('\\') : filePath.split('/');
        parts.pop();
        return parts.join('\\') || parts.join('/');
    }
    getNetworkDirection(sourceIp, destIp) {
        // Simple heuristic - could be enhanced with network configuration
        if (this.isPrivateIP(sourceIp) && !this.isPrivateIP(destIp)) {
            return 'outbound';
        }
        else if (!this.isPrivateIP(sourceIp) && this.isPrivateIP(destIp)) {
            return 'inbound';
        }
        else if (this.isPrivateIP(sourceIp) && this.isPrivateIP(destIp)) {
            return 'internal';
        }
        return 'external';
    }
    isPrivateIP(ip) {
        if (!ip)
            return false;
        const privateRanges = [
            /^10\./,
            /^192\.168\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^127\./,
            /^169\.254\./
        ];
        return privateRanges.some(range => range.test(ip));
    }
    getCategoryForEventId(eventId) {
        const categoryMap = {
            1: 'process',
            2: 'file',
            3: 'network',
            4: 'host',
            5: 'process',
            6: 'driver',
            7: 'process',
            8: 'process',
            9: 'process',
            10: 'process',
            11: 'file',
            12: 'registry',
            13: 'registry',
            14: 'registry',
            15: 'file',
            16: 'host',
            17: 'process',
            18: 'process',
            19: 'host',
            20: 'host',
            21: 'host',
            22: 'network',
            23: 'file',
            24: 'host',
            25: 'process',
            26: 'file',
            27: 'file',
            28: 'file',
            29: 'file'
        };
        return categoryMap[eventId] || 'host';
    }
    getActionForEventId(eventId) {
        const actionMap = {
            1: 'process_created',
            2: 'file_time_changed',
            3: 'network_connection',
            4: 'service_state_changed',
            5: 'process_terminated',
            6: 'driver_loaded',
            7: 'image_loaded',
            8: 'remote_thread_created',
            9: 'raw_access_read',
            10: 'process_accessed',
            11: 'file_created',
            12: 'registry_object_created',
            13: 'registry_value_set',
            14: 'registry_renamed',
            15: 'file_stream_created',
            16: 'service_configuration_changed',
            17: 'pipe_created',
            18: 'pipe_connected',
            19: 'wmi_filter_detected',
            20: 'wmi_consumer_detected',
            21: 'wmi_consumer_filter_detected',
            22: 'dns_query',
            23: 'file_deleted',
            24: 'clipboard_changed',
            25: 'process_tampering',
            26: 'file_delete_detected',
            27: 'file_block_executable',
            28: 'file_block_shredding',
            29: 'file_executable_detected'
        };
        return actionMap[eventId] || 'unknown';
    }
    getSeverityForEventId(eventId, eventData, ruleName) {
        // Rule-based severity first
        if (ruleName && ruleName.includes('critical'))
            return 'critical';
        if (ruleName && ruleName.includes('high'))
            return 'high';
        if (ruleName && ruleName.includes('medium'))
            return 'medium';
        // Pattern-based severity
        const commandLine = eventData.CommandLine || '';
        if (this.attackPatterns.credential_dumping.pattern.test(commandLine))
            return 'critical';
        if (this.attackPatterns.process_injection.pattern.test(commandLine))
            return 'high';
        if (this.attackPatterns.uac_bypass.pattern.test(commandLine))
            return 'high';
        // Default severity by event type
        const severityMap = {
            1: 'low', // Process creation
            2: 'medium', // File time change
            3: 'low', // Network connection
            4: 'low', // Service state
            5: 'low', // Process termination
            6: 'medium', // Driver loaded
            7: 'low', // Image loaded
            8: 'high', // Remote thread
            9: 'medium', // Raw access
            10: 'medium', // Process access
            11: 'low', // File created
            12: 'medium', // Registry object
            13: 'medium', // Registry value
            14: 'medium', // Registry rename
            15: 'low', // File stream
            16: 'high', // Service config change
            17: 'low', // Pipe created
            18: 'low', // Pipe connected
            19: 'high', // WMI filter
            20: 'high', // WMI consumer
            21: 'high', // WMI consumer filter
            22: 'low', // DNS query
            23: 'low', // File deleted
            24: 'medium', // Clipboard
            25: 'high', // Process tampering
            26: 'low', // File delete detected
            27: 'medium', // File block executable
            28: 'medium', // File block shredding
            29: 'medium' // File executable detected
        };
        return severityMap[eventId] || 'low';
    }
    mapToECSCategory(category, eventId) {
        const mapping = {
            'process': ['process'],
            'file': ['file'],
            'network': ['network'],
            'registry': ['registry'],
            'driver': ['driver'],
            'host': ['host']
        };
        return mapping[category] || ['host'];
    }
    mapToECSType(eventId) {
        const typeMap = {
            1: ['start'],
            2: ['change'],
            3: ['connection'],
            4: ['change'],
            5: ['end'],
            6: ['start'],
            7: ['start'],
            8: ['creation'],
            9: ['access'],
            10: ['access'],
            11: ['creation'],
            12: ['creation'],
            13: ['change'],
            14: ['change'],
            15: ['creation'],
            16: ['change'],
            17: ['creation'],
            18: ['connection'],
            19: ['start'],
            20: ['start'],
            21: ['connection'],
            22: ['protocol'],
            23: ['deletion'],
            24: ['change'],
            25: ['change'],
            26: ['deletion'],
            27: ['denied'],
            28: ['denied'],
            29: ['allowed']
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
    getTagsForEvent(eventId, ruleName) {
        const baseTags = ['sysmon', 'windows', 'endpoint'];
        if (ruleName) {
            baseTags.push('rule-based');
        }
        const eventTags = {
            1: ['process-creation'],
            2: ['file-modification'],
            3: ['network-connection'],
            5: ['process-termination'],
            6: ['driver-load'],
            7: ['image-load'],
            8: ['process-injection'],
            10: ['process-access'],
            11: ['file-creation'],
            12: ['registry-creation'],
            13: ['registry-modification'],
            22: ['dns-query'],
            23: ['file-deletion'],
            25: ['process-tampering']
        };
        if (eventTags[eventId]) {
            baseTags.push(...eventTags[eventId]);
        }
        return baseTags;
    }
    extractRelatedIPs(event) {
        const ips = [];
        if (event.network?.sourceIp)
            ips.push(event.network.sourceIp);
        if (event.network?.destinationIp)
            ips.push(event.network.destinationIp);
        return ips;
    }
    extractRelatedUsers(event) {
        const users = [];
        if (event.process?.user)
            users.push(event.process.user);
        return users;
    }
    extractRelatedHashes(event) {
        const hashes = [];
        if (event.process?.hashes?.md5)
            hashes.push(event.process.hashes.md5);
        if (event.process?.hashes?.sha1)
            hashes.push(event.process.hashes.sha1);
        if (event.process?.hashes?.sha256)
            hashes.push(event.process.hashes.sha256);
        if (event.file?.hashes?.md5)
            hashes.push(event.file.hashes.md5);
        if (event.file?.hashes?.sha1)
            hashes.push(event.file.hashes.sha1);
        if (event.file?.hashes?.sha256)
            hashes.push(event.file.hashes.sha256);
        return hashes;
    }
}
//# sourceMappingURL=SysmonEventParser.js.map