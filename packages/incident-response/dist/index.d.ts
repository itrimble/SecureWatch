export * from './types/incident-response.types';
export { CaseManagementService } from './services/case-management-service';
export { TimelineReconstructionService } from './services/timeline-reconstruction-service';
export { EvidencePreservationService } from './services/evidence-preservation-service';
export { NotificationService } from './services/notification-service';
export { EscalationService } from './services/escalation-service';
export { PlaybookEngine } from './engines/playbook-engine';
export { SOARIntegrationService } from './integrations/soar-integration';
export { logger } from './utils/logger';
import { EventEmitter } from 'events';
import { CaseManagementService } from './services/case-management-service';
import { TimelineReconstructionService } from './services/timeline-reconstruction-service';
import { EvidencePreservationService } from './services/evidence-preservation-service';
import { NotificationService } from './services/notification-service';
import { EscalationService } from './services/escalation-service';
import { PlaybookEngine } from './engines/playbook-engine';
import { SOARIntegrationService } from './integrations/soar-integration';
import { Case, DatabaseConfig, IRConfig } from './types/incident-response.types';
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
export declare class IncidentResponseManager extends EventEmitter {
    private config;
    caseManagement: CaseManagementService;
    timelineReconstruction: TimelineReconstructionService;
    evidencePreservation: EvidencePreservationService;
    notifications: NotificationService;
    escalation: EscalationService;
    playbooks: PlaybookEngine;
    soarIntegration: SOARIntegrationService;
    constructor(config: IncidentResponseConfig);
    initialize(): Promise<void>;
    private setupEventHandlers;
    createSecurityIncident(incidentData: {
        title: string;
        description: string;
        severity: string;
        priority: string;
        reporter: string;
        sourceAlerts?: string[];
        affectedSystems?: string[];
        mitreAttackTechniques?: string[];
        tags?: string[];
    }): Promise<Case>;
    processAlert(alertData: {
        alertId: string;
        title: string;
        severity: string;
        source: string;
        timestamp: Date;
        details: any;
        indicators?: string[];
    }): Promise<{
        case?: Case;
        timelineEvent: any;
    }>;
    collectForensicEvidence(caseId: string, collectionRequest: {
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
    }): Promise<any>;
    getSystemStatistics(): Promise<any>;
    private mapCasePriorityToNotification;
    shutdown(): Promise<void>;
}
