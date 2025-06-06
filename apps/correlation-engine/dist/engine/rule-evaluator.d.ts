import { Pool } from 'pg';
import { createClient } from 'redis';
import { CorrelationRule, LogEvent, EvaluationResult, CorrelationContext } from '../types';
export declare class RuleEvaluator {
    private db;
    private redis;
    constructor(db: Pool, redis: ReturnType<typeof createClient>);
    initialize(): Promise<void>;
    evaluate(rule: CorrelationRule, event: LogEvent, context: CorrelationContext): Promise<EvaluationResult>;
    private evaluateSimpleRule;
    private evaluateCondition;
    private evaluateThresholdRule;
    private evaluateSequenceRule;
    private evaluateComplexRule;
    private evaluateMLRule;
    private getFieldValue;
    private getCurrentMetricValue;
    private calculateConfidence;
}
//# sourceMappingURL=rule-evaluator.d.ts.map