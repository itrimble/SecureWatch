import { EventEmitter } from 'events';
import { Playbook, PlaybookResult, DatabaseConfig } from '../types/incident-response.types';
interface PlaybookEngineConfig {
    database: DatabaseConfig;
    maxConcurrentExecutions: number;
    defaultTimeout: number;
    enableApprovalWorkflow: boolean;
    notificationWebhook?: string;
}
export declare class PlaybookEngine extends EventEmitter {
    private db;
    private config;
    private actionHandlers;
    private activeExecutions;
    private pendingApprovals;
    constructor(config: PlaybookEngineConfig);
    initialize(): Promise<void>;
    private createTables;
    private initializeActionHandlers;
    createPlaybook(playbookData: Omit<Playbook, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'successRate'>): Promise<Playbook>;
    getPlaybook(playbookId: string): Promise<Playbook | null>;
    updatePlaybook(playbookId: string, updates: Partial<Playbook>): Promise<Playbook | null>;
    deletePlaybook(playbookId: string): Promise<void>;
    executePlaybook(playbookId: string, context: {
        triggeredBy: string;
        caseId?: string;
        alertId?: string;
        variables?: Record<string, any>;
    }): Promise<PlaybookResult>;
    private executeSteps;
    private evaluateCondition;
    private executeAction;
    private requestApproval;
    approvePlaybook(executionId: string, approverId: string, comments?: string): Promise<void>;
    rejectPlaybook(executionId: string, approverId: string, comments?: string): Promise<void>;
    private handleApprovalTimeout;
    findTriggeredPlaybooks(triggerData: {
        alertType?: string;
        severity?: string;
        tags?: string[];
        mitreAttackTechniques?: string[];
    }): Promise<Playbook[]>;
    private matchesTriggerConditions;
    private createExecutionRecord;
    private updateExecutionRecord;
    private recordStepExecution;
    private updatePlaybookStatistics;
    private getPlaybookName;
    private sendNotification;
    private sendApprovalNotifications;
    private loadActivePlaybooks;
    private resumePendingExecutions;
    private mapRowToPlaybook;
    getPlaybookStatistics(): Promise<any>;
    shutdown(): Promise<void>;
}
export {};
