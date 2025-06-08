"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskAssessmentService = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const knex_1 = __importDefault(require("knex"));
const logger_1 = require("../utils/logger");
class RiskAssessmentService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.riskThresholds = {
            critical: 80,
            high: 60,
            medium: 40,
            low: 20
        };
        this.threatScenarios = new Map();
        this.db = (0, knex_1.default)({
            client: config.database.type,
            connection: config.database.connection,
            useNullAsDefault: true
        });
        this.loadDefaultThreatScenarios();
    }
    async initialize() {
        logger_1.logger.info('Initializing Risk Assessment Service');
        await this.createTables();
        await this.seedDefaultData();
        logger_1.logger.info('Risk Assessment Service initialized successfully');
    }
    async createTables() {
        // Compliance risks table
        if (!(await this.db.schema.hasTable('compliance_risks'))) {
            await this.db.schema.createTable('compliance_risks', (table) => {
                table.string('id').primary();
                table.string('framework_id').notNullable();
                table.string('control_id').notNullable();
                table.string('risk_level').notNullable();
                table.integer('likelihood').notNullable();
                table.integer('impact').notNullable();
                table.decimal('risk_score', 10, 2).notNullable();
                table.text('description');
                table.json('mitigations');
                table.decimal('residual_risk', 10, 2);
                table.string('accepted_by');
                table.dateTime('accepted_at');
                table.dateTime('review_date').notNullable();
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.json('metadata');
                table.index(['framework_id', 'control_id']);
                table.index(['risk_level']);
                table.index(['review_date']);
                table.unique(['framework_id', 'control_id']);
            });
        }
        // Risk assessments history
        if (!(await this.db.schema.hasTable('risk_assessments'))) {
            await this.db.schema.createTable('risk_assessments', (table) => {
                table.string('id').primary();
                table.string('framework_id').notNullable();
                table.dateTime('assessment_date').notNullable();
                table.string('assessor_id');
                table.decimal('overall_risk_score', 10, 2).notNullable();
                table.string('risk_level').notNullable();
                table.integer('high_risk_controls').defaultTo(0);
                table.integer('medium_risk_controls').defaultTo(0);
                table.integer('low_risk_controls').defaultTo(0);
                table.integer('accepted_risks').defaultTo(0);
                table.integer('mitigated_risks').defaultTo(0);
                table.json('summary');
                table.json('recommendations');
                table.string('status').defaultTo('draft'); // draft, final, approved
                table.string('approved_by');
                table.dateTime('approved_at');
                table.dateTime('created_at').notNullable();
                table.index(['framework_id', 'assessment_date']);
                table.index(['status']);
            });
        }
        // Risk mitigation tracking
        if (!(await this.db.schema.hasTable('risk_mitigations'))) {
            await this.db.schema.createTable('risk_mitigations', (table) => {
                table.string('id').primary();
                table.string('risk_id').notNullable();
                table.string('description').notNullable();
                table.string('type').notNullable(); // technical, administrative, physical
                table.integer('effectiveness').notNullable(); // 0-100
                table.string('implementation_status').notNullable();
                table.string('owner_id');
                table.dateTime('target_date');
                table.dateTime('completed_date');
                table.decimal('cost_estimate', 15, 2);
                table.text('notes');
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.foreign('risk_id').references('compliance_risks.id').onDelete('CASCADE');
                table.index(['risk_id']);
                table.index(['implementation_status']);
                table.index(['target_date']);
            });
        }
        // Threat scenarios
        if (!(await this.db.schema.hasTable('threat_scenarios'))) {
            await this.db.schema.createTable('threat_scenarios', (table) => {
                table.string('id').primary();
                table.string('name').notNullable();
                table.text('description');
                table.string('category').notNullable();
                table.integer('likelihood').notNullable();
                table.integer('potential_impact').notNullable();
                table.json('affected_controls');
                table.json('mitigation_strategies');
                table.boolean('active').defaultTo(true);
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.index(['category']);
                table.index(['active']);
            });
        }
        // Risk factors configuration
        if (!(await this.db.schema.hasTable('risk_factors'))) {
            await this.db.schema.createTable('risk_factors', (table) => {
                table.string('id').primary();
                table.string('factor_name').notNullable();
                table.string('factor_type').notNullable();
                table.decimal('weight', 5, 2).notNullable();
                table.text('description');
                table.json('calculation_rules');
                table.boolean('active').defaultTo(true);
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.unique(['factor_name']);
                table.index(['active']);
            });
        }
        // Risk trends
        if (!(await this.db.schema.hasTable('risk_trends'))) {
            await this.db.schema.createTable('risk_trends', (table) => {
                table.string('id').primary();
                table.string('framework_id').notNullable();
                table.date('trend_date').notNullable();
                table.decimal('overall_score', 10, 2).notNullable();
                table.integer('critical_risks').defaultTo(0);
                table.integer('high_risks').defaultTo(0);
                table.integer('medium_risks').defaultTo(0);
                table.integer('low_risks').defaultTo(0);
                table.json('metrics');
                table.dateTime('created_at').notNullable();
                table.index(['framework_id', 'trend_date']);
                table.unique(['framework_id', 'trend_date']);
            });
        }
    }
    async seedDefaultData() {
        // Seed default risk factors
        const factorsCount = await this.db('risk_factors').count('* as count').first();
        if (factorsCount?.count === 0) {
            const defaultFactors = [
                {
                    id: (0, uuid_1.v4)(),
                    factor_name: 'Control Weight',
                    factor_type: 'control',
                    weight: 1.0,
                    description: 'Base weight of the control in the framework',
                    calculation_rules: JSON.stringify({ source: 'control.riskWeight' }),
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: (0, uuid_1.v4)(),
                    factor_name: 'Evidence Age',
                    factor_type: 'evidence',
                    weight: 0.8,
                    description: 'How recent the supporting evidence is',
                    calculation_rules: JSON.stringify({
                        ranges: [
                            { days: 30, multiplier: 1.0 },
                            { days: 90, multiplier: 1.2 },
                            { days: 180, multiplier: 1.5 },
                            { days: 365, multiplier: 2.0 }
                        ]
                    }),
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: (0, uuid_1.v4)(),
                    factor_name: 'Automation Level',
                    factor_type: 'control',
                    weight: 0.7,
                    description: 'Level of automation for the control',
                    calculation_rules: JSON.stringify({
                        levels: {
                            full: 0.5,
                            partial: 1.0,
                            manual: 1.5
                        }
                    }),
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: (0, uuid_1.v4)(),
                    factor_name: 'Historical Incidents',
                    factor_type: 'historical',
                    weight: 1.2,
                    description: 'Past incidents related to this control',
                    calculation_rules: JSON.stringify({
                        incidentImpact: {
                            none: 0.8,
                            low: 1.0,
                            medium: 1.5,
                            high: 2.0
                        }
                    }),
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: (0, uuid_1.v4)(),
                    factor_name: 'Industry Threat Level',
                    factor_type: 'external',
                    weight: 0.9,
                    description: 'Current threat landscape for the industry',
                    calculation_rules: JSON.stringify({
                        levels: {
                            low: 0.8,
                            moderate: 1.0,
                            elevated: 1.3,
                            severe: 1.6
                        }
                    }),
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];
            await this.db('risk_factors').insert(defaultFactors);
        }
        // Seed default threat scenarios
        const scenariosCount = await this.db('threat_scenarios').count('* as count').first();
        if (scenariosCount?.count === 0) {
            const defaultScenarios = [
                {
                    id: (0, uuid_1.v4)(),
                    name: 'Data Breach - External Attack',
                    description: 'Unauthorized access to sensitive data through external cyber attack',
                    category: 'cybersecurity',
                    likelihood: 4,
                    potential_impact: 5,
                    affected_controls: JSON.stringify(['access-control', 'encryption', 'monitoring']),
                    mitigation_strategies: JSON.stringify([
                        'Implement multi-factor authentication',
                        'Encrypt data at rest and in transit',
                        'Deploy intrusion detection systems',
                        'Regular security assessments'
                    ]),
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: (0, uuid_1.v4)(),
                    name: 'Insider Threat',
                    description: 'Malicious or negligent actions by authorized users',
                    category: 'personnel',
                    likelihood: 3,
                    potential_impact: 4,
                    affected_controls: JSON.stringify(['access-control', 'monitoring', 'segregation-of-duties']),
                    mitigation_strategies: JSON.stringify([
                        'Implement user behavior analytics',
                        'Regular access reviews',
                        'Background checks',
                        'Security awareness training'
                    ]),
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: (0, uuid_1.v4)(),
                    name: 'Ransomware Attack',
                    description: 'Malware that encrypts data and demands payment',
                    category: 'malware',
                    likelihood: 4,
                    potential_impact: 5,
                    affected_controls: JSON.stringify(['backup', 'malware-protection', 'incident-response']),
                    mitigation_strategies: JSON.stringify([
                        'Regular offline backups',
                        'Anti-malware solutions',
                        'Email filtering',
                        'User training on phishing'
                    ]),
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: (0, uuid_1.v4)(),
                    name: 'Supply Chain Compromise',
                    description: 'Security breach through third-party vendors or suppliers',
                    category: 'third-party',
                    likelihood: 3,
                    potential_impact: 4,
                    affected_controls: JSON.stringify(['vendor-management', 'monitoring', 'contracts']),
                    mitigation_strategies: JSON.stringify([
                        'Vendor security assessments',
                        'Contractual security requirements',
                        'Supply chain monitoring',
                        'Incident notification requirements'
                    ]),
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: (0, uuid_1.v4)(),
                    name: 'Compliance Violation',
                    description: 'Failure to meet regulatory requirements resulting in penalties',
                    category: 'regulatory',
                    likelihood: 2,
                    potential_impact: 4,
                    affected_controls: JSON.stringify(['policies', 'training', 'monitoring', 'documentation']),
                    mitigation_strategies: JSON.stringify([
                        'Regular compliance assessments',
                        'Automated compliance monitoring',
                        'Employee training programs',
                        'Documentation management'
                    ]),
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];
            await this.db('threat_scenarios').insert(defaultScenarios);
        }
    }
    loadDefaultThreatScenarios() {
        // Load threat scenarios into memory for quick access
        this.threatScenarios.set('data-breach', {
            id: 'data-breach',
            name: 'Data Breach - External Attack',
            description: 'Unauthorized access to sensitive data',
            category: 'cybersecurity',
            likelihood: 4,
            potentialImpact: 5,
            affectedControls: ['access-control', 'encryption', 'monitoring'],
            mitigationStrategies: ['MFA', 'Encryption', 'IDS/IPS', 'Security assessments']
        });
        this.threatScenarios.set('insider-threat', {
            id: 'insider-threat',
            name: 'Insider Threat',
            description: 'Malicious or negligent insider actions',
            category: 'personnel',
            likelihood: 3,
            potentialImpact: 4,
            affectedControls: ['access-control', 'monitoring', 'segregation-of-duties'],
            mitigationStrategies: ['UEBA', 'Access reviews', 'Background checks', 'Training']
        });
    }
    // Risk Assessment
    async assessFrameworkRisk(frameworkId, controls, complianceStatuses) {
        const assessmentId = (0, uuid_1.v4)();
        const assessmentDate = new Date();
        const controlRisks = [];
        let totalRiskScore = 0;
        let highRiskCount = 0;
        let mediumRiskCount = 0;
        let lowRiskCount = 0;
        let acceptedRiskCount = 0;
        let mitigatedRiskCount = 0;
        // Assess risk for each control
        for (const control of controls) {
            const status = complianceStatuses.get(control.id) || 'not_applicable';
            const risk = await this.assessControlRisk(frameworkId, control, status);
            controlRisks.push(risk);
            totalRiskScore += risk.riskScore;
            // Count risk levels
            switch (risk.riskLevel) {
                case 'critical':
                case 'high':
                    highRiskCount++;
                    break;
                case 'medium':
                    mediumRiskCount++;
                    break;
                case 'low':
                case 'info':
                    lowRiskCount++;
                    break;
            }
            if (risk.acceptedBy) {
                acceptedRiskCount++;
            }
            if (risk.mitigations.length > 0 && risk.residualRisk < risk.riskScore) {
                mitigatedRiskCount++;
            }
        }
        // Calculate overall risk score (weighted average)
        const overallRiskScore = controls.length > 0 ? totalRiskScore / controls.length : 0;
        const riskLevel = this.calculateRiskLevel(overallRiskScore);
        // Generate recommendations
        const recommendations = await this.generateRecommendations(controlRisks, controls);
        // Save assessment
        const assessment = {
            id: assessmentId,
            frameworkId,
            assessmentDate,
            overallRiskScore,
            riskLevel,
            controlRisks,
            highRiskControls: highRiskCount,
            mediumRiskControls: mediumRiskCount,
            lowRiskControls: lowRiskCount,
            acceptedRisks: acceptedRiskCount,
            mitigatedRisks: mitigatedRiskCount,
            recommendations
        };
        await this.saveAssessment(assessment);
        await this.updateRiskTrends(frameworkId, assessment);
        this.emit('risk-assessment-completed', { assessmentId, frameworkId, overallRiskScore });
        return assessment;
    }
    async assessControlRisk(frameworkId, control, status) {
        // Get existing risk or create new
        const existingRisk = await this.getRiskByControl(frameworkId, control.id);
        // Calculate base risk factors
        const likelihood = this.calculateLikelihood(control, status);
        const impact = this.calculateImpact(control);
        // Apply risk calculation factors
        const factors = await this.getRiskFactors();
        const adjustedRiskScore = this.calculateAdjustedRiskScore(control, likelihood, impact, factors);
        const riskLevel = this.calculateRiskLevel(adjustedRiskScore);
        const risk = {
            id: existingRisk?.id || (0, uuid_1.v4)(),
            frameworkId,
            controlId: control.id,
            riskLevel,
            likelihood,
            impact,
            riskScore: adjustedRiskScore,
            description: this.generateRiskDescription(control, status, riskLevel),
            mitigations: existingRisk?.mitigations || [],
            residualRisk: existingRisk?.residualRisk || adjustedRiskScore,
            acceptedBy: existingRisk?.acceptedBy,
            acceptedAt: existingRisk?.acceptedAt,
            reviewDate: this.calculateNextReviewDate(riskLevel),
            metadata: {
                controlStatus: status,
                lastAssessed: new Date(),
                factors: factors
            }
        };
        // Save or update risk
        await this.saveRisk(risk);
        return risk;
    }
    calculateLikelihood(control, status) {
        // Base likelihood based on compliance status
        let likelihood = 3; // Medium by default
        switch (status) {
            case 'non_compliant':
                likelihood = 5; // Very likely
                break;
            case 'partially_compliant':
                likelihood = 4; // Likely
                break;
            case 'compliant':
                likelihood = 2; // Unlikely
                break;
            case 'not_applicable':
                likelihood = 1; // Very unlikely
                break;
            case 'in_remediation':
                likelihood = 3; // Possible
                break;
        }
        // Adjust based on automation level
        if (control.automationLevel === 'full') {
            likelihood = Math.max(1, likelihood - 1);
        }
        else if (control.automationLevel === 'manual') {
            likelihood = Math.min(5, likelihood + 1);
        }
        return likelihood;
    }
    calculateImpact(control) {
        // Base impact on control weight
        const weight = control.riskWeight;
        if (weight >= 9)
            return 5; // Critical impact
        if (weight >= 7)
            return 4; // Major impact
        if (weight >= 5)
            return 3; // Moderate impact
        if (weight >= 3)
            return 2; // Minor impact
        return 1; // Negligible impact
    }
    calculateAdjustedRiskScore(control, likelihood, impact, factors) {
        // Base risk score (likelihood × impact)
        let riskScore = likelihood * impact * 4; // Scale to 0-100
        // Apply adjustment factors
        riskScore *= factors.controlWeight;
        riskScore *= factors.automationLevel;
        riskScore *= factors.evidenceAge;
        riskScore *= factors.historicalIncidents;
        riskScore *= factors.industryThreatLevel;
        riskScore *= factors.complianceHistory;
        // Ensure score is within bounds
        return Math.max(0, Math.min(100, riskScore));
    }
    calculateRiskLevel(score) {
        if (score >= this.riskThresholds.critical)
            return 'critical';
        if (score >= this.riskThresholds.high)
            return 'high';
        if (score >= this.riskThresholds.medium)
            return 'medium';
        if (score >= this.riskThresholds.low)
            return 'low';
        return 'info';
    }
    generateRiskDescription(control, status, riskLevel) {
        const statusDescriptions = {
            non_compliant: 'is not compliant with requirements',
            partially_compliant: 'is only partially compliant',
            compliant: 'meets compliance requirements',
            not_applicable: 'is not applicable',
            in_remediation: 'is currently being remediated',
            compensating_control: 'has compensating controls in place'
        };
        return `Control "${control.title}" ${statusDescriptions[status]}, resulting in ${riskLevel} risk. ${control.description}`;
    }
    calculateNextReviewDate(riskLevel) {
        const reviewDate = new Date();
        switch (riskLevel) {
            case 'critical':
                reviewDate.setDate(reviewDate.getDate() + 30); // Monthly
                break;
            case 'high':
                reviewDate.setDate(reviewDate.getDate() + 90); // Quarterly
                break;
            case 'medium':
                reviewDate.setDate(reviewDate.getDate() + 180); // Semi-annually
                break;
            case 'low':
            case 'info':
                reviewDate.setDate(reviewDate.getDate() + 365); // Annually
                break;
        }
        return reviewDate;
    }
    async getRiskFactors() {
        // In production, these would be calculated based on actual data
        return {
            controlWeight: 1.0,
            evidenceAge: 1.0,
            automationLevel: 1.0,
            historicalIncidents: 1.0,
            industryThreatLevel: 1.2, // Slightly elevated
            complianceHistory: 0.9 // Good history reduces risk
        };
    }
    // Recommendations
    async generateRecommendations(risks, controls) {
        const recommendations = [];
        const controlMap = new Map(controls.map(c => [c.id, c]));
        // Focus on high and critical risks
        const highRisks = risks.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high').sort((a, b) => b.riskScore - a.riskScore);
        for (const risk of highRisks) {
            const control = controlMap.get(risk.controlId);
            if (!control)
                continue;
            const recommendation = {
                id: (0, uuid_1.v4)(),
                controlId: risk.controlId,
                priority: risk.riskLevel,
                title: `Mitigate risk for ${control.title}`,
                description: this.generateRecommendationDescription(risk, control),
                estimatedEffort: this.estimateEffort(risk, control),
                estimatedCost: this.estimateCost(risk, control),
                mitigationSteps: this.generateMitigationSteps(risk, control)
            };
            recommendations.push(recommendation);
        }
        // Also recommend quick wins (low effort, high impact)
        const quickWins = risks
            .filter(r => r.riskLevel === 'medium' && this.isQuickWin(r, controlMap.get(r.controlId)))
            .slice(0, 5);
        for (const risk of quickWins) {
            const control = controlMap.get(risk.controlId);
            if (!control)
                continue;
            recommendations.push({
                id: (0, uuid_1.v4)(),
                controlId: risk.controlId,
                priority: 'medium',
                title: `Quick win: ${control.title}`,
                description: `This control can be improved with minimal effort for significant risk reduction.`,
                estimatedEffort: 'Low',
                estimatedCost: 5000,
                mitigationSteps: this.generateMitigationSteps(risk, control)
            });
        }
        return recommendations;
    }
    generateRecommendationDescription(risk, control) {
        const descriptions = {
            critical: `Critical risk identified. Immediate action required to address ${control.title}. Current risk score of ${risk.riskScore.toFixed(1)} significantly exceeds acceptable thresholds.`,
            high: `High risk requiring prompt attention. ${control.title} has a risk score of ${risk.riskScore.toFixed(1)}. Mitigation should be prioritized in the next remediation cycle.`,
            medium: `Moderate risk identified for ${control.title}. Consider implementing additional controls to reduce risk score from ${risk.riskScore.toFixed(1)}.`,
            low: `Low risk for ${control.title}. Monitor and maintain current controls.`,
            info: `Informational finding for ${control.title}. No immediate action required.`
        };
        return descriptions[risk.riskLevel];
    }
    estimateEffort(risk, control) {
        if (control.automationLevel === 'full' && risk.riskLevel === 'high') {
            return 'Medium - Requires configuration changes';
        }
        if (control.automationLevel === 'manual' && risk.riskLevel === 'critical') {
            return 'High - Requires process redesign and automation';
        }
        if (risk.mitigations.length > 3) {
            return 'High - Multiple mitigations required';
        }
        return 'Medium - Standard remediation effort';
    }
    estimateCost(risk, control) {
        let baseCost = 10000;
        // Adjust based on risk level
        const riskMultipliers = {
            critical: 5,
            high: 3,
            medium: 2,
            low: 1,
            info: 0.5
        };
        baseCost *= riskMultipliers[risk.riskLevel];
        // Adjust based on automation needs
        if (control.automationLevel === 'manual' && risk.riskLevel !== 'low') {
            baseCost *= 2; // Double for automation implementation
        }
        return Math.round(baseCost);
    }
    generateMitigationSteps(risk, control) {
        const steps = [];
        // Common mitigation steps based on control type
        if (control.evidenceTypes.includes('configuration')) {
            steps.push('Review and update system configurations');
            steps.push('Implement configuration baselines');
        }
        if (control.evidenceTypes.includes('log_data')) {
            steps.push('Enhance logging and monitoring capabilities');
            steps.push('Implement automated log analysis');
        }
        if (control.automationLevel === 'manual') {
            steps.push('Evaluate automation opportunities');
            steps.push('Implement workflow automation where feasible');
        }
        // Risk-level specific steps
        if (risk.riskLevel === 'critical' || risk.riskLevel === 'high') {
            steps.push('Conduct immediate risk assessment');
            steps.push('Implement compensating controls');
            steps.push('Schedule follow-up assessment in 30 days');
        }
        // Add control-specific recommendations
        steps.push(`Implement ${control.implementationGuidance || 'control-specific measures'}`);
        if (control.testingProcedures) {
            steps.push('Execute defined testing procedures to verify effectiveness');
        }
        return steps;
    }
    isQuickWin(risk, control) {
        if (!control)
            return false;
        // Quick wins: automated controls with configuration issues
        if (control.automationLevel === 'full' && risk.riskScore < 60) {
            return true;
        }
        // Quick wins: controls with simple evidence requirements
        if (control.evidenceTypes.length === 1 && risk.mitigations.length === 0) {
            return true;
        }
        return false;
    }
    // Risk Management
    async acceptRisk(riskId, acceptedBy, justification) {
        const now = new Date();
        await this.db('compliance_risks')
            .where('id', riskId)
            .update({
            accepted_by: acceptedBy,
            accepted_at: now,
            metadata: this.db.raw(`json_set(metadata, '$.acceptanceJustification', ?)`, [justification]),
            updated_at: now
        });
        const risk = await this.getRisk(riskId);
        if (risk) {
            this.emit('risk-accepted', { riskId, acceptedBy, risk });
        }
    }
    async addMitigation(riskId, mitigation) {
        const risk = await this.getRisk(riskId);
        if (!risk) {
            throw new Error(`Risk not found: ${riskId}`);
        }
        const newMitigation = {
            id: (0, uuid_1.v4)(),
            ...mitigation
        };
        const updatedMitigations = [...risk.mitigations, newMitigation];
        // Recalculate residual risk
        const totalEffectiveness = updatedMitigations
            .filter(m => m.implementationStatus === 'implemented' || m.implementationStatus === 'verified')
            .reduce((sum, m) => sum + m.effectiveness, 0);
        const residualRisk = risk.riskScore * (1 - Math.min(totalEffectiveness / 100, 0.9));
        await this.db('compliance_risks')
            .where('id', riskId)
            .update({
            mitigations: JSON.stringify(updatedMitigations),
            residual_risk: residualRisk,
            updated_at: new Date()
        });
        // Also save to mitigations table for tracking
        await this.db('risk_mitigations').insert({
            id: newMitigation.id,
            risk_id: riskId,
            description: newMitigation.description,
            type: newMitigation.type,
            effectiveness: newMitigation.effectiveness,
            implementation_status: newMitigation.implementationStatus,
            created_at: new Date(),
            updated_at: new Date()
        });
        this.emit('mitigation-added', { riskId, mitigation: newMitigation });
    }
    // Risk Monitoring
    async getRiskTrends(frameworkId, period) {
        const rows = await this.db('risk_trends')
            .where('framework_id', frameworkId)
            .whereBetween('trend_date', [period.start, period.end])
            .orderBy('trend_date', 'asc');
        return rows.map((row) => ({
            date: new Date(row.trend_date),
            overallScore: parseFloat(row.overall_score),
            highRisks: row.high_risks,
            mediumRisks: row.medium_risks,
            lowRisks: row.low_risks
        }));
    }
    async getRiskMatrix(frameworkId) {
        const risks = await this.db('compliance_risks')
            .where('framework_id', frameworkId)
            .whereNotNull('likelihood')
            .whereNotNull('impact');
        // Group by likelihood and impact
        const matrix = new Map();
        for (const risk of risks) {
            const key = `${risk.likelihood}-${risk.impact}`;
            if (!matrix.has(key)) {
                matrix.set(key, {
                    likelihood: risk.likelihood,
                    impact: risk.impact,
                    controls: []
                });
            }
            matrix.get(key).controls.push({
                controlId: risk.control_id,
                controlTitle: '', // Would be joined with controls table
                currentRisk: parseFloat(risk.risk_score),
                residualRisk: parseFloat(risk.residual_risk || risk.risk_score)
            });
        }
        return Array.from(matrix.values());
    }
    async getHighRiskControls(frameworkId, limit = 10) {
        const rows = await this.db('compliance_risks')
            .where('framework_id', frameworkId)
            .whereIn('risk_level', ['critical', 'high'])
            .whereNull('accepted_by')
            .orderBy('risk_score', 'desc')
            .limit(limit);
        return rows.map((row) => this.parseRiskRow(row));
    }
    // Data Persistence
    async saveRisk(risk) {
        const now = new Date();
        await this.db('compliance_risks')
            .insert({
            id: risk.id,
            framework_id: risk.frameworkId,
            control_id: risk.controlId,
            risk_level: risk.riskLevel,
            likelihood: risk.likelihood,
            impact: risk.impact,
            risk_score: risk.riskScore,
            description: risk.description,
            mitigations: JSON.stringify(risk.mitigations),
            residual_risk: risk.residualRisk,
            accepted_by: risk.acceptedBy,
            accepted_at: risk.acceptedAt,
            review_date: risk.reviewDate,
            created_at: now,
            updated_at: now,
            metadata: JSON.stringify(risk.metadata || {})
        })
            .onConflict(['framework_id', 'control_id'])
            .merge({
            risk_level: risk.riskLevel,
            likelihood: risk.likelihood,
            impact: risk.impact,
            risk_score: risk.riskScore,
            description: risk.description,
            mitigations: JSON.stringify(risk.mitigations),
            residual_risk: risk.residualRisk,
            review_date: risk.reviewDate,
            updated_at: now,
            metadata: JSON.stringify(risk.metadata || {})
        });
    }
    async saveAssessment(assessment) {
        await this.db('risk_assessments').insert({
            id: assessment.id,
            framework_id: assessment.frameworkId,
            assessment_date: assessment.assessmentDate,
            overall_risk_score: assessment.overallRiskScore,
            risk_level: assessment.riskLevel,
            high_risk_controls: assessment.highRiskControls,
            medium_risk_controls: assessment.mediumRiskControls,
            low_risk_controls: assessment.lowRiskControls,
            accepted_risks: assessment.acceptedRisks,
            mitigated_risks: assessment.mitigatedRisks,
            summary: JSON.stringify({
                controlCount: assessment.controlRisks.length,
                averageScore: assessment.overallRiskScore
            }),
            recommendations: JSON.stringify(assessment.recommendations),
            status: 'draft',
            created_at: new Date()
        });
    }
    async updateRiskTrends(frameworkId, assessment) {
        const trendDate = new Date(assessment.assessmentDate);
        trendDate.setHours(0, 0, 0, 0);
        await this.db('risk_trends')
            .insert({
            id: (0, uuid_1.v4)(),
            framework_id: frameworkId,
            trend_date: trendDate,
            overall_score: assessment.overallRiskScore,
            critical_risks: 0, // Would calculate from assessment
            high_risks: assessment.highRiskControls,
            medium_risks: assessment.mediumRiskControls,
            low_risks: assessment.lowRiskControls,
            metrics: JSON.stringify({
                acceptedRisks: assessment.acceptedRisks,
                mitigatedRisks: assessment.mitigatedRisks
            }),
            created_at: new Date()
        })
            .onConflict(['framework_id', 'trend_date'])
            .merge({
            overall_score: assessment.overallRiskScore,
            high_risks: assessment.highRiskControls,
            medium_risks: assessment.mediumRiskControls,
            low_risks: assessment.lowRiskControls,
            metrics: JSON.stringify({
                acceptedRisks: assessment.acceptedRisks,
                mitigatedRisks: assessment.mitigatedRisks
            })
        });
    }
    // Data Retrieval
    async getRisk(riskId) {
        const row = await this.db('compliance_risks').where('id', riskId).first();
        if (!row)
            return null;
        return this.parseRiskRow(row);
    }
    async getRiskByControl(frameworkId, controlId) {
        const row = await this.db('compliance_risks')
            .where({ framework_id: frameworkId, control_id: controlId })
            .first();
        if (!row)
            return null;
        return this.parseRiskRow(row);
    }
    parseRiskRow(row) {
        return {
            id: row.id,
            frameworkId: row.framework_id,
            controlId: row.control_id,
            riskLevel: row.risk_level,
            likelihood: row.likelihood,
            impact: row.impact,
            riskScore: parseFloat(row.risk_score),
            description: row.description,
            mitigations: JSON.parse(row.mitigations || '[]'),
            residualRisk: parseFloat(row.residual_risk),
            acceptedBy: row.accepted_by,
            acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
            reviewDate: new Date(row.review_date),
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    async shutdown() {
        logger_1.logger.info('Shutting down Risk Assessment Service');
        await this.db.destroy();
        logger_1.logger.info('Risk Assessment Service shutdown complete');
    }
}
exports.RiskAssessmentService = RiskAssessmentService;
//# sourceMappingURL=risk-assessment-service.js.map