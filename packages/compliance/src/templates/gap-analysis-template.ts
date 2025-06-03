import { ReportTemplate } from '../types/compliance.types';
import { v4 as uuidv4 } from 'uuid';

export const GapAnalysisReportTemplate: ReportTemplate = {
  id: uuidv4(),
  name: 'Compliance Gap Analysis Report',
  description: 'Comprehensive gap analysis report identifying compliance deficiencies and remediation roadmap',
  frameworkId: '', // Can be applied to any framework
  type: 'gap_analysis',
  createdBy: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublic: true,
  sections: [
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      type: 'summary',
      order: 1,
      config: {
        template: `
# Compliance Gap Analysis Report

## Organization: {{organizationName}}
## Framework: {{frameworkName}} v{{frameworkVersion}}
## Assessment Date: {{assessmentDate}}

### Executive Overview
This gap analysis identifies the differences between the current state of {{organizationName}}'s compliance posture and the requirements of {{frameworkName}}. The analysis provides a prioritized roadmap for achieving full compliance.

### Key Findings
- **Current Compliance Level:** {{currentComplianceScore}}%
- **Target Compliance Level:** {{targetComplianceScore}}%
- **Compliance Gap:** {{complianceGap}}%
- **Critical Gaps Identified:** {{criticalGapCount}}
- **Estimated Time to Compliance:** {{estimatedTimeToCompliance}}
- **Estimated Investment Required:** {{estimatedInvestment}}

### Risk Summary
- **Current Risk Exposure:** {{currentRiskExposure}}
- **Risk Reduction Potential:** {{riskReductionPotential}}%
- **Highest Risk Areas:** {{#each highRiskAreas}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
        `
      }
    },
    {
      id: 'maturity-assessment',
      title: 'Compliance Maturity Assessment',
      type: 'chart',
      order: 2,
      config: {
        chartType: 'radar',
        title: 'Current vs Target Maturity Levels',
        data: 'maturityData',
        dimensions: 'categories',
        series: [
          { name: 'Current State', data: 'currentMaturity' },
          { name: 'Target State', data: 'targetMaturity' },
          { name: 'Industry Average', data: 'industryAverage' }
        ],
        scale: { min: 0, max: 5 }
      }
    },
    {
      id: 'gap-visualization',
      title: 'Compliance Gap Visualization',
      type: 'chart',
      order: 3,
      config: {
        chartType: 'waterfall',
        title: 'Gap Analysis by Control Category',
        data: 'gapsByCategory',
        startValue: 'currentScore',
        categories: 'controlCategories',
        positiveLabel: 'Achieved',
        negativeLabel: 'Gap',
        targetValue: 100
      }
    },
    {
      id: 'detailed-gaps',
      title: 'Detailed Gap Analysis',
      type: 'table',
      order: 4,
      config: {
        title: 'Control-Level Gap Analysis',
        columns: [
          { field: 'controlId', header: 'Control ID', width: '10%' },
          { field: 'controlTitle', header: 'Control', width: '25%' },
          { field: 'currentState', header: 'Current State', width: '20%' },
          { field: 'targetState', header: 'Target State', width: '15%' },
          { field: 'gap', header: 'Gap', width: '15%' },
          { field: 'priority', header: 'Priority', width: '15%' }
        ],
        groupBy: 'category',
        expandable: true,
        detailsFields: ['gapDescription', 'rootCause', 'impact', 'dependencies']
      }
    },
    {
      id: 'root-cause-analysis',
      title: 'Root Cause Analysis',
      type: 'narrative',
      order: 5,
      config: {
        template: `
## Root Cause Analysis

### Systematic Issues Identified
{{#each systematicIssues}}
#### {{this.issue}}
- **Affected Controls:** {{this.affectedControlCount}}
- **Root Cause:** {{this.rootCause}}
- **Contributing Factors:**
  {{#each this.contributingFactors}}
  - {{this}}
  {{/each}}
- **Recommended Solution:** {{this.solution}}
{{/each}}

### Organizational Factors
{{#each organizationalFactors}}
- **{{this.factor}}**: {{this.description}}
  - Impact: {{this.impact}}
  - Remediation Approach: {{this.approach}}
{{/each}}

### Technical Debt
Total technical debt contributing to compliance gaps: {{technicalDebt.count}} items
- **Critical:** {{technicalDebt.critical}}
- **High:** {{technicalDebt.high}}
- **Medium:** {{technicalDebt.medium}}
        `
      }
    },
    {
      id: 'remediation-roadmap',
      title: 'Remediation Roadmap',
      type: 'chart',
      order: 6,
      config: {
        chartType: 'gantt',
        title: 'Compliance Remediation Timeline',
        data: 'remediationTasks',
        taskField: 'task',
        startField: 'startDate',
        endField: 'endDate',
        progressField: 'progress',
        dependenciesField: 'dependencies',
        groupField: 'phase',
        milestones: 'complianceMilestones'
      }
    },
    {
      id: 'effort-analysis',
      title: 'Effort and Resource Analysis',
      type: 'table',
      order: 7,
      config: {
        title: 'Remediation Effort Breakdown',
        columns: [
          { field: 'workstream', header: 'Workstream', width: '25%' },
          { field: 'effort', header: 'Effort (Hours)', width: '15%', type: 'number' },
          { field: 'resources', header: 'Resources Required', width: '20%' },
          { field: 'cost', header: 'Estimated Cost', width: '15%', type: 'currency' },
          { field: 'duration', header: 'Duration', width: '15%' },
          { field: 'complexity', header: 'Complexity', width: '10%' }
        ],
        showTotals: true,
        includeResourceChart: true
      }
    },
    {
      id: 'quick-wins',
      title: 'Quick Wins Analysis',
      type: 'matrix',
      order: 8,
      config: {
        title: 'Effort vs Impact Matrix',
        matrixType: 'scatter',
        xAxis: {
          field: 'effort',
          label: 'Implementation Effort',
          scale: 'low-high'
        },
        yAxis: {
          field: 'impact',
          label: 'Compliance Impact',
          scale: 'low-high'
        },
        quadrants: {
          'low-effort-high-impact': { label: 'Quick Wins', color: '#4caf50' },
          'high-effort-high-impact': { label: 'Strategic Projects', color: '#2196f3' },
          'low-effort-low-impact': { label: 'Fill-ins', color: '#ff9800' },
          'high-effort-low-impact': { label: 'Question Marks', color: '#f44336' }
        },
        dataPoints: 'remediationItems'
      }
    },
    {
      id: 'cost-benefit',
      title: 'Cost-Benefit Analysis',
      type: 'chart',
      order: 9,
      config: {
        chartType: 'bubble',
        title: 'Remediation Cost vs Risk Reduction',
        data: 'costBenefitData',
        xAxis: {
          field: 'cost',
          label: 'Implementation Cost ($)'
        },
        yAxis: {
          field: 'riskReduction',
          label: 'Risk Reduction Score'
        },
        sizeField: 'complianceImpact',
        colorField: 'priority',
        tooltip: ['control', 'description', 'roi']
      }
    },
    {
      id: 'implementation-phases',
      title: 'Phased Implementation Plan',
      type: 'narrative',
      order: 10,
      config: {
        template: `
## Phased Implementation Approach

### Phase 1: Foundation ({{phase1.duration}})
**Objective:** {{phase1.objective}}
**Target Compliance:** {{phase1.targetCompliance}}%

#### Key Activities:
{{#each phase1.activities}}
- {{this.activity}} ({{this.owner}})
{{/each}}

#### Success Criteria:
{{#each phase1.successCriteria}}
- {{this}}
{{/each}}

### Phase 2: Core Implementation ({{phase2.duration}})
**Objective:** {{phase2.objective}}
**Target Compliance:** {{phase2.targetCompliance}}%

#### Key Activities:
{{#each phase2.activities}}
- {{this.activity}} ({{this.owner}})
{{/each}}

### Phase 3: Advanced Controls ({{phase3.duration}})
**Objective:** {{phase3.objective}}
**Target Compliance:** {{phase3.targetCompliance}}%

#### Key Activities:
{{#each phase3.activities}}
- {{this.activity}} ({{this.owner}})
{{/each}}

### Phase 4: Optimization ({{phase4.duration}})
**Objective:** {{phase4.objective}}
**Target Compliance:** {{phase4.targetCompliance}}%
        `
      }
    },
    {
      id: 'risk-mitigation',
      title: 'Risk Mitigation Strategy',
      type: 'table',
      order: 11,
      config: {
        title: 'Gap-Related Risk Mitigation',
        columns: [
          { field: 'risk', header: 'Risk Description', width: '30%' },
          { field: 'likelihood', header: 'Likelihood', width: '10%' },
          { field: 'impact', header: 'Impact', width: '10%' },
          { field: 'riskScore', header: 'Risk Score', width: '10%' },
          { field: 'mitigation', header: 'Mitigation Strategy', width: '25%' },
          { field: 'residualRisk', header: 'Residual Risk', width: '15%' }
        ],
        heatmapColumn: 'riskScore',
        groupBy: 'riskCategory'
      }
    },
    {
      id: 'dependencies',
      title: 'Dependencies and Prerequisites',
      type: 'chart',
      order: 12,
      config: {
        chartType: 'network',
        title: 'Remediation Dependencies',
        data: 'dependencyNetwork',
        nodeTypes: {
          control: { color: '#2196f3', shape: 'circle' },
          technology: { color: '#4caf50', shape: 'square' },
          process: { color: '#ff9800', shape: 'diamond' },
          people: { color: '#9c27b0', shape: 'triangle' }
        },
        showCriticalPath: true
      }
    },
    {
      id: 'success-metrics',
      title: 'Success Metrics and KPIs',
      type: 'narrative',
      order: 13,
      config: {
        template: `
## Success Metrics

### Key Performance Indicators
{{#each kpis}}
- **{{this.metric}}**
  - Current: {{this.current}}
  - Target: {{this.target}}
  - Measurement: {{this.measurement}}
{{/each}}

### Compliance Milestones
{{#each milestones}}
- **{{this.date}}**: {{this.milestone}} ({{this.complianceLevel}}%)
{{/each}}

### Success Factors
{{#each successFactors}}
- {{this.factor}}: {{this.description}}
{{/each}}
        `
      }
    },
    {
      id: 'recommendations',
      title: 'Recommendations and Next Steps',
      type: 'narrative',
      order: 14,
      config: {
        template: `
## Recommendations

### Immediate Actions (Next 30 Days)
{{#each immediateActions}}
{{@index}}. {{this.action}}
   - Owner: {{this.owner}}
   - Expected Outcome: {{this.outcome}}
{{/each}}

### Strategic Recommendations
{{#each strategicRecommendations}}
#### {{this.title}}
{{this.description}}

**Benefits:**
{{#each this.benefits}}
- {{this}}
{{/each}}

**Considerations:**
{{#each this.considerations}}
- {{this}}
{{/each}}
{{/each}}

### Resource Requirements
- **Additional FTEs Required:** {{resourceRequirements.ftes}}
- **External Consultants:** {{resourceRequirements.consultants}}
- **Technology Investments:** {{resourceRequirements.technology}}
- **Training Requirements:** {{resourceRequirements.training}}

### Next Steps
1. Review and approve remediation roadmap
2. Allocate budget and resources
3. Establish project governance
4. Begin Phase 1 implementation
5. Schedule quarterly progress reviews
        `
      }
    }
  ],
  schedule: {
    enabled: false, // Gap analysis is typically run on-demand
    frequency: 'quarterly',
    recipients: ['compliance-team@company.com'],
    format: 'pdf'
  }
};