import { z } from 'zod';
export declare const CaseSeveritySchema: z.ZodEnum<["low", "medium", "high", "critical"]>;
export declare const CaseStatusSchema: z.ZodEnum<["open", "in-progress", "resolved", "closed", "escalated"]>;
export declare const CasePrioritySchema: z.ZodEnum<["p1", "p2", "p3", "p4"]>;
export declare const EvidenceTypeSchema: z.ZodEnum<["file", "log", "screenshot", "network-capture", "memory-dump", "disk-image", "registry", "email", "document", "other"]>;
export declare const TaskStatusSchema: z.ZodEnum<["pending", "assigned", "in-progress", "completed", "blocked"]>;
export declare const NotificationChannelSchema: z.ZodEnum<["email", "sms", "slack", "teams", "webhook", "pagerduty"]>;
export declare const PlaybookStepTypeSchema: z.ZodEnum<["manual", "automated", "approval", "decision"]>;
export declare const ActionTypeSchema: z.ZodEnum<["notification", "api_call", "enrichment", "isolation", "quarantine", "block_ip", "disable_user", "collect_evidence", "custom"]>;
export type CaseSeverity = z.infer<typeof CaseSeveritySchema>;
export type CaseStatus = z.infer<typeof CaseStatusSchema>;
export type CasePriority = z.infer<typeof CasePrioritySchema>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type PlaybookStepType = z.infer<typeof PlaybookStepTypeSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    fullName: z.ZodString;
    role: z.ZodEnum<["analyst", "senior-analyst", "manager", "admin"]>;
    department: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    timezone: z.ZodDefault<z.ZodString>;
    notificationPreferences: z.ZodDefault<z.ZodObject<{
        email: z.ZodDefault<z.ZodBoolean>;
        sms: z.ZodDefault<z.ZodBoolean>;
        slack: z.ZodDefault<z.ZodBoolean>;
        teams: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        email: boolean;
        sms: boolean;
        slack: boolean;
        teams: boolean;
    }, {
        email?: boolean | undefined;
        sms?: boolean | undefined;
        slack?: boolean | undefined;
        teams?: boolean | undefined;
    }>>;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    id: string;
    username: string;
    fullName: string;
    role: "analyst" | "senior-analyst" | "manager" | "admin";
    timezone: string;
    notificationPreferences: {
        email: boolean;
        sms: boolean;
        slack: boolean;
        teams: boolean;
    };
    active: boolean;
    department?: string | undefined;
    phone?: string | undefined;
}, {
    email: string;
    id: string;
    username: string;
    fullName: string;
    role: "analyst" | "senior-analyst" | "manager" | "admin";
    department?: string | undefined;
    phone?: string | undefined;
    timezone?: string | undefined;
    notificationPreferences?: {
        email?: boolean | undefined;
        sms?: boolean | undefined;
        slack?: boolean | undefined;
        teams?: boolean | undefined;
    } | undefined;
    active?: boolean | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const CaseSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    priority: z.ZodEnum<["p1", "p2", "p3", "p4"]>;
    status: z.ZodEnum<["open", "in-progress", "resolved", "closed", "escalated"]>;
    assignee: z.ZodOptional<z.ZodString>;
    reporter: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    closedAt: z.ZodOptional<z.ZodDate>;
    dueDate: z.ZodOptional<z.ZodDate>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    category: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodString>;
    affectedSystems: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    affectedUsers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    sourceAlerts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    relatedCases: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    mitreAttackTechniques: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    iocs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    timeline: z.ZodDefault<z.ZodArray<z.ZodObject<{
        timestamp: z.ZodDate;
        event: z.ZodString;
        details: z.ZodString;
        source: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        automated: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        automated: boolean;
        timestamp: Date;
        event: string;
        details: string;
        source: string;
        userId?: string | undefined;
    }, {
        timestamp: Date;
        event: string;
        details: string;
        source: string;
        automated?: boolean | undefined;
        userId?: string | undefined;
    }>, "many">>;
    metrics: z.ZodDefault<z.ZodObject<{
        timeToDetection: z.ZodOptional<z.ZodNumber>;
        timeToResponse: z.ZodOptional<z.ZodNumber>;
        timeToContainment: z.ZodOptional<z.ZodNumber>;
        timeToResolution: z.ZodOptional<z.ZodNumber>;
        businessImpact: z.ZodOptional<z.ZodString>;
        estimatedLoss: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        timeToDetection?: number | undefined;
        timeToResponse?: number | undefined;
        timeToContainment?: number | undefined;
        timeToResolution?: number | undefined;
        businessImpact?: string | undefined;
        estimatedLoss?: number | undefined;
    }, {
        timeToDetection?: number | undefined;
        timeToResponse?: number | undefined;
        timeToContainment?: number | undefined;
        timeToResolution?: number | undefined;
        businessImpact?: string | undefined;
        estimatedLoss?: number | undefined;
    }>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    status: "open" | "in-progress" | "resolved" | "closed" | "escalated";
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    priority: "p1" | "p2" | "p3" | "p4";
    reporter: string;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    affectedSystems: string[];
    affectedUsers: string[];
    sourceAlerts: string[];
    relatedCases: string[];
    mitreAttackTechniques: string[];
    iocs: string[];
    timeline: {
        automated: boolean;
        timestamp: Date;
        event: string;
        details: string;
        source: string;
        userId?: string | undefined;
    }[];
    metrics: {
        timeToDetection?: number | undefined;
        timeToResponse?: number | undefined;
        timeToContainment?: number | undefined;
        timeToResolution?: number | undefined;
        businessImpact?: string | undefined;
        estimatedLoss?: number | undefined;
    };
    metadata: Record<string, any>;
    assignee?: string | undefined;
    closedAt?: Date | undefined;
    dueDate?: Date | undefined;
    category?: string | undefined;
    subcategory?: string | undefined;
}, {
    status: "open" | "in-progress" | "resolved" | "closed" | "escalated";
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    priority: "p1" | "p2" | "p3" | "p4";
    reporter: string;
    createdAt: Date;
    updatedAt: Date;
    assignee?: string | undefined;
    closedAt?: Date | undefined;
    dueDate?: Date | undefined;
    tags?: string[] | undefined;
    category?: string | undefined;
    subcategory?: string | undefined;
    affectedSystems?: string[] | undefined;
    affectedUsers?: string[] | undefined;
    sourceAlerts?: string[] | undefined;
    relatedCases?: string[] | undefined;
    mitreAttackTechniques?: string[] | undefined;
    iocs?: string[] | undefined;
    timeline?: {
        timestamp: Date;
        event: string;
        details: string;
        source: string;
        automated?: boolean | undefined;
        userId?: string | undefined;
    }[] | undefined;
    metrics?: {
        timeToDetection?: number | undefined;
        timeToResponse?: number | undefined;
        timeToContainment?: number | undefined;
        timeToResolution?: number | undefined;
        businessImpact?: string | undefined;
        estimatedLoss?: number | undefined;
    } | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type Case = z.infer<typeof CaseSchema>;
export declare const EvidenceSchema: z.ZodObject<{
    id: z.ZodString;
    caseId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["file", "log", "screenshot", "network-capture", "memory-dump", "disk-image", "registry", "email", "document", "other"]>;
    size: z.ZodNumber;
    hash: z.ZodObject<{
        md5: z.ZodOptional<z.ZodString>;
        sha1: z.ZodOptional<z.ZodString>;
        sha256: z.ZodString;
        sha512: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sha256: string;
        md5?: string | undefined;
        sha1?: string | undefined;
        sha512?: string | undefined;
    }, {
        sha256: string;
        md5?: string | undefined;
        sha1?: string | undefined;
        sha512?: string | undefined;
    }>;
    source: z.ZodString;
    collectedBy: z.ZodString;
    collectedAt: z.ZodDate;
    chainOfCustody: z.ZodDefault<z.ZodArray<z.ZodObject<{
        timestamp: z.ZodDate;
        action: z.ZodEnum<["collected", "transferred", "analyzed", "stored", "deleted"]>;
        userId: z.ZodString;
        location: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp: Date;
        userId: string;
        action: "collected" | "transferred" | "analyzed" | "stored" | "deleted";
        location: string;
        notes?: string | undefined;
    }, {
        timestamp: Date;
        userId: string;
        action: "collected" | "transferred" | "analyzed" | "stored" | "deleted";
        location: string;
        notes?: string | undefined;
    }>, "many">>;
    filePath: z.ZodOptional<z.ZodString>;
    originalFilename: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    isDeleted: z.ZodDefault<z.ZodBoolean>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "file" | "log" | "screenshot" | "network-capture" | "memory-dump" | "disk-image" | "registry" | "email" | "document" | "other";
    id: string;
    tags: string[];
    source: string;
    metadata: Record<string, any>;
    caseId: string;
    name: string;
    size: number;
    hash: {
        sha256: string;
        md5?: string | undefined;
        sha1?: string | undefined;
        sha512?: string | undefined;
    };
    collectedBy: string;
    collectedAt: Date;
    chainOfCustody: {
        timestamp: Date;
        userId: string;
        action: "collected" | "transferred" | "analyzed" | "stored" | "deleted";
        location: string;
        notes?: string | undefined;
    }[];
    isDeleted: boolean;
    description?: string | undefined;
    filePath?: string | undefined;
    originalFilename?: string | undefined;
    mimeType?: string | undefined;
}, {
    type: "file" | "log" | "screenshot" | "network-capture" | "memory-dump" | "disk-image" | "registry" | "email" | "document" | "other";
    id: string;
    source: string;
    caseId: string;
    name: string;
    size: number;
    hash: {
        sha256: string;
        md5?: string | undefined;
        sha1?: string | undefined;
        sha512?: string | undefined;
    };
    collectedBy: string;
    collectedAt: Date;
    description?: string | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    chainOfCustody?: {
        timestamp: Date;
        userId: string;
        action: "collected" | "transferred" | "analyzed" | "stored" | "deleted";
        location: string;
        notes?: string | undefined;
    }[] | undefined;
    filePath?: string | undefined;
    originalFilename?: string | undefined;
    mimeType?: string | undefined;
    isDeleted?: boolean | undefined;
}>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    caseId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    status: z.ZodEnum<["pending", "assigned", "in-progress", "completed", "blocked"]>;
    assignee: z.ZodOptional<z.ZodString>;
    assignedBy: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    dueDate: z.ZodOptional<z.ZodDate>;
    completedAt: z.ZodOptional<z.ZodDate>;
    priority: z.ZodEnum<["p1", "p2", "p3", "p4"]>;
    estimatedHours: z.ZodOptional<z.ZodNumber>;
    actualHours: z.ZodOptional<z.ZodNumber>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    checklist: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        task: z.ZodString;
        completed: z.ZodDefault<z.ZodBoolean>;
        completedAt: z.ZodOptional<z.ZodDate>;
        completedBy: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        completed: boolean;
        id: string;
        task: string;
        completedAt?: Date | undefined;
        completedBy?: string | undefined;
    }, {
        id: string;
        task: string;
        completed?: boolean | undefined;
        completedAt?: Date | undefined;
        completedBy?: string | undefined;
    }>, "many">>;
    comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        content: z.ZodString;
        timestamp: z.ZodDate;
        edited: z.ZodDefault<z.ZodBoolean>;
        editedAt: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        timestamp: Date;
        userId: string;
        content: string;
        edited: boolean;
        editedAt?: Date | undefined;
    }, {
        id: string;
        timestamp: Date;
        userId: string;
        content: string;
        edited?: boolean | undefined;
        editedAt?: Date | undefined;
    }>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    status: "in-progress" | "pending" | "assigned" | "completed" | "blocked";
    id: string;
    title: string;
    description: string;
    priority: "p1" | "p2" | "p3" | "p4";
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    metadata: Record<string, any>;
    caseId: string;
    assignedBy: string;
    dependencies: string[];
    checklist: {
        completed: boolean;
        id: string;
        task: string;
        completedAt?: Date | undefined;
        completedBy?: string | undefined;
    }[];
    comments: {
        id: string;
        timestamp: Date;
        userId: string;
        content: string;
        edited: boolean;
        editedAt?: Date | undefined;
    }[];
    assignee?: string | undefined;
    dueDate?: Date | undefined;
    completedAt?: Date | undefined;
    estimatedHours?: number | undefined;
    actualHours?: number | undefined;
}, {
    status: "in-progress" | "pending" | "assigned" | "completed" | "blocked";
    id: string;
    title: string;
    description: string;
    priority: "p1" | "p2" | "p3" | "p4";
    createdAt: Date;
    updatedAt: Date;
    caseId: string;
    assignedBy: string;
    assignee?: string | undefined;
    dueDate?: Date | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    completedAt?: Date | undefined;
    estimatedHours?: number | undefined;
    actualHours?: number | undefined;
    dependencies?: string[] | undefined;
    checklist?: {
        id: string;
        task: string;
        completed?: boolean | undefined;
        completedAt?: Date | undefined;
        completedBy?: string | undefined;
    }[] | undefined;
    comments?: {
        id: string;
        timestamp: Date;
        userId: string;
        content: string;
        edited?: boolean | undefined;
        editedAt?: Date | undefined;
    }[] | undefined;
}>;
export type Task = z.infer<typeof TaskSchema>;
export declare const CommentSchema: z.ZodObject<{
    id: z.ZodString;
    caseId: z.ZodString;
    taskId: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
    content: z.ZodString;
    timestamp: z.ZodDate;
    edited: z.ZodDefault<z.ZodBoolean>;
    editedAt: z.ZodOptional<z.ZodDate>;
    mentions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isInternal: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: Date;
    userId: string;
    metadata: Record<string, any>;
    caseId: string;
    content: string;
    edited: boolean;
    mentions: string[];
    attachments: string[];
    isInternal: boolean;
    editedAt?: Date | undefined;
    taskId?: string | undefined;
}, {
    id: string;
    timestamp: Date;
    userId: string;
    caseId: string;
    content: string;
    metadata?: Record<string, any> | undefined;
    edited?: boolean | undefined;
    editedAt?: Date | undefined;
    taskId?: string | undefined;
    mentions?: string[] | undefined;
    attachments?: string[] | undefined;
    isInternal?: boolean | undefined;
}>;
export type Comment = z.infer<typeof CommentSchema>;
export declare const NotificationSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["case-created", "case-updated", "case-assigned", "task-assigned", "evidence-added", "escalation", "approval-required", "deadline-approaching"]>;
    title: z.ZodString;
    message: z.ZodString;
    recipient: z.ZodString;
    channels: z.ZodArray<z.ZodEnum<["email", "sms", "slack", "teams", "webhook", "pagerduty"]>, "many">;
    priority: z.ZodEnum<["p1", "p2", "p3", "p4"]>;
    relatedEntityId: z.ZodString;
    relatedEntityType: z.ZodEnum<["case", "task", "evidence", "playbook"]>;
    status: z.ZodDefault<z.ZodEnum<["pending", "sent", "delivered", "failed"]>>;
    createdAt: z.ZodDate;
    sentAt: z.ZodOptional<z.ZodDate>;
    deliveredAt: z.ZodOptional<z.ZodDate>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "case-created" | "case-updated" | "case-assigned" | "task-assigned" | "evidence-added" | "escalation" | "approval-required" | "deadline-approaching";
    status: "pending" | "sent" | "delivered" | "failed";
    id: string;
    title: string;
    priority: "p1" | "p2" | "p3" | "p4";
    createdAt: Date;
    metadata: Record<string, any>;
    recipient: string;
    channels: ("email" | "sms" | "slack" | "teams" | "webhook" | "pagerduty")[];
    relatedEntityId: string;
    relatedEntityType: "task" | "case" | "evidence" | "playbook";
    sentAt?: Date | undefined;
    deliveredAt?: Date | undefined;
}, {
    message: string;
    type: "case-created" | "case-updated" | "case-assigned" | "task-assigned" | "evidence-added" | "escalation" | "approval-required" | "deadline-approaching";
    id: string;
    title: string;
    priority: "p1" | "p2" | "p3" | "p4";
    createdAt: Date;
    recipient: string;
    channels: ("email" | "sms" | "slack" | "teams" | "webhook" | "pagerduty")[];
    relatedEntityId: string;
    relatedEntityType: "task" | "case" | "evidence" | "playbook";
    status?: "pending" | "sent" | "delivered" | "failed" | undefined;
    metadata?: Record<string, any> | undefined;
    sentAt?: Date | undefined;
    deliveredAt?: Date | undefined;
}>;
export type Notification = z.infer<typeof NotificationSchema>;
export declare const EscalationRuleSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    conditions: z.ZodObject<{
        severity: z.ZodOptional<z.ZodArray<z.ZodEnum<["low", "medium", "high", "critical"]>, "many">>;
        priority: z.ZodOptional<z.ZodArray<z.ZodEnum<["p1", "p2", "p3", "p4"]>, "many">>;
        status: z.ZodOptional<z.ZodArray<z.ZodEnum<["open", "in-progress", "resolved", "closed", "escalated"]>, "many">>;
        timeElapsed: z.ZodOptional<z.ZodNumber>;
        noResponse: z.ZodOptional<z.ZodBoolean>;
        customCondition: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: ("open" | "in-progress" | "resolved" | "closed" | "escalated")[] | undefined;
        severity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        priority?: ("p1" | "p2" | "p3" | "p4")[] | undefined;
        timeElapsed?: number | undefined;
        noResponse?: boolean | undefined;
        customCondition?: string | undefined;
    }, {
        status?: ("open" | "in-progress" | "resolved" | "closed" | "escalated")[] | undefined;
        severity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        priority?: ("p1" | "p2" | "p3" | "p4")[] | undefined;
        timeElapsed?: number | undefined;
        noResponse?: boolean | undefined;
        customCondition?: string | undefined;
    }>;
    actions: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["assign", "notify", "escalate", "auto-approve"]>;
        target: z.ZodString;
        config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "assign" | "notify" | "escalate" | "auto-approve";
        target: string;
        config: Record<string, any>;
    }, {
        type: "assign" | "notify" | "escalate" | "auto-approve";
        target: string;
        config?: Record<string, any> | undefined;
    }>, "many">;
    enabled: z.ZodDefault<z.ZodBoolean>;
    order: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    name: string;
    conditions: {
        status?: ("open" | "in-progress" | "resolved" | "closed" | "escalated")[] | undefined;
        severity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        priority?: ("p1" | "p2" | "p3" | "p4")[] | undefined;
        timeElapsed?: number | undefined;
        noResponse?: boolean | undefined;
        customCondition?: string | undefined;
    };
    actions: {
        type: "assign" | "notify" | "escalate" | "auto-approve";
        target: string;
        config: Record<string, any>;
    }[];
    enabled: boolean;
    order: number;
}, {
    id: string;
    description: string;
    name: string;
    conditions: {
        status?: ("open" | "in-progress" | "resolved" | "closed" | "escalated")[] | undefined;
        severity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        priority?: ("p1" | "p2" | "p3" | "p4")[] | undefined;
        timeElapsed?: number | undefined;
        noResponse?: boolean | undefined;
        customCondition?: string | undefined;
    };
    actions: {
        type: "assign" | "notify" | "escalate" | "auto-approve";
        target: string;
        config?: Record<string, any> | undefined;
    }[];
    enabled?: boolean | undefined;
    order?: number | undefined;
}>;
export type EscalationRule = z.infer<typeof EscalationRuleSchema>;
export declare const PlaybookConditionSchema: z.ZodObject<{
    field: z.ZodString;
    operator: z.ZodEnum<["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "in", "not_in", "regex"]>;
    value: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
    value?: any;
}, {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
    value?: any;
}>;
export declare const PlaybookActionSchema: z.ZodObject<{
    type: z.ZodEnum<["notification", "api_call", "enrichment", "isolation", "quarantine", "block_ip", "disable_user", "collect_evidence", "custom"]>;
    config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    timeout: z.ZodOptional<z.ZodNumber>;
    retries: z.ZodDefault<z.ZodNumber>;
    continueOnFailure: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
    config: Record<string, any>;
    retries: number;
    continueOnFailure: boolean;
    timeout?: number | undefined;
}, {
    type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
    config?: Record<string, any> | undefined;
    timeout?: number | undefined;
    retries?: number | undefined;
    continueOnFailure?: boolean | undefined;
}>;
export declare const PlaybookStepSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["manual", "automated", "approval", "decision"]>;
    action: z.ZodObject<{
        type: z.ZodEnum<["notification", "api_call", "enrichment", "isolation", "quarantine", "block_ip", "disable_user", "collect_evidence", "custom"]>;
        config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        timeout: z.ZodOptional<z.ZodNumber>;
        retries: z.ZodDefault<z.ZodNumber>;
        continueOnFailure: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
        config: Record<string, any>;
        retries: number;
        continueOnFailure: boolean;
        timeout?: number | undefined;
    }, {
        type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
        config?: Record<string, any> | undefined;
        timeout?: number | undefined;
        retries?: number | undefined;
        continueOnFailure?: boolean | undefined;
    }>;
    condition: z.ZodOptional<z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodEnum<["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "in", "not_in", "regex"]>;
        value: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        field: string;
        operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
        value?: any;
    }, {
        field: string;
        operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
        value?: any;
    }>>;
    onSuccess: z.ZodOptional<z.ZodString>;
    onFailure: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    approvers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    order: z.ZodDefault<z.ZodNumber>;
    parallel: z.ZodDefault<z.ZodBoolean>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "manual" | "automated" | "approval" | "decision";
    id: string;
    name: string;
    action: {
        type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
        config: Record<string, any>;
        retries: number;
        continueOnFailure: boolean;
        timeout?: number | undefined;
    };
    enabled: boolean;
    order: number;
    approvers: string[];
    parallel: boolean;
    description?: string | undefined;
    timeout?: number | undefined;
    condition?: {
        field: string;
        operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
        value?: any;
    } | undefined;
    onSuccess?: string | undefined;
    onFailure?: string | undefined;
}, {
    type: "manual" | "automated" | "approval" | "decision";
    id: string;
    name: string;
    action: {
        type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
        config?: Record<string, any> | undefined;
        timeout?: number | undefined;
        retries?: number | undefined;
        continueOnFailure?: boolean | undefined;
    };
    description?: string | undefined;
    enabled?: boolean | undefined;
    order?: number | undefined;
    timeout?: number | undefined;
    condition?: {
        field: string;
        operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
        value?: any;
    } | undefined;
    onSuccess?: string | undefined;
    onFailure?: string | undefined;
    approvers?: string[] | undefined;
    parallel?: boolean | undefined;
}>;
export declare const PlaybookSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    triggerConditions: z.ZodOptional<z.ZodObject<{
        alertType: z.ZodOptional<z.ZodString>;
        severity: z.ZodOptional<z.ZodArray<z.ZodEnum<["low", "medium", "high", "critical"]>, "many">>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        customCondition: z.ZodOptional<z.ZodString>;
        mitreAttackTechniques: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        severity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        tags?: string[] | undefined;
        mitreAttackTechniques?: string[] | undefined;
        customCondition?: string | undefined;
        alertType?: string | undefined;
    }, {
        severity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        tags?: string[] | undefined;
        mitreAttackTechniques?: string[] | undefined;
        customCondition?: string | undefined;
        alertType?: string | undefined;
    }>>;
    steps: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["manual", "automated", "approval", "decision"]>;
        action: z.ZodObject<{
            type: z.ZodEnum<["notification", "api_call", "enrichment", "isolation", "quarantine", "block_ip", "disable_user", "collect_evidence", "custom"]>;
            config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
            timeout: z.ZodOptional<z.ZodNumber>;
            retries: z.ZodDefault<z.ZodNumber>;
            continueOnFailure: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
            config: Record<string, any>;
            retries: number;
            continueOnFailure: boolean;
            timeout?: number | undefined;
        }, {
            type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
            config?: Record<string, any> | undefined;
            timeout?: number | undefined;
            retries?: number | undefined;
            continueOnFailure?: boolean | undefined;
        }>;
        condition: z.ZodOptional<z.ZodObject<{
            field: z.ZodString;
            operator: z.ZodEnum<["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "in", "not_in", "regex"]>;
            value: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
            value?: any;
        }, {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
            value?: any;
        }>>;
        onSuccess: z.ZodOptional<z.ZodString>;
        onFailure: z.ZodOptional<z.ZodString>;
        timeout: z.ZodOptional<z.ZodNumber>;
        approvers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        order: z.ZodDefault<z.ZodNumber>;
        parallel: z.ZodDefault<z.ZodBoolean>;
        enabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "manual" | "automated" | "approval" | "decision";
        id: string;
        name: string;
        action: {
            type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
            config: Record<string, any>;
            retries: number;
            continueOnFailure: boolean;
            timeout?: number | undefined;
        };
        enabled: boolean;
        order: number;
        approvers: string[];
        parallel: boolean;
        description?: string | undefined;
        timeout?: number | undefined;
        condition?: {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
            value?: any;
        } | undefined;
        onSuccess?: string | undefined;
        onFailure?: string | undefined;
    }, {
        type: "manual" | "automated" | "approval" | "decision";
        id: string;
        name: string;
        action: {
            type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
            config?: Record<string, any> | undefined;
            timeout?: number | undefined;
            retries?: number | undefined;
            continueOnFailure?: boolean | undefined;
        };
        description?: string | undefined;
        enabled?: boolean | undefined;
        order?: number | undefined;
        timeout?: number | undefined;
        condition?: {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
            value?: any;
        } | undefined;
        onSuccess?: string | undefined;
        onFailure?: string | undefined;
        approvers?: string[] | undefined;
        parallel?: boolean | undefined;
    }>, "many">;
    approvalRequired: z.ZodDefault<z.ZodBoolean>;
    approvers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    timeoutMinutes: z.ZodOptional<z.ZodNumber>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdBy: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    lastExecuted: z.ZodOptional<z.ZodDate>;
    executionCount: z.ZodDefault<z.ZodNumber>;
    successRate: z.ZodDefault<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    metadata: Record<string, any>;
    name: string;
    enabled: boolean;
    approvers: string[];
    version: string;
    steps: {
        type: "manual" | "automated" | "approval" | "decision";
        id: string;
        name: string;
        action: {
            type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
            config: Record<string, any>;
            retries: number;
            continueOnFailure: boolean;
            timeout?: number | undefined;
        };
        enabled: boolean;
        order: number;
        approvers: string[];
        parallel: boolean;
        description?: string | undefined;
        timeout?: number | undefined;
        condition?: {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
            value?: any;
        } | undefined;
        onSuccess?: string | undefined;
        onFailure?: string | undefined;
    }[];
    approvalRequired: boolean;
    createdBy: string;
    executionCount: number;
    successRate: number;
    category?: string | undefined;
    triggerConditions?: {
        severity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        tags?: string[] | undefined;
        mitreAttackTechniques?: string[] | undefined;
        customCondition?: string | undefined;
        alertType?: string | undefined;
    } | undefined;
    timeoutMinutes?: number | undefined;
    lastExecuted?: Date | undefined;
}, {
    id: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    steps: {
        type: "manual" | "automated" | "approval" | "decision";
        id: string;
        name: string;
        action: {
            type: "notification" | "api_call" | "enrichment" | "isolation" | "quarantine" | "block_ip" | "disable_user" | "collect_evidence" | "custom";
            config?: Record<string, any> | undefined;
            timeout?: number | undefined;
            retries?: number | undefined;
            continueOnFailure?: boolean | undefined;
        };
        description?: string | undefined;
        enabled?: boolean | undefined;
        order?: number | undefined;
        timeout?: number | undefined;
        condition?: {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in" | "regex";
            value?: any;
        } | undefined;
        onSuccess?: string | undefined;
        onFailure?: string | undefined;
        approvers?: string[] | undefined;
        parallel?: boolean | undefined;
    }[];
    createdBy: string;
    tags?: string[] | undefined;
    category?: string | undefined;
    metadata?: Record<string, any> | undefined;
    enabled?: boolean | undefined;
    approvers?: string[] | undefined;
    version?: string | undefined;
    triggerConditions?: {
        severity?: ("low" | "medium" | "high" | "critical")[] | undefined;
        tags?: string[] | undefined;
        mitreAttackTechniques?: string[] | undefined;
        customCondition?: string | undefined;
        alertType?: string | undefined;
    } | undefined;
    approvalRequired?: boolean | undefined;
    timeoutMinutes?: number | undefined;
    lastExecuted?: Date | undefined;
    executionCount?: number | undefined;
    successRate?: number | undefined;
}>;
export type Playbook = z.infer<typeof PlaybookSchema>;
export type PlaybookStep = z.infer<typeof PlaybookStepSchema>;
export type PlaybookAction = z.infer<typeof PlaybookActionSchema>;
export type PlaybookCondition = z.infer<typeof PlaybookConditionSchema>;
export declare const ExecutionContextSchema: z.ZodObject<{
    executionId: z.ZodString;
    playbookId: z.ZodString;
    caseId: z.ZodOptional<z.ZodString>;
    alertId: z.ZodOptional<z.ZodString>;
    triggeredBy: z.ZodString;
    triggeredAt: z.ZodDate;
    approved: z.ZodDefault<z.ZodBoolean>;
    approvedBy: z.ZodOptional<z.ZodString>;
    approvedAt: z.ZodOptional<z.ZodDate>;
    variables: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    stepResults: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    errors: z.ZodDefault<z.ZodArray<z.ZodObject<{
        stepId: z.ZodString;
        error: z.ZodString;
        timestamp: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        timestamp: Date;
        stepId: string;
        error: string;
    }, {
        timestamp: Date;
        stepId: string;
        error: string;
    }>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, any>;
    executionId: string;
    playbookId: string;
    triggeredBy: string;
    triggeredAt: Date;
    approved: boolean;
    variables: Record<string, any>;
    stepResults: Record<string, any>;
    errors: {
        timestamp: Date;
        stepId: string;
        error: string;
    }[];
    caseId?: string | undefined;
    alertId?: string | undefined;
    approvedBy?: string | undefined;
    approvedAt?: Date | undefined;
}, {
    executionId: string;
    playbookId: string;
    triggeredBy: string;
    triggeredAt: Date;
    metadata?: Record<string, any> | undefined;
    caseId?: string | undefined;
    alertId?: string | undefined;
    approved?: boolean | undefined;
    approvedBy?: string | undefined;
    approvedAt?: Date | undefined;
    variables?: Record<string, any> | undefined;
    stepResults?: Record<string, any> | undefined;
    errors?: {
        timestamp: Date;
        stepId: string;
        error: string;
    }[] | undefined;
}>;
export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;
export declare const PlaybookResultSchema: z.ZodObject<{
    executionId: z.ZodString;
    playbookId: z.ZodString;
    status: z.ZodEnum<["success", "failure", "partial", "pending_approval", "timeout", "cancelled"]>;
    startTime: z.ZodDate;
    endTime: z.ZodOptional<z.ZodDate>;
    duration: z.ZodOptional<z.ZodNumber>;
    stepsExecuted: z.ZodDefault<z.ZodNumber>;
    stepsSucceeded: z.ZodDefault<z.ZodNumber>;
    stepsFailed: z.ZodDefault<z.ZodNumber>;
    stepResults: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    errors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    output: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    status: "timeout" | "success" | "failure" | "partial" | "pending_approval" | "cancelled";
    metadata: Record<string, any>;
    executionId: string;
    playbookId: string;
    stepResults: Record<string, any>;
    errors: string[];
    startTime: Date;
    stepsExecuted: number;
    stepsSucceeded: number;
    stepsFailed: number;
    output: Record<string, any>;
    endTime?: Date | undefined;
    duration?: number | undefined;
}, {
    status: "timeout" | "success" | "failure" | "partial" | "pending_approval" | "cancelled";
    executionId: string;
    playbookId: string;
    startTime: Date;
    metadata?: Record<string, any> | undefined;
    stepResults?: Record<string, any> | undefined;
    errors?: string[] | undefined;
    endTime?: Date | undefined;
    duration?: number | undefined;
    stepsExecuted?: number | undefined;
    stepsSucceeded?: number | undefined;
    stepsFailed?: number | undefined;
    output?: Record<string, any> | undefined;
}>;
export type PlaybookResult = z.infer<typeof PlaybookResultSchema>;
export declare const ActionResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    output: z.ZodOptional<z.ZodAny>;
    error: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, any>;
    success: boolean;
    error?: string | undefined;
    duration?: number | undefined;
    output?: any;
}, {
    success: boolean;
    metadata?: Record<string, any> | undefined;
    error?: string | undefined;
    duration?: number | undefined;
    output?: any;
}>;
export type ActionResult = z.infer<typeof ActionResultSchema>;
export declare const TimelineEventSchema: z.ZodObject<{
    id: z.ZodString;
    caseId: z.ZodString;
    timestamp: z.ZodDate;
    event: z.ZodString;
    description: z.ZodString;
    source: z.ZodString;
    sourceType: z.ZodEnum<["log", "alert", "user-action", "system", "evidence", "external"]>;
    severity: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    userId: z.ZodOptional<z.ZodString>;
    automated: z.ZodDefault<z.ZodBoolean>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    relatedEntities: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["user", "host", "ip", "domain", "file", "process"]>;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        type: "file" | "user" | "host" | "ip" | "domain" | "process";
    }, {
        value: string;
        type: "file" | "user" | "host" | "ip" | "domain" | "process";
    }>, "many">>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    automated: boolean;
    id: string;
    description: string;
    tags: string[];
    timestamp: Date;
    event: string;
    source: string;
    metadata: Record<string, any>;
    caseId: string;
    attachments: string[];
    sourceType: "log" | "evidence" | "alert" | "user-action" | "system" | "external";
    relatedEntities: {
        value: string;
        type: "file" | "user" | "host" | "ip" | "domain" | "process";
    }[];
    severity?: "low" | "medium" | "high" | "critical" | undefined;
    userId?: string | undefined;
}, {
    id: string;
    description: string;
    timestamp: Date;
    event: string;
    source: string;
    caseId: string;
    sourceType: "log" | "evidence" | "alert" | "user-action" | "system" | "external";
    automated?: boolean | undefined;
    severity?: "low" | "medium" | "high" | "critical" | undefined;
    tags?: string[] | undefined;
    userId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    attachments?: string[] | undefined;
    relatedEntities?: {
        value: string;
        type: "file" | "user" | "host" | "ip" | "domain" | "process";
    }[] | undefined;
}>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export declare const SOARIntegrationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["phantom", "demisto", "siemplify", "swimlane", "custom"]>;
    endpoint: z.ZodString;
    apiKey: z.ZodString;
    enabled: z.ZodDefault<z.ZodBoolean>;
    config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    lastSync: z.ZodOptional<z.ZodDate>;
    syncInterval: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "custom" | "phantom" | "demisto" | "siemplify" | "swimlane";
    id: string;
    name: string;
    config: Record<string, any>;
    enabled: boolean;
    endpoint: string;
    apiKey: string;
    syncInterval: number;
    lastSync?: Date | undefined;
}, {
    type: "custom" | "phantom" | "demisto" | "siemplify" | "swimlane";
    id: string;
    name: string;
    endpoint: string;
    apiKey: string;
    config?: Record<string, any> | undefined;
    enabled?: boolean | undefined;
    lastSync?: Date | undefined;
    syncInterval?: number | undefined;
}>;
export type SOARIntegration = z.infer<typeof SOARIntegrationSchema>;
export declare const ForensicCollectionSchema: z.ZodObject<{
    id: z.ZodString;
    caseId: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    target: z.ZodObject<{
        type: z.ZodEnum<["host", "network", "cloud", "mobile"]>;
        identifier: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "host" | "network" | "cloud" | "mobile";
        identifier: string;
        location?: string | undefined;
    }, {
        type: "host" | "network" | "cloud" | "mobile";
        identifier: string;
        location?: string | undefined;
    }>;
    collectionType: z.ZodEnum<["live-response", "disk-image", "memory-dump", "network-capture", "log-collection"]>;
    status: z.ZodEnum<["planned", "in-progress", "completed", "failed", "cancelled"]>;
    startedAt: z.ZodOptional<z.ZodDate>;
    completedAt: z.ZodOptional<z.ZodDate>;
    collectedBy: z.ZodString;
    tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    artifacts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    chainOfCustody: z.ZodDefault<z.ZodArray<z.ZodObject<{
        timestamp: z.ZodDate;
        action: z.ZodString;
        userId: z.ZodString;
        location: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp: Date;
        userId: string;
        action: string;
        location: string;
        notes?: string | undefined;
    }, {
        timestamp: Date;
        userId: string;
        action: string;
        location: string;
        notes?: string | undefined;
    }>, "many">>;
    integrity: z.ZodOptional<z.ZodObject<{
        verified: z.ZodDefault<z.ZodBoolean>;
        method: z.ZodOptional<z.ZodString>;
        hash: z.ZodOptional<z.ZodString>;
        signature: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        verified: boolean;
        hash?: string | undefined;
        method?: string | undefined;
        signature?: string | undefined;
    }, {
        hash?: string | undefined;
        verified?: boolean | undefined;
        method?: string | undefined;
        signature?: string | undefined;
    }>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    status: "in-progress" | "completed" | "failed" | "cancelled" | "planned";
    id: string;
    description: string;
    metadata: Record<string, any>;
    caseId: string;
    name: string;
    collectedBy: string;
    chainOfCustody: {
        timestamp: Date;
        userId: string;
        action: string;
        location: string;
        notes?: string | undefined;
    }[];
    target: {
        type: "host" | "network" | "cloud" | "mobile";
        identifier: string;
        location?: string | undefined;
    };
    collectionType: "network-capture" | "memory-dump" | "disk-image" | "live-response" | "log-collection";
    tools: string[];
    artifacts: string[];
    completedAt?: Date | undefined;
    startedAt?: Date | undefined;
    integrity?: {
        verified: boolean;
        hash?: string | undefined;
        method?: string | undefined;
        signature?: string | undefined;
    } | undefined;
}, {
    status: "in-progress" | "completed" | "failed" | "cancelled" | "planned";
    id: string;
    description: string;
    caseId: string;
    name: string;
    collectedBy: string;
    target: {
        type: "host" | "network" | "cloud" | "mobile";
        identifier: string;
        location?: string | undefined;
    };
    collectionType: "network-capture" | "memory-dump" | "disk-image" | "live-response" | "log-collection";
    metadata?: Record<string, any> | undefined;
    chainOfCustody?: {
        timestamp: Date;
        userId: string;
        action: string;
        location: string;
        notes?: string | undefined;
    }[] | undefined;
    completedAt?: Date | undefined;
    startedAt?: Date | undefined;
    tools?: string[] | undefined;
    artifacts?: string[] | undefined;
    integrity?: {
        hash?: string | undefined;
        verified?: boolean | undefined;
        method?: string | undefined;
        signature?: string | undefined;
    } | undefined;
}>;
export type ForensicCollection = z.infer<typeof ForensicCollectionSchema>;
export declare const CaseReportSchema: z.ZodObject<{
    id: z.ZodString;
    caseId: z.ZodString;
    title: z.ZodString;
    type: z.ZodEnum<["incident-summary", "detailed-analysis", "executive-summary", "technical-report", "lessons-learned"]>;
    generatedBy: z.ZodString;
    generatedAt: z.ZodDate;
    format: z.ZodEnum<["pdf", "html", "markdown", "json"]>;
    sections: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        content: z.ZodString;
        order: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        title: string;
        content: string;
        order: number;
    }, {
        title: string;
        content: string;
        order: number;
    }>, "many">>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    recipients: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    confidentiality: z.ZodDefault<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "incident-summary" | "detailed-analysis" | "executive-summary" | "technical-report" | "lessons-learned";
    id: string;
    title: string;
    metadata: Record<string, any>;
    caseId: string;
    attachments: string[];
    generatedBy: string;
    generatedAt: Date;
    format: "pdf" | "html" | "markdown" | "json";
    sections: {
        title: string;
        content: string;
        order: number;
    }[];
    recipients: string[];
    confidentiality: "public" | "internal" | "confidential" | "restricted";
}, {
    type: "incident-summary" | "detailed-analysis" | "executive-summary" | "technical-report" | "lessons-learned";
    id: string;
    title: string;
    caseId: string;
    generatedBy: string;
    generatedAt: Date;
    format: "pdf" | "html" | "markdown" | "json";
    metadata?: Record<string, any> | undefined;
    attachments?: string[] | undefined;
    sections?: {
        title: string;
        content: string;
        order: number;
    }[] | undefined;
    recipients?: string[] | undefined;
    confidentiality?: "public" | "internal" | "confidential" | "restricted" | undefined;
}>;
export type CaseReport = z.infer<typeof CaseReportSchema>;
export declare const IRConfigSchema: z.ZodObject<{
    notifications: z.ZodObject<{
        defaultChannels: z.ZodArray<z.ZodEnum<["email", "sms", "slack", "teams", "webhook", "pagerduty"]>, "many">;
        emailConfig: z.ZodOptional<z.ZodObject<{
            smtpHost: z.ZodString;
            smtpPort: z.ZodNumber;
            username: z.ZodString;
            password: z.ZodString;
            fromAddress: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            username: string;
            smtpHost: string;
            smtpPort: number;
            password: string;
            fromAddress: string;
        }, {
            username: string;
            smtpHost: string;
            smtpPort: number;
            password: string;
            fromAddress: string;
        }>>;
        slackConfig: z.ZodOptional<z.ZodObject<{
            botToken: z.ZodString;
            signingSecret: z.ZodString;
            defaultChannel: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            botToken: string;
            signingSecret: string;
            defaultChannel: string;
        }, {
            botToken: string;
            signingSecret: string;
            defaultChannel: string;
        }>>;
        teamsConfig: z.ZodOptional<z.ZodObject<{
            webhookUrl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            webhookUrl: string;
        }, {
            webhookUrl: string;
        }>>;
        smsConfig: z.ZodOptional<z.ZodObject<{
            provider: z.ZodEnum<["twilio", "aws-sns"]>;
            config: z.ZodRecord<z.ZodString, z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            config: Record<string, any>;
            provider: "twilio" | "aws-sns";
        }, {
            config: Record<string, any>;
            provider: "twilio" | "aws-sns";
        }>>;
    }, "strip", z.ZodTypeAny, {
        defaultChannels: ("email" | "sms" | "slack" | "teams" | "webhook" | "pagerduty")[];
        emailConfig?: {
            username: string;
            smtpHost: string;
            smtpPort: number;
            password: string;
            fromAddress: string;
        } | undefined;
        slackConfig?: {
            botToken: string;
            signingSecret: string;
            defaultChannel: string;
        } | undefined;
        teamsConfig?: {
            webhookUrl: string;
        } | undefined;
        smsConfig?: {
            config: Record<string, any>;
            provider: "twilio" | "aws-sns";
        } | undefined;
    }, {
        defaultChannels: ("email" | "sms" | "slack" | "teams" | "webhook" | "pagerduty")[];
        emailConfig?: {
            username: string;
            smtpHost: string;
            smtpPort: number;
            password: string;
            fromAddress: string;
        } | undefined;
        slackConfig?: {
            botToken: string;
            signingSecret: string;
            defaultChannel: string;
        } | undefined;
        teamsConfig?: {
            webhookUrl: string;
        } | undefined;
        smsConfig?: {
            config: Record<string, any>;
            provider: "twilio" | "aws-sns";
        } | undefined;
    }>;
    escalation: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        defaultTimeouts: z.ZodObject<{
            low: z.ZodDefault<z.ZodNumber>;
            medium: z.ZodDefault<z.ZodNumber>;
            high: z.ZodDefault<z.ZodNumber>;
            critical: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            low: number;
            medium: number;
            high: number;
            critical: number;
        }, {
            low?: number | undefined;
            medium?: number | undefined;
            high?: number | undefined;
            critical?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        defaultTimeouts: {
            low: number;
            medium: number;
            high: number;
            critical: number;
        };
    }, {
        defaultTimeouts: {
            low?: number | undefined;
            medium?: number | undefined;
            high?: number | undefined;
            critical?: number | undefined;
        };
        enabled?: boolean | undefined;
    }>;
    automation: z.ZodObject<{
        autoAssignment: z.ZodDefault<z.ZodBoolean>;
        autoEscalation: z.ZodDefault<z.ZodBoolean>;
        autoPlaybooks: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        autoAssignment: boolean;
        autoEscalation: boolean;
        autoPlaybooks: boolean;
    }, {
        autoAssignment?: boolean | undefined;
        autoEscalation?: boolean | undefined;
        autoPlaybooks?: boolean | undefined;
    }>;
    forensics: z.ZodObject<{
        storageLocation: z.ZodString;
        encryptionEnabled: z.ZodDefault<z.ZodBoolean>;
        retentionPeriod: z.ZodDefault<z.ZodNumber>;
        compressionEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        storageLocation: string;
        encryptionEnabled: boolean;
        retentionPeriod: number;
        compressionEnabled: boolean;
    }, {
        storageLocation: string;
        encryptionEnabled?: boolean | undefined;
        retentionPeriod?: number | undefined;
        compressionEnabled?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    escalation: {
        enabled: boolean;
        defaultTimeouts: {
            low: number;
            medium: number;
            high: number;
            critical: number;
        };
    };
    notifications: {
        defaultChannels: ("email" | "sms" | "slack" | "teams" | "webhook" | "pagerduty")[];
        emailConfig?: {
            username: string;
            smtpHost: string;
            smtpPort: number;
            password: string;
            fromAddress: string;
        } | undefined;
        slackConfig?: {
            botToken: string;
            signingSecret: string;
            defaultChannel: string;
        } | undefined;
        teamsConfig?: {
            webhookUrl: string;
        } | undefined;
        smsConfig?: {
            config: Record<string, any>;
            provider: "twilio" | "aws-sns";
        } | undefined;
    };
    automation: {
        autoAssignment: boolean;
        autoEscalation: boolean;
        autoPlaybooks: boolean;
    };
    forensics: {
        storageLocation: string;
        encryptionEnabled: boolean;
        retentionPeriod: number;
        compressionEnabled: boolean;
    };
}, {
    escalation: {
        defaultTimeouts: {
            low?: number | undefined;
            medium?: number | undefined;
            high?: number | undefined;
            critical?: number | undefined;
        };
        enabled?: boolean | undefined;
    };
    notifications: {
        defaultChannels: ("email" | "sms" | "slack" | "teams" | "webhook" | "pagerduty")[];
        emailConfig?: {
            username: string;
            smtpHost: string;
            smtpPort: number;
            password: string;
            fromAddress: string;
        } | undefined;
        slackConfig?: {
            botToken: string;
            signingSecret: string;
            defaultChannel: string;
        } | undefined;
        teamsConfig?: {
            webhookUrl: string;
        } | undefined;
        smsConfig?: {
            config: Record<string, any>;
            provider: "twilio" | "aws-sns";
        } | undefined;
    };
    automation: {
        autoAssignment?: boolean | undefined;
        autoEscalation?: boolean | undefined;
        autoPlaybooks?: boolean | undefined;
    };
    forensics: {
        storageLocation: string;
        encryptionEnabled?: boolean | undefined;
        retentionPeriod?: number | undefined;
        compressionEnabled?: boolean | undefined;
    };
}>;
export type IRConfig = z.infer<typeof IRConfigSchema>;
export interface DatabaseConfig {
    type: 'sqlite' | 'postgres' | 'mysql';
    connection: any;
}
export interface CaseEvent {
    type: 'case-created' | 'case-updated' | 'case-assigned' | 'case-closed' | 'evidence-added' | 'task-completed';
    caseId: string;
    data: any;
    timestamp: Date;
    userId?: string;
}
export interface PlaybookEvent {
    type: 'playbook-started' | 'playbook-completed' | 'playbook-failed' | 'step-completed' | 'approval-required';
    executionId: string;
    playbookId: string;
    data: any;
    timestamp: Date;
}
export declare class IRError extends Error {
    code: string;
    context?: any | undefined;
    constructor(message: string, code: string, context?: any | undefined);
}
export declare class PlaybookExecutionError extends IRError {
    stepId: string;
    executionId: string;
    constructor(message: string, stepId: string, executionId: string, context?: any);
}
export declare class EvidenceIntegrityError extends IRError {
    evidenceId: string;
    constructor(message: string, evidenceId: string, context?: any);
}
