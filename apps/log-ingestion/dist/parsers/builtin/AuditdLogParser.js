/**
 * Linux Audit Daemon (auditd) Parser
 *
 * Parses logs from the Linux audit framework. These logs are typically in a
 * key-value pair format and provide highly detailed information about security-relevant
 * events on a system.
 */
export class AuditdLogParser {
    id = 'linux-auditd';
    name = 'Linux Auditd';
    vendor = 'Linux';
    logSource = 'auditd:log';
    version = '1.0.0';
    format = 'custom';
    category = 'host';
    priority = 90;
    enabled = true;
    config = {
        enabled: true,
        priority: 90,
        timeout: 5000,
        maxSize: 50000,
    };
    validate(rawLog) {
        return rawLog.startsWith('type=') && rawLog.includes('audit(');
    }
    parse(rawLog) {
        const fields = this.parseKeyValue(rawLog);
        const timestampMatch = fields.audit.match(/(\d+)\.\d+:\d+/);
        return {
            timestamp: timestampMatch ? new Date(parseInt(timestampMatch[1], 10) * 1000) : new Date(),
            source: fields.hostname || 'linux-host',
            category: 'host',
            action: fields.type,
            outcome: fields.res === 'success' ? 'success' : 'failure',
            severity: 'medium',
            rawData: rawLog,
            custom: {
                auditd: fields
            }
        };
    }
    normalize(event) {
        const data = event.custom.auditd;
        return {
            '@timestamp': event.timestamp.toISOString(),
            'message': `Auditd event type=${data.type} syscall=${data.syscall} auid=${data.auid}`,
            'event.kind': 'event',
            'event.category': ['host', 'audit'],
            'event.type': ['info'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity': 50,
            'log.level': 'medium',
            'log.original': event.rawData,
            'user.id': data.auid,
            'user.name': data.aunreal,
            'process.pid': data.pid ? parseInt(data.pid, 10) : undefined,
            'process.executable': data.exe,
            'host.hostname': data.hostname,
            'observer.vendor': this.vendor,
            'observer.product': 'auditd',
            'observer.type': 'host-auditing',
            'securewatch.parser.id': this.id,
            'securewatch.parser.name': this.name,
            'securewatch.parser.version': this.version,
        };
    }
    parseKeyValue(log) {
        const data = {};
        const regex = /(\S+)=("([^"]*)"|'([^']*)'|(\S+))/g;
        let match;
        while ((match = regex.exec(log)) !== null) {
            data[match[1]] = match[3] || match[4] || match[5];
        }
        return data;
    }
}
//# sourceMappingURL=AuditdLogParser.js.map