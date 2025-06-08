import { EventEmitter } from 'events';
import { ComplianceEvidence, EvidenceCollectionRule, EvidenceType, DatabaseConfig, EvidenceCollectionRequest, ComplianceFrameworkType } from '../types/compliance.types';
interface CollectorPlugin {
    type: 'api' | 'script' | 'query' | 'manual';
    name: string;
    description: string;
    collect: (config: any) => Promise<any>;
    validate?: (data: any) => boolean;
}
interface CollectionJob {
    id: string;
    ruleId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    result?: any;
    error?: string;
}
interface EvidenceSearchFilters {
    frameworkTypes?: ComplianceFrameworkType[];
    evidenceTypes?: EvidenceType[];
    sources?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    controlIds?: string[];
    query?: string;
}
export declare class EvidenceCollectionService extends EventEmitter {
    private db;
    private collectors;
    private collectionJobs;
    private scheduledJobs;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private registerBuiltInCollectors;
    registerCollector(collector: CollectorPlugin): void;
    createCollectionRule(ruleData: Omit<EvidenceCollectionRule, 'id'>): Promise<EvidenceCollectionRule>;
    updateCollectionRule(ruleId: string, updates: Partial<EvidenceCollectionRule>): Promise<void>;
    getCollectionRule(ruleId: string): Promise<EvidenceCollectionRule | null>;
    getCollectionRules(frameworkId?: string, active?: boolean): Promise<EvidenceCollectionRule[]>;
    collectEvidence(request: EvidenceCollectionRequest): Promise<ComplianceEvidence>;
    runCollectionRule(ruleId: string): Promise<CollectionJob>;
    private executeCollection;
    private createEvidence;
    private mapEvidenceToControls;
    private validateEvidence;
    private getNestedValue;
    getEvidence(evidenceId: string): Promise<ComplianceEvidence | null>;
    searchEvidence(filters: EvidenceSearchFilters, pagination: {
        page: number;
        limit: number;
    }): Promise<{
        evidence: ComplianceEvidence[];
        total: number;
    }>;
    getEvidenceForControl(frameworkId: string, controlId: string): Promise<ComplianceEvidence[]>;
    private loadCollectionRules;
    private scheduleCollection;
    private cancelScheduledCollection;
    private updateNextRunTime;
    private calculateNextRunTime;
    private recordCollectionHistory;
    private parseEvidenceRow;
    cleanupExpiredEvidence(): Promise<number>;
    verifyEvidenceIntegrity(evidenceId: string): Promise<boolean>;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=evidence-collection-service.d.ts.map