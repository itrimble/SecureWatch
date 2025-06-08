import { EventEmitter } from 'events';
import { ComplianceRisk, RiskLevel, DatabaseConfig, ComplianceControl, ComplianceStatus } from '../types/compliance.types';
interface RiskAssessmentResult {
    id: string;
    frameworkId: string;
    assessmentDate: Date;
    overallRiskScore: number;
    riskLevel: RiskLevel;
    controlRisks: ComplianceRisk[];
    highRiskControls: number;
    mediumRiskControls: number;
    lowRiskControls: number;
    acceptedRisks: number;
    mitigatedRisks: number;
    recommendations: RiskRecommendation[];
}
interface RiskRecommendation {
    id: string;
    controlId: string;
    priority: RiskLevel;
    title: string;
    description: string;
    estimatedEffort: string;
    estimatedCost?: number;
    mitigationSteps: string[];
}
interface RiskTrend {
    date: Date;
    overallScore: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
}
interface RiskMatrix {
    likelihood: number;
    impact: number;
    controls: Array<{
        controlId: string;
        controlTitle: string;
        currentRisk: number;
        residualRisk: number;
    }>;
}
export declare class RiskAssessmentService extends EventEmitter {
    private db;
    private riskThresholds;
    private threatScenarios;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private seedDefaultData;
    private loadDefaultThreatScenarios;
    assessFrameworkRisk(frameworkId: string, controls: ComplianceControl[], complianceStatuses: Map<string, ComplianceStatus>): Promise<RiskAssessmentResult>;
    private assessControlRisk;
    private calculateLikelihood;
    private calculateImpact;
    private calculateAdjustedRiskScore;
    private calculateRiskLevel;
    private generateRiskDescription;
    private calculateNextReviewDate;
    private getRiskFactors;
    private generateRecommendations;
    private generateRecommendationDescription;
    private estimateEffort;
    private estimateCost;
    private generateMitigationSteps;
    private isQuickWin;
    acceptRisk(riskId: string, acceptedBy: string, justification: string): Promise<void>;
    addMitigation(riskId: string, mitigation: Omit<ComplianceRisk['mitigations'][0], 'id'>): Promise<void>;
    getRiskTrends(frameworkId: string, period: {
        start: Date;
        end: Date;
    }): Promise<RiskTrend[]>;
    getRiskMatrix(frameworkId: string): Promise<RiskMatrix[]>;
    getHighRiskControls(frameworkId: string, limit?: number): Promise<ComplianceRisk[]>;
    private saveRisk;
    private saveAssessment;
    private updateRiskTrends;
    getRisk(riskId: string): Promise<ComplianceRisk | null>;
    getRiskByControl(frameworkId: string, controlId: string): Promise<ComplianceRisk | null>;
    private parseRiskRow;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=risk-assessment-service.d.ts.map