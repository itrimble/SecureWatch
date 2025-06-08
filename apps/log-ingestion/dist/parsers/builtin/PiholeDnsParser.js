/**
 * Pi-hole DNS Parser
 *
 * Parses DNS query logs from Pi-hole, a popular open-source network-wide
 * ad blocker and DNS sinkhole.
 * Example Format: MMM DD HH:mm:ss dnsmasq[PID]: query[TYPE] domain.com from client-ip
 * Example Format: MMM DD HH:mm:ss dnsmasq[PID]: /etc/pihole/gravity.list domain.com is client-ip
 */
export class PiholeDnsParser {
    id = 'pihole-dns';
    name = 'Pi-hole DNS';
    vendor = 'Pi-hole';
    logSource = 'pihole:dns';
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
    queryRegex = /dnsmasq\[\d+\]: query\[(\w+)\] ([\w.-]+) from ([\d\.]+)/;
    blockRegex = /dnsmasq\[\d+\]: \S+ ([\w.-]+) is ([\d\.]+)/;
    validate(rawLog) {
        return rawLog.includes('dnsmasq[');
    }
    parse(rawLog) {
        let match = rawLog.match(this.queryRegex);
        if (match) {
            const [, queryType, domain, clientIp] = match;
            return {
                timestamp: new Date(), // Assumes syslog timestamp is handled upstream
                source: 'pi-hole',
                category: 'network',
                action: 'dns_query',
                outcome: 'success',
                severity: 'low',
                rawData: rawLog,
                custom: { pihole: { type: 'query', queryType, domain, clientIp } }
            };
        }
        match = rawLog.match(this.blockRegex);
        if (match) {
            const [, domain, clientIp] = match;
            return {
                timestamp: new Date(),
                source: 'pi-hole',
                category: 'network',
                action: 'dns_query_blocked',
                outcome: 'failure',
                severity: 'medium',
                rawData: rawLog,
                custom: { pihole: { type: 'block', domain, clientIp } }
            };
        }
        return null;
    }
    normalize(event) {
        const data = event.custom.pihole;
        return {
            '@timestamp': event.timestamp.toISOString(),
            'message': `Pi-hole DNS ${data.type}: ${data.domain} from ${data.clientIp}`,
            'event.kind': event.outcome === 'failure' ? 'alert' : 'event',
            'event.category': ['network'],
            'event.type': ['protocol'],
            'event.action': event.action,
            'event.outcome': event.outcome,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'log.level': event.severity,
            'log.original': event.rawData,
            'dns.question.name': data.domain,
            'dns.question.type': data.queryType,
            'source.ip': data.clientIp,
            'observer.vendor': this.vendor,
            'observer.product': 'Pi-hole',
            'observer.type': 'dns-filter',
            'securewatch.parser.id': this.id,
            'securewatch.parser.name': this.name,
            'securewatch.parser.version': this.version,
            'securewatch.confidence': 0.83,
            'securewatch.severity': event.severity,
        };
    }
    mapSeverityToNumber(severity) {
        const mapping = { 'low': 25, 'medium': 50, 'high': 75 };
        return mapping[severity] || 25;
    }
}
//# sourceMappingURL=PiholeDnsParser.js.map