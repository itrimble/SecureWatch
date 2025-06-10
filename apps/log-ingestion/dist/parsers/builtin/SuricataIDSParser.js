import { get } from 'lodash';
/**
 * Suricata IDS/IPS Parser
 *
 * Parses EVE JSON output from Suricata, a high-performance Network Intrusion
 * Detection and Prevention System. This parser handles various event types
 * including 'alert', 'http', 'dns', 'tls', and 'fileinfo'.
 */
export class SuricataIDSParser {
    id = 'suricata-ids';
    name = 'Suricata IDS/IPS';
    vendor = 'OISF';
    logSource = 'suricata:eve';
    version = '1.0.0';
    format = 'json';
    category = 'network';
    priority = 98;
    enabled = true;
    config = {
        enabled: true,
        priority: 98,
        timeout: 5000,
        maxSize: 100000,
    };
    validate(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            return data.event_type && data.timestamp && data.src_ip;
        }
        catch (error) {
            return false;
        }
    }
    parse(rawLog) {
        try {
            const data = JSON.parse(rawLog);
            const eventType = data.event_type;
            const severity = get(data, 'alert.severity', 3); // Default to informational
            return {
                timestamp: new Date(data.timestamp),
                source: data.host || 'suricata-sensor',
                category: 'network',
                action: eventType,
                outcome: eventType === 'alert' ? 'failure' : 'success',
                severity: this.mapSeverity(severity),
                rawData: rawLog,
                custom: {
                    suricata: data
                }
            };
        }
        catch (error) {
            console.error('Error parsing Suricata log:', error);
            return null;
        }
    }
    normalize(event) {
        const data = event.custom.suricata;
        const alert = data.alert || {};
        const http = data.http || {};
        const dns = data.dns || {};
        const tls = data.tls || {};
        const normalized = {
            '@timestamp': event.timestamp.toISOString(),
            'message': alert.signature || `Suricata ${data.event_type} event from ${data.src_ip}`,
            'event.kind': data.event_type === 'alert' ? 'alert' : 'event',
            'event.category': ['network', 'intrusion_detection'],
            'event.type': ['info'],
            'event.action': alert.action || event.action,
            'event.outcome': event.outcome,
            'event.severity': this.mapSeverityToNumber(event.severity),
            'log.level': event.severity,
            'log.original': event.rawData,
            'source.ip': data.src_ip,
            'source.port': data.src_port,
            'destination.ip': data.dest_ip,
            'destination.port': data.dest_port,
            'network.transport': data.proto?.toLowerCase(),
            'network.app_protocol': data.app_proto,
            'url.full': http.hostname ? `http://${http.hostname}${http.url}` : undefined,
            'url.domain': http.hostname || dns.rrname,
            'http.request.method': http.http_method,
            'user_agent.original': http.http_user_agent,
            'dns.question.name': dns.rrname,
            'dns.question.type': dns.rrtype,
            'tls.server.issuer': tls.issuerdn,
            'tls.server.subject': tls.subject,
            'threat.indicator.name': alert.signature,
            'threat.tactic.id': [alert.category],
            'observer.vendor': this.vendor,
            'observer.product': 'Suricata',
            'observer.type': 'ids',
            'securewatch.parser.id': this.id,
            'securewatch.parser.name': this.name,
            'securewatch.parser.version': this.version,
        };
        return normalized;
    }
    mapSeverity(level) {
        if (level === 1)
            return 'high';
        if (level === 2)
            return 'medium';
        return 'low';
    }
    mapSeverityToNumber(severity) {
        const mapping = { 'low': 25, 'medium': 50, 'high': 75, 'critical': 100 };
        return mapping[severity] || 25;
    }
}
//# sourceMappingURL=SuricataIDSParser.js.map