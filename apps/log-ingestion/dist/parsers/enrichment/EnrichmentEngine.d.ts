import { NormalizedEvent } from '../types';
export interface EnrichmentRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    priority: number;
    conditions: EnrichmentCondition[];
    actions: EnrichmentAction[];
}
export interface EnrichmentCondition {
    field: string;
    operator: 'equals' | 'contains' | 'matches' | 'exists' | 'in' | 'range';
    value?: any;
    values?: any[];
    caseSensitive?: boolean;
}
export interface EnrichmentAction {
    type: 'add_field' | 'set_field' | 'add_tag' | 'lookup' | 'geoip' | 'threat_intel' | 'calculate';
    field?: string;
    value?: any;
    source?: string;
    formula?: string;
}
export interface LookupTable {
    name: string;
    keyField: string;
    data: Map<string, Record<string, any>>;
    cacheTimeout?: number;
    lastUpdated: Date;
}
export interface ThreatIntelSource {
    name: string;
    endpoint: string;
    apiKey?: string;
    enabled: boolean;
    cacheTimeout: number;
    fields: string[];
}
export declare class EnrichmentEngine {
    private rules;
    private lookupTables;
    private threatIntelSources;
    private cache;
    private geoipEnabled;
    initialize(): Promise<void>;
    enrichEvent(event: NormalizedEvent): Promise<NormalizedEvent>;
    registerRule(rule: EnrichmentRule): void;
    addLookupTable(table: LookupTable): void;
    addThreatIntelSource(source: ThreatIntelSource): void;
    getStats(): {
        rulesCount: number;
        lookupTablesCount: number;
        threatIntelSourcesCount: number;
        cacheSize: number;
    };
    clearCache(): void;
    shutdown(): Promise<void>;
    private loadDefaultRules;
    private loadLookupTables;
    private initializeThreatIntelSources;
    private initializeGeoIP;
    private evaluateConditions;
    private evaluateCondition;
    private applyActions;
    private applyAction;
    private getFieldValue;
    private setFieldValue;
    private addTag;
    private performLookup;
    private performGeoIPLookup;
    private performThreatIntelLookup;
    private performCalculation;
    private calculateRiskScore;
    private isValidIP;
    private isPrivateIP;
}
//# sourceMappingURL=EnrichmentEngine.d.ts.map