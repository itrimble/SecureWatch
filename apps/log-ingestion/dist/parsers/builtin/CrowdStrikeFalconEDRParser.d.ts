import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * CrowdStrike Falcon EDR Parser
 *
 * Parses detailed endpoint detection and response (EDR) events from the
 * CrowdStrike Falcon platform. It focuses on process creations, network connections,
 * and other security-relevant host activities.
 */
export declare class CrowdStrikeFalconEDRParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "json";
    category: "endpoint";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverity;
    private mapSeverityToNumber;
}
//# sourceMappingURL=CrowdStrikeFalconEDRParser.d.ts.map