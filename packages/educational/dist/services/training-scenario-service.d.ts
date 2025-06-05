import { EventEmitter } from 'events';
import { TrainingScenario, DatabaseConfig, SearchFilters, Pagination } from '../types/educational.types';
interface ScenarioInstance {
    id: string;
    scenarioId: string;
    studentId: string;
    status: 'provisioning' | 'running' | 'paused' | 'completed' | 'failed' | 'expired';
    startedAt: Date;
    completedAt?: Date;
    expiresAt: Date;
    timeRemaining: number;
    progress: {
        objectivesCompleted: number;
        totalObjectives: number;
        score: number;
        hintsUsed: number;
        flags: string[];
        artifacts: string[];
        timeline: {
            timestamp: Date;
            action: string;
            details: any;
        }[];
    };
    environment: {
        containersInfo: any[];
        accessInfo: any;
        networkTopology: any;
    };
    metadata: Record<string, any>;
}
interface ScenarioSearchResult {
    scenarios: TrainingScenario[];
    total: number;
    page: number;
    totalPages: number;
}
interface ObjectiveSubmission {
    objectiveId: string;
    studentId: string;
    instanceId: string;
    answer: string;
    evidence: string[];
    submittedAt: Date;
    validationResult?: {
        correct: boolean;
        score: number;
        feedback: string;
        partialCredit: number;
    };
}
interface AttackSimulation {
    id: string;
    name: string;
    description: string;
    category: 'malware' | 'phishing' | 'network-intrusion' | 'data-breach' | 'insider-threat' | 'ddos';
    attackVector: string[];
    targetSystems: string[];
    timeline: {
        phase: string;
        timestamp: string;
        actions: string[];
        indicators: string[];
        evidence: string[];
    }[];
    artifacts: {
        id: string;
        name: string;
        type: 'log' | 'network-capture' | 'memory-dump' | 'file' | 'email' | 'alert';
        content: any;
        timestamp: string;
        source: string;
    }[];
    iocs: {
        type: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'filename';
        value: string;
        description: string;
        confidence: 'low' | 'medium' | 'high';
    }[];
    mitreTactics: string[];
    mitreTooling: string[];
    createdBy: string;
    createdAt: Date;
    metadata: Record<string, any>;
}
export declare class TrainingScenarioService extends EventEmitter {
    private db;
    private activeInstances;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private seedDefaultScenarios;
    private loadActiveInstances;
    private startCleanupWorker;
    createTrainingScenario(scenarioData: Omit<TrainingScenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingScenario>;
    getTrainingScenario(scenarioId: string): Promise<TrainingScenario | null>;
    searchTrainingScenarios(filters: SearchFilters, pagination: Pagination): Promise<ScenarioSearchResult>;
    startScenarioInstance(scenarioId: string, studentId: string): Promise<ScenarioInstance>;
    private provisionScenarioEnvironment;
    getScenarioInstance(instanceId: string): Promise<ScenarioInstance | null>;
    getActiveInstanceForStudent(scenarioId: string, studentId: string): Promise<ScenarioInstance | null>;
    submitObjective(instanceId: string, objectiveId: string, submission: {
        answer: string;
        evidence: string[];
    }): Promise<ObjectiveSubmission>;
    private validateObjectiveSubmission;
    createAttackSimulation(simulationData: Omit<AttackSimulation, 'id' | 'createdAt'>): Promise<AttackSimulation>;
    getAttackSimulations(category?: string): Promise<AttackSimulation[]>;
    private updateInstance;
    private recordAnalyticsEvent;
    private cleanupExpiredInstances;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=training-scenario-service.d.ts.map