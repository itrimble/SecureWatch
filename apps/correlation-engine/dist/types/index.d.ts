export interface LogEvent {
    id: string;
    timestamp: string;
    event_id?: string;
    source: string;
    source_identifier?: string;
    level: string;
    message: string;
    computer_name?: string;
    hostname?: string;
    user_name?: string;
    ip_address?: string;
    source_ip?: string;
    destination_ip?: string;
    process_name?: string;
    auth_result?: string;
    logon_type?: string;
    event_category?: string;
    metadata?: Record<string, any>;
}
export interface CorrelationRule {
    id: string;
    name: string;
    description?: string;
    type: 'simple' | 'complex' | 'ml-based' | 'threshold' | 'sequence';
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
    rule_logic: RuleLogic;
    time_window_minutes?: number;
    event_count_threshold?: number;
    conditions?: RuleCondition[];
    metadata?: Record<string, any>;
}
export interface RuleLogic {
    operator?: 'AND' | 'OR';
    conditions?: Array<{
        field: string;
        operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex_match' | 'in' | 'not_in';
        value: any;
        case_sensitive?: boolean;
    }>;
    threshold?: {
        count: number;
        time_window_minutes: number;
        group_by?: string[];
    };
    sequence?: {
        events: Array<{
            event_id: string;
            conditions?: Record<string, any>;
            timeout_minutes?: number;
        }>;
        ordered: boolean;
    };
}
export interface RuleCondition {
    id: string;
    condition_type: 'field_match' | 'regex' | 'threshold' | 'time_sequence';
    field_name?: string;
    operator?: string;
    value?: string;
    condition_order: number;
    is_required: boolean;
    metadata?: Record<string, any>;
}
export interface CorrelationIncident {
    id: string;
    organization_id?: string;
    rule_id?: string;
    pattern_id?: string;
    incident_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'resolved' | 'false_positive';
    title: string;
    description?: string;
    first_seen: string;
    last_seen: string;
    event_count: number;
    affected_assets: string[];
    assigned_to?: string;
    resolved_at?: string;
    resolution_notes?: string;
    resolution?: string;
    created_at?: string;
    updated_at?: string;
    metadata?: Record<string, any>;
}
export interface CorrelationPattern {
    id: string;
    name: string;
    description?: string;
    pattern_type: 'attack_chain' | 'anomaly' | 'behavioral' | 'statistical';
    detection_logic: any;
    confidence_threshold: number;
    is_active: boolean;
}
export interface EvaluationResult {
    ruleId: string;
    matched: boolean;
    confidence: number;
    executionTime: number;
    matchedConditions: string[];
    metadata?: Record<string, any>;
}
export interface CorrelationContext {
    eventId: string;
    timestamp: Date;
    source: string;
    eventType: string;
    relatedEvents?: LogEvent[];
    metadata: Record<string, any>;
}
export interface CorrelationAction {
    id: string;
    rule_id: string;
    action_type: 'alert' | 'email' | 'webhook' | 'script' | 'block';
    action_config: Record<string, any>;
    priority: number;
    enabled: boolean;
}
export interface RuleTemplate {
    id: string;
    name: string;
    category: string;
    description?: string;
    template_logic: any;
    required_fields: string[];
    optional_fields?: string[];
    default_severity: string;
}
export interface AttackChain {
    id: string;
    chain_name: string;
    mitre_tactics: string[];
    mitre_techniques: string[];
    stage_count: number;
    current_stage: number;
    first_detection: string;
    last_activity: string;
    status: 'active' | 'contained' | 'completed';
    risk_score: number;
    affected_entities: any[];
}
export interface BehavioralBaseline {
    id: string;
    entity_type: 'user' | 'host' | 'application' | 'network';
    entity_id: string;
    metric_name: string;
    baseline_value: any;
    standard_deviation?: number;
    last_updated: string;
    sample_count: number;
    confidence_level: number;
}
//# sourceMappingURL=index.d.ts.map