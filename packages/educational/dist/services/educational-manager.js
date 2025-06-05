import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { EducationalConfigSchema } from '../types/educational.types';
// Import all educational services
import { LearningManagementService } from './learning-management-service';
import { LabEnvironmentService } from './lab-environment-service';
import { ProgressTrackingService } from './progress-tracking-service';
import { AssessmentService } from './assessment-service';
import { CertificationService } from './certification-service';
import { TrainingScenarioService } from './training-scenario-service';
import { KnowledgeBaseService } from './knowledge-base-service';
import { InstructorService } from './instructor-service';
export class EducationalManager extends EventEmitter {
    config;
    // Service instances
    learningManagementService;
    labEnvironmentService;
    progressTrackingService;
    assessmentService;
    certificationService;
    trainingScenarioService;
    knowledgeBaseService;
    instructorService;
    serviceStatuses = new Map();
    initialized = false;
    constructor(config) {
        super();
        this.config = {
            ...config,
            educational: EducationalConfigSchema.parse(config.educational),
            services: {
                enableLearningManagement: true,
                enableLabEnvironment: true,
                enableProgressTracking: true,
                enableAssessments: true,
                enableCertifications: true,
                enableTrainingScenarios: true,
                enableKnowledgeBase: true,
                enableInstructorTools: true,
                ...config.services
            }
        };
    }
    async initialize() {
        logger.info('Initializing Educational Manager');
        try {
            // Initialize services based on configuration
            await this.initializeServices();
            // Set up inter-service event handlers
            this.setupEventHandlers();
            // Initialize cross-service integrations
            await this.initializeIntegrations();
            this.initialized = true;
            this.emit('educational-manager-initialized');
            logger.info('Educational Manager initialized successfully');
            logger.info(`Enabled services: ${Array.from(this.serviceStatuses.keys()).join(', ')}`);
        }
        catch (error) {
            logger.error('Failed to initialize Educational Manager:', error);
            throw error;
        }
    }
    async initializeServices() {
        const initPromises = [];
        // Learning Management Service
        if (this.config.services?.enableLearningManagement) {
            this.learningManagementService = new LearningManagementService({
                database: this.config.database
            });
            this.setServiceStatus('learning-management', 'initializing');
            initPromises.push(this.learningManagementService.initialize()
                .then(() => this.setServiceStatus('learning-management', 'running'))
                .catch((error) => this.setServiceStatus('learning-management', 'error', error.message)));
        }
        // Lab Environment Service
        if (this.config.services?.enableLabEnvironment) {
            this.labEnvironmentService = new LabEnvironmentService({
                database: this.config.database
            });
            this.setServiceStatus('lab-environment', 'initializing');
            initPromises.push(this.labEnvironmentService.initialize()
                .then(() => this.setServiceStatus('lab-environment', 'running'))
                .catch((error) => this.setServiceStatus('lab-environment', 'error', error.message)));
        }
        // Progress Tracking Service
        if (this.config.services?.enableProgressTracking) {
            this.progressTrackingService = new ProgressTrackingService({
                database: this.config.database
            });
            this.setServiceStatus('progress-tracking', 'initializing');
            initPromises.push(this.progressTrackingService.initialize()
                .then(() => this.setServiceStatus('progress-tracking', 'running'))
                .catch((error) => this.setServiceStatus('progress-tracking', 'error', error.message)));
        }
        // Assessment Service
        if (this.config.services?.enableAssessments) {
            this.assessmentService = new AssessmentService({
                database: this.config.database
            });
            this.setServiceStatus('assessments', 'initializing');
            initPromises.push(this.assessmentService.initialize()
                .then(() => this.setServiceStatus('assessments', 'running'))
                .catch((error) => this.setServiceStatus('assessments', 'error', error.message)));
        }
        // Certification Service
        if (this.config.services?.enableCertifications) {
            this.certificationService = new CertificationService({
                database: this.config.database
            });
            this.setServiceStatus('certifications', 'initializing');
            initPromises.push(this.certificationService.initialize()
                .then(() => this.setServiceStatus('certifications', 'running'))
                .catch((error) => this.setServiceStatus('certifications', 'error', error.message)));
        }
        // Training Scenario Service
        if (this.config.services?.enableTrainingScenarios) {
            this.trainingScenarioService = new TrainingScenarioService({
                database: this.config.database
            });
            this.setServiceStatus('training-scenarios', 'initializing');
            initPromises.push(this.trainingScenarioService.initialize()
                .then(() => this.setServiceStatus('training-scenarios', 'running'))
                .catch((error) => this.setServiceStatus('training-scenarios', 'error', error.message)));
        }
        // Knowledge Base Service
        if (this.config.services?.enableKnowledgeBase) {
            this.knowledgeBaseService = new KnowledgeBaseService({
                database: this.config.database
            });
            this.setServiceStatus('knowledge-base', 'initializing');
            initPromises.push(this.knowledgeBaseService.initialize()
                .then(() => this.setServiceStatus('knowledge-base', 'running'))
                .catch((error) => this.setServiceStatus('knowledge-base', 'error', error.message)));
        }
        // Instructor Service
        if (this.config.services?.enableInstructorTools) {
            this.instructorService = new InstructorService({
                database: this.config.database
            });
            this.setServiceStatus('instructor-tools', 'initializing');
            initPromises.push(this.instructorService.initialize()
                .then(() => this.setServiceStatus('instructor-tools', 'running'))
                .catch((error) => this.setServiceStatus('instructor-tools', 'error', error.message)));
        }
        // Wait for all services to initialize
        await Promise.allSettled(initPromises);
        // Log initialization results
        const runningServices = Array.from(this.serviceStatuses.values())
            .filter(status => status.status === 'running').length;
        const errorServices = Array.from(this.serviceStatuses.values())
            .filter(status => status.status === 'error');
        logger.info(`Services initialized: ${runningServices}/${this.serviceStatuses.size} running`);
        if (errorServices.length > 0) {
            logger.warn('Services with errors:', errorServices.map(s => `${s.name}: ${s.lastError}`));
        }
    }
    setupEventHandlers() {
        // Set up cross-service event handling for better integration
        // When a student completes a learning path, check for certification eligibility
        if (this.progressTrackingService && this.certificationService) {
            this.progressTrackingService.on('progress-updated', async (event) => {
                if (event.progress.status === 'completed' && event.progress.learningPathId) {
                    try {
                        // Check if this learning path is tied to a certification
                        // and if the student is eligible
                        // This would be implemented based on business logic
                        logger.debug(`Checking certification eligibility for student ${event.progress.studentId}`);
                    }
                    catch (error) {
                        logger.error('Error checking certification eligibility:', error);
                    }
                }
            });
        }
        // When an assessment is completed, update progress tracking
        if (this.assessmentService && this.progressTrackingService) {
            this.assessmentService.on('assessment-submitted', async (event) => {
                try {
                    await this.progressTrackingService.updateProgress({
                        studentId: event.result.studentId,
                        assessmentId: event.result.assessmentId,
                        status: event.result.passed ? 'completed' : 'failed',
                        score: event.result.score,
                        timeSpent: event.result.timeSpent
                    });
                }
                catch (error) {
                    logger.error('Error updating progress from assessment:', error);
                }
            });
        }
        // When a lab instance is completed, update progress tracking
        if (this.labEnvironmentService && this.progressTrackingService) {
            this.labEnvironmentService.on('task-submitted', async (event) => {
                try {
                    // Extract lab completion data and update progress
                    logger.debug(`Updating progress for lab submission: ${event.instanceId}`);
                }
                catch (error) {
                    logger.error('Error updating progress from lab:', error);
                }
            });
        }
        // When a training scenario is completed, update progress tracking
        if (this.trainingScenarioService && this.progressTrackingService) {
            this.trainingScenarioService.on('objective-submitted', async (event) => {
                try {
                    // Update progress based on scenario objective completion
                    logger.debug(`Updating progress for scenario objective: ${event.objectiveId}`);
                }
                catch (error) {
                    logger.error('Error updating progress from scenario:', error);
                }
            });
        }
        // When instructor grades an assignment, update progress
        if (this.instructorService && this.progressTrackingService) {
            this.instructorService.on('grade-submitted', async (event) => {
                try {
                    // Update student progress with instructor grade
                    logger.debug(`Updating progress from instructor grade: ${event.gradingItemId}`);
                }
                catch (error) {
                    logger.error('Error updating progress from instructor grade:', error);
                }
            });
        }
        // Global event forwarding for external listeners
        const services = [
            this.learningManagementService,
            this.labEnvironmentService,
            this.progressTrackingService,
            this.assessmentService,
            this.certificationService,
            this.trainingScenarioService,
            this.knowledgeBaseService,
            this.instructorService
        ];
        services.forEach(service => {
            if (service) {
                service.on('*', (eventName, eventData) => {
                    this.emit(`service:${eventName}`, eventData);
                });
            }
        });
    }
    async initializeIntegrations() {
        // Set up any additional integrations between services
        logger.info('Initializing cross-service integrations');
        // Example: Sync learning path completion requirements with assessment thresholds
        if (this.learningManagementService && this.assessmentService) {
            // Implementation would sync assessment passing scores with learning path requirements
        }
        // Example: Ensure lab environments are properly linked to learning modules
        if (this.learningManagementService && this.labEnvironmentService) {
            // Implementation would validate lab references in learning modules
        }
        // Example: Set up automatic grading workflows for instructors
        if (this.instructorService && this.assessmentService) {
            // Implementation would create grading queue items for instructor review
        }
        logger.info('Cross-service integrations initialized');
    }
    setServiceStatus(serviceName, status, errorMessage) {
        this.serviceStatuses.set(serviceName, {
            name: serviceName,
            status,
            lastError: errorMessage,
            initialized: status === 'running'
        });
        this.emit('service-status-changed', { serviceName, status, errorMessage });
        if (status === 'error') {
            logger.error(`Service ${serviceName} failed to initialize: ${errorMessage}`);
        }
        else if (status === 'running') {
            logger.info(`Service ${serviceName} initialized successfully`);
        }
    }
    // Service Access Methods
    getLearningManagementService() {
        return this.learningManagementService;
    }
    getLabEnvironmentService() {
        return this.labEnvironmentService;
    }
    getProgressTrackingService() {
        return this.progressTrackingService;
    }
    getAssessmentService() {
        return this.assessmentService;
    }
    getCertificationService() {
        return this.certificationService;
    }
    getTrainingScenarioService() {
        return this.trainingScenarioService;
    }
    getKnowledgeBaseService() {
        return this.knowledgeBaseService;
    }
    getInstructorService() {
        return this.instructorService;
    }
    // Status and Health Checks
    getServiceStatuses() {
        return new Map(this.serviceStatuses);
    }
    isHealthy() {
        const errorServices = Array.from(this.serviceStatuses.values())
            .filter(status => status.status === 'error');
        return errorServices.length === 0 && this.initialized;
    }
    getHealth() {
        const services = Array.from(this.serviceStatuses.values());
        const errorCount = services.filter(s => s.status === 'error').length;
        const runningCount = services.filter(s => s.status === 'running').length;
        let status;
        if (errorCount === 0 && runningCount === services.length) {
            status = 'healthy';
        }
        else if (errorCount < services.length / 2) {
            status = 'degraded';
        }
        else {
            status = 'unhealthy';
        }
        return {
            status,
            services,
            initialized: this.initialized
        };
    }
    // Analytics and Reporting
    async getEducationalAnalytics() {
        const analytics = {
            overview: {
                totalUsers: 0,
                activeUsers: 0,
                totalCourses: 0,
                totalCompletions: 0,
                averageCompletionRate: 0
            },
            engagement: {
                dailyActiveUsers: 0,
                weeklyActiveUsers: 0,
                monthlyActiveUsers: 0,
                averageSessionDuration: 0,
                topCourses: []
            },
            performance: {
                averageScores: 0,
                passRates: 0,
                certificationsEarned: 0,
                topPerformers: []
            },
            content: {
                totalLearningPaths: 0,
                totalModules: 0,
                totalLessons: 0,
                totalLabs: 0,
                totalAssessments: 0,
                totalKnowledgeArticles: 0
            }
        };
        try {
            // Aggregate data from all services
            if (this.learningManagementService) {
                const lmsStats = await this.learningManagementService.getLearningPathStatistics();
                analytics.content.totalLearningPaths = lmsStats.totalPaths;
                analytics.content.totalModules = lmsStats.totalModules;
                analytics.content.totalLessons = lmsStats.totalLessons;
            }
            if (this.assessmentService) {
                const assessmentStats = await this.assessmentService.getAssessmentStatistics();
                analytics.content.totalAssessments = assessmentStats.totalAssessments;
                analytics.performance.averageScores = assessmentStats.averageScore;
                analytics.performance.passRates = assessmentStats.passRate;
            }
            if (this.certificationService) {
                const certStats = await this.certificationService.getCertificationStatistics();
                analytics.performance.certificationsEarned = certStats.totalCertificates;
            }
            if (this.knowledgeBaseService) {
                const kbStats = await this.knowledgeBaseService.getKnowledgeBaseStatistics();
                analytics.content.totalKnowledgeArticles = kbStats.totalArticles;
            }
            // Additional analytics would be calculated by aggregating data across services
        }
        catch (error) {
            logger.error('Error generating educational analytics:', error);
        }
        return analytics;
    }
    async getLearningStatistics() {
        const stats = {
            totalLearningPaths: 0,
            totalModules: 0,
            totalLessons: 0,
            totalLabs: 0,
            totalAssessments: 0,
            totalStudents: 0,
            totalInstructors: 0,
            totalEnrollments: 0,
            completionRate: 0,
            averageScore: 0,
            popularPaths: [],
            recentActivity: []
        };
        try {
            // Aggregate statistics from all services
            const promises = [];
            if (this.learningManagementService) {
                promises.push(this.learningManagementService.getLearningPathStatistics()
                    .then(lmsStats => {
                    stats.totalLearningPaths = lmsStats.totalPaths;
                    stats.totalModules = lmsStats.totalModules;
                    stats.totalLessons = lmsStats.totalLessons;
                }));
            }
            if (this.assessmentService) {
                promises.push(this.assessmentService.getAssessmentStatistics()
                    .then(assessmentStats => {
                    stats.totalAssessments = assessmentStats.totalAssessments;
                    stats.averageScore = assessmentStats.averageScore;
                }));
            }
            if (this.progressTrackingService) {
                promises.push(
                // Assuming a method to get overall progress statistics
                Promise.resolve().then(() => {
                    // Implementation would aggregate enrollment and completion data
                    stats.totalEnrollments = 0;
                    stats.completionRate = 0;
                }));
            }
            await Promise.allSettled(promises);
        }
        catch (error) {
            logger.error('Error generating learning statistics:', error);
        }
        return stats;
    }
    // Search across all educational content
    async searchEducationalContent(query, filters, pagination) {
        const results = { total: 0 };
        try {
            const searchPromises = [];
            // Search learning paths
            if (this.learningManagementService) {
                searchPromises.push(this.learningManagementService.searchLearningPaths({ ...filters, query }, { ...pagination, limit: Math.floor(pagination.limit / 3) }).then(pathResults => {
                    results.learningPaths = pathResults.paths;
                    results.total += pathResults.total;
                }));
            }
            // Search knowledge base articles
            if (this.knowledgeBaseService) {
                searchPromises.push(this.knowledgeBaseService.searchArticles({ ...filters, query }, { ...pagination, limit: Math.floor(pagination.limit / 3) }).then(articleResults => {
                    results.knowledgeArticles = articleResults.articles;
                    results.total += articleResults.total;
                }));
            }
            // Search training scenarios
            if (this.trainingScenarioService) {
                searchPromises.push(this.trainingScenarioService.searchTrainingScenarios({ ...filters, query }, { ...pagination, limit: Math.floor(pagination.limit / 3) }).then(scenarioResults => {
                    results.trainingScenarios = scenarioResults.scenarios;
                    results.total += scenarioResults.total;
                }));
            }
            await Promise.allSettled(searchPromises);
        }
        catch (error) {
            logger.error('Error searching educational content:', error);
        }
        return results;
    }
    // Student Journey Methods
    async getStudentJourney(studentId) {
        const journey = {
            enrollments: [],
            progress: [],
            achievements: [],
            certificates: [],
            recentActivity: []
        };
        try {
            const journeyPromises = [];
            // Get enrollments
            if (this.progressTrackingService) {
                journeyPromises.push(this.progressTrackingService.getStudentEnrollments(studentId)
                    .then(enrollments => { journey.enrollments = enrollments; }));
                journeyPromises.push(this.progressTrackingService.getStudentProgress(studentId)
                    .then(progress => { journey.progress = progress; }));
                journeyPromises.push(this.progressTrackingService.getStudentAchievements(studentId)
                    .then(achievements => { journey.achievements = achievements; }));
            }
            // Get certificates
            // Implementation would fetch certificates for the student
            await Promise.allSettled(journeyPromises);
        }
        catch (error) {
            logger.error('Error getting student journey:', error);
        }
        return journey;
    }
    // Configuration Management
    getConfiguration() {
        return this.config.educational;
    }
    async updateConfiguration(updates) {
        const newConfig = { ...this.config.educational, ...updates };
        const validatedConfig = EducationalConfigSchema.parse(newConfig);
        this.config.educational = validatedConfig;
        // Notify services of configuration changes
        this.emit('configuration-updated', validatedConfig);
        logger.info('Educational configuration updated');
    }
    // Shutdown
    async shutdown() {
        logger.info('Shutting down Educational Manager');
        const shutdownPromises = [];
        // Shutdown all services
        if (this.learningManagementService) {
            shutdownPromises.push(this.learningManagementService.shutdown());
        }
        if (this.labEnvironmentService) {
            shutdownPromises.push(this.labEnvironmentService.shutdown());
        }
        if (this.progressTrackingService) {
            shutdownPromises.push(this.progressTrackingService.shutdown());
        }
        if (this.assessmentService) {
            shutdownPromises.push(this.assessmentService.shutdown());
        }
        if (this.certificationService) {
            shutdownPromises.push(this.certificationService.shutdown());
        }
        if (this.trainingScenarioService) {
            shutdownPromises.push(this.trainingScenarioService.shutdown());
        }
        if (this.knowledgeBaseService) {
            shutdownPromises.push(this.knowledgeBaseService.shutdown());
        }
        if (this.instructorService) {
            shutdownPromises.push(this.instructorService.shutdown());
        }
        await Promise.allSettled(shutdownPromises);
        // Update service statuses
        this.serviceStatuses.forEach((_, serviceName) => {
            this.setServiceStatus(serviceName, 'stopped');
        });
        this.initialized = false;
        this.emit('educational-manager-shutdown');
        logger.info('Educational Manager shutdown complete');
    }
}
//# sourceMappingURL=educational-manager.js.map