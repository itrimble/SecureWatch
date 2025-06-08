import { WebSocketMessage } from '../types';
export declare class WebSocketService {
    private port;
    private server?;
    private clients;
    private redis?;
    private isInitialized;
    private heartbeatInterval?;
    constructor(port?: number);
    initialize(): Promise<void>;
    private setupWebSocketHandlers;
    private handleClientMessage;
    private handleJobUpdate;
    private sendToClient;
    broadcastToOrganization(organizationId: string, message: WebSocketMessage): void;
    sendToUser(userId: string, organizationId: string, message: WebSocketMessage): void;
    notifyJobComplete(jobId: string, userId: string, organizationId: string, result: any): void;
    notifyJobError(jobId: string, userId: string, organizationId: string, error: string): void;
    private startHeartbeat;
    getStats(): {
        connected_clients: number;
        clients_by_org: Record<string, number>;
        total_subscriptions: number;
    };
    shutdown(): Promise<void>;
}
//# sourceMappingURL=WebSocketService.d.ts.map