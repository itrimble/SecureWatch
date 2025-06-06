import { Pool } from 'pg';
import { CorrelationRule, CorrelationIncident, LogEvent } from '../types';
export interface Action {
    id: string;
    type: string;
    config: any;
    enabled: boolean;
}
export declare class ActionExecutor {
    private db;
    constructor(db: Pool);
    initialize(): Promise<void>;
    executeActions(rule: CorrelationRule, incident: CorrelationIncident, event: LogEvent): Promise<void>;
    private executeAction;
    private sendEmailNotification;
    private executeWebhook;
    private sendSlackNotification;
    private createTicket;
    private isolateHost;
    private blockIpAddress;
    private disableUser;
    private getRuleActions;
    private logActionExecution;
    private generateEmailBody;
    private mapSeverityToPriority;
}
//# sourceMappingURL=action-executor.d.ts.map