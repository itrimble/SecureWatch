import { EventEmitter } from 'events';
import { DatabaseConfig, EducationalConfig, LearningStatistics, SearchFilters, Pagination } from '../types/educational.types';
import { LearningManagementService } from './learning-management-service';
import { LabEnvironmentService } from './lab-environment-service';
import { ProgressTrackingService } from './progress-tracking-service';
import { AssessmentService } from './assessment-service';
import { CertificationService } from './certification-service';
import { TrainingScenarioService } from './training-scenario-service';
import { KnowledgeBaseService } from './knowledge-base-service';
import { InstructorService } from './instructor-service';
interface EducationalManagerConfig {
    database: DatabaseConfig;
    educational: EducationalConfig;
    services?: {
        enableLearningManagement?: boolean;
        enableLabEnvironment?: boolean;
        enableProgressTracking?: boolean;
        enableAssessments?: boolean;
        enableCertifications?: boolean;
        enableTrainingScenarios?: boolean;
        enableKnowledgeBase?: boolean;
        enableInstructorTools?: boolean;
    };
}
interface ServiceStatus {
    name: string;
    status: 'initializing' | 'running' | 'stopped' | 'error';
    lastError?: string;
    initialized: boolean;
}
interface EducationalAnalytics {
    overview: {
        totalUsers: number;
        activeUsers: number;
        totalCourses: number;
        totalCompletions: number;
        averageCompletionRate: number;
    };
    engagement: {
        dailyActiveUsers: number;
        weeklyActiveUsers: number;
        monthlyActiveUsers: number;
        averageSessionDuration: number;
        topCourses: {
            id: string;
            title: string;
            enrollments: number;
            completionRate: number;
        }[];
    };
    performance: {
        averageScores: number;
        passRates: number;
        certificationsEarned: number;
        topPerformers: {
            userId: string;
            coursesCompleted: number;
            averageScore: number;
            certificationsEarned: number;
        }[];
    };
    content: {
        totalLearningPaths: number;
        totalModules: number;
        totalLessons: number;
        totalLabs: number;
        totalAssessments: number;
        totalKnowledgeArticles: number;
    };
}
export declare class EducationalManager extends EventEmitter {
    private config;
    private learningManagementService?;
    private labEnvironmentService?;
    private progressTrackingService?;
    private assessmentService?;
    private certificationService?;
    private trainingScenarioService?;
    private knowledgeBaseService?;
    private instructorService?;
    private serviceStatuses;
    private initialized;
    constructor(config: EducationalManagerConfig);
    initialize(): Promise<void>;
    private initializeServices;
    private setupEventHandlers;
    private initializeIntegrations;
    private setServiceStatus;
    getLearningManagementService(): LearningManagementService | undefined;
    getLabEnvironmentService(): LabEnvironmentService | undefined;
    getProgressTrackingService(): ProgressTrackingService | undefined;
    getAssessmentService(): AssessmentService | undefined;
    getCertificationService(): CertificationService | undefined;
    getTrainingScenarioService(): TrainingScenarioService | undefined;
    getKnowledgeBaseService(): KnowledgeBaseService | undefined;
    getInstructorService(): InstructorService | undefined;
    getServiceStatuses(): Map<string, ServiceStatus>;
    isHealthy(): boolean;
    getHealth(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        services: ServiceStatus[];
        initialized: boolean;
    };
    getEducationalAnalytics(): Promise<EducationalAnalytics>;
    getLearningStatistics(): Promise<LearningStatistics>;
    searchEducationalContent(query: string, filters: SearchFilters, pagination: Pagination): Promise<{
        learningPaths?: any[];
        knowledgeArticles?: any[];
        trainingScenarios?: any[];
        total: number;
    }>;
    getStudentJourney(studentId: string): Promise<{
        enrollments: any[];
        progress: any[];
        achievements: any[];
        certificates: any[];
        recentActivity: any[];
    }>;
    getConfiguration(): EducationalConfig;
    updateConfiguration(updates: Partial<EducationalConfig>): Promise<void>;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=educational-manager.d.ts.map