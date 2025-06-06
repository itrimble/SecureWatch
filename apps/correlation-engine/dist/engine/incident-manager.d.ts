import { Pool } from 'pg';
import { LogEvent, CorrelationIncident, EvaluationResult } from '../types';
export interface CreateIncidentParams {
    rule_id?: string;
    pattern_id?: string;
    incident_type: string;
    severity: string;
    title: string;
    description: string;
    first_seen: string;
    last_seen: string;
    event_count: number;
    affected_assets: string[];
    metadata: any;
}
export declare class IncidentManager {
    private db;
    constructor(db: Pool);
    initialize(): Promise<void>;
    createIncident(params: CreateIncidentParams): Promise<CorrelationIncident>;
    updateIncident(incidentId: string, event: LogEvent, result: EvaluationResult): Promise<CorrelationIncident>;
    findOpenIncident(ruleId: string, event: LogEvent, timeWindowMinutes: number): Promise<CorrelationIncident | null>;
    addCorrelatedEvent(incidentId: string, eventId: string, eventTimestamp: string, relevanceScore: number): Promise<void>;
    getIncidentById(incidentId: string): Promise<CorrelationIncident | null>;
    getActiveIncidents(organizationId: string): Promise<CorrelationIncident[]>;
    updateIncidentStatus(incidentId: string, status: string, resolution?: string): Promise<void>;
    getIncidentStats(organizationId: string): Promise<any>;
}
//# sourceMappingURL=incident-manager.d.ts.map