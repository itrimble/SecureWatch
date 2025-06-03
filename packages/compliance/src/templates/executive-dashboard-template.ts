import { ReportTemplate } from '../types/compliance.types';
import { v4 as uuidv4 } from 'uuid';

export const ExecutiveDashboardTemplate: ReportTemplate = {
  id: uuidv4(),
  name: 'Executive Compliance Dashboard',
  description: 'High-level compliance overview dashboard for executive leadership',
  type: 'executive',
  createdBy: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublic: true,
  sections: [
    {
      id: 'compliance-overview',
      title: 'Multi-Framework Compliance Overview',
      type: 'summary',
      order: 1,
      config: {
        template: `
# Executive Compliance Dashboard
**Report Date:** {{reportDate}}
**Organization:** {{organizationName}}

## Overall Compliance Posture
{{#each frameworks}}
### {{this.name}} ({{this.type}})
- **Compliance Score:** {{this.score}}%
- **Trend:** {{this.trend}} ({{this.trendValue}}% from last period)
- **Risk Level:** {{this.riskLevel}}
{{/each}}

## Key Metrics
- **Average Compliance Score:** {{averageComplianceScore}}%
- **High Risk Controls:** {{highRiskCount}}
- **Overdue Remediations:** {{overdueCount}}
- **Upcoming Audits:** {{upcomingAudits}}
        `
      }
    },
    {
      id: 'compliance-trends',
      title: 'Compliance Trends',
      type: 'chart',
      order: 2,
      config: {
        chartType: 'line',
        title: '12-Month Compliance Trend',
        data: 'complianceTrends',
        xAxis: 'month',
        yAxis: 'complianceScore',
        series: ['SOX', 'HIPAA', 'PCI-DSS', 'GDPR', 'ISO-27001'],
        showDataLabels: false,
        enableZoom: true
      }
    },
    {
      id: 'risk-heatmap',
      title: 'Enterprise Risk Heat Map',
      type: 'chart',
      order: 3,
      config: {
        chartType: 'heatmap',
        title: 'Risk Distribution by Framework and Category',
        data: 'riskMatrix',
        xAxis: 'framework',
        yAxis: 'category',
        valueField: 'riskScore',
        colorScale: {
          0: '#4caf50',
          25: '#8bc34a',
          50: '#ffeb3b',
          75: '#ff9800',
          100: '#f44336'
        }
      }
    },
    {
      id: 'key-initiatives',
      title: 'Strategic Compliance Initiatives',
      type: 'table',
      order: 4,
      config: {
        columns: [
          { field: 'initiative', header: 'Initiative', width: '30%' },
          { field: 'framework', header: 'Framework', width: '15%' },
          { field: 'status', header: 'Status', width: '15%' },
          { field: 'progress', header: 'Progress', width: '15%', type: 'progress' },
          { field: 'budget', header: 'Budget', width: '15%', type: 'currency' },
          { field: 'targetDate', header: 'Target', width: '10%' }
        ],
        showStatusIndicators: true
      }
    },
    {
      id: 'cost-analysis',
      title: 'Compliance Investment Analysis',
      type: 'chart',
      order: 5,
      config: {
        chartType: 'combinedChart',
        charts: [
          {
            type: 'bar',
            data: 'complianceCosts',
            yAxis: 'cost',
            label: 'Investment'
          },
          {
            type: 'line',
            data: 'riskReduction',
            yAxis: 'riskScore',
            label: 'Risk Reduction',
            secondary: true
          }
        ],
        xAxis: 'quarter'
      }
    },
    {
      id: 'regulatory-calendar',
      title: 'Regulatory Calendar',
      type: 'table',
      order: 6,
      config: {
        title: 'Upcoming Compliance Events',
        columns: [
          { field: 'date', header: 'Date', width: '15%', type: 'date' },
          { field: 'event', header: 'Event', width: '35%' },
          { field: 'framework', header: 'Framework', width: '15%' },
          { field: 'type', header: 'Type', width: '15%' },
          { field: 'owner', header: 'Owner', width: '20%' }
        ],
        sortBy: 'date',
        highlightToday: true,
        showCountdown: true
      }
    },
    {
      id: 'incident-summary',
      title: 'Compliance Incidents & Breaches',
      type: 'summary',
      order: 7,
      config: {
        template: `
## Incident Summary (Last 12 Months)

### By Severity
- **Critical:** {{incidents.critical}} ({{incidents.criticalTrend}}% YoY)
- **High:** {{incidents.high}} ({{incidents.highTrend}}% YoY)
- **Medium:** {{incidents.medium}} ({{incidents.mediumTrend}}% YoY)
- **Low:** {{incidents.low}} ({{incidents.lowTrend}}% YoY)

### Financial Impact
- **Total Fines/Penalties:** {{financialImpact.fines}}
- **Remediation Costs:** {{financialImpact.remediation}}
- **Business Impact:** {{financialImpact.business}}

### Notable Incidents
{{#each notableIncidents}}
- **{{this.date}}:** {{this.description}} ({{this.impact}})
{{/each}}
        `
      }
    },
    {
      id: 'recommendations',
      title: 'Strategic Recommendations',
      type: 'narrative',
      order: 8,
      config: {
        template: `
## Executive Recommendations

### Immediate Actions Required
{{#each immediateActions}}
{{@index}}. **{{this.title}}**
   - Framework: {{this.framework}}
   - Risk: {{this.risk}}
   - Investment: {{this.investment}}
   - Timeline: {{this.timeline}}
{{/each}}

### Strategic Opportunities
{{#each strategicOpportunities}}
- **{{this.opportunity}}**: {{this.description}}
  - Potential ROI: {{this.roi}}
  - Risk Reduction: {{this.riskReduction}}%
{{/each}}

### Resource Optimization
{{resourceOptimization}}
        `
      }
    },
    {
      id: 'benchmark-comparison',
      title: 'Industry Benchmarking',
      type: 'chart',
      order: 9,
      config: {
        chartType: 'radar',
        title: 'Compliance Maturity vs Industry Peers',
        data: 'benchmarkData',
        dimensions: [
          'Policy & Governance',
          'Risk Management',
          'Technical Controls',
          'Monitoring & Testing',
          'Incident Response',
          'Training & Awareness'
        ],
        series: [
          { name: 'Your Organization', data: 'orgScores' },
          { name: 'Industry Average', data: 'industryAvg' },
          { name: 'Best in Class', data: 'bestInClass' }
        ]
      }
    },
    {
      id: 'board-summary',
      title: 'Board Summary',
      type: 'narrative',
      order: 10,
      config: {
        template: `
## Board of Directors Summary

### Compliance Program Effectiveness
{{boardSummary.effectiveness}}

### Key Achievements (This Period)
{{#each boardSummary.achievements}}
- {{this}}
{{/each}}

### Critical Risks Requiring Board Attention
{{#each boardSummary.criticalRisks}}
- **{{this.risk}}**: {{this.description}}
  - Potential Impact: {{this.impact}}
  - Recommended Action: {{this.action}}
{{/each}}

### Attestation Readiness
{{#each boardSummary.attestations}}
- **{{this.framework}}**: {{this.status}} (Due: {{this.dueDate}})
{{/each}}

### Next Period Focus Areas
{{boardSummary.focusAreas}}
        `
      }
    }
  ],
  schedule: {
    enabled: true,
    frequency: 'monthly',
    recipients: ['ceo@company.com', 'board-audit-committee@company.com', 'ciso@company.com'],
    format: 'pdf'
  }
};