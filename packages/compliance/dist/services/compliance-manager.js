"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceManager = void 0;
exports.createComplianceSystem = createComplianceSystem;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
const compliance_types_1 = require("../types/compliance.types");
// Import all services
const evidence_collection_service_1 = require("./evidence-collection-service");
const audit_trail_service_1 = require("./audit-trail-service");
const risk_assessment_service_1 = require("./risk-assessment-service");
// Import frameworks and templates
const frameworks_1 = require("../frameworks");
class ComplianceManager extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.frameworks = new Map();
        this.initialized = false;
        this.config = {
            ...config,
            compliance: compliance_types_1.ComplianceConfigSchema.parse({
                retentionPolicy: {
                    auditLogs: 2555, // 7 years
                    evidence: 2555,
                    reports: 2555,
                    assessments: 1825 // 5 years
                },
                automation: {
                    enabledFrameworks: ['SOX', 'HIPAA', 'PCI-DSS', 'GDPR', 'ISO-27001', 'NIST-CSF'],
                    evidenceCollection: true,
                    reportGeneration: true,
                    riskScoring: true,
                    notifications: {
                        enabled: true,
                        channels: ['email', 'webhook'],
                        recipients: {}
                    }
                },
                scoring: {
                    method: 'weighted',
                    weights: {}
                },
                integrations: [],
                ...config.compliance
            }),
            services: {
                enableEvidenceCollection: true,
                enableAuditTrail: true,
                enableRiskAssessment: true,
                ...config.services
            }
        };
    }
    async initialize() {
        logger_1.logger.info('Initializing Compliance Manager');
        try {
            // Initialize services
            await this.initializeServices();
            // Load compliance frameworks
            await this.loadFrameworks();
            // Set up event handlers
            this.setupEventHandlers();
            // Start health monitoring
            this.startHealthMonitoring();
            this.initialized = true;
            this.emit('compliance-manager-initialized');
            logger_1.logger.info('Compliance Manager initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Compliance Manager:', error);
            throw error;
        }
    }
    async initializeServices() {
        const initPromises = [];
        // Initialize Evidence Collection Service
        if (this.config.services?.enableEvidenceCollection) {
            this.evidenceService = new evidence_collection_service_1.EvidenceCollectionService({
                database: this.config.database
            });
            initPromises.push(this.evidenceService.initialize());
        }
        // Initialize Audit Trail Service
        if (this.config.services?.enableAuditTrail) {
            this.auditService = new audit_trail_service_1.AuditTrailService({
                database: this.config.database
            });
            initPromises.push(this.auditService.initialize());
        }
        // Initialize Risk Assessment Service
        if (this.config.services?.enableRiskAssessment) {
            this.riskService = new risk_assessment_service_1.RiskAssessmentService({
                database: this.config.database
            });
            initPromises.push(this.riskService.initialize());
        }
        await Promise.all(initPromises);
        logger_1.logger.info('All compliance services initialized');
    }
    async loadFrameworks() {
        const enabledFrameworks = this.config.compliance?.automation.enabledFrameworks || [];
        for (const frameworkType of enabledFrameworks) {
            const framework = (0, frameworks_1.createFrameworkFromDefinition)(frameworkType);
            if (framework) {
                this.frameworks.set(frameworkType, framework);
                logger_1.logger.info(`Loaded framework: ${frameworkType}`);
            }
        }
    }
    setupEventHandlers() {
        // Evidence collection events
        if (this.evidenceService) {
            this.evidenceService.on('evidence-collected', (event) => {
                this.emit('evidence-collected', event);
                this.logComplianceEvent('evidence_collected', event);
            });
            this.evidenceService.on('collection-failed', (event) => {
                this.emit('collection-failed', event);
                this.logComplianceEvent('collection_failed', event);
            });
        }
        // Audit trail events
        if (this.auditService) {
            this.auditService.on('alert-triggered', (event) => {
                this.emit('audit-alert', event);
                this.handleAuditAlert(event);
            });
        }
        // Risk assessment events
        if (this.riskService) {
            this.riskService.on('risk-assessment-completed', (event) => {
                this.emit('risk-assessed', event);
                this.logComplianceEvent('risk_assessment_completed', event);
            });
            this.riskService.on('risk-accepted', (event) => {
                this.emit('risk-accepted', event);
                this.logComplianceEvent('risk_accepted', event);
            });
        }
    }
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            const health = await this.checkHealth();
            this.emit('health-check', health);
        }, 60000); // Check every minute
    }
    // Framework Management
    getFramework(type) {
        return this.frameworks.get(type);
    }
    getEnabledFrameworks() {
        return Array.from(this.frameworks.values());
    }
    async updateFrameworkStatus(frameworkId, enabled) {
        const config = this.config.compliance;
        if (enabled) {
            if (!config.automation.enabledFrameworks.includes(frameworkId)) {
                config.automation.enabledFrameworks.push(frameworkId);
                const framework = (0, frameworks_1.createFrameworkFromDefinition)(frameworkId);
                if (framework) {
                    this.frameworks.set(frameworkId, framework);
                }
            }
        }
        else {
            config.automation.enabledFrameworks = config.automation.enabledFrameworks.filter(f => f !== frameworkId);
            this.frameworks.delete(frameworkId);
        }
        this.emit('framework-status-changed', { frameworkId, enabled });
    }
    // Evidence Collection
    async collectEvidence(request) {
        if (!this.evidenceService) {
            throw new Error('Evidence collection service not enabled');
        }
        const evidence = await this.evidenceService.collectEvidence({
            frameworkId: request.frameworkId,
            controlIds: request.controlIds,
            evidenceType: request.evidenceType,
            source: request.source,
            data: request.data
        });
        await this.logComplianceEvent('evidence_collected_manual', {
            evidenceId: evidence.id,
            frameworkId: request.frameworkId,
            controlCount: request.controlIds.length
        });
        return evidence;
    }
    async scheduleEvidenceCollection(frameworkId, schedule) {
        if (!this.evidenceService) {
            throw new Error('Evidence collection service not enabled');
        }
        const framework = this.frameworks.get(frameworkId);
        if (!framework) {
            throw new Error(`Framework not found: ${frameworkId}`);
        }
        // Create collection rules for each control
        for (const control of framework.controls) {
            if (control.automationLevel !== 'manual') {
                await this.evidenceService.createCollectionRule({
                    name: `${framework.name} - ${control.title}`,
                    description: `Automated evidence collection for ${control.controlId}`,
                    frameworkId: framework.id,
                    controlIds: [control.id],
                    evidenceType: control.evidenceTypes[0], // Primary evidence type
                    automation: {
                        enabled: true,
                        schedule
                    },
                    collector: {
                        type: control.automationLevel === 'full' ? 'api' : 'script',
                        config: {
                            // Configuration would be control-specific
                            controlId: control.controlId,
                            evidenceTypes: control.evidenceTypes
                        }
                    },
                    active: true
                });
            }
        }
    }
    // Compliance Assessment
    async runComplianceAssessment(frameworkId, scope) {
        const framework = this.frameworks.get(frameworkId);
        if (!framework) {
            throw new Error(`Framework not found: ${frameworkId}`);
        }
        // Collect evidence for all controls
        const controlStatuses = new Map();
        const evidenceMap = new Map();
        if (this.evidenceService) {
            for (const control of framework.controls) {
                const evidence = await this.evidenceService.getEvidenceForControl(framework.id, control.id);
                evidenceMap.set(control.id, evidence);
                // Determine compliance status based on evidence
                const status = this.evaluateControlCompliance(control, evidence);
                controlStatuses.set(control.id, status);
            }
        }
        // Run risk assessment
        let riskAssessment;
        if (this.riskService) {
            riskAssessment = await this.riskService.assessFrameworkRisk(framework.id, framework.controls, controlStatuses);
        }
        const assessment = {
            id: uuidv4(),
            frameworkId: framework.id,
            assessmentDate: new Date(),
            assessorId: 'system',
            scope: scope || {
                departments: ['all'],
                systems: ['all'],
                processes: ['all']
            },
            controlAssessments: framework.controls.map(control => ({
                controlId: control.id,
                status: controlStatuses.get(control.id) || 'not_applicable',
                evidence: (evidenceMap.get(control.id) || []).map(e => e.id),
                findings: [], // Would be populated based on analysis
                notes: '',
                assessedAt: new Date(),
                assessedBy: 'system'
            })),
            overallStatus: this.calculateOverallStatus(controlStatuses),
            nextAssessmentDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            metadata: {
                riskAssessmentId: riskAssessment?.id
            }
        };
        await this.logComplianceEvent('assessment_completed', {
            assessmentId: assessment.id,
            frameworkId,
            overallStatus: assessment.overallStatus
        });
        return assessment;
    }
    evaluateControlCompliance(control, evidence) {
        if (evidence.length === 0) {
            return 'non_compliant';
        }
        // Check evidence age
        const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
        const recentEvidence = evidence.filter(e => new Date().getTime() - e.collectedAt.getTime() < maxAge);
        if (recentEvidence.length === 0) {
            return 'partially_compliant';
        }
        // Check if all required evidence types are present
        const collectedTypes = new Set(recentEvidence.map(e => e.type));
        const missingTypes = control.evidenceTypes.filter((t) => !collectedTypes.has(t));
        if (missingTypes.length === 0) {
            return 'compliant';
        }
        else if (missingTypes.length < control.evidenceTypes.length / 2) {
            return 'partially_compliant';
        }
        else {
            return 'non_compliant';
        }
    }
    calculateOverallStatus(statuses) {
        const counts = {
            compliant: 0,
            non_compliant: 0,
            partially_compliant: 0,
            not_applicable: 0
        };
        for (const status of statuses.values()) {
            counts[status]++;
        }
        const total = statuses.size - counts.not_applicable;
        const compliantPercentage = (counts.compliant / total) * 100;
        if (counts.non_compliant > 0) {
            return 'non_compliant';
        }
        else if (compliantPercentage >= 95) {
            return 'compliant';
        }
        else {
            return 'partially_compliant';
        }
    }
    // Gap Analysis
    async runGapAnalysis(request) {
        const framework = this.frameworks.get(request.frameworkId);
        if (!framework) {
            throw new Error(`Framework not found: ${request.frameworkId}`);
        }
        const assessment = await this.runComplianceAssessment(request.frameworkId);
        const gaps = [];
        for (const controlAssessment of assessment.controlAssessments) {
            if (controlAssessment.status !== 'compliant') {
                const control = framework.controls.find(c => c.id === controlAssessment.controlId);
                if (!control)
                    continue;
                const gap = {
                    id: uuidv4(),
                    frameworkId: framework.id,
                    controlId: control.id,
                    currentState: {
                        status: controlAssessment.status,
                        maturityLevel: this.calculateMaturityLevel(controlAssessment),
                        evidence: controlAssessment.evidence
                    },
                    targetState: {
                        status: 'compliant',
                        maturityLevel: request.targetMaturityLevel || 5,
                        requirements: control.requirements
                    },
                    gap: {
                        description: `Control ${control.controlId} is currently ${controlAssessment.status}`,
                        severity: this.calculateGapSeverity(controlAssessment.status, control.riskWeight),
                        remediationSteps: this.generateRemediationSteps(control, controlAssessment),
                        estimatedCost: this.estimateRemediationCost(control, controlAssessment),
                        estimatedEffort: this.estimateRemediationEffort(control, controlAssessment)
                    },
                    identifiedAt: new Date(),
                    identifiedBy: 'system',
                    metadata: {}
                };
                gaps.push(gap);
            }
        }
        return gaps;
    }
    calculateMaturityLevel(assessment) {
        switch (assessment.status) {
            case 'compliant': return 5;
            case 'partially_compliant': return 3;
            case 'non_compliant': return 1;
            default: return 0;
        }
    }
    calculateGapSeverity(status, riskWeight) {
        if (status === 'non_compliant' && riskWeight >= 9)
            return 'critical';
        if (status === 'non_compliant' && riskWeight >= 7)
            return 'high';
        if (status === 'partially_compliant' && riskWeight >= 7)
            return 'medium';
        return 'low';
    }
    generateRemediationSteps(control, assessment) {
        const steps = [];
        // Generic steps based on control type
        if (control.automationLevel === 'manual') {
            steps.push({
                step: 1,
                description: 'Document current manual processes',
                owner: 'Process Owner',
                effort: '1 week'
            });
            steps.push({
                step: 2,
                description: 'Identify automation opportunities',
                owner: 'IT Team',
                effort: '2 weeks'
            });
        }
        // Evidence-specific steps
        const missingEvidence = control.evidenceTypes.filter((type) => !assessment.evidence.some((e) => e.type === type));
        if (missingEvidence.length > 0) {
            steps.push({
                step: steps.length + 1,
                description: `Collect missing evidence types: ${missingEvidence.join(', ')}`,
                owner: 'Compliance Team',
                effort: '1-2 weeks'
            });
        }
        // Implementation guidance
        if (control.implementationGuidance) {
            steps.push({
                step: steps.length + 1,
                description: control.implementationGuidance,
                owner: 'Implementation Team',
                effort: '2-4 weeks'
            });
        }
        return steps;
    }
    estimateRemediationCost(control, assessment) {
        let baseCost = 5000;
        // Adjust based on automation needs
        if (control.automationLevel === 'manual' && assessment.status === 'non_compliant') {
            baseCost *= 3; // Automation implementation
        }
        // Adjust based on risk weight
        baseCost *= (control.riskWeight / 5);
        return Math.round(baseCost);
    }
    estimateRemediationEffort(control, assessment) {
        if (control.automationLevel === 'manual' && assessment.status === 'non_compliant') {
            return '3-6 months';
        }
        if (assessment.status === 'partially_compliant') {
            return '1-3 months';
        }
        return '2-4 weeks';
    }
    // Dashboard and Analytics
    async getComplianceDashboard() {
        const dashboard = {
            overallCompliance: {
                score: 0,
                trend: 'stable',
                change: 0
            },
            frameworkStatus: [],
            riskOverview: {
                criticalRisks: 0,
                highRisks: 0,
                mediumRisks: 0,
                lowRisks: 0,
                totalRiskScore: 0,
                trendsFromLastPeriod: {
                    newRisks: 0,
                    mitigatedRisks: 0,
                    acceptedRisks: 0
                }
            },
            upcomingActivities: [],
            recentFindings: [],
            evidenceCollection: {
                totalEvidence: 0,
                automatedCollection: 0,
                manualCollection: 0,
                lastCollectionRun: new Date(),
                nextScheduledRun: new Date()
            }
        };
        // Aggregate data from services
        let totalScore = 0;
        let frameworkCount = 0;
        for (const [type, framework] of this.frameworks) {
            const assessment = await this.getLatestAssessment(framework.id);
            if (assessment) {
                const score = this.calculateComplianceScore(assessment);
                totalScore += score;
                frameworkCount++;
                dashboard.frameworkStatus.push({
                    frameworkId: framework.id,
                    frameworkName: framework.name,
                    complianceScore: score,
                    controlsTotal: framework.controls.length,
                    controlsCompliant: assessment.controlAssessments.filter(ca => ca.status === 'compliant').length,
                    lastAssessment: assessment.assessmentDate,
                    nextAssessment: assessment.nextAssessmentDate
                });
            }
        }
        dashboard.overallCompliance.score = frameworkCount > 0 ? totalScore / frameworkCount : 0;
        // Get risk overview from risk service
        if (this.riskService) {
            // Aggregate risk data
            for (const framework of this.frameworks.values()) {
                const risks = await this.riskService.getHighRiskControls(framework.id, 100);
                for (const risk of risks) {
                    switch (risk.riskLevel) {
                        case 'critical':
                            dashboard.riskOverview.criticalRisks++;
                            break;
                        case 'high':
                            dashboard.riskOverview.highRisks++;
                            break;
                        case 'medium':
                            dashboard.riskOverview.mediumRisks++;
                            break;
                        case 'low':
                            dashboard.riskOverview.lowRisks++;
                            break;
                    }
                    dashboard.riskOverview.totalRiskScore += risk.riskScore;
                }
            }
        }
        // Get evidence collection stats
        if (this.evidenceService) {
            const evidenceStats = await this.evidenceService.searchEvidence({}, { page: 1, limit: 1 });
            dashboard.evidenceCollection.totalEvidence = evidenceStats.total;
        }
        return dashboard;
    }
    calculateComplianceScore(assessment) {
        const counts = {
            compliant: 0,
            non_compliant: 0,
            partially_compliant: 0,
            not_applicable: 0
        };
        for (const ca of assessment.controlAssessments) {
            counts[ca.status]++;
        }
        const total = assessment.controlAssessments.length - counts.not_applicable;
        if (total === 0)
            return 100;
        const score = ((counts.compliant + (counts.partially_compliant * 0.5)) / total) * 100;
        return Math.round(score);
    }
    async getLatestAssessment(frameworkId) {
        // In production, this would fetch from database
        // For now, return null to indicate no assessment yet
        return null;
    }
    // Audit and Logging
    async logComplianceEvent(action, details) {
        if (!this.auditService)
            return;
        await this.auditService.logEvent({
            timestamp: new Date(),
            userId: 'system',
            userEmail: 'system@compliance',
            userRole: 'system',
            action,
            resource: {
                type: 'compliance',
                id: details.id || 'system',
                name: details.name
            },
            details,
            result: 'success',
            ipAddress: '127.0.0.1',
            sessionId: 'system-session',
            compliance: {
                frameworkIds: details.frameworkId ? [details.frameworkId] : [],
                controlIds: details.controlIds || []
            }
        });
    }
    async handleAuditAlert(alert) {
        // Handle critical audit alerts
        logger_1.logger.warn('Audit alert triggered:', alert);
        // Send notifications based on configuration
        if (this.config.compliance?.automation.notifications.enabled) {
            this.emit('notification-required', {
                type: 'audit-alert',
                severity: alert.rule.severity,
                message: `Audit alert: ${alert.rule.name}`,
                details: alert
            });
        }
    }
    // Health Monitoring
    async checkHealth() {
        const health = [];
        // Check Evidence Collection Service
        if (this.evidenceService) {
            try {
                // Simple health check - could be more sophisticated
                const rules = await this.evidenceService.getCollectionRules();
                health.push({
                    service: 'evidence-collection',
                    status: 'healthy',
                    lastCheck: new Date()
                });
            }
            catch (error) {
                health.push({
                    service: 'evidence-collection',
                    status: 'unhealthy',
                    lastCheck: new Date(),
                    error: error.message
                });
            }
        }
        // Check Audit Trail Service
        if (this.auditService) {
            try {
                const stats = await this.auditService.getAuditStatistics({
                    start: new Date(Date.now() - 60000),
                    end: new Date()
                });
                health.push({
                    service: 'audit-trail',
                    status: 'healthy',
                    lastCheck: new Date()
                });
            }
            catch (error) {
                health.push({
                    service: 'audit-trail',
                    status: 'unhealthy',
                    lastCheck: new Date(),
                    error: error.message
                });
            }
        }
        // Check Risk Assessment Service
        if (this.riskService) {
            try {
                // Health check implementation
                health.push({
                    service: 'risk-assessment',
                    status: 'healthy',
                    lastCheck: new Date()
                });
            }
            catch (error) {
                health.push({
                    service: 'risk-assessment',
                    status: 'unhealthy',
                    lastCheck: new Date(),
                    error: error.message
                });
            }
        }
        return health;
    }
    // Cleanup and Maintenance
    async performMaintenance() {
        logger_1.logger.info('Performing compliance system maintenance');
        // Apply retention policies
        if (this.auditService) {
            const deletedAudits = await this.auditService.applyRetentionPolicies();
            logger_1.logger.info(`Deleted ${deletedAudits} expired audit records`);
        }
        // Clean up expired evidence
        if (this.evidenceService) {
            const deletedEvidence = await this.evidenceService.cleanupExpiredEvidence();
            logger_1.logger.info(`Deleted ${deletedEvidence} expired evidence records`);
        }
        this.emit('maintenance-completed', { timestamp: new Date() });
    }
    // Shutdown
    async shutdown() {
        logger_1.logger.info('Shutting down Compliance Manager');
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        const shutdownPromises = [];
        if (this.evidenceService) {
            shutdownPromises.push(this.evidenceService.shutdown());
        }
        if (this.auditService) {
            shutdownPromises.push(this.auditService.shutdown());
        }
        if (this.riskService) {
            shutdownPromises.push(this.riskService.shutdown());
        }
        await Promise.all(shutdownPromises);
        this.initialized = false;
        this.emit('compliance-manager-shutdown');
        logger_1.logger.info('Compliance Manager shutdown complete');
    }
    // Helper to generate unique ID
    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
exports.ComplianceManager = ComplianceManager;
// Export a factory function for easy initialization
async function createComplianceSystem(config) {
    const manager = new ComplianceManager(config);
    await manager.initialize();
    return manager;
}
//# sourceMappingURL=compliance-manager.js.map