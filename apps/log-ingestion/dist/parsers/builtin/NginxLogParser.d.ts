import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * NGINX Access and Error Log Parser
 *
 * A dedicated parser for NGINX access and error logs. It handles the "combined"
 * format by default but can be extended for custom log formats.
 */
export declare class NginxLogParser implements LogParser {
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
    private readonly combinedRegex;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private parseNginxTimestamp;
    private mapSeverityToNumber;
}
//# sourceMappingURL=NginxLogParser.d.ts.map