import { EventEmitter } from 'events';
import { Notification, NotificationChannel, DatabaseConfig, IRConfig } from '../types/incident-response.types';
export declare class NotificationService extends EventEmitter {
    private db;
    private config;
    private emailTransporter?;
    private templates;
    private deliveryQueue;
    private retryQueue;
    constructor(config: {
        database: DatabaseConfig;
        irConfig: IRConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private initializeEmailTransporter;
    private initializeTemplates;
    sendNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'status'>): Promise<Notification>;
    sendNotificationFromTemplate(templateId: string, recipient: string, variables: Record<string, any>, options?: {
        priority?: string;
        channels?: NotificationChannel[];
        relatedEntityId?: string;
        relatedEntityType?: string;
    }): Promise<Notification>;
    private replaceVariables;
    private startDeliveryWorker;
    private startRetryWorker;
    private processNotification;
    private deliverToChannel;
    private sendEmail;
    private formatEmailHTML;
    private sendSMS;
    private sendSlack;
    private getSlackColor;
    private sendTeams;
    private getTeamsColor;
    private sendWebhook;
    private sendPagerDuty;
    private recordDeliveryAttempt;
    private updateNotificationStatus;
    private retryDelivery;
    private getUserPreferences;
    private isQuietHours;
    private timeToMinutes;
    getNotification(notificationId: string): Promise<Notification | null>;
    getUserNotifications(userId: string, options?: {
        limit?: number;
        offset?: number;
        status?: string;
        type?: string;
    }): Promise<{
        notifications: Notification[];
        total: number;
    }>;
    updateUserPreferences(userId: string, preferences: any): Promise<void>;
    getNotificationStatistics(): Promise<any>;
    private loadTemplates;
    shutdown(): Promise<void>;
}
