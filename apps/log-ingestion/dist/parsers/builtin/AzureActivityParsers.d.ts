import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Azure Activity Logs Parser
 *
 * Parses JSON-formatted logs from Azure Monitor. These logs cover a wide range of
 * activities, including administrative actions, service health events, and policy alerts.
 * The parser handles the complex, nested structure of Azure log records.
 */
export declare class AzureActivityLogsParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "json";
    category: "cloud";
    priority: number;
    enabled: boolean;
    config: ParserConfig;
    /**
     * Validates that the log is a valid JSON object and contains key Azure Activity Log fields.
     * @param rawLog The raw log string.
     * @returns True if the log is a valid Azure Activity Log, false otherwise.
     */
    validate(rawLog: string): boolean;
    /**
     * Parses the raw JSON log into a structured ParsedEvent object.
     * @param rawLog The raw log string.
     * @returns A ParsedEvent object or null if parsing fails.
     */
    parse(rawLog: string): ParsedEvent | null;
    /**
     * Normalizes the parsed event into the SecureWatch Common Event Format (SCEF).
     * @param event The parsed event object.
     * @returns A NormalizedEvent object.
     */
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverity;
    private mapSeverityToNumber;
}
//# sourceMappingURL=AzureActivityParsers.d.ts.map