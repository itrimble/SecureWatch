import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import {
  DatabaseConfig,
  ComplianceConfig,
  ComplianceConfigSchema,
  ComplianceFramework,
  ComplianceFrameworkType,
  ComplianceDashboard,
  ComplianceReport,
  ComplianceAssessment,
  ComplianceEvidence,
  ComplianceGap,
  ReportGenerationRequest,
  GapAnalysisRequest
} from '../types/compliance.types';

// Import all services
import { EvidenceCollectionService } from './evidence-collection-service';
import { AuditTrailService } from './audit-trail-service';
import { RiskAssessmentService } from './risk-assessment-service';

// Import frameworks and templates
import { createFrameworkFromDefinition, getAvailableFrameworks } from '../frameworks';
import { getAllReportTemplates } from '../templates';

interface ComplianceManagerConfig {
  database: DatabaseConfig;
  compliance?: Partial<ComplianceConfig>;
  services?: {
    enableEvidenceCollection?: boolean;
    enableAuditTrail?: boolean;
    enableRiskAssessment?: boolean;
  };
}

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  error?: string;
}

export class ComplianceManager extends EventEmitter {
  private config: ComplianceManagerConfig;
  private evidenceService?: EvidenceCollectionService;
  private auditService?: AuditTrailService;
  private riskService?: RiskAssessmentService;
  
  private frameworks: Map<string, ComplianceFramework> = new Map();
  private initialized: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: ComplianceManagerConfig) {
    super();
    this.config = {
      ...config,
      compliance: ComplianceConfigSchema.parse({
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

  async initialize(): Promise<void> {
    logger.info('Initializing Compliance Manager');
    
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
      
      logger.info('Compliance Manager initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Compliance Manager:', error);
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    // Initialize Evidence Collection Service
    if (this.config.services?.enableEvidenceCollection) {
      this.evidenceService = new EvidenceCollectionService({
        database: this.config.database
      });
      initPromises.push(this.evidenceService.initialize());
    }

    // Initialize Audit Trail Service
    if (this.config.services?.enableAuditTrail) {
      this.auditService = new AuditTrailService({
        database: this.config.database
      });
      initPromises.push(this.auditService.initialize());
    }

    // Initialize Risk Assessment Service
    if (this.config.services?.enableRiskAssessment) {
      this.riskService = new RiskAssessmentService({
        database: this.config.database
      });
      initPromises.push(this.riskService.initialize());
    }

    await Promise.all(initPromises);
    logger.info('All compliance services initialized');
  }

  private async loadFrameworks(): Promise<void> {
    const enabledFrameworks = this.config.compliance?.automation.enabledFrameworks || [];
    
    for (const frameworkType of enabledFrameworks) {
      const framework = createFrameworkFromDefinition(frameworkType as ComplianceFrameworkType);
      if (framework) {
        this.frameworks.set(frameworkType, framework);
        logger.info(`Loaded framework: ${frameworkType}`);
      }
    }
  }

  private setupEventHandlers(): void {
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

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.checkHealth();
      this.emit('health-check', health);
    }, 60000); // Check every minute
  }

  // Framework Management
  getFramework(type: ComplianceFrameworkType): ComplianceFramework | undefined {
    return this.frameworks.get(type);
  }

  getEnabledFrameworks(): ComplianceFramework[] {
    return Array.from(this.frameworks.values());
  }

  async updateFrameworkStatus(
    frameworkId: string,
    enabled: boolean
  ): Promise<void> {
    const config = this.config.compliance!;
    
    if (enabled) {
      if (!config.automation.enabledFrameworks.includes(frameworkId as ComplianceFrameworkType)) {
        config.automation.enabledFrameworks.push(frameworkId as ComplianceFrameworkType);
        const framework = createFrameworkFromDefinition(frameworkId as ComplianceFrameworkType);
        if (framework) {
          this.frameworks.set(frameworkId, framework);
        }
      }
    } else {
      config.automation.enabledFrameworks = config.automation.enabledFrameworks.filter(
        f => f !== frameworkId
      );
      this.frameworks.delete(frameworkId);
    }

    this.emit('framework-status-changed', { frameworkId, enabled });
  }

  // Evidence Collection
  async collectEvidence(request: {
    frameworkId: string;
    controlIds: string[];
    evidenceType: any;
    source: string;
    data: any;
  }): Promise<ComplianceEvidence> {
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

  async scheduleEvidenceCollection(
    frameworkId: string,
    schedule: string
  ): Promise<void> {
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
  async runComplianceAssessment(
    frameworkId: string,
    scope?: any
  ): Promise<ComplianceAssessment> {
    const framework = this.frameworks.get(frameworkId);
    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`);
    }

    // Collect evidence for all controls
    const controlStatuses = new Map<string, any>();
    const evidenceMap = new Map<string, ComplianceEvidence[]>();

    if (this.evidenceService) {
      for (const control of framework.controls) {
        const evidence = await this.evidenceService.getEvidenceForControl(
          framework.id,
          control.id
        );
        evidenceMap.set(control.id, evidence);
        
        // Determine compliance status based on evidence
        const status = this.evaluateControlCompliance(control, evidence);
        controlStatuses.set(control.id, status);
      }
    }

    // Run risk assessment
    let riskAssessment;
    if (this.riskService) {
      riskAssessment = await this.riskService.assessFrameworkRisk(
        framework.id,
        framework.controls,
        controlStatuses
      );
    }

    const assessment: ComplianceAssessment = {
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

  private evaluateControlCompliance(control: any, evidence: ComplianceEvidence[]): string {
    if (evidence.length === 0) {
      return 'non_compliant';
    }

    // Check evidence age
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    const recentEvidence = evidence.filter(e => 
      new Date().getTime() - e.collectedAt.getTime() < maxAge
    );

    if (recentEvidence.length === 0) {
      return 'partially_compliant';
    }

    // Check if all required evidence types are present
    const collectedTypes = new Set(recentEvidence.map(e => e.type));
    const missingTypes = control.evidenceTypes.filter((t: any) => !collectedTypes.has(t));

    if (missingTypes.length === 0) {
      return 'compliant';
    } else if (missingTypes.length < control.evidenceTypes.length / 2) {
      return 'partially_compliant';
    } else {
      return 'non_compliant';
    }
  }

  private calculateOverallStatus(statuses: Map<string, string>): string {
    const counts = {
      compliant: 0,
      non_compliant: 0,
      partially_compliant: 0,
      not_applicable: 0
    };

    for (const status of statuses.values()) {
      counts[status as keyof typeof counts]++;
    }

    const total = statuses.size - counts.not_applicable;
    const compliantPercentage = (counts.compliant / total) * 100;

    if (counts.non_compliant > 0) {
      return 'non_compliant';
    } else if (compliantPercentage >= 95) {
      return 'compliant';
    } else {
      return 'partially_compliant';
    }
  }

  // Gap Analysis
  async runGapAnalysis(request: GapAnalysisRequest): Promise<ComplianceGap[]> {
    const framework = this.frameworks.get(request.frameworkId);
    if (!framework) {
      throw new Error(`Framework not found: ${request.frameworkId}`);
    }

    const assessment = await this.runComplianceAssessment(request.frameworkId);
    const gaps: ComplianceGap[] = [];

    for (const controlAssessment of assessment.controlAssessments) {
      if (controlAssessment.status !== 'compliant') {
        const control = framework.controls.find(c => c.id === controlAssessment.controlId);
        if (!control) continue;

        const gap: ComplianceGap = {
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

  private calculateMaturityLevel(assessment: any): number {
    switch (assessment.status) {
      case 'compliant': return 5;
      case 'partially_compliant': return 3;
      case 'non_compliant': return 1;
      default: return 0;
    }
  }

  private calculateGapSeverity(status: string, riskWeight: number): any {
    if (status === 'non_compliant' && riskWeight >= 9) return 'critical';
    if (status === 'non_compliant' && riskWeight >= 7) return 'high';
    if (status === 'partially_compliant' && riskWeight >= 7) return 'medium';
    return 'low';
  }

  private generateRemediationSteps(control: any, assessment: any): any[] {
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
    const missingEvidence = control.evidenceTypes.filter((type: any) => 
      !assessment.evidence.some((e: any) => e.type === type)
    );

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

  private estimateRemediationCost(control: any, assessment: any): number {
    let baseCost = 5000;

    // Adjust based on automation needs
    if (control.automationLevel === 'manual' && assessment.status === 'non_compliant') {
      baseCost *= 3; // Automation implementation
    }

    // Adjust based on risk weight
    baseCost *= (control.riskWeight / 5);

    return Math.round(baseCost);
  }

  private estimateRemediationEffort(control: any, assessment: any): string {
    if (control.automationLevel === 'manual' && assessment.status === 'non_compliant') {
      return '3-6 months';
    }
    if (assessment.status === 'partially_compliant') {
      return '1-3 months';
    }
    return '2-4 weeks';
  }

  // Dashboard and Analytics
  async getComplianceDashboard(): Promise<ComplianceDashboard> {
    const dashboard: ComplianceDashboard = {
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
          controlsCompliant: assessment.controlAssessments.filter(
            ca => ca.status === 'compliant'
          ).length,
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
            case 'critical': dashboard.riskOverview.criticalRisks++; break;
            case 'high': dashboard.riskOverview.highRisks++; break;
            case 'medium': dashboard.riskOverview.mediumRisks++; break;
            case 'low': dashboard.riskOverview.lowRisks++; break;
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

  private calculateComplianceScore(assessment: ComplianceAssessment): number {
    const counts = {
      compliant: 0,
      non_compliant: 0,
      partially_compliant: 0,
      not_applicable: 0
    };

    for (const ca of assessment.controlAssessments) {
      counts[ca.status as keyof typeof counts]++;
    }

    const total = assessment.controlAssessments.length - counts.not_applicable;
    if (total === 0) return 100;

    const score = ((counts.compliant + (counts.partially_compliant * 0.5)) / total) * 100;
    return Math.round(score);
  }

  private async getLatestAssessment(frameworkId: string): Promise<ComplianceAssessment | null> {
    // In production, this would fetch from database
    // For now, return null to indicate no assessment yet
    return null;
  }

  // Audit and Logging
  private async logComplianceEvent(
    action: string,
    details: any
  ): Promise<void> {
    if (!this.auditService) return;

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

  private async handleAuditAlert(alert: any): Promise<void> {
    // Handle critical audit alerts
    logger.warn('Audit alert triggered:', alert);
    
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
  async checkHealth(): Promise<ServiceHealth[]> {
    const health: ServiceHealth[] = [];

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
      } catch (error: any) {
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
      } catch (error: any) {
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
      } catch (error: any) {
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
  async performMaintenance(): Promise<void> {
    logger.info('Performing compliance system maintenance');

    // Apply retention policies
    if (this.auditService) {
      const deletedAudits = await this.auditService.applyRetentionPolicies();
      logger.info(`Deleted ${deletedAudits} expired audit records`);
    }

    // Clean up expired evidence
    if (this.evidenceService) {
      const deletedEvidence = await this.evidenceService.cleanupExpiredEvidence();
      logger.info(`Deleted ${deletedEvidence} expired evidence records`);
    }

    this.emit('maintenance-completed', { timestamp: new Date() });
  }

  // Shutdown
  async shutdown(): Promise<void> {
    logger.info('Shutting down Compliance Manager');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const shutdownPromises: Promise<void>[] = [];

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
    
    logger.info('Compliance Manager shutdown complete');
  }

  // Helper to generate unique ID
  private uuidv4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Export a factory function for easy initialization
export async function createComplianceSystem(config: ComplianceManagerConfig): Promise<ComplianceManager> {
  const manager = new ComplianceManager(config);
  await manager.initialize();
  return manager;
}