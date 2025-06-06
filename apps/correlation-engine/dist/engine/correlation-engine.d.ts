import { LogEvent } from '../types';
export declare class CorrelationEngine {
    private db;
    private redis;
    private queue;
    private ruleEvaluator;
    private patternMatcher;
    private incidentManager;
    private actionExecutor;
    private activeRules;
    private eventBuffer;
    constructor();
    initialize(): Promise<void>;
    processEvent(event: LogEvent): Promise<void>;
    private handleRuleMatch;
    private handlePatternMatch;
    private addEventToBuffer;
    private startEventBufferCleanup;
    private loadActiveRules;
    reloadRules(): Promise<void>;
    private generateIncidentTitle;
    private generateIncidentDescription;
    private extractAffectedAssets;
    private updateRuleMetrics;
    shutdown(): Promise<void>;
    getActiveRuleCount(): Promise<number>;
    getEventBufferSize(): Promise<number>;
    getQueueSize(): Promise<number>;
    getEngineStats(): Promise<any>;
}
export declare const correlationEngine: CorrelationEngine;
//# sourceMappingURL=correlation-engine.d.ts.map