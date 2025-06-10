import { LogParser, ParsedEvent, NormalizedEvent } from '../types';
/**
 * Common Event Format (CEF) Parser
 * * Parses CEF messages, which are often transported over syslog.
 * CEF Format: CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
 */
export declare class CEFParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "network";
    priority: number;
    enabled: boolean;
    private readonly cefPattern;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private parseCEFExtension;
    private mapSeverity;
    private mapSeverityToNumber;
    private getOutcome;
    private mapToECSCategory;
    private mapDirection;
}
//# sourceMappingURL=CEFParser.d.ts.map