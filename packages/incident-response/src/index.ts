// Incident Response Package Exports

// Types
export * from './types/incident-response.types';

// Services
export { CaseManagementService } from './services/case-management-service';
export { TimelineReconstructionService } from './services/timeline-reconstruction-service';
export { EvidencePreservationService } from './services/evidence-preservation-service';
export { NotificationService } from './services/notification-service';
export { EscalationService } from './services/escalation-service';

// Engines
export { PlaybookEngine } from './engines/playbook-engine';

// Integrations
export { SOARIntegrationService } from './integrations/soar-integration';

// Utilities
export { logger } from './utils/logger';

// Main Incident Response Manager
import { EventEmitter } from 'events';
import { CaseManagementService } from './services/case-management-service';
import { TimelineReconstructionService } from './services/timeline-reconstruction-service';
import { EvidencePreservationService } from './services/evidence-preservation-service';
import { NotificationService } from './services/notification-service';
import { EscalationService } from './services/escalation-service';
import { PlaybookEngine } from './engines/playbook-engine';
import { SOARIntegrationService } from './integrations/soar-integration';
import { logger } from './utils/logger';
import {
  Case,
  Task,
  Evidence,
  Playbook,
  Notification,
  DatabaseConfig,
  IRConfig
} from './types/incident-response.types';

export interface IncidentResponseConfig {
  database: DatabaseConfig;
  irConfig: IRConfig;
  playbook: {
    maxConcurrentExecutions: number;
    defaultTimeout: number;
    enableApprovalWorkflow: boolean;
    notificationWebhook?: string;
  };
  evidence: {
    basePath: string;
    encryptionEnabled: boolean;
    compressionEnabled: boolean;
    checksumAlgorithm: 'md5' | 'sha1' | 'sha256' | 'sha512';
    retentionPeriod: number;
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
  forensics: {
    toolsPath: string;
    outputPath: string;
    encryptionKey?: string;
    compressionLevel: number;
    verificationEnabled: boolean;
  };
}

export class IncidentResponseManager extends EventEmitter {
  private config: IncidentResponseConfig;
  
  // Core Services
  public caseManagement: CaseManagementService;
  public timelineReconstruction: TimelineReconstructionService;
  public evidencePreservation: EvidencePreservationService;
  public notifications: NotificationService;
  public escalation: EscalationService;
  public playbooks: PlaybookEngine;
  public soarIntegration: SOARIntegrationService;

  constructor(config: IncidentResponseConfig) {
    super();
    this.config = config;

    // Initialize services
    this.caseManagement = new CaseManagementService({
      database: config.database,
      autoAssignment: config.irConfig.automation.autoAssignment,
      escalationEnabled: config.irConfig.escalation.enabled,
      retentionPeriod: config.evidence.retentionPeriod
    });

    this.timelineReconstruction = new TimelineReconstructionService({
      database: config.database
    });

    this.evidencePreservation = new EvidencePreservationService({
      database: config.database,
      storage: config.evidence,
      forensics: config.forensics
    });

    this.notifications = new NotificationService({
      database: config.database,
      irConfig: config.irConfig
    });

    this.escalation = new EscalationService({
      database: config.database
    });

    this.playbooks = new PlaybookEngine({
      database: config.database,
      maxConcurrentExecutions: config.playbook.maxConcurrentExecutions,
      defaultTimeout: config.playbook.defaultTimeout,
      enableApprovalWorkflow: config.playbook.enableApprovalWorkflow,
      notificationWebhook: config.playbook.notificationWebhook
    });

    this.soarIntegration = new SOARIntegrationService();

    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Incident Response Manager');

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

      logger.info('Incident Response Manager initialized successfully');
      this.emit('system-ready');
    } catch (error) {
      logger.error('Failed to initialize Incident Response Manager:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // Case Management Events
    this.caseManagement.on('case-created', async (data) => {
      const { caseId, case: caseData } = data;
      
      // Register for escalation monitoring
      await this.escalation.registerCaseForEscalation(caseData);
      
      // Send creation notification
      await this.notifications.sendNotificationFromTemplate(
        'case-created',
        caseData.reporter,
        {
          caseTitle: caseData.title,
          caseSeverity: caseData.severity,
          casePriority: caseData.priority,
          reporter: caseData.reporter,
          createdAt: caseData.createdAt.toISOString(),
          caseDescription: caseData.description,
          caseId: caseData.id,
          caseUrl: `${this.config.irConfig.notifications.caseBaseUrl || ''}/cases/${caseData.id}`
        },
        {
          priority: this.mapCasePriorityToNotification(caseData.priority),
          relatedEntityId: caseData.id,
          relatedEntityType: 'case'
        }
      );

      // Sync to SOAR if configured
      await this.soarIntegration.syncCaseToSOAR(caseData);
      
      this.emit('case-created', data);
    });

    this.caseManagement.on('case-assigned', async (data) => {
      const { caseId, assignee } = data;
      const caseData = await this.caseManagement.getCase(caseId);
      
      if (caseData) {
        await this.notifications.sendNotificationFromTemplate(
          'case-assigned',
          assignee,
          {
            caseTitle: caseData.title,
            caseSeverity: caseData.severity,
            casePriority: caseData.priority,
            assignedBy: data.assignedBy || 'system',
            dueDate: caseData.dueDate?.toISOString() || 'Not set',
            caseId: caseData.id,
            caseUrl: `${this.config.irConfig.notifications.caseBaseUrl || ''}/cases/${caseData.id}`
          }
        );
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
          await this.notifications.sendNotificationFromTemplate(
            'evidence-added',
            caseData.assignee,
            {
              caseTitle: caseData.title,
              evidenceName: evidenceData.name,
              evidenceType: evidenceData.type,
              addedBy: evidenceData.collectedBy,
              addedAt: evidenceData.collectedAt.toISOString(),
              evidenceDescription: evidenceData.description,
              caseId: caseData.id,
              evidenceId: evidenceData.id,
              caseUrl: `${this.config.irConfig.notifications.caseBaseUrl || ''}/cases/${caseData.id}`
            }
          );
        }

        // Upload to SOAR if configured
        await this.soarIntegration.uploadEvidenceToSOAR(evidenceData);
      }
      
      this.emit('evidence-collected', data);
    });

    this.evidencePreservation.on('integrity-failure', async (data) => {
      logger.critical('Evidence integrity failure detected:', data);
      
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
          await this.notifications.sendNotificationFromTemplate(
            'approval-required',
            approver,
            {
              playbookName: playbook.name,
              triggeredBy: data.triggeredBy || 'system',
              caseTitle: data.caseTitle || 'N/A',
              reason: playbook.description,
              approvalUrl: `${this.config.irConfig.notifications.baseUrl || ''}/approvals/${executionId}`,
              executionId
            },
            {
              priority: 'p2',
              relatedEntityId: executionId,
              relatedEntityType: 'playbook'
            }
          );
        }
      }
      
      this.emit('approval-required', data);
    });

    // Escalation Events
    this.escalation.on('escalation-notification', async (data) => {
      await this.notifications.sendNotificationFromTemplate(
        'escalation',
        data.recipient,
        data,
        {
          priority: 'p1',
          channels: data.channels,
          relatedEntityId: data.caseId,
          relatedEntityType: 'case'
        }
      );
    });

    this.escalation.on('escalation-assignment', async (data) => {
      await this.caseManagement.assignCase(data.caseId, data.assignee, 'escalation-service');
    });

    this.escalation.on('escalation-case-escalated', async (data) => {
      await this.caseManagement.updateCase(data.caseId, {
        priority: data.newPriority as any,
        status: 'escalated'
      }, 'escalation-service');
    });

    this.escalation.on('get-case-data', async (data) => {
      const caseData = await this.caseManagement.getCase(data.caseId);
      data.callback(caseData);
    });
  }

  // High-level API Methods
  async createSecurityIncident(incidentData: {
    title: string;
    description: string;
    severity: string;
    priority: string;
    reporter: string;
    sourceAlerts?: string[];
    affectedSystems?: string[];
    mitreAttackTechniques?: string[];
    tags?: string[];
  }): Promise<Case> {
    const caseData = await this.caseManagement.createCase({
      title: incidentData.title,
      description: incidentData.description,
      severity: incidentData.severity as any,
      priority: incidentData.priority as any,
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

  async processAlert(alertData: {
    alertId: string;
    title: string;
    severity: string;
    source: string;
    timestamp: Date;
    details: any;
    indicators?: string[];
  }): Promise<{ case?: Case; timelineEvent: any }> {
    // Add to timeline if case exists, or create new case
    let caseData: Case | undefined;
    
    // Try to find existing related case
    const relatedCases = await this.caseManagement.searchCases({
      sourceAlerts: [alertData.alertId],
      status: ['open', 'in-progress'],
      limit: 1
    });

    if (relatedCases.cases.length > 0) {
      caseData = relatedCases.cases[0];
    } else if (alertData.severity === 'critical' || alertData.severity === 'high') {
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
      sourceType: 'alert' as const,
      severity: alertData.severity as any,
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

  async collectForensicEvidence(
    caseId: string,
    collectionRequest: {
      name: string;
      description: string;
      target: {
        type: 'host' | 'network' | 'cloud' | 'mobile';
        identifier: string;
        location?: string;
      };
      collectionType: 'live-response' | 'disk-image' | 'memory-dump' | 'network-capture' | 'log-collection';
      collectedBy: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<any> {
    const collection = await this.evidencePreservation.createForensicCollection(caseId, collectionRequest);
    
    // Start collection if high priority
    if (collectionRequest.priority === 'high' || collectionRequest.priority === 'critical') {
      await this.evidencePreservation.startForensicCollection(collection.id, collectionRequest.collectedBy);
    }

    return collection;
  }

  // Statistics and Monitoring
  async getSystemStatistics(): Promise<any> {
    const [
      caseStats,
      evidenceStats,
      notificationStats,
      escalationStats,
      playbookStats
    ] = await Promise.all([
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
  private mapCasePriorityToNotification(priority: string): string {
    const mapping: { [key: string]: string } = {
      'p1': 'p1',
      'p2': 'p2',
      'p3': 'p3',
      'p4': 'p4'
    };
    return mapping[priority] || 'p3';
  }

  // Shutdown
  async shutdown(): Promise<void> {
    logger.info('Shutting down Incident Response Manager');

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

      logger.info('Incident Response Manager shutdown complete');
      this.emit('system-shutdown');
    } catch (error) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }
}