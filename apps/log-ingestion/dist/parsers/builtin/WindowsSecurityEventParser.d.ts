import { LogParser, ParsedEvent, NormalizedEvent } from '../types';
export declare class WindowsSecurityEventParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "xml";
    category: "endpoint";
    priority: number;
    enabled: boolean;
    private readonly logonTypes;
    private readonly mitreMapping;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private extractEventId;
    private extractTimestamp;
    private extractComputer;
    private extractEventData;
    private extractUserInfo;
    private extractDeviceInfo;
    private extractAuthenticationInfo;
    private extractThreatInfo;
    private adjustTechniqueConfidence;
    private getCategoryForEventId;
    private getActionForEventId;
    private getOutcomeForEventId;
    private getSeverityForEventId;
    private mapToECSCategory;
    private mapToECSType;
    private mapSeverityToNumber;
    private getAuthMethodForEventId;
    private getTagsForEventId;
}
//# sourceMappingURL=WindowsSecurityEventParser.d.ts.map