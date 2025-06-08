import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Microsoft Internet Information Services (IIS) Log Parser
 *
 * Parses W3C Extended Log Format files from IIS. This format is space-delimited
 * and the fields can vary depending on the server configuration. This parser
 * attempts to handle the most common fields.
 */
export declare class IISLogParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "custom";
    category: "web";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    private fields;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverityToNumber;
}
//# sourceMappingURL=IISLogParser.d.ts.map