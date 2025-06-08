import { LogSource, LogSeverity, LogCategory, } from '../types/log-event.types';
import { FieldExtractor } from '../parsers/field-extractor';
import { SeverityMapper } from '../utils/severity-mapper';
import { CategoryClassifier } from '../utils/category-classifier';
import logger from '../utils/logger';
export class LogNormalizer {
    fieldExtractor;
    severityMapper;
    categoryClassifier;
    constructor() {
        this.fieldExtractor = new FieldExtractor();
        this.severityMapper = new SeverityMapper();
        this.categoryClassifier = new CategoryClassifier();
    }
    async normalize(rawEvent) {
        try {
            // Handle EVTX parsed events
            if (rawEvent.source === 'windows_evtx' || rawEvent.metadata?.source_type === 'windows_evtx') {
                return this.normalizeEVTXEvent(rawEvent);
            }
            // Handle existing sources
            if (rawEvent.source) {
                switch (rawEvent.source) {
                    case LogSource.WINDOWS_EVENT_LOG:
                        return this.normalizeWindowsEvent(rawEvent);
                    case LogSource.SYSLOG:
                        return this.normalizeSyslogEvent(rawEvent);
                    case LogSource.AWS_CLOUDTRAIL:
                        return this.normalizeCloudTrailEvent(rawEvent);
                    case LogSource.AZURE_ACTIVITY:
                        return this.normalizeAzureActivityEvent(rawEvent);
                    case LogSource.GCP_LOGGING:
                        return this.normalizeGCPLoggingEvent(rawEvent);
                    default:
                        return this.normalizeGenericEvent(rawEvent);
                }
            }
            // Default to generic normalization
            return this.normalizeGenericEvent(rawEvent);
        }
        catch (error) {
            logger.error('Error normalizing event', { eventId: rawEvent.id, error });
            throw error;
        }
    }
    normalizeEVTXEvent(rawEvent) {
        // Handle EVTX parsed events from Python parser
        const severity = this.mapWindowsEventSeverity(rawEvent.event_id, rawEvent.level);
        const category = this.classifyWindowsEventCategory(rawEvent.event_id, rawEvent.channel);
        // Build normalized event with enhanced Windows-specific fields
        const normalized = {
            id: rawEvent.id || `evtx-${rawEvent.record_id}-${Date.now()}`,
            timestamp: new Date(rawEvent.timestamp),
            source: 'windows_evtx',
            severity,
            category,
            message: rawEvent.message || this.buildWindowsEventMessage(rawEvent.event_id, rawEvent.event_data),
            fields: {
                // Core Windows fields
                event_id: rawEvent.event_id,
                channel: rawEvent.channel,
                computer: rawEvent.computer,
                record_id: rawEvent.record_id,
                level: rawEvent.level,
                // Additional fields
                correlation_id: rawEvent.correlation_id,
                activity_id: rawEvent.activity_id,
                keywords: rawEvent.keywords,
                task: rawEvent.task,
                opcode: rawEvent.opcode,
                source_file: rawEvent.source_file,
                parsed_at: rawEvent.parsed_at,
                // Event data and system data
                ...(rawEvent.event_data || {}),
                ...(rawEvent.system_data || {}),
                // Enhanced authentication fields for 4624/4625
                ...(rawEvent.event_id === 4624 || rawEvent.event_id === 4625 ? {
                    target_user_name: rawEvent.event_data?.TargetUserName,
                    target_domain_name: rawEvent.event_data?.TargetDomainName,
                    logon_type: rawEvent.event_data?.LogonType,
                    source_network_address: rawEvent.event_data?.IpAddress,
                    workstation_name: rawEvent.event_data?.WorkstationName,
                    authentication_package: rawEvent.event_data?.AuthenticationPackageName,
                    logon_process: rawEvent.event_data?.LogonProcessName,
                    failure_reason: rawEvent.event_data?.FailureReason,
                    status: rawEvent.event_data?.Status,
                    sub_status: rawEvent.event_data?.SubStatus
                } : {}),
                // Enhanced process fields for 4688
                ...(rawEvent.event_id === 4688 ? {
                    new_process_name: rawEvent.event_data?.NewProcessName,
                    new_process_id: rawEvent.event_data?.NewProcessId,
                    command_line: rawEvent.event_data?.CommandLine,
                    creator_process_name: rawEvent.event_data?.CreatorProcessName,
                    creator_process_id: rawEvent.event_data?.CreatorProcessId,
                    token_elevation_type: rawEvent.event_data?.TokenElevationType
                } : {}),
                // Enhanced service fields for 7045
                ...(rawEvent.event_id === 7045 ? {
                    service_name: rawEvent.event_data?.ServiceName,
                    image_path: rawEvent.event_data?.ImagePath,
                    service_type: rawEvent.event_data?.ServiceType,
                    start_type: rawEvent.event_data?.StartType,
                    account_name: rawEvent.event_data?.AccountName
                } : {}),
                // Enhanced scheduled task fields for 4698
                ...(rawEvent.event_id === 4698 ? {
                    task_name: rawEvent.event_data?.TaskName,
                    task_content: rawEvent.event_data?.TaskContent
                } : {}),
                // Enhanced PowerShell fields for 4103/4104
                ...(rawEvent.event_id === 4103 || rawEvent.event_id === 4104 ? {
                    script_block_text: rawEvent.event_data?.ScriptBlockText,
                    script_block_id: rawEvent.event_data?.ScriptBlockId,
                    command_name: rawEvent.event_data?.CommandName,
                    command_type: rawEvent.event_data?.CommandType,
                    engine_version: rawEvent.event_data?.EngineVersion,
                    runspace_id: rawEvent.event_data?.RunspaceId,
                    pipeline_id: rawEvent.event_data?.PipelineId
                } : {})
            },
            tags: this.buildWindowsEVTXTags(rawEvent),
            host: {
                hostname: rawEvent.computer,
                ip: rawEvent.event_data?.IpAddress ? [rawEvent.event_data.IpAddress] : [],
            },
            metadata: rawEvent.metadata || {
                parser: 'evtx_parser',
                version: '1.0',
                source_type: 'windows_evtx'
            },
            rawEvent: rawEvent.raw_xml || JSON.stringify(rawEvent),
        };
        // Add user information if available
        if (rawEvent.event_data?.TargetUserName || rawEvent.event_data?.SubjectUserName) {
            normalized.user = {
                username: rawEvent.event_data.TargetUserName || rawEvent.event_data.SubjectUserName,
                userId: rawEvent.event_data.TargetUserSid || rawEvent.event_data.SubjectUserSid,
                domain: rawEvent.event_data.TargetDomainName || rawEvent.event_data.SubjectDomainName,
            };
        }
        // Add process information if available
        if (rawEvent.process_id || rawEvent.event_data?.NewProcessId) {
            normalized.process = {
                pid: parseInt(rawEvent.process_id || rawEvent.event_data.NewProcessId, 10),
                name: rawEvent.event_data?.NewProcessName || rawEvent.event_data?.ProcessName || 'unknown',
                commandLine: rawEvent.event_data?.CommandLine,
                parentPid: rawEvent.event_data?.CreatorProcessId ? parseInt(rawEvent.event_data.CreatorProcessId, 10) : undefined,
                parentName: rawEvent.event_data?.CreatorProcessName,
            };
        }
        // Add network information if available
        if (rawEvent.event_data?.IpAddress) {
            normalized.network = {
                sourceIp: rawEvent.event_data.IpAddress,
                sourcePort: rawEvent.event_data.IpPort ? parseInt(rawEvent.event_data.IpPort, 10) : undefined,
                direction: 'inbound',
            };
        }
        return normalized;
    }
    normalizeWindowsEvent(rawEvent) {
        const winEvent = JSON.parse(rawEvent.rawData.toString());
        // Map Windows event levels to our severity
        const severity = this.severityMapper.mapWindowsLevel(winEvent.level);
        // Classify event category based on event ID and channel
        const category = this.categoryClassifier.classifyWindowsEvent(winEvent.eventId, winEvent.channel, winEvent.provider.name);
        // Extract structured fields
        const fields = this.extractWindowsFields(winEvent);
        // Build normalized event
        const normalized = {
            id: rawEvent.id,
            timestamp: rawEvent.timestamp,
            source: rawEvent.source,
            severity,
            category,
            message: this.buildWindowsMessage(winEvent),
            fields,
            tags: this.buildWindowsTags(winEvent),
            host: {
                hostname: winEvent.computer,
                ip: [],
                domain: this.extractDomain(winEvent.computer),
            },
            metadata: rawEvent.metadata,
            rawEvent: rawEvent.rawData.toString(),
        };
        // Add optional fields if present
        if (winEvent.security?.userId) {
            normalized.user = {
                username: winEvent.security.userId,
                userId: winEvent.security.userSid,
            };
        }
        // Extract process info if available
        const processInfo = this.extractWindowsProcessInfo(winEvent);
        if (processInfo) {
            normalized.process = processInfo;
        }
        // Extract network info if available
        const networkInfo = this.extractWindowsNetworkInfo(winEvent);
        if (networkInfo) {
            normalized.network = networkInfo;
        }
        return normalized;
    }
    normalizeSyslogEvent(rawEvent) {
        const syslogEvent = JSON.parse(rawEvent.rawData.toString());
        const severity = this.severityMapper.mapSyslogSeverity(syslogEvent.severity);
        const category = this.categoryClassifier.classifySyslogEvent(syslogEvent.facility, syslogEvent.appName || '', syslogEvent.message);
        const fields = this.fieldExtractor.extractFromMessage(syslogEvent.message);
        return {
            id: rawEvent.id,
            timestamp: syslogEvent.timestamp,
            source: rawEvent.source,
            severity,
            category,
            message: syslogEvent.message,
            fields: {
                ...fields,
                facility: syslogEvent.facility,
                facilityName: this.getFacilityName(syslogEvent.facility),
                ...(syslogEvent.structuredData || {}),
            },
            tags: this.buildSyslogTags(syslogEvent),
            host: {
                hostname: syslogEvent.hostname,
                ip: [],
            },
            process: syslogEvent.appName ? {
                pid: syslogEvent.procId ? parseInt(syslogEvent.procId, 10) : 0,
                name: syslogEvent.appName,
            } : undefined,
            metadata: rawEvent.metadata,
            rawEvent: rawEvent.rawData.toString(),
        };
    }
    normalizeCloudTrailEvent(rawEvent) {
        const cloudTrailEvent = JSON.parse(rawEvent.rawData.toString());
        return {
            id: rawEvent.id,
            timestamp: new Date(cloudTrailEvent.eventTime),
            source: rawEvent.source,
            severity: this.determineCloudTrailSeverity(cloudTrailEvent),
            category: LogCategory.AUDIT,
            message: `${cloudTrailEvent.eventName} by ${cloudTrailEvent.userIdentity?.principalId || 'unknown'}`,
            fields: {
                eventVersion: cloudTrailEvent.eventVersion,
                eventName: cloudTrailEvent.eventName,
                eventSource: cloudTrailEvent.eventSource,
                awsRegion: cloudTrailEvent.awsRegion,
                sourceIPAddress: cloudTrailEvent.sourceIPAddress,
                userAgent: cloudTrailEvent.userAgent,
                errorCode: cloudTrailEvent.errorCode,
                errorMessage: cloudTrailEvent.errorMessage,
                requestParameters: cloudTrailEvent.requestParameters,
                responseElements: cloudTrailEvent.responseElements,
            },
            tags: [
                'aws',
                'cloudtrail',
                cloudTrailEvent.eventType,
                cloudTrailEvent.readOnly ? 'read-only' : 'write',
            ].filter(Boolean),
            host: {
                hostname: cloudTrailEvent.recipientAccountId,
                ip: cloudTrailEvent.sourceIPAddress ? [cloudTrailEvent.sourceIPAddress] : [],
            },
            user: this.extractCloudTrailUser(cloudTrailEvent.userIdentity),
            network: {
                sourceIp: cloudTrailEvent.sourceIPAddress,
            },
            metadata: rawEvent.metadata,
            rawEvent: rawEvent.rawData.toString(),
        };
    }
    normalizeAzureActivityEvent(rawEvent) {
        const azureEvent = JSON.parse(rawEvent.rawData.toString());
        return {
            id: rawEvent.id,
            timestamp: new Date(azureEvent.time),
            source: rawEvent.source,
            severity: this.mapAzureLevel(azureEvent.level),
            category: this.classifyAzureCategory(azureEvent.category),
            message: azureEvent.operationName,
            fields: {
                correlationId: azureEvent.correlationId,
                subscriptionId: azureEvent.subscriptionId,
                resourceGroupName: azureEvent.resourceGroupName,
                resourceProviderName: azureEvent.resourceProviderName,
                resourceId: azureEvent.resourceId,
                operationId: azureEvent.operationId,
                operationName: azureEvent.operationName,
                status: azureEvent.status,
                subStatus: azureEvent.subStatus,
                claims: azureEvent.claims,
                properties: azureEvent.properties,
            },
            tags: [
                'azure',
                azureEvent.category,
                azureEvent.resourceProviderName,
            ].filter(Boolean),
            host: {
                hostname: azureEvent.resourceId,
                ip: [],
            },
            user: azureEvent.caller ? {
                username: azureEvent.caller,
            } : undefined,
            metadata: rawEvent.metadata,
            rawEvent: rawEvent.rawData.toString(),
        };
    }
    normalizeGCPLoggingEvent(rawEvent) {
        const gcpEvent = JSON.parse(rawEvent.rawData.toString());
        return {
            id: rawEvent.id,
            timestamp: new Date(gcpEvent.timestamp),
            source: rawEvent.source,
            severity: this.mapGCPSeverity(gcpEvent.severity),
            category: this.classifyGCPCategory(gcpEvent),
            message: gcpEvent.textPayload || gcpEvent.jsonPayload?.message || JSON.stringify(gcpEvent.jsonPayload),
            fields: {
                logName: gcpEvent.logName,
                resource: gcpEvent.resource,
                insertId: gcpEvent.insertId,
                labels: gcpEvent.labels,
                operation: gcpEvent.operation,
                trace: gcpEvent.trace,
                spanId: gcpEvent.spanId,
                traceSampled: gcpEvent.traceSampled,
                sourceLocation: gcpEvent.sourceLocation,
                ...(gcpEvent.jsonPayload || {}),
            },
            tags: [
                'gcp',
                gcpEvent.resource?.type,
                ...(gcpEvent.labels ? Object.keys(gcpEvent.labels) : []),
            ].filter(Boolean),
            host: {
                hostname: gcpEvent.resource?.labels?.instance_id || gcpEvent.resource?.labels?.project_id || 'unknown',
                ip: [],
            },
            metadata: rawEvent.metadata,
            rawEvent: rawEvent.rawData.toString(),
        };
    }
    normalizeGenericEvent(rawEvent) {
        const message = rawEvent.rawData.toString();
        const fields = this.fieldExtractor.extractFromMessage(message);
        return {
            id: rawEvent.id,
            timestamp: rawEvent.timestamp,
            source: rawEvent.source,
            severity: LogSeverity.INFO,
            category: LogCategory.APPLICATION,
            message,
            fields,
            tags: [],
            host: {
                hostname: 'unknown',
                ip: [],
            },
            metadata: rawEvent.metadata,
            rawEvent: message,
        };
    }
    // Helper methods
    extractWindowsFields(event) {
        return {
            eventId: event.eventId,
            eventRecordId: event.eventRecordId,
            level: event.level,
            task: event.task,
            opcode: event.opcode,
            keywords: event.keywords,
            channel: event.channel,
            provider: event.provider,
            ...(event.eventData || {}),
            ...(event.userDefinedData || {}),
        };
    }
    buildWindowsMessage(event) {
        // Build a human-readable message from Windows event
        const baseMessage = `Event ${event.eventId} from ${event.provider.name}`;
        // Add common event descriptions
        const descriptions = {
            4624: 'An account was successfully logged on',
            4625: 'An account failed to log on',
            4634: 'An account was logged off',
            4648: 'A logon was attempted using explicit credentials',
            4672: 'Special privileges assigned to new logon',
            4688: 'A new process has been created',
            4689: 'A process has exited',
            4698: 'A scheduled task was created',
            4699: 'A scheduled task was deleted',
            4700: 'A scheduled task was enabled',
            4701: 'A scheduled task was disabled',
            4702: 'A scheduled task was updated',
        };
        return descriptions[event.eventId] || baseMessage;
    }
    buildWindowsTags(event) {
        const tags = ['windows'];
        // Add channel as tag
        tags.push(event.channel.toLowerCase().replace(/\s+/g, '-'));
        // Add keywords as tags
        tags.push(...event.keywords.map(k => k.toLowerCase().replace(/\s+/g, '-')));
        // Add security-related tags
        if (event.channel === 'Security' || event.keywords.includes('Audit')) {
            tags.push('security', 'audit');
        }
        return [...new Set(tags)]; // Remove duplicates
    }
    extractDomain(hostname) {
        const parts = hostname.split('.');
        if (parts.length > 1) {
            return parts.slice(1).join('.');
        }
        return undefined;
    }
    extractWindowsProcessInfo(event) {
        const eventData = event.eventData;
        if (!eventData)
            return undefined;
        if (eventData.ProcessId || eventData.NewProcessId) {
            return {
                pid: parseInt(eventData.ProcessId || eventData.NewProcessId, 10),
                name: eventData.ProcessName || eventData.NewProcessName || 'unknown',
                path: eventData.ProcessPath,
                commandLine: eventData.CommandLine,
                parentPid: eventData.ParentProcessId ? parseInt(eventData.ParentProcessId, 10) : undefined,
                parentName: eventData.ParentProcessName,
                user: eventData.SubjectUserName,
            };
        }
        return undefined;
    }
    extractWindowsNetworkInfo(event) {
        const eventData = event.eventData;
        if (!eventData || !eventData.IpAddress)
            return undefined;
        return {
            sourceIp: eventData.IpAddress,
            sourcePort: eventData.IpPort ? parseInt(eventData.IpPort, 10) : undefined,
            direction: 'inbound',
        };
    }
    buildSyslogTags(event) {
        const tags = ['syslog'];
        if (event.appName) {
            tags.push(event.appName.toLowerCase());
        }
        tags.push(this.getFacilityName(event.facility));
        tags.push(this.getSeverityName(event.severity));
        return tags;
    }
    getFacilityName(facility) {
        const facilities = [
            'kern', 'user', 'mail', 'daemon', 'auth', 'syslog', 'lpr', 'news',
            'uucp', 'cron', 'authpriv', 'ftp', 'ntp', 'security', 'console', 'solaris-cron',
            'local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7'
        ];
        return facilities[facility] || `facility${facility}`;
    }
    getSeverityName(severity) {
        const severities = [
            'emerg', 'alert', 'crit', 'err', 'warning', 'notice', 'info', 'debug'
        ];
        return severities[severity] || `severity${severity}`;
    }
    determineCloudTrailSeverity(event) {
        if (event.errorCode || event.errorMessage) {
            return LogSeverity.HIGH;
        }
        const sensitiveActions = [
            'DeleteBucket', 'PutBucketPolicy', 'DeleteTrail', 'StopLogging',
            'DeleteAccessKey', 'CreateAccessKey', 'AttachUserPolicy', 'DetachUserPolicy',
            'PutUserPolicy', 'DeleteUserPolicy', 'CreateUser', 'DeleteUser',
            'AssumeRole', 'AssumeRoleWithSAML', 'AssumeRoleWithWebIdentity'
        ];
        if (sensitiveActions.includes(event.eventName)) {
            return LogSeverity.MEDIUM;
        }
        return LogSeverity.INFO;
    }
    extractCloudTrailUser(userIdentity) {
        if (!userIdentity)
            return undefined;
        return {
            username: userIdentity.userName || userIdentity.principalId,
            userId: userIdentity.accountId,
            groups: userIdentity.sessionContext?.sessionIssuer?.type ?
                [userIdentity.sessionContext.sessionIssuer.type] : undefined,
        };
    }
    mapAzureLevel(level) {
        const mapping = {
            'Critical': LogSeverity.CRITICAL,
            'Error': LogSeverity.HIGH,
            'Warning': LogSeverity.MEDIUM,
            'Informational': LogSeverity.INFO,
            'Verbose': LogSeverity.DEBUG,
        };
        return mapping[level] || LogSeverity.INFO;
    }
    classifyAzureCategory(category) {
        const mapping = {
            'Administrative': LogCategory.AUDIT,
            'Security': LogCategory.SECURITY,
            'ServiceHealth': LogCategory.SYSTEM,
            'Alert': LogCategory.THREAT,
            'Autoscale': LogCategory.SYSTEM,
            'Policy': LogCategory.COMPLIANCE,
            'Recommendation': LogCategory.SYSTEM,
        };
        return mapping[category] || LogCategory.APPLICATION;
    }
    mapGCPSeverity(severity) {
        const mapping = {
            'EMERGENCY': LogSeverity.CRITICAL,
            'ALERT': LogSeverity.CRITICAL,
            'CRITICAL': LogSeverity.CRITICAL,
            'ERROR': LogSeverity.HIGH,
            'WARNING': LogSeverity.MEDIUM,
            'NOTICE': LogSeverity.LOW,
            'INFO': LogSeverity.INFO,
            'DEBUG': LogSeverity.DEBUG,
        };
        return mapping[severity] || LogSeverity.INFO;
    }
    classifyGCPCategory(event) {
        if (event.logName?.includes('audit')) {
            return LogCategory.AUDIT;
        }
        if (event.resource?.type === 'gce_instance' || event.resource?.type === 'k8s_cluster') {
            return LogCategory.SYSTEM;
        }
        if (event.logName?.includes('security')) {
            return LogCategory.SECURITY;
        }
        return LogCategory.APPLICATION;
    }
    // Enhanced Windows Event processing methods
    mapWindowsEventSeverity(eventId, level) {
        // Critical security events
        const criticalEvents = [1102]; // Log cleared
        if (criticalEvents.includes(eventId)) {
            return LogSeverity.CRITICAL;
        }
        // High severity events
        const highSeverityEvents = [4625, 4740]; // Failed logon, account lockout
        if (highSeverityEvents.includes(eventId)) {
            return LogSeverity.HIGH;
        }
        // Medium severity events
        const mediumSeverityEvents = [4624, 4688, 7045, 4698, 4103, 4104]; // Successful logon, process creation, service install, task creation, PowerShell
        if (mediumSeverityEvents.includes(eventId)) {
            return LogSeverity.MEDIUM;
        }
        // Map by Windows level if available
        if (level) {
            const levelLower = level.toLowerCase();
            if (levelLower === 'critical')
                return LogSeverity.CRITICAL;
            if (levelLower === 'error')
                return LogSeverity.HIGH;
            if (levelLower === 'warning')
                return LogSeverity.MEDIUM;
            if (levelLower === 'information')
                return LogSeverity.INFO;
            if (levelLower === 'verbose')
                return LogSeverity.DEBUG;
        }
        return LogSeverity.INFO;
    }
    classifyWindowsEventCategory(eventId, channel) {
        // Security events
        if (channel === 'Security') {
            const authEvents = [4624, 4625, 4634, 4648, 4672]; // Authentication related
            if (authEvents.includes(eventId)) {
                return LogCategory.SECURITY;
            }
            const processEvents = [4688, 4689]; // Process related
            if (processEvents.includes(eventId)) {
                return LogCategory.SYSTEM;
            }
            const taskEvents = [4698, 4699, 4700, 4701, 4702]; // Scheduled task related
            if (taskEvents.includes(eventId)) {
                return LogCategory.SYSTEM;
            }
            const auditEvents = [1102]; // Audit log related
            if (auditEvents.includes(eventId)) {
                return LogCategory.AUDIT;
            }
            return LogCategory.SECURITY;
        }
        // System events
        if (channel === 'System') {
            const serviceEvents = [7045, 7036]; // Service related
            if (serviceEvents.includes(eventId)) {
                return LogCategory.SYSTEM;
            }
            return LogCategory.SYSTEM;
        }
        // PowerShell events
        if (channel.includes('PowerShell')) {
            return LogCategory.APPLICATION;
        }
        return LogCategory.APPLICATION;
    }
    buildWindowsEventMessage(eventId, eventData) {
        const descriptions = {
            4624: 'An account was successfully logged on',
            4625: 'An account failed to log on',
            4634: 'An account was logged off',
            4648: 'A logon was attempted using explicit credentials',
            4672: 'Special privileges assigned to new logon',
            4688: 'A new process has been created',
            4689: 'A process has exited',
            4698: 'A scheduled task was created',
            4699: 'A scheduled task was deleted',
            4700: 'A scheduled task was enabled',
            4701: 'A scheduled task was disabled',
            4702: 'A scheduled task was updated',
            7045: 'A service was installed on the system',
            7036: 'A service entered the running state',
            1102: 'The audit log was cleared',
            4103: 'PowerShell module logging',
            4104: 'PowerShell script block logging'
        };
        let message = descriptions[eventId] || `Windows Event ${eventId}`;
        // Add contextual information
        if (eventData) {
            if (eventData.TargetUserName) {
                message += ` (User: ${eventData.TargetUserName})`;
            }
            if (eventData.NewProcessName) {
                message += ` (Process: ${eventData.NewProcessName})`;
            }
            if (eventData.ServiceName) {
                message += ` (Service: ${eventData.ServiceName})`;
            }
            if (eventData.TaskName) {
                message += ` (Task: ${eventData.TaskName})`;
            }
        }
        return message;
    }
    buildWindowsEVTXTags(event) {
        const tags = ['windows', 'evtx'];
        // Add channel tag
        if (event.channel) {
            tags.push(event.channel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
        }
        // Add event-specific tags
        if (event.event_id) {
            tags.push(`event-${event.event_id}`);
            // Add semantic tags based on event ID
            const authEvents = [4624, 4625, 4634, 4648, 4672];
            const processEvents = [4688, 4689];
            const serviceEvents = [7045, 7036];
            const taskEvents = [4698, 4699, 4700, 4701, 4702];
            const powershellEvents = [4103, 4104];
            const auditEvents = [1102];
            if (authEvents.includes(event.event_id)) {
                tags.push('authentication');
            }
            if (processEvents.includes(event.event_id)) {
                tags.push('process');
            }
            if (serviceEvents.includes(event.event_id)) {
                tags.push('service');
            }
            if (taskEvents.includes(event.event_id)) {
                tags.push('scheduled-task');
            }
            if (powershellEvents.includes(event.event_id)) {
                tags.push('powershell');
            }
            if (auditEvents.includes(event.event_id)) {
                tags.push('audit', 'critical');
            }
            // Add failure/success tags
            if (event.event_id === 4625) {
                tags.push('failure', 'failed-logon');
            }
            if (event.event_id === 4624) {
                tags.push('success', 'successful-logon');
            }
        }
        // Add computer/hostname tag
        if (event.computer) {
            tags.push(`host-${event.computer.toLowerCase()}`);
        }
        // Add user tags if available
        if (event.event_data?.TargetUserName) {
            tags.push(`user-${event.event_data.TargetUserName.toLowerCase()}`);
        }
        // Add source file tag if from EVTX import
        if (event.source_file) {
            tags.push('evtx-import');
        }
        return [...new Set(tags)]; // Remove duplicates
    }
}
//# sourceMappingURL=log-normalizer.js.map