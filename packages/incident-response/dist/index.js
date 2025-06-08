"use strict";
// Incident Response Package Exports
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentResponseManager = exports.logger = exports.SOARIntegrationService = exports.PlaybookEngine = exports.EscalationService = exports.NotificationService = exports.EvidencePreservationService = exports.TimelineReconstructionService = exports.CaseManagementService = void 0;
// Types
__exportStar(require("./types/incident-response.types"), exports);
// Services
var case_management_service_1 = require("./services/case-management-service");
Object.defineProperty(exports, "CaseManagementService", { enumerable: true, get: function () { return case_management_service_1.CaseManagementService; } });
var timeline_reconstruction_service_1 = require("./services/timeline-reconstruction-service");
Object.defineProperty(exports, "TimelineReconstructionService", { enumerable: true, get: function () { return timeline_reconstruction_service_1.TimelineReconstructionService; } });
var evidence_preservation_service_1 = require("./services/evidence-preservation-service");
Object.defineProperty(exports, "EvidencePreservationService", { enumerable: true, get: function () { return evidence_preservation_service_1.EvidencePreservationService; } });
var notification_service_1 = require("./services/notification-service");
Object.defineProperty(exports, "NotificationService", { enumerable: true, get: function () { return notification_service_1.NotificationService; } });
var escalation_service_1 = require("./services/escalation-service");
Object.defineProperty(exports, "EscalationService", { enumerable: true, get: function () { return escalation_service_1.EscalationService; } });
// Engines
var playbook_engine_1 = require("./engines/playbook-engine");
Object.defineProperty(exports, "PlaybookEngine", { enumerable: true, get: function () { return playbook_engine_1.PlaybookEngine; } });
// Integrations
var soar_integration_1 = require("./integrations/soar-integration");
Object.defineProperty(exports, "SOARIntegrationService", { enumerable: true, get: function () { return soar_integration_1.SOARIntegrationService; } });
// Utilities
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
// Main Incident Response Manager
const events_1 = require("events");
const case_management_service_2 = require("./services/case-management-service");
const timeline_reconstruction_service_2 = require("./services/timeline-reconstruction-service");
const evidence_preservation_service_2 = require("./services/evidence-preservation-service");
const notification_service_2 = require("./services/notification-service");
const escalation_service_2 = require("./services/escalation-service");
const playbook_engine_2 = require("./engines/playbook-engine");
const soar_integration_2 = require("./integrations/soar-integration");
const logger_2 = require("./utils/logger");
class IncidentResponseManager extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        // Initialize services
        this.caseManagement = new case_management_service_2.CaseManagementService({
            database: config.database,
            autoAssignment: config.irConfig.automation.autoAssignment,
            escalationEnabled: config.irConfig.escalation.enabled,
            retentionPeriod: config.evidence.retentionPeriod
        });
        this.timelineReconstruction = new timeline_reconstruction_service_2.TimelineReconstructionService({
            database: config.database
        });
        this.evidencePreservation = new evidence_preservation_service_2.EvidencePreservationService({
            database: config.database,
            storage: config.evidence,
            forensics: config.forensics
        });
        this.notifications = new notification_service_2.NotificationService({
            database: config.database,
            irConfig: config.irConfig
        });
        this.escalation = new escalation_service_2.EscalationService({
            database: config.database
        });
        this.playbooks = new playbook_engine_2.PlaybookEngine({
            database: config.database,
            maxConcurrentExecutions: config.playbook.maxConcurrentExecutions,
            defaultTimeout: config.playbook.defaultTimeout,
            enableApprovalWorkflow: config.playbook.enableApprovalWorkflow,
            notificationWebhook: config.playbook.notificationWebhook
        });
        this.soarIntegration = new soar_integration_2.SOARIntegrationService();
        this.setupEventHandlers();
    }
    async initialize() {
        logger_2.logger.info('Initializing Incident Response Manager');
        try {
            // Initialize all services in parallel
            await Promise.all([
                this.caseManagement.initialize(),
                this.timelineReconstruction.initialize(),
                this.evidencePreservation.initialize(),
                this.notifications.initialize(),
                this.escalation.initialize(),
                this.playbooks.initialize(),
                this.soarIntegration.initialize()
            ]);
            logger_2.logger.info('Incident Response Manager initialized successfully');
            this.emit('system-ready');
        }
        catch (error) {
            logger_2.logger.error('Failed to initialize Incident Response Manager:', error);
            throw error;
        }
    }
    setupEventHandlers() {
        // Case Management Events
        this.caseManagement.on('case-created', async (data) => {
            const { caseId, case: caseData } = data;
            // Register for escalation monitoring
            await this.escalation.registerCaseForEscalation(caseData);
            // Send creation notification
            await this.notifications.sendNotificationFromTemplate('case-created', caseData.reporter, {
                caseTitle: caseData.title,
                caseSeverity: caseData.severity,
                casePriority: caseData.priority,
                reporter: caseData.reporter,
                createdAt: caseData.createdAt.toISOString(),
                caseDescription: caseData.description,
                caseId: caseData.id,
                caseUrl: `${this.config.irConfig.notifications.caseBaseUrl || ''}/cases/${caseData.id}`
            }, {
                priority: this.mapCasePriorityToNotification(caseData.priority),
                relatedEntityId: caseData.id,
                relatedEntityType: 'case'
            });
            // Sync to SOAR if configured
            await this.soarIntegration.syncCaseToSOAR(caseData);
            this.emit('case-created', data);
        });
        this.caseManagement.on('case-assigned', async (data) => {
            const { caseId, assignee } = data;
            const caseData = await this.caseManagement.getCase(caseId);
            if (caseData) {
                await this.notifications.sendNotificationFromTemplate('case-assigned', assignee, {
                    caseTitle: caseData.title,
                    caseSeverity: caseData.severity,
                    casePriority: caseData.priority,
                    assignedBy: data.assignedBy || 'system',
                    dueDate: caseData.dueDate?.toISOString() || 'Not set',
                    caseId: caseData.id,
                    caseUrl: `${this.config.irConfig.notifications.caseBaseUrl || ''}/cases/${caseData.id}`
                });
            }
            this.emit('case-assigned', data);
        });
        this.caseManagement.on('case-closed', async (data) => {
            const { caseId } = data;
            // Unregister from escalation monitoring
            await this.escalation.unregisterCaseFromEscalation(caseId);
            this.emit('case-closed', data);
        });
        // Evidence Events
        this.evidencePreservation.on('evidence-collected', async (data) => {
            const { evidenceId, caseId } = data;
            const evidenceData = await this.evidencePreservation.getEvidence(evidenceId, 'system');
            if (evidenceData) {
                const caseData = await this.caseManagement.getCase(caseId);
                if (caseData && caseData.assignee) {
                    await this.notifications.sendNotificationFromTemplate('evidence-added', caseData.assignee, {
                        caseTitle: caseData.title,
                        evidenceName: evidenceData.name,
                        evidenceType: evidenceData.type,
                        addedBy: evidenceData.collectedBy,
                        addedAt: evidenceData.collectedAt.toISOString(),
                        evidenceDescription: evidenceData.description,
                        caseId: caseData.id,
                        evidenceId: evidenceData.id,
                        caseUrl: `${this.config.irConfig.notifications.caseBaseUrl || ''}/cases/${caseData.id}`
                    });
                }
                // Upload to SOAR if configured
                await this.soarIntegration.uploadEvidenceToSOAR(evidenceData);
            }
            this.emit('evidence-collected', data);
        });
        this.evidencePreservation.on('integrity-failure', async (data) => {
            logger_2.logger.critical('Evidence integrity failure detected:', data);
            // Send critical notification
            await this.notifications.sendNotification({
                type: 'evidence-integrity-failure',
                title: 'CRITICAL: Evidence Integrity Failure',
                message: `Evidence integrity verification failed for evidence ${data.evidenceId}. Immediate investigation required.`,
                recipient: 'security-manager',
                channels: ['email', 'sms', 'slack'],
                priority: 'p1',
                relatedEntityId: data.evidenceId,
                relatedEntityType: 'evidence'
            });
            this.emit('integrity-failure', data);
        });
        // Playbook Events
        this.playbooks.on('approval-required', async (data) => {
            const { executionId, playbookId, approvers } = data;
            const playbook = await this.playbooks.getPlaybook(playbookId);
            if (playbook) {
                for (const approver of approvers) {
                    await this.notifications.sendNotificationFromTemplate('approval-required', approver, {
                        playbookName: playbook.name,
                        triggeredBy: data.triggeredBy || 'system',
                        caseTitle: data.caseTitle || 'N/A',
                        reason: playbook.description,
                        approvalUrl: `${this.config.irConfig.notifications.baseUrl || ''}/approvals/${executionId}`,
                        executionId
                    }, {
                        priority: 'p2',
                        relatedEntityId: executionId,
                        relatedEntityType: 'playbook'
                    });
                }
            }
            this.emit('approval-required', data);
        });
        // Escalation Events
        this.escalation.on('escalation-notification', async (data) => {
            await this.notifications.sendNotificationFromTemplate('escalation', data.recipient, data, {
                priority: 'p1',
                channels: data.channels,
                relatedEntityId: data.caseId,
                relatedEntityType: 'case'
            });
        });
        this.escalation.on('escalation-assignment', async (data) => {
            await this.caseManagement.assignCase(data.caseId, data.assignee, 'escalation-service');
        });
        this.escalation.on('escalation-case-escalated', async (data) => {
            await this.caseManagement.updateCase(data.caseId, {
                priority: data.newPriority,
                status: 'escalated'
            }, 'escalation-service');
        });
        this.escalation.on('get-case-data', async (data) => {
            const caseData = await this.caseManagement.getCase(data.caseId);
            data.callback(caseData);
        });
    }
    // High-level API Methods
    async createSecurityIncident(incidentData) {
        const caseData = await this.caseManagement.createCase({
            title: incidentData.title,
            description: incidentData.description,
            severity: incidentData.severity,
            priority: incidentData.priority,
            status: 'open',
            reporter: incidentData.reporter,
            sourceAlerts: incidentData.sourceAlerts || [],
            affectedSystems: incidentData.affectedSystems || [],
            mitreAttackTechniques: incidentData.mitreAttackTechniques || [],
            tags: incidentData.tags || [],
            timeline: [],
            metrics: {},
            metadata: {}
        });
        // Check for auto-triggered playbooks
        const triggeredPlaybooks = await this.playbooks.findTriggeredPlaybooks({
            severity: incidentData.severity,
            tags: incidentData.tags,
            mitreAttackTechniques: incidentData.mitreAttackTechniques
        });
        for (const playbook of triggeredPlaybooks) {
            await this.playbooks.executePlaybook(playbook.id, {
                triggeredBy: 'auto-trigger',
                caseId: caseData.id,
                variables: {
                    severity: incidentData.severity,
                    affectedSystems: incidentData.affectedSystems
                }
            });
        }
        return caseData;
    }
    async processAlert(alertData) {
        // Add to timeline if case exists, or create new case
        let caseData;
        // Try to find existing related case
        const relatedCases = await this.caseManagement.searchCases({
            sourceAlerts: [alertData.alertId],
            status: ['open', 'in-progress'],
            limit: 1
        });
        if (relatedCases.cases.length > 0) {
            caseData = relatedCases.cases[0];
        }
        else if (alertData.severity === 'critical' || alertData.severity === 'high') {
            // Auto-create case for high severity alerts
            caseData = await this.createSecurityIncident({
                title: `Alert: ${alertData.title}`,
                description: `Automatically created from alert ${alertData.alertId}`,
                severity: alertData.severity,
                priority: alertData.severity === 'critical' ? 'p1' : 'p2',
                reporter: 'alert-system',
                sourceAlerts: [alertData.alertId],
                tags: ['auto-created', 'alert']
            });
        }
        // Add timeline event
        const timelineEvent = {
            id: `alert-${alertData.alertId}`,
            caseId: caseData?.id || 'unassigned',
            timestamp: alertData.timestamp,
            event: 'Security Alert',
            description: alertData.title,
            source: alertData.source,
            sourceType: 'alert',
            severity: alertData.severity,
            automated: true,
            tags: ['alert'],
            relatedEntities: [],
            attachments: [],
            metadata: alertData.details
        };
        if (caseData) {
            await this.timelineReconstruction.addTimelineEvent(caseData.id, timelineEvent);
        }
        return { case: caseData, timelineEvent };
    }
    async collectForensicEvidence(caseId, collectionRequest) {
        const collection = await this.evidencePreservation.createForensicCollection(caseId, collectionRequest);
        // Start collection if high priority
        if (collectionRequest.priority === 'high' || collectionRequest.priority === 'critical') {
            await this.evidencePreservation.startForensicCollection(collection.id, collectionRequest.collectedBy);
        }
        return collection;
    }
    // Statistics and Monitoring
    async getSystemStatistics() {
        const [caseStats, evidenceStats, notificationStats, escalationStats, playbookStats] = await Promise.all([
            this.caseManagement.getCaseStatistics(),
            this.evidencePreservation.getEvidenceStatistics(),
            this.notifications.getNotificationStatistics(),
            this.escalation.getEscalationStatistics(),
            this.playbooks.getPlaybookStatistics()
        ]);
        return {
            cases: caseStats,
            evidence: evidenceStats,
            notifications: notificationStats,
            escalations: escalationStats,
            playbooks: playbookStats,
            system: {
                uptime: process.uptime(),
                version: '1.0.0',
                status: 'operational'
            }
        };
    }
    // Utility Methods
    mapCasePriorityToNotification(priority) {
        const mapping = {
            'p1': 'p1',
            'p2': 'p2',
            'p3': 'p3',
            'p4': 'p4'
        };
        return mapping[priority] || 'p3';
    }
    // Shutdown
    async shutdown() {
        logger_2.logger.info('Shutting down Incident Response Manager');
        try {
            await Promise.all([
                this.caseManagement.shutdown(),
                this.timelineReconstruction.shutdown(),
                this.evidencePreservation.shutdown(),
                this.notifications.shutdown(),
                this.escalation.shutdown(),
                this.playbooks.shutdown(),
                this.soarIntegration.shutdown()
            ]);
            logger_2.logger.info('Incident Response Manager shutdown complete');
            this.emit('system-shutdown');
        }
        catch (error) {
            logger_2.logger.error('Error during shutdown:', error);
            throw error;
        }
    }
}
exports.IncidentResponseManager = IncidentResponseManager;
