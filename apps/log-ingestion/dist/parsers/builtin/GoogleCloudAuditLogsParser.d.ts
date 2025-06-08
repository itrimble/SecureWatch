import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';
/**
 * Google Cloud Platform (GCP) Audit Logs Parser
 *
 * Parses audit logs from GCP, covering Admin Activity, Data Access,
 * and System Event logs. These logs provide critical visibility into actions
 * performed on the GCP platform.
 */
export declare class GoogleCloudAuditLogsParser implements LogParser {
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
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private mapSeverityToNumber;
}
//# sourceMappingURL=GoogleCloudAuditLogsParser.d.ts.map