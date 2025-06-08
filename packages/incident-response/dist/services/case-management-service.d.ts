import { EventEmitter } from 'events';
import { Case, Task, Comment, TimelineEvent, CaseStatus, CaseSeverity, CasePriority, DatabaseConfig } from '../types/incident-response.types';
export interface CaseManagementConfig {
    database: DatabaseConfig;
    autoAssignment: boolean;
    escalationEnabled: boolean;
    retentionPeriod: number;
}
export declare class CaseManagementService extends EventEmitter {
    private db;
    private config;
    constructor(config: CaseManagementConfig);
    initialize(): Promise<void>;
    private createTables;
    private setupIndexes;
    createCase(caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<Case>;
    getCase(caseId: string): Promise<Case | null>;
    updateCase(caseId: string, updates: Partial<Case>, userId?: string): Promise<Case | null>;
    assignCase(caseId: string, assignee: string, assignedBy: string): Promise<void>;
    closeCase(caseId: string, resolution: string, userId: string): Promise<void>;
    searchCases(criteria: {
        status?: CaseStatus[];
        severity?: CaseSeverity[];
        priority?: CasePriority[];
        assignee?: string;
        reporter?: string;
        tags?: string[];
        dateRange?: {
            start: Date;
            end: Date;
        };
        textSearch?: string;
        limit?: number;
        offset?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        cases: Case[];
        total: number;
    }>;
    createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
    updateTask(taskId: string, updates: Partial<Task>, userId?: string): Promise<Task | null>;
    getTask(taskId: string): Promise<Task | null>;
    getCaseTasks(caseId: string): Promise<Task[]>;
    addComment(commentData: Omit<Comment, 'id' | 'timestamp'>): Promise<Comment>;
    getCaseComments(caseId: string): Promise<Comment[]>;
    addTimelineEvent(caseId: string, eventData: TimelineEvent): Promise<void>;
    getCaseTimeline(caseId: string): Promise<TimelineEvent[]>;
    linkCases(parentCaseId: string, relatedCaseId: string, relationshipType: string, userId: string, notes?: string): Promise<void>;
    getRelatedCases(caseId: string): Promise<Array<{
        caseId: string;
        relationshipType: string;
        notes?: string;
    }>>;
    getCaseStatistics(): Promise<any>;
    private getAutoAssignee;
    private handleStatusTransition;
    private mapRowToCase;
    private mapRowToTask;
    private mapRowToComment;
    private mapRowToTimelineEvent;
    shutdown(): Promise<void>;
}
