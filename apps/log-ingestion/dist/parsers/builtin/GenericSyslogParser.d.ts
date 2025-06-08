import { LogParser, ParsedEvent, NormalizedEvent } from '../types';
export declare class GenericSyslogParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "syslog";
    category: "network";
    priority: number;
    enabled: boolean;
    private readonly facilities;
    private readonly severities;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private parseSyslogMessage;
    private parseTimestamp;
    private parseRFC3164Timestamp;
    private extractJSONPayload;
    private extractDeviceInfo;
    private extractNetworkInfoFromJSON;
    private getCategoryFromFacility;
    private getActionFromMessage;
    private getOutcomeFromMessage;
    private mapToECSCategory;
    private mapToECSType;
    private mapSeverityToNumber;
    private calculateConfidence;
    private getTagsForEvent;
}
//# sourceMappingURL=GenericSyslogParser.d.ts.map