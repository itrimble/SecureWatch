import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * SentinelOne EDR Parser
 *
 * Parses endpoint detection and response (EDR) events from the
 * SentinelOne Singularity platform.
 */
export declare class SentinelOneEDRParser implements LogParser {
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
}
//# sourceMappingURL=SentinelOneEDRParser.d.ts.map