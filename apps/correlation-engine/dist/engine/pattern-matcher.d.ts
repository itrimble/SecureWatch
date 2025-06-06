import { Pool } from 'pg';
import { LogEvent } from '../types';
export interface PatternMatch {
    id: string;
    name: string;
    pattern_type: string;
    severity: string;
    description: string;
    matched_events: LogEvent[];
    relevance_score: number;
}
export declare class PatternMatcher {
    private db;
    constructor(db: Pool);
    initialize(): Promise<void>;
    findMatches(event: LogEvent, eventBuffer: Map<string, LogEvent[]>): Promise<PatternMatch[]>;
    private checkBruteForcePattern;
    private checkPrivilegeEscalationPattern;
    private checkLateralMovementPattern;
    private checkDataExfiltrationPattern;
}
//# sourceMappingURL=pattern-matcher.d.ts.map