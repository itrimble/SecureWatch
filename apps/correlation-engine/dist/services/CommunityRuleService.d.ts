import { Pool } from 'pg';
export interface CommunityRule {
    id: string;
    rule_id: string;
    title: string;
    description: string;
    detection_query: string;
    condition: string;
    level: 'low' | 'medium' | 'high' | 'critical';
    severity: number;
    mitre_attack_techniques: string[];
    mitre_attack_tactics: string[];
    source_type: string;
    category: string;
    enabled: boolean;
    timeframe?: string;
    aggregation?: {
        field: string;
        operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
        threshold: number;
    };
    tags: string[];
    created_at: string;
    updated_at: string;
}
export interface RuleExecutionResult {
    rule_id: string;
    matched: boolean;
    match_count: number;
    execution_time: number;
    error?: string;
    matched_events?: any[];
}
export interface CommunityRuleMetrics {
    total_rules: number;
    enabled_rules: number;
    rules_by_source: Record<string, number>;
    rules_by_severity: Record<string, number>;
    last_execution_stats: {
        total_executions: number;
        successful_executions: number;
        failed_executions: number;
        average_execution_time: number;
    };
}
export declare class CommunityRuleService {
    private dbPool;
    private communityRules;
    private ruleCache;
    private lastLoadTime;
    private cacheRefreshInterval;
    private isInitialized;
    constructor(dbPool: Pool);
    initialize(): Promise<void>;
    loadCommunityRules(): Promise<void>;
    getCommunityRules(): CommunityRule[];
    getRulesByCategory(category: string): CommunityRule[];
    getRulesBySource(sourceType: string): CommunityRule[];
    getRulesBySeverity(level: 'low' | 'medium' | 'high' | 'critical'): CommunityRule[];
    getHighPriorityRules(): CommunityRule[];
    getRulesByMitreTechniques(techniques: string[]): CommunityRule[];
    evaluateEvent(event: any, categories?: string[]): Promise<RuleExecutionResult[]>;
    private evaluateRuleAgainstEvent;
    private executeKQLQuery;
    private getNestedValue;
    private recordRuleExecution;
    getMetrics(): Promise<CommunityRuleMetrics>;
    private setupPeriodicRefresh;
    refreshRules(): Promise<void>;
    needsRefresh(): boolean;
    getRule(ruleId: string): CommunityRule | undefined;
    getRuleCount(): number;
    isReady(): boolean;
}
//# sourceMappingURL=CommunityRuleService.d.ts.map