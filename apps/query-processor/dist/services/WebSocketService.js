// WebSocket Service for real-time job status updates
// Provides real-time notifications to frontend clients
import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { createClient } from 'redis';
import { logger } from '../utils/logger';
export class WebSocketService {
    port;
    server;
    clients = new Map();
    redis;
    isInitialized = false;
    heartbeatInterval;
    constructor(port = 8080) {
        this.port = port;
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            // Initialize Redis subscriber for job updates
            this.redis = createClient({
                url: process.env.REDIS_URL || 'redis://:securewatch_dev@localhost:6379',
            });
            await this.redis.connect();
            // Subscribe to job update channel
            await this.redis.subscribe('job-updates', (message) => {
                this.handleJobUpdate(message);
            });
            // Create WebSocket server
            const httpServer = createServer();
            this.server = new WebSocketServer({ server: httpServer });
            this.setupWebSocketHandlers();
            this.startHeartbeat();
            httpServer.listen(this.port, () => {
                logger.info(`WebSocket server started on port ${this.port}`);
            });
            this.isInitialized = true;
        }
        catch (error) {
            logger.error('Failed to initialize WebSocket service:', error);
            throw error;
        }
    }
    setupWebSocketHandlers() {
        if (!this.server)
            return;
        this.server.on('connection', (ws, request) => {
            // Extract user info from query parameters or headers
            const url = new URL(request.url || '', `http://${request.headers.host}`);
            const userId = url.searchParams.get('userId');
            const organizationId = url.searchParams.get('organizationId');
            const token = url.searchParams.get('token'); // For authentication
            if (!userId || !organizationId) {
                logger.warn('WebSocket connection rejected: missing userId or organizationId');
                ws.close(1008, 'Missing required parameters');
                return;
            }
            // TODO: Validate token for authentication
            // For now, we'll accept any connection with valid parameters
            if (token) {
                // Token validation would go here
                logger.debug('Token provided for WebSocket connection');
            }
            const clientId = `${userId}-${Date.now()}`;
            const client = {
                ws,
                userId,
                organizationId,
                subscriptions: new Set(),
                lastPing: Date.now(),
            };
            this.clients.set(clientId, client);
            logger.info(`WebSocket client connected: ${clientId}`, {
                userId,
                organizationId,
                totalClients: this.clients.size,
            });
            // Send welcome message
            this.sendToClient(clientId, {
                type: 'system_status',
                data: { status: 'connected', clientId },
                timestamp: new Date().toISOString(),
            });
            // Handle incoming messages
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleClientMessage(clientId, message);
                }
                catch (error) {
                    logger.warn(`Invalid message from client ${clientId}:`, error);
                }
            });
            // Handle client disconnect
            ws.on('close', () => {
                this.clients.delete(clientId);
                logger.info(`WebSocket client disconnected: ${clientId}`, {
                    totalClients: this.clients.size,
                });
            });
            // Handle errors
            ws.on('error', (error) => {
                logger.error(`WebSocket error for client ${clientId}:`, error);
                this.clients.delete(clientId);
            });
            // Handle pong responses for heartbeat
            ws.on('pong', () => {
                const client = this.clients.get(clientId);
                if (client) {
                    client.lastPing = Date.now();
                }
            });
        });
    }
    handleClientMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        switch (message.type) {
            case 'subscribe_job':
                if (message.jobId) {
                    client.subscriptions.add(message.jobId);
                    logger.debug(`Client ${clientId} subscribed to job ${message.jobId}`);
                }
                break;
            case 'unsubscribe_job':
                if (message.jobId) {
                    client.subscriptions.delete(message.jobId);
                    logger.debug(`Client ${clientId} unsubscribed from job ${message.jobId}`);
                }
                break;
            case 'ping':
                client.lastPing = Date.now();
                this.sendToClient(clientId, {
                    type: 'system_status',
                    data: { status: 'pong' },
                    timestamp: new Date().toISOString(),
                });
                break;
            case 'get_job_status':
                // Client requesting current status of a job
                // This could trigger a database lookup and send current status
                break;
            default:
                logger.warn(`Unknown message type from client ${clientId}: ${message.type}`);
        }
    }
    handleJobUpdate(message) {
        try {
            const update = JSON.parse(message);
            // Find clients that should receive this update
            for (const [clientId, client] of this.clients) {
                // Check if client should receive this update
                const shouldReceive = 
                // Same organization
                client.organizationId === update.organization_id &&
                    (
                    // Same user (for their own jobs)
                    client.userId === update.user_id ||
                        // Or subscribed to this specific job
                        (update.job_id && client.subscriptions.has(update.job_id)));
                if (shouldReceive) {
                    this.sendToClient(clientId, update);
                }
            }
        }
        catch (error) {
            logger.error('Failed to handle job update:', error);
        }
    }
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        try {
            client.ws.send(JSON.stringify(message));
        }
        catch (error) {
            logger.error(`Failed to send message to client ${clientId}:`, error);
            this.clients.delete(clientId);
        }
    }
    // Broadcast message to all clients in an organization
    broadcastToOrganization(organizationId, message) {
        for (const [clientId, client] of this.clients) {
            if (client.organizationId === organizationId) {
                this.sendToClient(clientId, message);
            }
        }
    }
    // Send message to specific user
    sendToUser(userId, organizationId, message) {
        for (const [clientId, client] of this.clients) {
            if (client.userId === userId && client.organizationId === organizationId) {
                this.sendToClient(clientId, message);
            }
        }
    }
    // Send job completion notification
    notifyJobComplete(jobId, userId, organizationId, result) {
        const message = {
            type: 'job_complete',
            job_id: jobId,
            user_id: userId,
            organization_id: organizationId,
            data: {
                status: 'completed',
                result_summary: {
                    total_rows: result.total_rows,
                    execution_time_ms: result.execution_time_ms,
                    result_location: result.result_location,
                },
            },
            timestamp: new Date().toISOString(),
        };
        this.sendToUser(userId, organizationId, message);
    }
    // Send job error notification
    notifyJobError(jobId, userId, organizationId, error) {
        const message = {
            type: 'job_error',
            job_id: jobId,
            user_id: userId,
            organization_id: organizationId,
            data: {
                status: 'failed',
                error_message: error,
            },
            timestamp: new Date().toISOString(),
        };
        this.sendToUser(userId, organizationId, message);
    }
    // Start heartbeat to check client connections
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const timeout = 30000; // 30 seconds
            for (const [clientId, client] of this.clients) {
                if (now - client.lastPing > timeout) {
                    logger.info(`Client ${clientId} timed out, closing connection`);
                    client.ws.terminate();
                    this.clients.delete(clientId);
                }
                else if (client.ws.readyState === WebSocket.OPEN) {
                    // Send ping
                    client.ws.ping();
                }
            }
        }, 15000); // Check every 15 seconds
    }
    // Get connection statistics
    getStats() {
        const stats = {
            connected_clients: this.clients.size,
            clients_by_org: {},
            total_subscriptions: 0,
        };
        for (const client of this.clients.values()) {
            stats.clients_by_org[client.organizationId] =
                (stats.clients_by_org[client.organizationId] || 0) + 1;
            stats.total_subscriptions += client.subscriptions.size;
        }
        return stats;
    }
    // Graceful shutdown
    async shutdown() {
        try {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            // Close all client connections
            for (const [clientId, client] of this.clients) {
                logger.info(`Closing WebSocket connection for client: ${clientId}`);
                client.ws.close(1001, 'Server shutting down');
            }
            this.clients.clear();
            // Close WebSocket server
            if (this.server) {
                this.server.close();
            }
            // Disconnect from Redis
            if (this.redis) {
                await this.redis.disconnect();
            }
            logger.info('WebSocket service shut down gracefully');
        }
        catch (error) {
            logger.error('Error during WebSocket service shutdown:', error);
        }
    }
}
//# sourceMappingURL=WebSocketService.js.map