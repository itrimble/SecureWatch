import { LogParser, ParsedEvent, NormalizedEvent } from '../types';
export declare class ApacheAccessLogParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "custom";
    category: "web";
    priority: number;
    enabled: boolean;
    private readonly formatPatterns;
    private readonly statusCategories;
    private readonly attackPatterns;
    private readonly suspiciousUserAgents;
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private parseLogLine;
    private parseTimestamp;
    private parseRequest;
    private extractNetworkInfo;
    private extractURLInfo;
    private detectThreats;
    private getTacticsForTechnique;
    private calculateThreatSeverity;
    private getActionFromRequest;
    private getOutcomeFromStatus;
    private getSeverityFromStatus;
    private mapToECSType;
    private mapSeverityToNumber;
    private calculateConfidence;
    private getTagsForEvent;
}
//# sourceMappingURL=ApacheAccessLogParser.d.ts.map