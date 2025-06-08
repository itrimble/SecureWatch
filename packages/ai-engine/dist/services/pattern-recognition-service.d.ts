import { EventEmitter } from 'events';
import { AttackPattern, PatternMatchResult } from '../types/ai.types';
interface SecurityEvent {
    id: string;
    timestamp: string;
    eventType: string;
    source: string;
    destination?: string;
    user?: string;
    process?: string;
    command?: string;
    file?: string;
    network?: {
        srcIP: string;
        dstIP: string;
        port: number;
        protocol: string;
    };
    metadata: Record<string, any>;
}
/**
 * Pattern Recognition Service for Attack Identification
 * Implements behavioral pattern matching for detecting coordinated attacks
 */
export declare class PatternRecognitionService extends EventEmitter {
    private attackPatterns;
    private activePatterns;
    private eventHistory;
    private maxHistorySize;
    private patternTimeout;
    constructor();
    /**
     * Register a new attack pattern
     */
    registerPattern(pattern: AttackPattern): void;
    /**
     * Process a security event and check for pattern matches
     */
    processEvent(event: SecurityEvent): Promise<PatternMatchResult[]>;
    /**
     * Analyze a batch of events for pattern matches
     */
    analyzeEventBatch(events: SecurityEvent[]): Promise<PatternMatchResult[]>;
    /**
     * Get active pattern states
     */
    getActivePatterns(): Array<{
        patternId: string;
        patternName: string;
        activeInstances: number;
        oldestStart: string;
        avgConfidence: number;
    }>;
    /**
     * Get pattern statistics
     */
    getPatternStats(patternId: string): {
        totalMatches: number;
        avgConfidence: number;
        avgDuration: number;
        lastMatch: string;
        falsePositives: number;
    };
    private checkPatternMatch;
    private getMatchingIndicators;
    private doesIndicatorMatch;
    private checkSequencePatterns;
    private doesEventMatchStep;
    private calculateIndicatorConfidence;
    private calculateRiskScore;
    private generateRecommendations;
    private consolidateMatches;
    private mergePatternMatches;
    private calculateEventOverlap;
    private combineBomatches;
    private setupCleanupRoutines;
    private initializeBuiltInPatterns;
}
export default PatternRecognitionService;
//# sourceMappingURL=pattern-recognition-service.d.ts.map