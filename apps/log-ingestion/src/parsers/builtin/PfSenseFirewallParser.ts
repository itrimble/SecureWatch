// apps/log-ingestion/src/parsers/builtin/PfSenseFirewallParser.ts
import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';

/**
 * pfSense Firewall Parser
 *
 * Parses filter log (firewall) events from pfSense, a popular open-source
 * firewall distribution. These logs are typically sent via syslog and are
 * in a specific CSV format.
 * Format: rule,sub-rule,anchor,tracker,if,reason,action,dir,ip-version,tos,ecn,ttl,id,offset,flags,proto,proto-id,length,src,dst,sport,dport,datalen
 * * ### Additional Recommended Data Sources for Comprehensive Visibility
 * * To enhance security analytics, this parser can be extended to cover other critical log types from pfSense and related open-source tools.
 * * - **Firewall Logs**: Parse pfSense’s native firewall logs for detailed information on allowed and blocked traffic, source/destination IPs, ports, protocols, and actions.
 * - **DHCP Logs**: Useful for mapping IP addresses to device hostnames and MAC addresses, which helps correlate network activity to specific devices.
 * - **VPN Logs**: If you use VPN services (OpenVPN, IPsec, WireGuard) on pfSense, parsing these logs will let you track remote access, session durations, and authentication events.
 * - **IDS/IPS Logs**: If you run Suricata or Snort on pfSense, their logs will provide intrusion detection and prevention events, signatures, and threat intelligence.
 * - **pfBlockerNG Logs**: If you use pfBlockerNG for DNS filtering or geoblocking, its logs reveal blocked domains, IPs, and threat categories.
 * - **Pi-hole Query and Block Lists**: Beyond basic DNS queries, parse Pi-hole’s blocklist updates, gravity list changes, and client activity for better DNS analytics.
 * - **System and Authentication Logs**: pfSense and Pi-hole both generate system logs (e.g., SSH logins, configuration changes, service restarts) that are crucial for auditing and detecting unauthorized access.
 * - **Netflow/sFlow/IPFIX Data**: If available, parsing flow data can provide granular visibility into network traffic patterns and bandwidth usage.
 * - **AdGuard Home Logs**: If you use AdGuard Home as an alternative or alongside Pi-hole, its logs offer similar DNS and filtering analytics.
 * - **SARG or Cache Manager Reports (for Squid)**: These provide summarized reports of proxy usage, user activity, and accessed sites.
 *
 * ### Summary Table
 *
 * | Source                | Key Insights Provided                                |
 * |-----------------------|------------------------------------------------------|
 * | Firewall Logs         | Traffic allowed/blocked, source/dest IPs, ports      |
 * | DHCP Logs             | Device mapping, IP-to-hostname/MAC correlation       |
 * | VPN Logs              | Remote access, session tracking, authentication      |
 * | IDS/IPS Logs          | Threat detection, attack signatures, alerts          |
 * | pfBlockerNG Logs      | DNS/IP block events, threat categories               |
 * | Pi-hole Blocklists    | Blocked domains, list updates, client activity       |
 * | System/Auth Logs      | Logins, config changes, service status               |
 * | Netflow/sFlow/IPFIX   | Traffic patterns, bandwidth, flow records            |
 * | AdGuard Home Logs     | DNS queries, block events, client activity           |
 * | SARG/Cache Reports    | Proxy usage summaries, user web access               |
 *
 */
export class PfSenseFirewallParser implements LogParser {
  id = 'pfsense-firewall';
  name = 'pfSense Firewall';
  vendor = 'Netgate';
  logSource = 'pfsense:filterlog';
  version = '1.0.0';
  format = 'csv' as const;
  category = 'network' as const;
  priority = 85;
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 85,
    timeout: 5000,
    maxSize: 50000,
  };
  
  // Regex to find the pfSense filterlog message within a syslog line
  private readonly filterlogRegex = /filterlog\[\d+\]: (.*)/;

  validate(rawLog: string): boolean {
    return rawLog.includes('filterlog[');
  }

  parse(rawLog: string): ParsedEvent | null {
    const match = rawLog.match(this.filterlogRegex);
    if (!match || !match[1]) return null;

    const fields = match[1].split(',');
    if (fields.length < 22) return null; // Ensure it has enough fields

    const action = fields[6];
    const direction = fields[7];
    
    return {
      timestamp: new Date(), // pfSense logs don't include a timestamp by default, use syslog header
      source: 'pfsense-firewall',
      category: 'network',
      action: action,
      outcome: action === 'pass' ? 'success' : 'failure',
      severity: action === 'block' ? 'medium' : 'low',
      rawData: rawLog,
      custom: {
        pfsense: {
          rule: fields[0],
          interface: fields[4],
          action,
          direction,
          protocol: fields[15],
          src_ip: fields[17],
          dst_ip: fields[18],
          src_port: fields[19],
          dst_port: fields[20],
        }
      }
    };
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const data = event.custom.pfsense;
    return {
      '@timestamp': event.timestamp.toISOString(),
      'message': `pfSense firewall ${data.action} traffic from ${data.src_ip}:${data.src_port} to ${data.dst_ip}:${data.dst_port} on interface ${data.interface}`,
      'event.kind': 'event',
      'event.category': ['network'],
      'event.type': ['connection', data.direction],
      'event.action': event.action,
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'log.level': event.severity,
      'log.original': event.rawData,
      'source.ip': data.src_ip,
      'source.port': parseInt(data.src_port, 10),
      'destination.ip': data.dst_ip,
      'destination.port': parseInt(data.dst_port, 10),
      'network.transport': data.protocol,
      'network.direction': data.direction,
      'observer.vendor': this.vendor,
      'observer.product': 'pfSense',
      'observer.type': 'firewall',
      'securewatch.parser.id': this.id,
      'securewatch.parser.name': this.name,
      'securewatch.parser.version': this.version,
      'securewatch.confidence': 0.88,
      'securewatch.severity': event.severity,
    };
  }
  
  private mapSeverityToNumber(severity: string): number {
    const mapping: Record<string, number> = { 'low': 25, 'medium': 50, 'high': 75 };
    return mapping[severity] || 25;
  }
}
