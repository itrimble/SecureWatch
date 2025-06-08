import { z } from 'zod';
export declare const ComplianceFrameworkTypeSchema: z.ZodEnum<["SOX", "HIPAA", "PCI-DSS", "GDPR", "ISO-27001", "NIST-CSF", "NIST-800-53", "NIST-800-171", "CIS", "COBIT", "FISMA", "CCPA", "FedRAMP", "CMMC"]>;
export declare const ComplianceStatusSchema: z.ZodEnum<["compliant", "non_compliant", "partially_compliant", "not_applicable", "in_remediation", "compensating_control"]>;
export declare const AutomationLevelSchema: z.ZodEnum<["full", "partial", "manual"]>;
export declare const EvidenceTypeSchema: z.ZodEnum<["configuration", "log_data", "screenshot", "document", "api_response", "scan_result", "user_attestation", "system_report", "policy_document", "process_output", "database_query", "file_integrity", "network_capture", "access_review", "vulnerability_scan"]>;
export declare const RiskLevelSchema: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
export declare const ReportFormatSchema: z.ZodEnum<["pdf", "csv", "json", "xml", "docx", "xlsx", "html"]>;
export declare const ComplianceControlSchema: z.ZodObject<{
    id: z.ZodString;
    controlId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    categoryId: z.ZodString;
    requirements: z.ZodArray<z.ZodString, "many">;
    evidenceTypes: z.ZodArray<z.ZodEnum<["configuration", "log_data", "screenshot", "document", "api_response", "scan_result", "user_attestation", "system_report", "policy_document", "process_output", "database_query", "file_integrity", "network_capture", "access_review", "vulnerability_scan"]>, "many">;
    automationLevel: z.ZodEnum<["full", "partial", "manual"]>;
    implementationGuidance: z.ZodOptional<z.ZodString>;
    testingProcedures: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    references: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    mappedControls: z.ZodOptional<z.ZodArray<z.ZodObject<{
        frameworkId: z.ZodString;
        controlId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        controlId: string;
        frameworkId: string;
    }, {
        controlId: string;
        frameworkId: string;
    }>, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    riskWeight: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    controlId: string;
    title: string;
    description: string;
    categoryId: string;
    requirements: string[];
    evidenceTypes: ("configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan")[];
    automationLevel: "full" | "partial" | "manual";
    tags: string[];
    riskWeight: number;
    implementationGuidance?: string | undefined;
    testingProcedures?: string[] | undefined;
    references?: string[] | undefined;
    mappedControls?: {
        controlId: string;
        frameworkId: string;
    }[] | undefined;
}, {
    id: string;
    controlId: string;
    title: string;
    description: string;
    categoryId: string;
    requirements: string[];
    evidenceTypes: ("configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan")[];
    automationLevel: "full" | "partial" | "manual";
    implementationGuidance?: string | undefined;
    testingProcedures?: string[] | undefined;
    references?: string[] | undefined;
    mappedControls?: {
        controlId: string;
        frameworkId: string;
    }[] | undefined;
    tags?: string[] | undefined;
    riskWeight?: number | undefined;
}>;
export declare const ComplianceCategorySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    parentId: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    name: string;
    order: number;
    parentId?: string | undefined;
}, {
    id: string;
    description: string;
    name: string;
    order: number;
    parentId?: string | undefined;
}>;
export declare const ComplianceFrameworkSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["SOX", "HIPAA", "PCI-DSS", "GDPR", "ISO-27001", "NIST-CSF", "NIST-800-53", "NIST-800-171", "CIS", "COBIT", "FISMA", "CCPA", "FedRAMP", "CMMC"]>;
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodString;
    effectiveDate: z.ZodDate;
    categories: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        parentId: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        name: string;
        order: number;
        parentId?: string | undefined;
    }, {
        id: string;
        description: string;
        name: string;
        order: number;
        parentId?: string | undefined;
    }>, "many">;
    controls: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        controlId: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        categoryId: z.ZodString;
        requirements: z.ZodArray<z.ZodString, "many">;
        evidenceTypes: z.ZodArray<z.ZodEnum<["configuration", "log_data", "screenshot", "document", "api_response", "scan_result", "user_attestation", "system_report", "policy_document", "process_output", "database_query", "file_integrity", "network_capture", "access_review", "vulnerability_scan"]>, "many">;
        automationLevel: z.ZodEnum<["full", "partial", "manual"]>;
        implementationGuidance: z.ZodOptional<z.ZodString>;
        testingProcedures: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        references: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        mappedControls: z.ZodOptional<z.ZodArray<z.ZodObject<{
            frameworkId: z.ZodString;
            controlId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            controlId: string;
            frameworkId: string;
        }, {
            controlId: string;
            frameworkId: string;
        }>, "many">>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        riskWeight: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        controlId: string;
        title: string;
        description: string;
        categoryId: string;
        requirements: string[];
        evidenceTypes: ("configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan")[];
        automationLevel: "full" | "partial" | "manual";
        tags: string[];
        riskWeight: number;
        implementationGuidance?: string | undefined;
        testingProcedures?: string[] | undefined;
        references?: string[] | undefined;
        mappedControls?: {
            controlId: string;
            frameworkId: string;
        }[] | undefined;
    }, {
        id: string;
        controlId: string;
        title: string;
        description: string;
        categoryId: string;
        requirements: string[];
        evidenceTypes: ("configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan")[];
        automationLevel: "full" | "partial" | "manual";
        implementationGuidance?: string | undefined;
        testingProcedures?: string[] | undefined;
        references?: string[] | undefined;
        mappedControls?: {
            controlId: string;
            frameworkId: string;
        }[] | undefined;
        tags?: string[] | undefined;
        riskWeight?: number | undefined;
    }>, "many">;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    type: "SOX" | "HIPAA" | "PCI-DSS" | "GDPR" | "ISO-27001" | "NIST-CSF" | "NIST-800-53" | "NIST-800-171" | "CIS" | "COBIT" | "FISMA" | "CCPA" | "FedRAMP" | "CMMC";
    name: string;
    version: string;
    effectiveDate: Date;
    categories: {
        id: string;
        description: string;
        name: string;
        order: number;
        parentId?: string | undefined;
    }[];
    controls: {
        id: string;
        controlId: string;
        title: string;
        description: string;
        categoryId: string;
        requirements: string[];
        evidenceTypes: ("configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan")[];
        automationLevel: "full" | "partial" | "manual";
        tags: string[];
        riskWeight: number;
        implementationGuidance?: string | undefined;
        testingProcedures?: string[] | undefined;
        references?: string[] | undefined;
        mappedControls?: {
            controlId: string;
            frameworkId: string;
        }[] | undefined;
    }[];
    metadata: Record<string, any>;
}, {
    id: string;
    description: string;
    type: "SOX" | "HIPAA" | "PCI-DSS" | "GDPR" | "ISO-27001" | "NIST-CSF" | "NIST-800-53" | "NIST-800-171" | "CIS" | "COBIT" | "FISMA" | "CCPA" | "FedRAMP" | "CMMC";
    name: string;
    version: string;
    effectiveDate: Date;
    categories: {
        id: string;
        description: string;
        name: string;
        order: number;
        parentId?: string | undefined;
    }[];
    controls: {
        id: string;
        controlId: string;
        title: string;
        description: string;
        categoryId: string;
        requirements: string[];
        evidenceTypes: ("configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan")[];
        automationLevel: "full" | "partial" | "manual";
        implementationGuidance?: string | undefined;
        testingProcedures?: string[] | undefined;
        references?: string[] | undefined;
        mappedControls?: {
            controlId: string;
            frameworkId: string;
        }[] | undefined;
        tags?: string[] | undefined;
        riskWeight?: number | undefined;
    }[];
    metadata?: Record<string, any> | undefined;
}>;
export declare const ComplianceEvidenceSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["configuration", "log_data", "screenshot", "document", "api_response", "scan_result", "user_attestation", "system_report", "policy_document", "process_output", "database_query", "file_integrity", "network_capture", "access_review", "vulnerability_scan"]>;
    source: z.ZodString;
    collectedAt: z.ZodDate;
    collectorId: z.ZodString;
    data: z.ZodAny;
    hash: z.ZodString;
    size: z.ZodNumber;
    retention: z.ZodOptional<z.ZodObject<{
        policy: z.ZodString;
        expiresAt: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        policy: string;
        expiresAt?: Date | undefined;
    }, {
        policy: string;
        expiresAt?: Date | undefined;
    }>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan";
    metadata: Record<string, any>;
    source: string;
    collectedAt: Date;
    collectorId: string;
    hash: string;
    size: number;
    data?: any;
    retention?: {
        policy: string;
        expiresAt?: Date | undefined;
    } | undefined;
}, {
    id: string;
    type: "configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan";
    source: string;
    collectedAt: Date;
    collectorId: string;
    hash: string;
    size: number;
    metadata?: Record<string, any> | undefined;
    data?: any;
    retention?: {
        policy: string;
        expiresAt?: Date | undefined;
    } | undefined;
}>;
export declare const EvidenceCollectionRuleSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    frameworkId: z.ZodString;
    controlIds: z.ZodArray<z.ZodString, "many">;
    evidenceType: z.ZodEnum<["configuration", "log_data", "screenshot", "document", "api_response", "scan_result", "user_attestation", "system_report", "policy_document", "process_output", "database_query", "file_integrity", "network_capture", "access_review", "vulnerability_scan"]>;
    automation: z.ZodObject<{
        enabled: z.ZodBoolean;
        schedule: z.ZodOptional<z.ZodString>;
        lastRun: z.ZodOptional<z.ZodDate>;
        nextRun: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        schedule?: string | undefined;
        lastRun?: Date | undefined;
        nextRun?: Date | undefined;
    }, {
        enabled: boolean;
        schedule?: string | undefined;
        lastRun?: Date | undefined;
        nextRun?: Date | undefined;
    }>;
    collector: z.ZodObject<{
        type: z.ZodEnum<["api", "script", "query", "manual"]>;
        config: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        type: "manual" | "api" | "script" | "query";
        config: Record<string, any>;
    }, {
        type: "manual" | "api" | "script" | "query";
        config: Record<string, any>;
    }>;
    validation: z.ZodOptional<z.ZodObject<{
        required: z.ZodBoolean;
        rules: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            operator: z.ZodEnum<["equals", "contains", "matches", "exists", "greater_than", "less_than"]>;
            value: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            field: string;
            operator: "equals" | "contains" | "matches" | "exists" | "greater_than" | "less_than";
            value?: any;
        }, {
            field: string;
            operator: "equals" | "contains" | "matches" | "exists" | "greater_than" | "less_than";
            value?: any;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        required: boolean;
        rules: {
            field: string;
            operator: "equals" | "contains" | "matches" | "exists" | "greater_than" | "less_than";
            value?: any;
        }[];
    }, {
        required: boolean;
        rules: {
            field: string;
            operator: "equals" | "contains" | "matches" | "exists" | "greater_than" | "less_than";
            value?: any;
        }[];
    }>>;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    frameworkId: string;
    name: string;
    controlIds: string[];
    evidenceType: "configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan";
    automation: {
        enabled: boolean;
        schedule?: string | undefined;
        lastRun?: Date | undefined;
        nextRun?: Date | undefined;
    };
    collector: {
        type: "manual" | "api" | "script" | "query";
        config: Record<string, any>;
    };
    active: boolean;
    validation?: {
        required: boolean;
        rules: {
            field: string;
            operator: "equals" | "contains" | "matches" | "exists" | "greater_than" | "less_than";
            value?: any;
        }[];
    } | undefined;
}, {
    id: string;
    description: string;
    frameworkId: string;
    name: string;
    controlIds: string[];
    evidenceType: "configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan";
    automation: {
        enabled: boolean;
        schedule?: string | undefined;
        lastRun?: Date | undefined;
        nextRun?: Date | undefined;
    };
    collector: {
        type: "manual" | "api" | "script" | "query";
        config: Record<string, any>;
    };
    validation?: {
        required: boolean;
        rules: {
            field: string;
            operator: "equals" | "contains" | "matches" | "exists" | "greater_than" | "less_than";
            value?: any;
        }[];
    } | undefined;
    active?: boolean | undefined;
}>;
export declare const AuditEventSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodDate;
    userId: z.ZodString;
    userEmail: z.ZodString;
    userRole: z.ZodString;
    action: z.ZodString;
    resource: z.ZodObject<{
        type: z.ZodString;
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: string;
        name?: string | undefined;
    }, {
        id: string;
        type: string;
        name?: string | undefined;
    }>;
    details: z.ZodRecord<z.ZodString, z.ZodAny>;
    result: z.ZodEnum<["success", "failure", "partial"]>;
    ipAddress: z.ZodString;
    userAgent: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    compliance: z.ZodOptional<z.ZodObject<{
        frameworkIds: z.ZodArray<z.ZodString, "many">;
        controlIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        controlIds: string[];
        frameworkIds: string[];
    }, {
        controlIds: string[];
        frameworkIds: string[];
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: Date;
    userId: string;
    userEmail: string;
    userRole: string;
    action: string;
    resource: {
        id: string;
        type: string;
        name?: string | undefined;
    };
    details: Record<string, any>;
    result: "partial" | "success" | "failure";
    ipAddress: string;
    sessionId: string;
    userAgent?: string | undefined;
    correlationId?: string | undefined;
    compliance?: {
        controlIds: string[];
        frameworkIds: string[];
    } | undefined;
}, {
    id: string;
    timestamp: Date;
    userId: string;
    userEmail: string;
    userRole: string;
    action: string;
    resource: {
        id: string;
        type: string;
        name?: string | undefined;
    };
    details: Record<string, any>;
    result: "partial" | "success" | "failure";
    ipAddress: string;
    sessionId: string;
    userAgent?: string | undefined;
    correlationId?: string | undefined;
    compliance?: {
        controlIds: string[];
        frameworkIds: string[];
    } | undefined;
}>;
export declare const ComplianceRiskSchema: z.ZodObject<{
    id: z.ZodString;
    frameworkId: z.ZodString;
    controlId: z.ZodString;
    riskLevel: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
    likelihood: z.ZodNumber;
    impact: z.ZodNumber;
    riskScore: z.ZodNumber;
    description: z.ZodString;
    mitigations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        type: z.ZodEnum<["technical", "administrative", "physical"]>;
        effectiveness: z.ZodNumber;
        implementationStatus: z.ZodEnum<["planned", "in_progress", "implemented", "verified"]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        type: "technical" | "administrative" | "physical";
        effectiveness: number;
        implementationStatus: "planned" | "in_progress" | "implemented" | "verified";
    }, {
        id: string;
        description: string;
        type: "technical" | "administrative" | "physical";
        effectiveness: number;
        implementationStatus: "planned" | "in_progress" | "implemented" | "verified";
    }>, "many">;
    residualRisk: z.ZodNumber;
    acceptedBy: z.ZodOptional<z.ZodString>;
    acceptedAt: z.ZodOptional<z.ZodDate>;
    reviewDate: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    controlId: string;
    description: string;
    frameworkId: string;
    metadata: Record<string, any>;
    riskLevel: "info" | "critical" | "high" | "medium" | "low";
    likelihood: number;
    impact: number;
    riskScore: number;
    mitigations: {
        id: string;
        description: string;
        type: "technical" | "administrative" | "physical";
        effectiveness: number;
        implementationStatus: "planned" | "in_progress" | "implemented" | "verified";
    }[];
    residualRisk: number;
    reviewDate: Date;
    acceptedBy?: string | undefined;
    acceptedAt?: Date | undefined;
}, {
    id: string;
    controlId: string;
    description: string;
    frameworkId: string;
    riskLevel: "info" | "critical" | "high" | "medium" | "low";
    likelihood: number;
    impact: number;
    riskScore: number;
    mitigations: {
        id: string;
        description: string;
        type: "technical" | "administrative" | "physical";
        effectiveness: number;
        implementationStatus: "planned" | "in_progress" | "implemented" | "verified";
    }[];
    residualRisk: number;
    reviewDate: Date;
    metadata?: Record<string, any> | undefined;
    acceptedBy?: string | undefined;
    acceptedAt?: Date | undefined;
}>;
export declare const ComplianceAssessmentSchema: z.ZodObject<{
    id: z.ZodString;
    frameworkId: z.ZodString;
    assessmentDate: z.ZodDate;
    assessorId: z.ZodString;
    scope: z.ZodObject<{
        departments: z.ZodArray<z.ZodString, "many">;
        systems: z.ZodArray<z.ZodString, "many">;
        processes: z.ZodArray<z.ZodString, "many">;
        locations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        departments: string[];
        systems: string[];
        processes: string[];
        locations?: string[] | undefined;
    }, {
        departments: string[];
        systems: string[];
        processes: string[];
        locations?: string[] | undefined;
    }>;
    controlAssessments: z.ZodArray<z.ZodObject<{
        controlId: z.ZodString;
        status: z.ZodEnum<["compliant", "non_compliant", "partially_compliant", "not_applicable", "in_remediation", "compensating_control"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        findings: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            description: z.ZodString;
            severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
            remediation: z.ZodOptional<z.ZodString>;
            dueDate: z.ZodOptional<z.ZodDate>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title: string;
            description: string;
            severity: "info" | "critical" | "high" | "medium" | "low";
            remediation?: string | undefined;
            dueDate?: Date | undefined;
        }, {
            id: string;
            title: string;
            description: string;
            severity: "info" | "critical" | "high" | "medium" | "low";
            remediation?: string | undefined;
            dueDate?: Date | undefined;
        }>, "many">;
        notes: z.ZodString;
        assessedAt: z.ZodDate;
        assessedBy: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        controlId: string;
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: string[];
        findings: {
            id: string;
            title: string;
            description: string;
            severity: "info" | "critical" | "high" | "medium" | "low";
            remediation?: string | undefined;
            dueDate?: Date | undefined;
        }[];
        notes: string;
        assessedAt: Date;
        assessedBy: string;
    }, {
        controlId: string;
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: string[];
        findings: {
            id: string;
            title: string;
            description: string;
            severity: "info" | "critical" | "high" | "medium" | "low";
            remediation?: string | undefined;
            dueDate?: Date | undefined;
        }[];
        notes: string;
        assessedAt: Date;
        assessedBy: string;
    }>, "many">;
    overallStatus: z.ZodEnum<["compliant", "non_compliant", "partially_compliant", "not_applicable", "in_remediation", "compensating_control"]>;
    completedAt: z.ZodOptional<z.ZodDate>;
    approvedBy: z.ZodOptional<z.ZodString>;
    approvedAt: z.ZodOptional<z.ZodDate>;
    nextAssessmentDate: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    frameworkId: string;
    metadata: Record<string, any>;
    assessmentDate: Date;
    assessorId: string;
    scope: {
        departments: string[];
        systems: string[];
        processes: string[];
        locations?: string[] | undefined;
    };
    controlAssessments: {
        controlId: string;
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: string[];
        findings: {
            id: string;
            title: string;
            description: string;
            severity: "info" | "critical" | "high" | "medium" | "low";
            remediation?: string | undefined;
            dueDate?: Date | undefined;
        }[];
        notes: string;
        assessedAt: Date;
        assessedBy: string;
    }[];
    overallStatus: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
    nextAssessmentDate: Date;
    completedAt?: Date | undefined;
    approvedBy?: string | undefined;
    approvedAt?: Date | undefined;
}, {
    id: string;
    frameworkId: string;
    assessmentDate: Date;
    assessorId: string;
    scope: {
        departments: string[];
        systems: string[];
        processes: string[];
        locations?: string[] | undefined;
    };
    controlAssessments: {
        controlId: string;
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: string[];
        findings: {
            id: string;
            title: string;
            description: string;
            severity: "info" | "critical" | "high" | "medium" | "low";
            remediation?: string | undefined;
            dueDate?: Date | undefined;
        }[];
        notes: string;
        assessedAt: Date;
        assessedBy: string;
    }[];
    overallStatus: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
    nextAssessmentDate: Date;
    metadata?: Record<string, any> | undefined;
    completedAt?: Date | undefined;
    approvedBy?: string | undefined;
    approvedAt?: Date | undefined;
}>;
export declare const ReportTemplateSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    frameworkId: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["compliance", "audit", "risk", "executive", "technical", "gap_analysis"]>;
    sections: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        type: z.ZodEnum<["summary", "details", "chart", "table", "matrix", "narrative"]>;
        config: z.ZodRecord<z.ZodString, z.ZodAny>;
        order: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        type: "details" | "summary" | "chart" | "table" | "matrix" | "narrative";
        order: number;
        config: Record<string, any>;
    }, {
        id: string;
        title: string;
        type: "details" | "summary" | "chart" | "table" | "matrix" | "narrative";
        order: number;
        config: Record<string, any>;
    }>, "many">;
    filters: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodString;
        value: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        field: string;
        operator: string;
        value?: any;
    }, {
        field: string;
        operator: string;
        value?: any;
    }>, "many">>;
    schedule: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        frequency: z.ZodEnum<["daily", "weekly", "monthly", "quarterly", "annually"]>;
        recipients: z.ZodArray<z.ZodString, "many">;
        format: z.ZodEnum<["pdf", "csv", "json", "xml", "docx", "xlsx", "html"]>;
        nextRun: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
        recipients: string[];
        format: "pdf" | "csv" | "json" | "xml" | "docx" | "xlsx" | "html";
        nextRun?: Date | undefined;
    }, {
        enabled: boolean;
        frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
        recipients: string[];
        format: "pdf" | "csv" | "json" | "xml" | "docx" | "xlsx" | "html";
        nextRun?: Date | undefined;
    }>>;
    createdBy: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    isPublic: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
    isPublic?: boolean | undefined;
}>;
export declare const ComplianceReportSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    templateId: z.ZodOptional<z.ZodString>;
    frameworkId: z.ZodString;
    generatedAt: z.ZodDate;
    generatedBy: z.ZodString;
    period: z.ZodObject<{
        start: z.ZodDate;
        end: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        start: Date;
        end: Date;
    }, {
        start: Date;
        end: Date;
    }>;
    controls: z.ZodArray<z.ZodObject<{
        controlId: z.ZodString;
        status: z.ZodEnum<["compliant", "non_compliant", "partially_compliant", "not_applicable", "in_remediation", "compensating_control"]>;
        evidence: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["configuration", "log_data", "screenshot", "document", "api_response", "scan_result", "user_attestation", "system_report", "policy_document", "process_output", "database_query", "file_integrity", "network_capture", "access_review", "vulnerability_scan"]>;
            source: z.ZodString;
            collectedAt: z.ZodDate;
            collectorId: z.ZodString;
            data: z.ZodAny;
            hash: z.ZodString;
            size: z.ZodNumber;
            retention: z.ZodOptional<z.ZodObject<{
                policy: z.ZodString;
                expiresAt: z.ZodOptional<z.ZodDate>;
            }, "strip", z.ZodTypeAny, {
                policy: string;
                expiresAt?: Date | undefined;
            }, {
                policy: string;
                expiresAt?: Date | undefined;
            }>>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            type: "configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan";
            metadata: Record<string, any>;
            source: string;
            collectedAt: Date;
            collectorId: string;
            hash: string;
            size: number;
            data?: any;
            retention?: {
                policy: string;
                expiresAt?: Date | undefined;
            } | undefined;
        }, {
            id: string;
            type: "configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan";
            source: string;
            collectedAt: Date;
            collectorId: string;
            hash: string;
            size: number;
            metadata?: Record<string, any> | undefined;
            data?: any;
            retention?: {
                policy: string;
                expiresAt?: Date | undefined;
            } | undefined;
        }>, "many">;
        findings: z.ZodArray<z.ZodString, "many">;
        notes: z.ZodString;
        score: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        controlId: string;
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: {
            id: string;
            type: "configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan";
            metadata: Record<string, any>;
            source: string;
            collectedAt: Date;
            collectorId: string;
            hash: string;
            size: number;
            data?: any;
            retention?: {
                policy: string;
                expiresAt?: Date | undefined;
            } | undefined;
        }[];
        findings: string[];
        notes: string;
        score: number;
    }, {
        controlId: string;
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: {
            id: string;
            type: "configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan";
            source: string;
            collectedAt: Date;
            collectorId: string;
            hash: string;
            size: number;
            metadata?: Record<string, any> | undefined;
            data?: any;
            retention?: {
                policy: string;
                expiresAt?: Date | undefined;
            } | undefined;
        }[];
        findings: string[];
        notes: string;
        score: number;
    }>, "many">;
    summary: z.ZodObject<{
        totalControls: z.ZodNumber;
        compliantCount: z.ZodNumber;
        nonCompliantCount: z.ZodNumber;
        partiallyCompliantCount: z.ZodNumber;
        notApplicableCount: z.ZodNumber;
        inRemediationCount: z.ZodNumber;
        overallComplianceScore: z.ZodNumber;
        riskScore: z.ZodNumber;
        trendsFromLastPeriod: z.ZodOptional<z.ZodObject<{
            scoreChange: z.ZodNumber;
            newFindings: z.ZodNumber;
            resolvedFindings: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            scoreChange: number;
            newFindings: number;
            resolvedFindings: number;
        }, {
            scoreChange: number;
            newFindings: number;
            resolvedFindings: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        riskScore: number;
        totalControls: number;
        compliantCount: number;
        nonCompliantCount: number;
        partiallyCompliantCount: number;
        notApplicableCount: number;
        inRemediationCount: number;
        overallComplianceScore: number;
        trendsFromLastPeriod?: {
            scoreChange: number;
            newFindings: number;
            resolvedFindings: number;
        } | undefined;
    }, {
        riskScore: number;
        totalControls: number;
        compliantCount: number;
        nonCompliantCount: number;
        partiallyCompliantCount: number;
        notApplicableCount: number;
        inRemediationCount: number;
        overallComplianceScore: number;
        trendsFromLastPeriod?: {
            scoreChange: number;
            newFindings: number;
            resolvedFindings: number;
        } | undefined;
    }>;
    executiveSummary: z.ZodOptional<z.ZodString>;
    recommendations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        priority: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
        title: z.ZodString;
        description: z.ZodString;
        affectedControls: z.ZodArray<z.ZodString, "many">;
        estimatedEffort: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
        priority: "info" | "critical" | "high" | "medium" | "low";
        affectedControls: string[];
        estimatedEffort?: string | undefined;
    }, {
        title: string;
        description: string;
        priority: "info" | "critical" | "high" | "medium" | "low";
        affectedControls: string[];
        estimatedEffort?: string | undefined;
    }>, "many">>;
    attestation: z.ZodOptional<z.ZodObject<{
        attestedBy: z.ZodString;
        attestedAt: z.ZodDate;
        signature: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        attestedBy: string;
        attestedAt: Date;
        signature?: string | undefined;
    }, {
        attestedBy: string;
        attestedAt: Date;
        signature?: string | undefined;
    }>>;
    distribution: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    frameworkId: string;
    name: string;
    controls: {
        controlId: string;
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: {
            id: string;
            type: "configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan";
            metadata: Record<string, any>;
            source: string;
            collectedAt: Date;
            collectorId: string;
            hash: string;
            size: number;
            data?: any;
            retention?: {
                policy: string;
                expiresAt?: Date | undefined;
            } | undefined;
        }[];
        findings: string[];
        notes: string;
        score: number;
    }[];
    metadata: Record<string, any>;
    summary: {
        riskScore: number;
        totalControls: number;
        compliantCount: number;
        nonCompliantCount: number;
        partiallyCompliantCount: number;
        notApplicableCount: number;
        inRemediationCount: number;
        overallComplianceScore: number;
        trendsFromLastPeriod?: {
            scoreChange: number;
            newFindings: number;
            resolvedFindings: number;
        } | undefined;
    };
    generatedAt: Date;
    generatedBy: string;
    period: {
        start: Date;
        end: Date;
    };
    templateId?: string | undefined;
    executiveSummary?: string | undefined;
    recommendations?: {
        title: string;
        description: string;
        priority: "info" | "critical" | "high" | "medium" | "low";
        affectedControls: string[];
        estimatedEffort?: string | undefined;
    }[] | undefined;
    attestation?: {
        attestedBy: string;
        attestedAt: Date;
        signature?: string | undefined;
    } | undefined;
    distribution?: string[] | undefined;
}, {
    id: string;
    description: string;
    frameworkId: string;
    name: string;
    controls: {
        controlId: string;
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: {
            id: string;
            type: "configuration" | "log_data" | "screenshot" | "document" | "api_response" | "scan_result" | "user_attestation" | "system_report" | "policy_document" | "process_output" | "database_query" | "file_integrity" | "network_capture" | "access_review" | "vulnerability_scan";
            source: string;
            collectedAt: Date;
            collectorId: string;
            hash: string;
            size: number;
            metadata?: Record<string, any> | undefined;
            data?: any;
            retention?: {
                policy: string;
                expiresAt?: Date | undefined;
            } | undefined;
        }[];
        findings: string[];
        notes: string;
        score: number;
    }[];
    summary: {
        riskScore: number;
        totalControls: number;
        compliantCount: number;
        nonCompliantCount: number;
        partiallyCompliantCount: number;
        notApplicableCount: number;
        inRemediationCount: number;
        overallComplianceScore: number;
        trendsFromLastPeriod?: {
            scoreChange: number;
            newFindings: number;
            resolvedFindings: number;
        } | undefined;
    };
    generatedAt: Date;
    generatedBy: string;
    period: {
        start: Date;
        end: Date;
    };
    metadata?: Record<string, any> | undefined;
    templateId?: string | undefined;
    executiveSummary?: string | undefined;
    recommendations?: {
        title: string;
        description: string;
        priority: "info" | "critical" | "high" | "medium" | "low";
        affectedControls: string[];
        estimatedEffort?: string | undefined;
    }[] | undefined;
    attestation?: {
        attestedBy: string;
        attestedAt: Date;
        signature?: string | undefined;
    } | undefined;
    distribution?: string[] | undefined;
}>;
export declare const ComplianceGapSchema: z.ZodObject<{
    id: z.ZodString;
    frameworkId: z.ZodString;
    controlId: z.ZodString;
    currentState: z.ZodObject<{
        status: z.ZodEnum<["compliant", "non_compliant", "partially_compliant", "not_applicable", "in_remediation", "compensating_control"]>;
        maturityLevel: z.ZodNumber;
        evidence: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: string[];
        maturityLevel: number;
    }, {
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: string[];
        maturityLevel: number;
    }>;
    targetState: z.ZodObject<{
        status: z.ZodEnum<["compliant", "non_compliant", "partially_compliant", "not_applicable", "in_remediation", "compensating_control"]>;
        maturityLevel: z.ZodNumber;
        requirements: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        requirements: string[];
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        maturityLevel: number;
    }, {
        requirements: string[];
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        maturityLevel: number;
    }>;
    gap: z.ZodObject<{
        description: z.ZodString;
        severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
        remediationSteps: z.ZodArray<z.ZodObject<{
            step: z.ZodNumber;
            description: z.ZodString;
            owner: z.ZodOptional<z.ZodString>;
            dueDate: z.ZodOptional<z.ZodDate>;
            effort: z.ZodOptional<z.ZodString>;
            dependencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            description: string;
            step: number;
            dueDate?: Date | undefined;
            owner?: string | undefined;
            effort?: string | undefined;
            dependencies?: string[] | undefined;
        }, {
            description: string;
            step: number;
            dueDate?: Date | undefined;
            owner?: string | undefined;
            effort?: string | undefined;
            dependencies?: string[] | undefined;
        }>, "many">;
        estimatedCost: z.ZodOptional<z.ZodNumber>;
        estimatedEffort: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        severity: "info" | "critical" | "high" | "medium" | "low";
        remediationSteps: {
            description: string;
            step: number;
            dueDate?: Date | undefined;
            owner?: string | undefined;
            effort?: string | undefined;
            dependencies?: string[] | undefined;
        }[];
        estimatedEffort?: string | undefined;
        estimatedCost?: number | undefined;
    }, {
        description: string;
        severity: "info" | "critical" | "high" | "medium" | "low";
        remediationSteps: {
            description: string;
            step: number;
            dueDate?: Date | undefined;
            owner?: string | undefined;
            effort?: string | undefined;
            dependencies?: string[] | undefined;
        }[];
        estimatedEffort?: string | undefined;
        estimatedCost?: number | undefined;
    }>;
    identifiedAt: z.ZodDate;
    identifiedBy: z.ZodString;
    reviewedAt: z.ZodOptional<z.ZodDate>;
    reviewedBy: z.ZodOptional<z.ZodString>;
    closedAt: z.ZodOptional<z.ZodDate>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    controlId: string;
    frameworkId: string;
    metadata: Record<string, any>;
    currentState: {
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: string[];
        maturityLevel: number;
    };
    targetState: {
        requirements: string[];
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        maturityLevel: number;
    };
    gap: {
        description: string;
        severity: "info" | "critical" | "high" | "medium" | "low";
        remediationSteps: {
            description: string;
            step: number;
            dueDate?: Date | undefined;
            owner?: string | undefined;
            effort?: string | undefined;
            dependencies?: string[] | undefined;
        }[];
        estimatedEffort?: string | undefined;
        estimatedCost?: number | undefined;
    };
    identifiedAt: Date;
    identifiedBy: string;
    reviewedAt?: Date | undefined;
    reviewedBy?: string | undefined;
    closedAt?: Date | undefined;
}, {
    id: string;
    controlId: string;
    frameworkId: string;
    currentState: {
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        evidence: string[];
        maturityLevel: number;
    };
    targetState: {
        requirements: string[];
        status: "compliant" | "non_compliant" | "partially_compliant" | "not_applicable" | "in_remediation" | "compensating_control";
        maturityLevel: number;
    };
    gap: {
        description: string;
        severity: "info" | "critical" | "high" | "medium" | "low";
        remediationSteps: {
            description: string;
            step: number;
            dueDate?: Date | undefined;
            owner?: string | undefined;
            effort?: string | undefined;
            dependencies?: string[] | undefined;
        }[];
        estimatedEffort?: string | undefined;
        estimatedCost?: number | undefined;
    };
    identifiedAt: Date;
    identifiedBy: string;
    metadata?: Record<string, any> | undefined;
    reviewedAt?: Date | undefined;
    reviewedBy?: string | undefined;
    closedAt?: Date | undefined;
}>;
export declare const ComplianceDashboardSchema: z.ZodObject<{
    overallCompliance: z.ZodObject<{
        score: z.ZodNumber;
        trend: z.ZodEnum<["improving", "stable", "declining"]>;
        change: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        score: number;
        trend: "improving" | "stable" | "declining";
        change: number;
    }, {
        score: number;
        trend: "improving" | "stable" | "declining";
        change: number;
    }>;
    frameworkStatus: z.ZodArray<z.ZodObject<{
        frameworkId: z.ZodString;
        frameworkName: z.ZodString;
        complianceScore: z.ZodNumber;
        controlsTotal: z.ZodNumber;
        controlsCompliant: z.ZodNumber;
        lastAssessment: z.ZodDate;
        nextAssessment: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        frameworkId: string;
        frameworkName: string;
        complianceScore: number;
        controlsTotal: number;
        controlsCompliant: number;
        lastAssessment: Date;
        nextAssessment: Date;
    }, {
        frameworkId: string;
        frameworkName: string;
        complianceScore: number;
        controlsTotal: number;
        controlsCompliant: number;
        lastAssessment: Date;
        nextAssessment: Date;
    }>, "many">;
    riskOverview: z.ZodObject<{
        criticalRisks: z.ZodNumber;
        highRisks: z.ZodNumber;
        mediumRisks: z.ZodNumber;
        lowRisks: z.ZodNumber;
        totalRiskScore: z.ZodNumber;
        trendsFromLastPeriod: z.ZodObject<{
            newRisks: z.ZodNumber;
            mitigatedRisks: z.ZodNumber;
            acceptedRisks: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            newRisks: number;
            mitigatedRisks: number;
            acceptedRisks: number;
        }, {
            newRisks: number;
            mitigatedRisks: number;
            acceptedRisks: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        trendsFromLastPeriod: {
            newRisks: number;
            mitigatedRisks: number;
            acceptedRisks: number;
        };
        criticalRisks: number;
        highRisks: number;
        mediumRisks: number;
        lowRisks: number;
        totalRiskScore: number;
    }, {
        trendsFromLastPeriod: {
            newRisks: number;
            mitigatedRisks: number;
            acceptedRisks: number;
        };
        criticalRisks: number;
        highRisks: number;
        mediumRisks: number;
        lowRisks: number;
        totalRiskScore: number;
    }>;
    upcomingActivities: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["assessment", "audit", "report", "remediation"]>;
        title: z.ZodString;
        dueDate: z.ZodDate;
        owner: z.ZodString;
        priority: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        type: "remediation" | "audit" | "assessment" | "report";
        dueDate: Date;
        priority: "info" | "critical" | "high" | "medium" | "low";
        owner: string;
    }, {
        title: string;
        type: "remediation" | "audit" | "assessment" | "report";
        dueDate: Date;
        priority: "info" | "critical" | "high" | "medium" | "low";
        owner: string;
    }>, "many">;
    recentFindings: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
        framework: z.ZodString;
        control: z.ZodString;
        identifiedAt: z.ZodDate;
        status: z.ZodEnum<["open", "in_progress", "resolved"]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        status: "in_progress" | "open" | "resolved";
        severity: "info" | "critical" | "high" | "medium" | "low";
        identifiedAt: Date;
        framework: string;
        control: string;
    }, {
        id: string;
        title: string;
        status: "in_progress" | "open" | "resolved";
        severity: "info" | "critical" | "high" | "medium" | "low";
        identifiedAt: Date;
        framework: string;
        control: string;
    }>, "many">;
    evidenceCollection: z.ZodObject<{
        totalEvidence: z.ZodNumber;
        automatedCollection: z.ZodNumber;
        manualCollection: z.ZodNumber;
        lastCollectionRun: z.ZodDate;
        nextScheduledRun: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        totalEvidence: number;
        automatedCollection: number;
        manualCollection: number;
        lastCollectionRun: Date;
        nextScheduledRun?: Date | undefined;
    }, {
        totalEvidence: number;
        automatedCollection: number;
        manualCollection: number;
        lastCollectionRun: Date;
        nextScheduledRun?: Date | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    overallCompliance: {
        score: number;
        trend: "improving" | "stable" | "declining";
        change: number;
    };
    frameworkStatus: {
        frameworkId: string;
        frameworkName: string;
        complianceScore: number;
        controlsTotal: number;
        controlsCompliant: number;
        lastAssessment: Date;
        nextAssessment: Date;
    }[];
    riskOverview: {
        trendsFromLastPeriod: {
            newRisks: number;
            mitigatedRisks: number;
            acceptedRisks: number;
        };
        criticalRisks: number;
        highRisks: number;
        mediumRisks: number;
        lowRisks: number;
        totalRiskScore: number;
    };
    upcomingActivities: {
        title: string;
        type: "remediation" | "audit" | "assessment" | "report";
        dueDate: Date;
        priority: "info" | "critical" | "high" | "medium" | "low";
        owner: string;
    }[];
    recentFindings: {
        id: string;
        title: string;
        status: "in_progress" | "open" | "resolved";
        severity: "info" | "critical" | "high" | "medium" | "low";
        identifiedAt: Date;
        framework: string;
        control: string;
    }[];
    evidenceCollection: {
        totalEvidence: number;
        automatedCollection: number;
        manualCollection: number;
        lastCollectionRun: Date;
        nextScheduledRun?: Date | undefined;
    };
}, {
    overallCompliance: {
        score: number;
        trend: "improving" | "stable" | "declining";
        change: number;
    };
    frameworkStatus: {
        frameworkId: string;
        frameworkName: string;
        complianceScore: number;
        controlsTotal: number;
        controlsCompliant: number;
        lastAssessment: Date;
        nextAssessment: Date;
    }[];
    riskOverview: {
        trendsFromLastPeriod: {
            newRisks: number;
            mitigatedRisks: number;
            acceptedRisks: number;
        };
        criticalRisks: number;
        highRisks: number;
        mediumRisks: number;
        lowRisks: number;
        totalRiskScore: number;
    };
    upcomingActivities: {
        title: string;
        type: "remediation" | "audit" | "assessment" | "report";
        dueDate: Date;
        priority: "info" | "critical" | "high" | "medium" | "low";
        owner: string;
    }[];
    recentFindings: {
        id: string;
        title: string;
        status: "in_progress" | "open" | "resolved";
        severity: "info" | "critical" | "high" | "medium" | "low";
        identifiedAt: Date;
        framework: string;
        control: string;
    }[];
    evidenceCollection: {
        totalEvidence: number;
        automatedCollection: number;
        manualCollection: number;
        lastCollectionRun: Date;
        nextScheduledRun?: Date | undefined;
    };
}>;
export declare const ComplianceConfigSchema: z.ZodObject<{
    retentionPolicy: z.ZodObject<{
        auditLogs: z.ZodNumber;
        evidence: z.ZodNumber;
        reports: z.ZodNumber;
        assessments: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        evidence: number;
        auditLogs: number;
        reports: number;
        assessments: number;
    }, {
        evidence: number;
        auditLogs: number;
        reports: number;
        assessments: number;
    }>;
    automation: z.ZodObject<{
        enabledFrameworks: z.ZodArray<z.ZodEnum<["SOX", "HIPAA", "PCI-DSS", "GDPR", "ISO-27001", "NIST-CSF", "NIST-800-53", "NIST-800-171", "CIS", "COBIT", "FISMA", "CCPA", "FedRAMP", "CMMC"]>, "many">;
        evidenceCollection: z.ZodBoolean;
        reportGeneration: z.ZodBoolean;
        riskScoring: z.ZodBoolean;
        notifications: z.ZodObject<{
            enabled: z.ZodBoolean;
            channels: z.ZodArray<z.ZodEnum<["email", "webhook", "sms"]>, "many">;
            recipients: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            recipients: Record<string, string[]>;
            channels: ("email" | "webhook" | "sms")[];
        }, {
            enabled: boolean;
            recipients: Record<string, string[]>;
            channels: ("email" | "webhook" | "sms")[];
        }>;
    }, "strip", z.ZodTypeAny, {
        evidenceCollection: boolean;
        enabledFrameworks: ("SOX" | "HIPAA" | "PCI-DSS" | "GDPR" | "ISO-27001" | "NIST-CSF" | "NIST-800-53" | "NIST-800-171" | "CIS" | "COBIT" | "FISMA" | "CCPA" | "FedRAMP" | "CMMC")[];
        reportGeneration: boolean;
        riskScoring: boolean;
        notifications: {
            enabled: boolean;
            recipients: Record<string, string[]>;
            channels: ("email" | "webhook" | "sms")[];
        };
    }, {
        evidenceCollection: boolean;
        enabledFrameworks: ("SOX" | "HIPAA" | "PCI-DSS" | "GDPR" | "ISO-27001" | "NIST-CSF" | "NIST-800-53" | "NIST-800-171" | "CIS" | "COBIT" | "FISMA" | "CCPA" | "FedRAMP" | "CMMC")[];
        reportGeneration: boolean;
        riskScoring: boolean;
        notifications: {
            enabled: boolean;
            recipients: Record<string, string[]>;
            channels: ("email" | "webhook" | "sms")[];
        };
    }>;
    scoring: z.ZodObject<{
        method: z.ZodEnum<["weighted", "simple", "risk-based"]>;
        weights: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        method: "weighted" | "simple" | "risk-based";
        weights?: Record<string, number> | undefined;
    }, {
        method: "weighted" | "simple" | "risk-based";
        weights?: Record<string, number> | undefined;
    }>;
    integrations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        name: z.ZodString;
        config: z.ZodRecord<z.ZodString, z.ZodAny>;
        enabled: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: string;
        name: string;
        enabled: boolean;
        config: Record<string, any>;
    }, {
        id: string;
        type: string;
        name: string;
        enabled: boolean;
        config: Record<string, any>;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    automation: {
        evidenceCollection: boolean;
        enabledFrameworks: ("SOX" | "HIPAA" | "PCI-DSS" | "GDPR" | "ISO-27001" | "NIST-CSF" | "NIST-800-53" | "NIST-800-171" | "CIS" | "COBIT" | "FISMA" | "CCPA" | "FedRAMP" | "CMMC")[];
        reportGeneration: boolean;
        riskScoring: boolean;
        notifications: {
            enabled: boolean;
            recipients: Record<string, string[]>;
            channels: ("email" | "webhook" | "sms")[];
        };
    };
    retentionPolicy: {
        evidence: number;
        auditLogs: number;
        reports: number;
        assessments: number;
    };
    scoring: {
        method: "weighted" | "simple" | "risk-based";
        weights?: Record<string, number> | undefined;
    };
    integrations: {
        id: string;
        type: string;
        name: string;
        enabled: boolean;
        config: Record<string, any>;
    }[];
}, {
    automation: {
        evidenceCollection: boolean;
        enabledFrameworks: ("SOX" | "HIPAA" | "PCI-DSS" | "GDPR" | "ISO-27001" | "NIST-CSF" | "NIST-800-53" | "NIST-800-171" | "CIS" | "COBIT" | "FISMA" | "CCPA" | "FedRAMP" | "CMMC")[];
        reportGeneration: boolean;
        riskScoring: boolean;
        notifications: {
            enabled: boolean;
            recipients: Record<string, string[]>;
            channels: ("email" | "webhook" | "sms")[];
        };
    };
    retentionPolicy: {
        evidence: number;
        auditLogs: number;
        reports: number;
        assessments: number;
    };
    scoring: {
        method: "weighted" | "simple" | "risk-based";
        weights?: Record<string, number> | undefined;
    };
    integrations: {
        id: string;
        type: string;
        name: string;
        enabled: boolean;
        config: Record<string, any>;
    }[];
}>;
export declare const DatabaseConfigSchema: z.ZodObject<{
    type: z.ZodEnum<["sqlite", "mysql", "postgresql"]>;
    connection: z.ZodUnion<[z.ZodString, z.ZodObject<{
        host: z.ZodString;
        port: z.ZodNumber;
        database: z.ZodString;
        user: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    }, {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    }>]>;
}, "strip", z.ZodTypeAny, {
    type: "sqlite" | "mysql" | "postgresql";
    connection: string | {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    };
}, {
    type: "sqlite" | "mysql" | "postgresql";
    connection: string | {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    };
}>;
export type ComplianceFrameworkType = z.infer<typeof ComplianceFrameworkTypeSchema>;
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;
export type AutomationLevel = z.infer<typeof AutomationLevelSchema>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export type ComplianceControl = z.infer<typeof ComplianceControlSchema>;
export type ComplianceCategory = z.infer<typeof ComplianceCategorySchema>;
export type ComplianceFramework = z.infer<typeof ComplianceFrameworkSchema>;
export type ComplianceEvidence = z.infer<typeof ComplianceEvidenceSchema>;
export type EvidenceCollectionRule = z.infer<typeof EvidenceCollectionRuleSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type ComplianceRisk = z.infer<typeof ComplianceRiskSchema>;
export type ComplianceAssessment = z.infer<typeof ComplianceAssessmentSchema>;
export type ReportTemplate = z.infer<typeof ReportTemplateSchema>;
export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;
export type ComplianceGap = z.infer<typeof ComplianceGapSchema>;
export type ComplianceDashboard = z.infer<typeof ComplianceDashboardSchema>;
export type ComplianceConfig = z.infer<typeof ComplianceConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export interface ComplianceFrameworkDefinition {
    type: ComplianceFrameworkType;
    name: string;
    version: string;
    description: string;
    categories: Omit<ComplianceCategory, 'id'>[];
    controls: Omit<ComplianceControl, 'id'>[];
}
export interface EvidenceCollectionRequest {
    frameworkId: string;
    controlIds: string[];
    evidenceType: EvidenceType;
    source: string;
    data: any;
}
export interface ComplianceAssessmentRequest {
    frameworkId: string;
    scope: {
        departments: string[];
        systems: string[];
        processes: string[];
        locations?: string[];
    };
    assessorId: string;
}
export interface ReportGenerationRequest {
    templateId?: string;
    frameworkId: string;
    period: {
        start: Date;
        end: Date;
    };
    format: ReportFormat;
    includeEvidence?: boolean;
    includeRecommendations?: boolean;
}
export interface GapAnalysisRequest {
    frameworkId: string;
    targetMaturityLevel?: number;
    includeRemediationPlan?: boolean;
    priorityThreshold?: RiskLevel;
}
export interface ComplianceSearchFilters {
    frameworks?: ComplianceFrameworkType[];
    status?: ComplianceStatus[];
    riskLevels?: RiskLevel[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    departments?: string[];
    systems?: string[];
    tags?: string[];
}
export interface Pagination {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
//# sourceMappingURL=compliance.types.d.ts.map