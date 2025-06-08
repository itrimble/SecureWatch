import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig, ParserMetadata } from '../types';
/**
 * Palo Alto Networks (PAN-OS) Firewall Parser
 *
 * Supports multiple PAN-OS log types including:
 * - Traffic logs (TRAFFIC)
 * - Threat logs (THREAT)
 * - Config logs (CONFIG)
 * - System logs (SYSTEM)
 * - GlobalProtect logs (GLOBALPROTECT)
 * - URL Filtering logs (URL)
 * - Data Filtering logs (DATA)
 * - Wildfire logs (WILDFIRE)
 * - Authentication logs (AUTHENTICATION)
 * - Decryption logs (DECRYPTION)
 *
 * PAN-OS logs are comma-separated with specific field positions
 * that vary by log type and PAN-OS version.
 */
export declare class PaloAltoFirewallParser implements LogParser {
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
    private readonly fieldMappings;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private extractPanLogFromSyslog;
    private parseCSVLine;
    private extractFields;
    private parseTimestamp;
    private parsePort;
    private parseNumber;
    private calculateConfidence;
    private detectPanOsVersion;
    private getEventCategory;
    private getEventType;
    private mapOutcome;
    private mapDirection;
    private mapSeverity;
    private mapSeverityToNumber;
    private mapThreatType;
    private mapSystemLogLevel;
    private mapToMitreAttack;
    private extractVendorSpecificFields;
    private parseGenericPanLog;
    private mapCategory;
}
//# sourceMappingURL=PaloAltoFirewallParser.d.ts.map