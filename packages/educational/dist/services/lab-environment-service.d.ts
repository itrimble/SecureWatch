import { EventEmitter } from 'events';
import { Lab, DatabaseConfig, SearchFilters, Pagination } from '../types/educational.types';
interface LabInstance {
    id: string;
    labId: string;
    studentId: string;
    status: 'provisioning' | 'running' | 'paused' | 'stopped' | 'failed' | 'completed';
    containersInfo: {
        containerId: string;
        name: string;
        status: string;
        ports: Record<string, number>;
        ipAddress?: string;
    }[];
    accessInfo: {
        endpoint?: string;
        credentials?: {
            username: string;
            password: string;
        };
        sshKeys?: string[];
        vpnConfig?: string;
    };
    startedAt: Date;
    lastAccessedAt?: Date;
    expiresAt: Date;
    timeRemaining: number;
    progress: {
        tasksCompleted: number;
        totalTasks: number;
        score: number;
        hintsUsed: number;
        flags: string[];
    };
    resources: {
        cpu: string;
        memory: string;
        storage: string;
    };
    metadata: Record<string, any>;
}
interface LabSearchResult {
    labs: Lab[];
    total: number;
    page: number;
    totalPages: number;
}
interface TaskSubmission {
    taskId: string;
    studentId: string;
    answer: string;
    flags: string[];
    output: string;
    submittedAt: Date;
    validationResult?: {
        passed: boolean;
        score: number;
        feedback: string;
        errors: string[];
    };
}
export declare class LabEnvironmentService extends EventEmitter {
    private db;
    private activeInstances;
    private containerOrchestrator;
    constructor(config: {
        database: DatabaseConfig;
        container?: any;
    });
    initialize(): Promise<void>;
    private createTables;
    private loadActiveInstances;
    private startCleanupWorker;
    createLab(labData: Omit<Lab, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lab>;
    getLab(labId: string): Promise<Lab | null>;
    searchLabs(filters: SearchFilters, pagination: Pagination): Promise<LabSearchResult>;
    startLabInstance(labId: string, studentId: string): Promise<LabInstance>;
    private provisionLabEnvironment;
    getLabInstance(instanceId: string): Promise<LabInstance | null>;
    getActiveInstanceForStudent(labId: string, studentId: string): Promise<LabInstance | null>;
    pauseLabInstance(instanceId: string): Promise<void>;
    resumeLabInstance(instanceId: string): Promise<void>;
    stopLabInstance(instanceId: string): Promise<void>;
    submitTaskAnswer(instanceId: string, taskId: string, submission: {
        answer: string;
        flags: string[];
        output: string;
    }): Promise<TaskSubmission>;
    private validateTaskSubmission;
    private addTaskToLab;
    private addHintToLab;
    private getLabTasks;
    private getLabHints;
    private getLabTask;
    private updateInstance;
    private recordAnalyticsEvent;
    private cleanupExpiredInstances;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=lab-environment-service.d.ts.map