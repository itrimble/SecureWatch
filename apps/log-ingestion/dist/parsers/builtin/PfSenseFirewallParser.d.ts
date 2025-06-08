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
export declare class PfSenseFirewallParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "csv";
    category: "network";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    private readonly filterlogRegex;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverityToNumber;
}
//# sourceMappingURL=PfSenseFirewallParser.d.ts.map