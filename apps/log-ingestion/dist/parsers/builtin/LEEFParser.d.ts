import { LogParser, ParsedEvent, NormalizedEvent } from '../types';
/**
 * Log Event Extended Format (LEEF) Parser
 * Parses LEEF messages used by IBM QRadar and other SIEM systems.
 * LEEF Format: LEEF:Version|Vendor|Product|Version|EventID|Key1=Value1<delimiter>Key2=Value2...
 */
export declare class LEEFParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "network";
    priority: number;
    enabled: boolean;
    private readonly leefPattern;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private parseLEEFExtension;
    private mapSeverity;
    private mapSeverityToNumber;
    private mapCategory;
    private getOutcome;
    private mapToECSCategory;
    private mapToECSType;
    private mapDirection;
    private parseNumber;
    private parsePort;
}
//# sourceMappingURL=LEEFParser.d.ts.map