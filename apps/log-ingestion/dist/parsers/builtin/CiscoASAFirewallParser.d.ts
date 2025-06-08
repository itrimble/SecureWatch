import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig, ParserMetadata } from '../types';
/**
 * Cisco ASA/Firepower Firewall Parser
 *
 * Supports multiple Cisco ASA log types including:
 * - Connection logs (Built/Teardown)
 * - Access Control List (ACL) logs
 * - Authentication logs
 * - VPN logs
 * - Intrusion Prevention System (IPS) logs
 * - System logs
 * - Threat Detection logs
 * - Application logs
 *
 * Cisco ASA logs use syslog format with specific message IDs and structured fields.
 * Message format: %ASA-Level-MessageID: Message_text
 */
export declare class CiscoASAFirewallParser implements LogParser {
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
    private readonly messagePatterns;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private extractTimestamp;
    private parseMessageFields;
    private parseConnectionBuilt;
    private parseConnectionTeardown;
    private parseACLDeny;
    private parseAuthentication;
    private calculateConfidence;
    private mapCategory;
    private determineOutcome;
    private mapSeverityFromLevel;
    private mapSeverityToNumber;
    private getEventCategory;
    private getEventType;
    private mapOutcome;
    private mapDirection;
    private parsePort;
    private parseNumber;
    private parseDuration;
    private isAuthSuccess;
}
//# sourceMappingURL=CiscoASAFirewallParser.d.ts.map