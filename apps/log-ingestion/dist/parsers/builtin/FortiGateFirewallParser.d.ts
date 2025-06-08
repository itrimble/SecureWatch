import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig, ParserMetadata } from '../types';
/**
 * Fortinet FortiGate Firewall Parser
 *
 * Supports multiple FortiGate log types including:
 * - Traffic logs (type=traffic)
 * - UTM logs (type=utm)
 * - Event logs (type=event)
 * - Attack logs (type=attack)
 * - VPN logs (type=ipsec/vpn)
 * - Authentication logs (type=event with authentication events)
 * - Application Control logs (type=app-ctrl)
 * - URL Filtering logs (type=webfilter)
 * - DNS Filter logs (type=dns)
 *
 * FortiGate logs use key-value pair format with structured fields.
 * Format: field1=value1 field2=value2 field3="quoted value" ...
 */
export declare class FortiGateFirewallParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "network";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    metadata: ParserMetadata;
    private readonly logTypes;
    private readonly actionMappings;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private hasKeyValueFormat;
    private parseKeyValuePairs;
    private parseTimestamp;
    private calculateConfidence;
    private mapCategory;
    private mapAction;
    private mapOutcome;
    private mapSeverity;
    private mapSeverityToNumber;
    private getEventCategory;
    private getEventType;
    private mapProtocol;
    private mapThreatType;
    private mapToMitreAttack;
    private isAuthenticationEvent;
    private isAuthSuccess;
    private parsePort;
    private parseNumber;
}
//# sourceMappingURL=FortiGateFirewallParser.d.ts.map