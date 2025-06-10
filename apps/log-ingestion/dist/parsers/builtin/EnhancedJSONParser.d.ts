import { LogParser, ParsedEvent, NormalizedEvent } from '../types';
/**
 * Enhanced JSON Parser with JSONPath support and JSON Schema validation
 * Handles complex JSON log structures with configurable field extraction
 */
export declare class EnhancedJSONParser implements LogParser {
    id: string;
    name: string;
    vendor: string;
    logSource: string;
    version: string;
    format: "json";
    category: "application";
    priority: number;
    enabled: boolean;
    private ajv;
    private defaultSchema;
    constructor();
    validate(rawLog: string): boolean;
    parse(rawLog: string): ParsedEvent | null;
    normalize(event: ParsedEvent): NormalizedEvent;
    private validateSchema;
    private extractTimestamp;
    private extractSource;
    private extractAction;
    private extractOutcome;
    private extractSeverity;
    private extractUser;
    private extractDevice;
    private extractNetwork;
    private extractProcess;
    private extractFile;
    private extractCustomFields;
    private determineCategory;
    private parseTimestamp;
    private parseOutcome;
    private parseSeverity;
    private mapSeverityToNumber;
    private mapToECSCategory;
    private mapToECSType;
    private parseNumber;
}
//# sourceMappingURL=EnhancedJSONParser.d.ts.map