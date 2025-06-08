"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GapAnalysisReportTemplate = exports.ExecutiveDashboardTemplate = exports.PCIDSSComplianceReportTemplate = exports.HIPAAComplianceReportTemplate = exports.SOXComplianceReportTemplate = exports.reportTemplates = void 0;
exports.getReportTemplate = getReportTemplate;
exports.getAllReportTemplates = getAllReportTemplates;
exports.getReportTemplatesByType = getReportTemplatesByType;
exports.getReportTemplatesByFramework = getReportTemplatesByFramework;
const sox_report_template_1 = require("./sox-report-template");
Object.defineProperty(exports, "SOXComplianceReportTemplate", { enumerable: true, get: function () { return sox_report_template_1.SOXComplianceReportTemplate; } });
const hipaa_report_template_1 = require("./hipaa-report-template");
Object.defineProperty(exports, "HIPAAComplianceReportTemplate", { enumerable: true, get: function () { return hipaa_report_template_1.HIPAAComplianceReportTemplate; } });
const pci_dss_report_template_1 = require("./pci-dss-report-template");
Object.defineProperty(exports, "PCIDSSComplianceReportTemplate", { enumerable: true, get: function () { return pci_dss_report_template_1.PCIDSSComplianceReportTemplate; } });
const executive_dashboard_template_1 = require("./executive-dashboard-template");
Object.defineProperty(exports, "ExecutiveDashboardTemplate", { enumerable: true, get: function () { return executive_dashboard_template_1.ExecutiveDashboardTemplate; } });
const gap_analysis_template_1 = require("./gap-analysis-template");
Object.defineProperty(exports, "GapAnalysisReportTemplate", { enumerable: true, get: function () { return gap_analysis_template_1.GapAnalysisReportTemplate; } });
// Map of all available report templates
exports.reportTemplates = new Map([
    ['sox-compliance', sox_report_template_1.SOXComplianceReportTemplate],
    ['hipaa-compliance', hipaa_report_template_1.HIPAAComplianceReportTemplate],
    ['pci-dss-compliance', pci_dss_report_template_1.PCIDSSComplianceReportTemplate],
    ['executive-dashboard', executive_dashboard_template_1.ExecutiveDashboardTemplate],
    ['gap-analysis', gap_analysis_template_1.GapAnalysisReportTemplate]
]);
/**
 * Get a report template by ID
 */
function getReportTemplate(templateId) {
    return exports.reportTemplates.get(templateId);
}
/**
 * Get all available report templates
 */
function getAllReportTemplates() {
    return Array.from(exports.reportTemplates.values());
}
/**
 * Get report templates by type
 */
function getReportTemplatesByType(type) {
    return Array.from(exports.reportTemplates.values()).filter(template => template.type === type);
}
/**
 * Get report templates by framework
 */
function getReportTemplatesByFramework(frameworkId) {
    return Array.from(exports.reportTemplates.values()).filter(template => template.frameworkId === frameworkId || !template.frameworkId);
}
//# sourceMappingURL=index.js.map