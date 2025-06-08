import { EventEmitter } from 'events';
import { TimelineEvent, DatabaseConfig } from '../types/incident-response.types';
interface TimelineFilter {
    caseId?: string;
    startTime?: Date;
    endTime?: Date;
    sourceTypes?: string[];
    sources?: string[];
    severities?: string[];
    tags?: string[];
    entityTypes?: string[];
    entityValues?: string[];
    textSearch?: string;
    automated?: boolean;
    limit?: number;
    offset?: number;
}
interface TimelineAnalysis {
    totalEvents: number;
    timeSpan: number;
    eventFrequency: {
        [key: string]: number;
    };
    sourceBreakdown: {
        [key: string]: number;
    };
    severityBreakdown: {
        [key: string]: number;
    };
    patterns: TimelinePattern[];
    gaps: TimelineGap[];
    clusters: TimelineCluster[];
}
interface TimelinePattern {
    id: string;
    type: string;
    description: string;
    events: string[];
    confidence: number;
    startTime: Date;
    endTime: Date;
    significance: 'low' | 'medium' | 'high' | 'critical';
}
interface TimelineGap {
    startTime: Date;
    endTime: Date;
    duration: number;
    significance: 'normal' | 'suspicious' | 'critical';
    context: string;
}
interface TimelineCluster {
    id: string;
    centerTime: Date;
    events: string[];
    radius: number;
    density: number;
    type: string;
}
export declare class TimelineReconstructionService extends EventEmitter {
    private db;
    private correlationRules;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private setupIndexes;
    private initializeCorrelationRules;
    reconstructTimeline(filter: TimelineFilter): Promise<{
        events: TimelineEvent[];
        analysis: TimelineAnalysis;
    }>;
    private getTimelineEvents;
    private analyzeTimeline;
    private calculateEventFrequency;
    private calculateSourceBreakdown;
    private calculateSeverityBreakdown;
    private detectPatterns;
    private applyCorrelationRule;
    private getEventTypeFromEvent;
    private calculatePatternConfidence;
    private findTimelineGaps;
    private createEventClusters;
    private createClusterFromEvents;
    savePattern(caseId: string, pattern: TimelinePattern): Promise<void>;
    getPatterns(caseId: string): Promise<TimelinePattern[]>;
    getTimelineVisualizationData(caseId: string, granularity?: 'hour' | 'day' | 'week'): Promise<{
        buckets: Array<{
            timestamp: Date;
            count: number;
            severity: {
                [key: string]: number;
            };
            sources: {
                [key: string]: number;
            };
        }>;
        summary: {
            totalEvents: number;
            timeSpan: number;
            peakActivity: Date;
            quietPeriods: Array<{
                start: Date;
                end: Date;
            }>;
        };
    }>;
    correlateEvents(event1Id: string, event2Id: string, correlationType: string, confidence: number): Promise<void>;
    exportTimeline(caseId: string, format?: 'json' | 'csv' | 'xml'): Promise<string>;
    private convertToCSV;
    private convertToXML;
    private mapRowToTimelineEvent;
    shutdown(): Promise<void>;
}
export {};
