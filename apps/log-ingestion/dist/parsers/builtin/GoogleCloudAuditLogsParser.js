/**
 * Google Cloud Platform (GCP) Audit Logs Parser
 *
 * Parses audit logs from GCP, covering Admin Activity, Data Access,
 * and System Event logs. These logs provide critical visibility into actions
 * performed on the GCP platform.
 */
export class GoogleCloudAuditLogsParser {
    id = 'gcp-audit-logs';
    name = 'Google Cloud Audit Logs';
    vendor = 'Google';
    logSource = 'gcp:audit';
    version = '1.0.0';
    format = 'json';
    category = 'cloud';
    priority = 88;
    enabled = true;
    config = {
        enabled: true,
        priority: 88,
        timeout: 5000,
        maxSize: 100000,
    };
    validate(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            return data.protoPayload && data.protoPayload['@type'] === 'type.googleapis.com/google.cloud.audit.AuditLog';
        }
        catch (error) {
            return false;
        }
    }
    parse(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            const payload = data.protoPayload;
            const event = {
                timestamp: new Date(data.timestamp),
                source: payload.serviceName,
                category: 'cloud',
                action: payload.methodName,
                outcome: payload.status && payload.status.code !== 0 ? 'failure' : 'success',
                severity: payload.status && payload.status.code !== 0 ? 'medium' : 'low',
                rawData: rawLog,
                custom: {
                    gcp: data
                }
            };
            return event;
        }
        catch (error) {
            console.error('Error parsing GCP Audit Log:', error);
            return null;
        }
    }
    normalize(event) {
        const data = event.custom.gcp;
        const payload = data.protoPayload;
        const normalized = {
            '@timestamp': event.timestamp.toISOString(),
            'event.kind': 'event',
            'event.category': [event.category, 'cloud'],
            'event.type': ['access'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity_name': event.severity,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'cloud.provider': 'gcp',
            'cloud.service.name': payload.serviceName,
            'cloud.project.id': data.resource?.labels?.project_id,
            'user.name': payload.authenticationInfo?.principalEmail,
            'source.ip': payload.requestMetadata?.callerIp,
            'observer.vendor': this.vendor,
            'observer.product': 'Google Cloud Logging',
            'observer.type': 'cloud',
            'securewatch.parser.id': this.id,
            'securewatch.parser.version': this.version,
            'securewatch.parser.name': this.name,
            'securewatch.confidence': 0.9,
            'securewatch.severity': event.severity,
            'raw_log': event.rawData,
        };
        return normalized;
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
}
//# sourceMappingURL=GoogleCloudAuditLogsParser.js.map