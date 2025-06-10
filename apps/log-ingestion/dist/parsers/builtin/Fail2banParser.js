/**
 * Fail2ban Log Parser
 *
 * Parses logs from Fail2ban, an intrusion prevention software framework that
 * protects computer servers from brute-force attacks.
 */
export class Fail2banParser {
    id = 'fail2ban';
    name = 'Fail2ban';
    vendor = 'Fail2ban';
    logSource = 'fail2ban:log';
    version = '1.0.0';
    format = 'syslog';
    category = 'host';
    priority = 85;
    enabled = true;
    config = {
        enabled: true,
        priority: 85,
        timeout: 5000,
        maxSize: 50000,
    };
    fail2banRegex = /fail2ban\.actions\s+\[(\d+)\]: (NOTICE|WARNING) \[([^\]]+)\] (Ban|Unban) ([\d\.]+)/;
    validate(rawLog) {
        return rawLog.includes('fail2ban.actions');
    }
    parse(rawLog) {
        const match = rawLog.match(this.fail2banRegex);
        if (!match)
            return null;
        const [, , level, jail, action, ip] = match;
        return {
            timestamp: new Date(), // Assumes syslog timestamp
            source: 'fail2ban-host',
            category: 'host',
            action: `${action.toLowerCase()}_ip`,
            outcome: 'success',
            severity: action === 'Ban' ? 'high' : 'low',
            rawData: rawLog,
            custom: {
                fail2ban: { level, jail, action, ip }
            }
        };
    }
    normalize(event) {
        const data = event.custom.fail2ban;
        return {
            '@timestamp': event.timestamp.toISOString(),
            'message': `Fail2ban [${data.jail}]: ${data.action} ${data.ip}`,
            'event.kind': 'alert',
            'event.category': ['host', 'intrusion_detection'],
            'event.type': ['info'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'log.level': event.severity,
            'log.original': event.rawData,
            'source.ip': data.ip,
            'rule.name': data.jail,
            'observer.vendor': this.vendor,
            'observer.product': 'Fail2ban',
            'observer.type': 'hids',
            'securewatch.parser.id': this.id,
            'securewatch.parser.name': this.name,
            'securewatch.parser.version': this.version,
        };
    }
    mapSeverityToNumber(severity) {
        const mapping = { 'low': 25, 'medium': 50, 'high': 75 };
        return mapping[severity] || 25;
    }
}
//# sourceMappingURL=Fail2banParser.js.map