/**
 * AdGuard Home DNS Parser
 *
 * Parses DNS query logs from AdGuard Home, a network-wide ad- and tracker-blocking
 * DNS server. Its logs are similar to Pi-hole but often in a more structured format.
 */
export class AdGuardHomeParser {
    id = 'adguard-home-dns';
    name = 'AdGuard Home DNS';
    vendor = 'AdGuard';
    logSource = 'adguard:dns';
    version = '1.0.0';
    format = 'syslog';
    category = 'network';
    priority = 80;
    enabled = true;
    config = {
        enabled: true,
        priority: 80,
        timeout: 5000,
        maxSize: 50000,
    };
    queryRegex = /\[info\] ([^:]+): successfully resolved ([\w.-]+) to ([\d\.]+)/;
    blockRegex = /\[info\] ([^:]+): blocked ([\w.-]+) by ([\w\s]+)/;
    validate(rawLog) {
        return rawLog.includes('AdGuardHome');
    }
    parse(rawLog) {
        let match = rawLog.match(this.queryRegex);
        if (match) {
            const [, client, domain] = match;
            return {
                timestamp: new Date(),
                source: 'adguard-home',
                category: 'network',
                action: 'dns_query',
                outcome: 'success',
                severity: 'low',
                rawData: rawLog,
                custom: { adguard: { type: 'query', domain, clientIp: client.trim() } }
            };
        }
        match = rawLog.match(this.blockRegex);
        if (match) {
            const [, client, domain, reason] = match;
            return {
                timestamp: new Date(),
                source: 'adguard-home',
                category: 'network',
                action: 'dns_query_blocked',
                outcome: 'failure',
                severity: 'medium',
                rawData: rawLog,
                custom: { adguard: { type: 'block', domain, clientIp: client.trim(), reason } }
            };
        }
        return null;
    }
    normalize(event) {
        const data = event.custom.adguard;
        return {
            '@timestamp': event.timestamp.toISOString(),
            'message': `AdGuard Home DNS ${data.type}: ${data.domain} from ${data.clientIp}`,
            'event.kind': event.outcome === 'failure' ? 'alert' : 'event',
            'event.category': ['network'],
            'event.type': ['protocol'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'log.level': event.severity,
            'log.original': event.rawData,
            'dns.question.name': data.domain,
            'source.ip': data.clientIp,
            'rule.name': data.reason,
            'observer.vendor': this.vendor,
            'observer.product': 'AdGuard Home',
            'observer.type': 'dns-filter',
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
//# sourceMappingURL=AdGuardHomeParser.js.map