import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * osquery Log Parser
 *
 * Parses JSON-formatted logs from osquery, an operating system instrumentation
 * framework that exposes an OS as a high-performance relational database.
 */
export declare class OsqueryLogParser implements LogParser {
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
//# sourceMappingURL=OsqueryLogParser.d.ts.map