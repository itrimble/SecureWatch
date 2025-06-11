// Educational System Main Entry Point
import { EducationalManager } from './services/educational-manager';
export { EducationalManager } from './services/educational-manager';

// Core Services
export { LearningManagementService } from './services/learning-management-service';
export { LabEnvironmentService } from './services/lab-environment-service';
export { ProgressTrackingService } from './services/progress-tracking-service';
export { AssessmentService } from './services/assessment-service';
export { CertificationService } from './services/certification-service';
export { TrainingScenarioService } from './services/training-scenario-service';
export { KnowledgeBaseService } from './services/knowledge-base-service';
export { InstructorService } from './services/instructor-service';

// Types and Schemas
export * from './types/educational.types';

// Utility exports (if needed)
export { logger } from './utils/logger';

// Configuration helpers
import {
  DatabaseConfig,
  EducationalConfig,
  EducationalConfigSchema
} from './types/educational.types';

/**
 * Factory function to create and initialize the Educational Manager
 * with all services enabled by default.
 */
export async function createEducationalSystem(config: {
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
}) {
  // Set default educational configuration
  const defaultEducationalConfig: EducationalConfig = EducationalConfigSchema.parse({
    features: {
      enrollmentRequired: true,
      allowGuestAccess: false,
      enableCertifications: true,
      enableForums: true,
      enableLabs: true,
      enableAssessments: true,
      enableProgressTracking: true
    },
    limits: {
      maxEnrollmentsPerUser: 10,
      maxLabDuration: 14400, // 4 hours
      maxFileUploadSize: 10485760, // 10MB
      maxLabAttempts: 5,
      maxAssessmentAttempts: 3
    },
    notifications: {
      enableEmailNotifications: true,
      enablePushNotifications: false,
      enrollmentReminders: true,
      assessmentReminders: true,
      certificateNotifications: true
    },
    labs: {
      defaultEnvironment: 'docker',
      resourceLimits: {
        cpu: '1',
        memory: '1Gi',
        storage: '10Gi'
      },
      networkIsolation: true,
      autoCleanup: true,
      cleanupDelay: 3600
    },
    assessment: {
      randomizeQuestions: true,
      showCorrectAnswers: true,
      allowRetakes: true,
      proctoring: {
        enabled: false,
        requireWebcam: false,
        requireScreenShare: false,
        plagiarismDetection: false
      }
    }
  });

  // Merge with provided configuration
  const educationalConfig = {
    ...defaultEducationalConfig,
    ...config.educational
  };

  // Create and initialize the Educational Manager
  const educationalManager = new EducationalManager({
    database: config.database,
    educational: educationalConfig,
    services: config.services
  });

  await educationalManager.initialize();

  return educationalManager;
}

/**
 * Default configuration for SQLite development setup
 */
export const DEFAULT_DEV_CONFIG = {
  database: {
    type: 'sqlite' as const,
    connection: './educational.db'
  }
};

/**
 * Helper function to create a development instance with SQLite
 */
export async function createDevEducationalSystem(customConfig?: any) {
  return await createEducationalSystem({
    database: DEFAULT_DEV_CONFIG.database,
    ...customConfig
  });
}

/**
 * Version information
 */
export const EDUCATIONAL_SYSTEM_VERSION = '1.0.0';

/**
 * Feature flags for the educational system
 */
export const EDUCATIONAL_FEATURES = {
  LEARNING_MANAGEMENT: 'learning-management',
  LAB_ENVIRONMENT: 'lab-environment',
  PROGRESS_TRACKING: 'progress-tracking',
  ASSESSMENTS: 'assessments',
  CERTIFICATIONS: 'certifications',
  TRAINING_SCENARIOS: 'training-scenarios',
  KNOWLEDGE_BASE: 'knowledge-base',
  INSTRUCTOR_TOOLS: 'instructor-tools'
} as const;

/**
 * Educational system constants
 */
export const EDUCATIONAL_CONSTANTS = {
  DEFAULT_SKILL_LEVELS: ['beginner', 'intermediate', 'advanced'] as const,
  DEFAULT_DIFFICULTIES: ['easy', 'medium', 'hard'] as const,
  DEFAULT_CONTENT_TYPES: ['video', 'article', 'interactive', 'simulation', 'document'] as const,
  DEFAULT_ASSESSMENT_TYPES: ['quiz', 'practical', 'project', 'simulation', 'essay'] as const,
  DEFAULT_PROGRESS_STATUSES: ['not-started', 'in-progress', 'completed', 'failed', 'paused'] as const,
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Time limits
  DEFAULT_LAB_TIMEOUT: 7200, // 2 hours in seconds
  DEFAULT_ASSESSMENT_TIME_LIMIT: 120, // 2 hours in minutes
  
  // Score thresholds
  DEFAULT_PASSING_SCORE: 70, // percentage
  DEFAULT_CERTIFICATION_SCORE: 80, // percentage
  
  // Retry limits
  DEFAULT_MAX_ATTEMPTS: 3,
  DEFAULT_MAX_LAB_ATTEMPTS: 5
} as const;