import { ReportTemplate } from '../types/compliance.types';
import { SOXComplianceReportTemplate } from './sox-report-template';
import { HIPAAComplianceReportTemplate } from './hipaa-report-template';
import { PCIDSSComplianceReportTemplate } from './pci-dss-report-template';
import { ExecutiveDashboardTemplate } from './executive-dashboard-template';
import { GapAnalysisReportTemplate } from './gap-analysis-template';

// Map of all available report templates
export const reportTemplates = new Map<string, ReportTemplate>([
  ['sox-compliance', SOXComplianceReportTemplate],
  ['hipaa-compliance', HIPAAComplianceReportTemplate],
  ['pci-dss-compliance', PCIDSSComplianceReportTemplate],
  ['executive-dashboard', ExecutiveDashboardTemplate],
  ['gap-analysis', GapAnalysisReportTemplate]
]);

/**
 * Get a report template by ID
 */
export function getReportTemplate(templateId: string): ReportTemplate | undefined {
  return reportTemplates.get(templateId);
}

/**
 * Get all available report templates
 */
export function getAllReportTemplates(): ReportTemplate[] {
  return Array.from(reportTemplates.values());
}

/**
 * Get report templates by type
 */
export function getReportTemplatesByType(type: ReportTemplate['type']): ReportTemplate[] {
  return Array.from(reportTemplates.values()).filter(template => template.type === type);
}

/**
 * Get report templates by framework
 */
export function getReportTemplatesByFramework(frameworkId: string): ReportTemplate[] {
  return Array.from(reportTemplates.values()).filter(
    template => template.frameworkId === frameworkId || !template.frameworkId
  );
}

// Export individual templates
export {
  SOXComplianceReportTemplate,
  HIPAAComplianceReportTemplate,
  PCIDSSComplianceReportTemplate,
  ExecutiveDashboardTemplate,
  GapAnalysisReportTemplate
};