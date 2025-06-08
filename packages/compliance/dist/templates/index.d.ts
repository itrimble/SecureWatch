import { ReportTemplate } from '../types/compliance.types';
import { SOXComplianceReportTemplate } from './sox-report-template';
import { HIPAAComplianceReportTemplate } from './hipaa-report-template';
import { PCIDSSComplianceReportTemplate } from './pci-dss-report-template';
import { ExecutiveDashboardTemplate } from './executive-dashboard-template';
import { GapAnalysisReportTemplate } from './gap-analysis-template';
export declare const reportTemplates: Map<string, {
    id: string;
    description: string;
    type: "compliance" | "technical" | "audit" | "risk" | "executive" | "gap_analysis";
    name: string;
    sections: {
        id: string;
        title: string;
        type: "details" | "summary" | "chart" | "table" | "matrix" | "narrative";
        order: number;
        config: Record<string, any>;
    }[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic: boolean;
    frameworkId?: string | undefined;
    schedule?: {
        enabled: boolean;
        frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
        recipients: string[];
        format: "pdf" | "csv" | "json" | "xml" | "docx" | "xlsx" | "html";
        nextRun?: Date | undefined;
    } | undefined;
    filters?: {
        field: string;
        operator: string;
        value?: any;
    }[] | undefined;
}>;
/**
 * Get a report template by ID
 */
export declare function getReportTemplate(templateId: string): ReportTemplate | undefined;
/**
 * Get all available report templates
 */
export declare function getAllReportTemplates(): ReportTemplate[];
/**
 * Get report templates by type
 */
export declare function getReportTemplatesByType(type: ReportTemplate['type']): ReportTemplate[];
/**
 * Get report templates by framework
 */
export declare function getReportTemplatesByFramework(frameworkId: string): ReportTemplate[];
export { SOXComplianceReportTemplate, HIPAAComplianceReportTemplate, PCIDSSComplianceReportTemplate, ExecutiveDashboardTemplate, GapAnalysisReportTemplate };
//# sourceMappingURL=index.d.ts.map