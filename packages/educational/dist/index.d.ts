export { EducationalManager } from './services/educational-manager';
export { LearningManagementService } from './services/learning-management-service';
export { LabEnvironmentService } from './services/lab-environment-service';
export { ProgressTrackingService } from './services/progress-tracking-service';
export { AssessmentService } from './services/assessment-service';
export { CertificationService } from './services/certification-service';
export { TrainingScenarioService } from './services/training-scenario-service';
export { KnowledgeBaseService } from './services/knowledge-base-service';
export { InstructorService } from './services/instructor-service';
export * from './types/educational.types';
export { logger } from './utils/logger';
import { DatabaseConfig, EducationalConfig } from './types/educational.types';
/**
 * Factory function to create and initialize the Educational Manager
 * with all services enabled by default.
 */
export declare function createEducationalSystem(config: {
    database: DatabaseConfig;
    educational?: Partial<EducationalConfig>;
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
}): Promise<any>;
/**
 * Default configuration for SQLite development setup
 */
export declare const DEFAULT_DEV_CONFIG: {
    database: {
        type: "sqlite";
        connection: string;
    };
};
/**
 * Helper function to create a development instance with SQLite
 */
export declare function createDevEducationalSystem(customConfig?: any): Promise<any>;
/**
 * Version information
 */
export declare const EDUCATIONAL_SYSTEM_VERSION = "1.0.0";
/**
 * Feature flags for the educational system
 */
export declare const EDUCATIONAL_FEATURES: {
    readonly LEARNING_MANAGEMENT: "learning-management";
    readonly LAB_ENVIRONMENT: "lab-environment";
    readonly PROGRESS_TRACKING: "progress-tracking";
    readonly ASSESSMENTS: "assessments";
    readonly CERTIFICATIONS: "certifications";
    readonly TRAINING_SCENARIOS: "training-scenarios";
    readonly KNOWLEDGE_BASE: "knowledge-base";
    readonly INSTRUCTOR_TOOLS: "instructor-tools";
};
/**
 * Educational system constants
 */
export declare const EDUCATIONAL_CONSTANTS: {
    readonly DEFAULT_SKILL_LEVELS: readonly ["beginner", "intermediate", "advanced"];
    readonly DEFAULT_DIFFICULTIES: readonly ["easy", "medium", "hard"];
    readonly DEFAULT_CONTENT_TYPES: readonly ["video", "article", "interactive", "simulation", "document"];
    readonly DEFAULT_ASSESSMENT_TYPES: readonly ["quiz", "practical", "project", "simulation", "essay"];
    readonly DEFAULT_PROGRESS_STATUSES: readonly ["not-started", "in-progress", "completed", "failed", "paused"];
    readonly DEFAULT_PAGE_SIZE: 20;
    readonly MAX_PAGE_SIZE: 100;
    readonly DEFAULT_LAB_TIMEOUT: 7200;
    readonly DEFAULT_ASSESSMENT_TIME_LIMIT: 120;
    readonly DEFAULT_PASSING_SCORE: 70;
    readonly DEFAULT_CERTIFICATION_SCORE: 80;
    readonly DEFAULT_MAX_ATTEMPTS: 3;
    readonly DEFAULT_MAX_LAB_ATTEMPTS: 5;
};
//# sourceMappingURL=index.d.ts.map