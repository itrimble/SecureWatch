"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const knex_1 = __importDefault(require("knex"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const incident_response_types_1 = require("../types/incident-response.types");
class NotificationService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.templates = new Map();
        this.deliveryQueue = [];
        this.retryQueue = [];
        this.db = (0, knex_1.default)({
            client: config.database.type,
            connection: config.database.connection,
            useNullAsDefault: true
        });
        this.config = config.irConfig;
        this.initializeEmailTransporter();
        this.initializeTemplates();
        this.startDeliveryWorker();
        this.startRetryWorker();
    }
    async initialize() {
        logger_1.logger.info('Initializing Notification Service');
        await this.createTables();
        await this.loadTemplates();
        logger_1.logger.info('Notification Service initialized successfully');
    }
    async createTables() {
        // Notifications table
        if (!(await this.db.schema.hasTable('notifications'))) {
            await this.db.schema.createTable('notifications', (table) => {
                table.string('id').primary();
                table.string('type', 50).notNullable().index();
                table.string('title').notNullable();
                table.text('message').notNullable();
                table.string('recipient').notNullable().index();
                table.json('channels');
                table.string('priority', 20).notNullable();
                table.string('related_entity_id').notNullable();
                table.string('related_entity_type', 50).notNullable();
                table.string('status', 20).notNullable().index();
                table.dateTime('created_at').notNullable().index();
                table.dateTime('sent_at');
                table.dateTime('delivered_at');
                table.json('metadata');
                table.index(['recipient', 'status']);
                table.index(['type', 'status']);
                table.index(['related_entity_id', 'related_entity_type']);
            });
        }
        // Notification delivery attempts table
        if (!(await this.db.schema.hasTable('notification_delivery_attempts'))) {
            await this.db.schema.createTable('notification_delivery_attempts', (table) => {
                table.string('id').primary();
                table.string('notification_id').notNullable().index();
                table.string('channel', 20).notNullable();
                table.string('status', 20).notNullable();
                table.integer('attempt').notNullable();
                table.dateTime('timestamp').notNullable().index();
                table.text('error');
                table.json('metadata');
                table.foreign('notification_id').references('notifications.id').onDelete('CASCADE');
                table.index(['notification_id', 'channel']);
                table.index(['status', 'timestamp']);
            });
        }
        // Notification templates table
        if (!(await this.db.schema.hasTable('notification_templates'))) {
            await this.db.schema.createTable('notification_templates', (table) => {
                table.string('id').primary();
                table.string('name').notNullable();
                table.string('type', 50).notNullable().index();
                table.json('channels');
                table.string('subject').notNullable();
                table.text('message').notNullable();
                table.json('variables');
                table.boolean('enabled').defaultTo(true);
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.json('metadata');
                table.index(['type', 'enabled']);
            });
        }
        // User notification preferences table
        if (!(await this.db.schema.hasTable('user_notification_preferences'))) {
            await this.db.schema.createTable('user_notification_preferences', (table) => {
                table.string('id').primary();
                table.string('user_id').notNullable().index();
                table.string('notification_type', 50).notNullable();
                table.json('enabled_channels');
                table.string('priority_threshold', 20).defaultTo('low');
                table.boolean('quiet_hours_enabled').defaultTo(false);
                table.time('quiet_hours_start');
                table.time('quiet_hours_end');
                table.json('metadata');
                table.unique(['user_id', 'notification_type']);
            });
        }
    }
    initializeEmailTransporter() {
        if (this.config.notifications.emailConfig) {
            const emailConfig = this.config.notifications.emailConfig;
            this.emailTransporter = nodemailer_1.default.createTransporter({
                host: emailConfig.smtpHost,
                port: emailConfig.smtpPort,
                secure: emailConfig.smtpPort === 465,
                auth: {
                    user: emailConfig.username,
                    pass: emailConfig.password
                }
            });
            logger_1.logger.info('Email transporter initialized');
        }
    }
    initializeTemplates() {
        // Case-related templates
        this.templates.set('case-created', {
            id: 'case-created',
            name: 'Case Created',
            type: 'case-created',
            channels: ['email', 'slack'],
            subject: 'New Security Case Created: {{caseTitle}}',
            message: `A new security case has been created:

Title: {{caseTitle}}
Severity: {{caseSeverity}}
Priority: {{casePriority}}
Reporter: {{reporter}}
Created: {{createdAt}}

Description:
{{caseDescription}}

Case ID: {{caseId}}
View Case: {{caseUrl}}`,
            variables: ['caseTitle', 'caseSeverity', 'casePriority', 'reporter', 'createdAt', 'caseDescription', 'caseId', 'caseUrl'],
            enabled: true
        });
        this.templates.set('case-assigned', {
            id: 'case-assigned',
            name: 'Case Assigned',
            type: 'case-assigned',
            channels: ['email', 'slack'],
            subject: 'Case Assigned to You: {{caseTitle}}',
            message: `A security case has been assigned to you:

Title: {{caseTitle}}
Severity: {{caseSeverity}}
Priority: {{casePriority}}
Assigned by: {{assignedBy}}
Due Date: {{dueDate}}

Please review and begin investigation.

Case ID: {{caseId}}
View Case: {{caseUrl}}`,
            variables: ['caseTitle', 'caseSeverity', 'casePriority', 'assignedBy', 'dueDate', 'caseId', 'caseUrl'],
            enabled: true
        });
        this.templates.set('escalation', {
            id: 'escalation',
            name: 'Case Escalation',
            type: 'escalation',
            channels: ['email', 'sms', 'slack'],
            subject: 'URGENT: Case Escalation Required - {{caseTitle}}',
            message: `URGENT: A security case requires immediate attention:

Title: {{caseTitle}}
Severity: {{caseSeverity}}
Priority: {{casePriority}}
Escalation Reason: {{escalationReason}}
Original Assignee: {{originalAssignee}}

Time Since Creation: {{timeElapsed}}
SLA Breach: {{slaStatus}}

Immediate action required.

Case ID: {{caseId}}
View Case: {{caseUrl}}`,
            variables: ['caseTitle', 'caseSeverity', 'casePriority', 'escalationReason', 'originalAssignee', 'timeElapsed', 'slaStatus', 'caseId', 'caseUrl'],
            enabled: true
        });
        this.templates.set('evidence-added', {
            id: 'evidence-added',
            name: 'Evidence Added',
            type: 'evidence-added',
            channels: ['email'],
            subject: 'Evidence Added to Case: {{caseTitle}}',
            message: `New evidence has been added to case:

Case: {{caseTitle}}
Evidence: {{evidenceName}}
Type: {{evidenceType}}
Added by: {{addedBy}}
Added at: {{addedAt}}

Description: {{evidenceDescription}}

Case ID: {{caseId}}
Evidence ID: {{evidenceId}}
View Case: {{caseUrl}}`,
            variables: ['caseTitle', 'evidenceName', 'evidenceType', 'addedBy', 'addedAt', 'evidenceDescription', 'caseId', 'evidenceId', 'caseUrl'],
            enabled: true
        });
        this.templates.set('approval-required', {
            id: 'approval-required',
            name: 'Approval Required',
            type: 'approval-required',
            channels: ['email', 'slack'],
            subject: 'Approval Required: {{playbookName}}',
            message: `A playbook execution requires your approval:

Playbook: {{playbookName}}
Triggered by: {{triggeredBy}}
Case: {{caseTitle}}
Reason: {{reason}}

Please review and approve/reject:
{{approvalUrl}}

Execution ID: {{executionId}}`,
            variables: ['playbookName', 'triggeredBy', 'caseTitle', 'reason', 'approvalUrl', 'executionId'],
            enabled: true
        });
    }
    // Notification Creation and Sending
    async sendNotification(notificationData) {
        const notification = {
            id: (0, uuid_1.v4)(),
            createdAt: new Date(),
            status: 'pending',
            ...notificationData
        };
        const validatedNotification = incident_response_types_1.NotificationSchema.parse(notification);
        // Check user preferences
        const userPreferences = await this.getUserPreferences(validatedNotification.recipient, validatedNotification.type);
        if (userPreferences) {
            // Filter channels based on user preferences
            validatedNotification.channels = validatedNotification.channels.filter(channel => userPreferences.enabledChannels.includes(channel));
            // Check priority threshold
            const priorityLevels = { p4: 1, p3: 2, p2: 3, p1: 4 };
            const notificationPriority = priorityLevels[validatedNotification.priority] || 1;
            const thresholdPriority = priorityLevels[userPreferences.priorityThreshold] || 1;
            if (notificationPriority < thresholdPriority) {
                logger_1.logger.debug(`Notification ${validatedNotification.id} below priority threshold for user ${validatedNotification.recipient}`);
                return validatedNotification;
            }
            // Check quiet hours
            if (userPreferences.quietHoursEnabled && this.isQuietHours(userPreferences)) {
                // Delay notification until after quiet hours (unless critical)
                if (validatedNotification.priority !== 'p1') {
                    logger_1.logger.debug(`Notification ${validatedNotification.id} delayed due to quiet hours`);
                    // In production, this would schedule the notification
                    return validatedNotification;
                }
            }
        }
        // Save to database
        await this.db('notifications').insert({
            id: validatedNotification.id,
            type: validatedNotification.type,
            title: validatedNotification.title,
            message: validatedNotification.message,
            recipient: validatedNotification.recipient,
            channels: JSON.stringify(validatedNotification.channels),
            priority: validatedNotification.priority,
            related_entity_id: validatedNotification.relatedEntityId,
            related_entity_type: validatedNotification.relatedEntityType,
            status: validatedNotification.status,
            created_at: validatedNotification.createdAt,
            sent_at: validatedNotification.sentAt,
            delivered_at: validatedNotification.deliveredAt,
            metadata: JSON.stringify(validatedNotification.metadata)
        });
        // Add to delivery queue
        this.deliveryQueue.push(validatedNotification);
        this.emit('notification-created', { notificationId: validatedNotification.id, notification: validatedNotification });
        logger_1.logger.info(`Created notification ${validatedNotification.id} for ${validatedNotification.recipient}`);
        return validatedNotification;
    }
    async sendNotificationFromTemplate(templateId, recipient, variables, options) {
        const template = this.templates.get(templateId);
        if (!template || !template.enabled) {
            throw new Error(`Template ${templateId} not found or disabled`);
        }
        // Replace variables in subject and message
        const subject = this.replaceVariables(template.subject, variables);
        const message = this.replaceVariables(template.message, variables);
        return this.sendNotification({
            type: template.type,
            title: subject,
            message,
            recipient,
            channels: options?.channels || template.channels,
            priority: options?.priority || 'p3',
            relatedEntityId: options?.relatedEntityId || '',
            relatedEntityType: options?.relatedEntityType || 'case',
            metadata: { templateId, variables }
        });
    }
    replaceVariables(text, variables) {
        let result = text;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            result = result.replace(new RegExp(placeholder, 'g'), String(value));
        }
        return result;
    }
    // Delivery Workers
    startDeliveryWorker() {
        setInterval(async () => {
            if (this.deliveryQueue.length > 0) {
                const notification = this.deliveryQueue.shift();
                await this.processNotification(notification);
            }
        }, 1000); // Process every second
    }
    startRetryWorker() {
        setInterval(async () => {
            if (this.retryQueue.length > 0) {
                const attempt = this.retryQueue.shift();
                await this.retryDelivery(attempt);
            }
        }, 30000); // Retry every 30 seconds
    }
    async processNotification(notification) {
        logger_1.logger.debug(`Processing notification ${notification.id}`);
        let allSucceeded = true;
        const deliveryResults = [];
        for (const channel of notification.channels) {
            try {
                const result = await this.deliverToChannel(notification, channel);
                deliveryResults.push(result);
                if (!result.success) {
                    allSucceeded = false;
                    // Add to retry queue if retryable
                    if (result.retryable && result.attempt < 3) {
                        this.retryQueue.push({
                            id: (0, uuid_1.v4)(),
                            notificationId: notification.id,
                            channel,
                            status: 'failed',
                            attempt: result.attempt + 1,
                            timestamp: new Date(),
                            error: result.error,
                            metadata: result.metadata
                        });
                    }
                }
            }
            catch (error) {
                logger_1.logger.error(`Failed to deliver notification ${notification.id} to ${channel}:`, error);
                allSucceeded = false;
            }
        }
        // Update notification status
        const newStatus = allSucceeded ? 'sent' : 'failed';
        await this.updateNotificationStatus(notification.id, newStatus);
        this.emit('notification-processed', {
            notificationId: notification.id,
            status: newStatus,
            deliveryResults
        });
    }
    async deliverToChannel(notification, channel) {
        const attempt = {
            id: (0, uuid_1.v4)(),
            notificationId: notification.id,
            channel,
            status: 'pending',
            attempt: 1,
            timestamp: new Date()
        };
        try {
            let result;
            switch (channel) {
                case 'email':
                    result = await this.sendEmail(notification);
                    break;
                case 'sms':
                    result = await this.sendSMS(notification);
                    break;
                case 'slack':
                    result = await this.sendSlack(notification);
                    break;
                case 'teams':
                    result = await this.sendTeams(notification);
                    break;
                case 'webhook':
                    result = await this.sendWebhook(notification);
                    break;
                case 'pagerduty':
                    result = await this.sendPagerDuty(notification);
                    break;
                default:
                    throw new Error(`Unsupported channel: ${channel}`);
            }
            attempt.status = result.success ? 'sent' : 'failed';
            if (result.error) {
                attempt.error = result.error;
            }
            await this.recordDeliveryAttempt(attempt);
            return result;
        }
        catch (error) {
            attempt.status = 'failed';
            attempt.error = error.message;
            await this.recordDeliveryAttempt(attempt);
            return {
                success: false,
                error: error.message,
                retryable: true,
                attempt: 1
            };
        }
    }
    // Channel-specific delivery methods
    async sendEmail(notification) {
        if (!this.emailTransporter) {
            throw new Error('Email transporter not configured');
        }
        const mailOptions = {
            from: this.config.notifications.emailConfig.fromAddress,
            to: notification.recipient,
            subject: notification.title,
            text: notification.message,
            html: this.formatEmailHTML(notification)
        };
        try {
            const info = await this.emailTransporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: info.messageId,
                attempt: 1
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
                retryable: true,
                attempt: 1
            };
        }
    }
    formatEmailHTML(notification) {
        return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px;">
              ${notification.title}
            </h2>
            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #2c5aa0; margin: 20px 0;">
              <strong>Priority:</strong> ${notification.priority.toUpperCase()}<br>
              <strong>Type:</strong> ${notification.type}<br>
              <strong>Created:</strong> ${notification.createdAt.toLocaleString()}
            </div>
            <div style="white-space: pre-line; padding: 15px 0;">
              ${notification.message}
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              This notification was sent by SecureWatch Incident Response System.<br>
              Notification ID: ${notification.id}
            </p>
          </div>
        </body>
      </html>
    `;
    }
    async sendSMS(notification) {
        if (!this.config.notifications.smsConfig) {
            throw new Error('SMS configuration not found');
        }
        // Mock SMS sending - in production, integrate with Twilio, AWS SNS, etc.
        logger_1.logger.info(`Sending SMS to ${notification.recipient}: ${notification.message}`);
        return {
            success: true,
            messageId: `sms_${Date.now()}`,
            attempt: 1
        };
    }
    async sendSlack(notification) {
        if (!this.config.notifications.slackConfig) {
            throw new Error('Slack configuration not found');
        }
        const slackMessage = {
            channel: this.config.notifications.slackConfig.defaultChannel,
            text: notification.title,
            attachments: [{
                    color: this.getSlackColor(notification.priority),
                    fields: [
                        {
                            title: 'Priority',
                            value: notification.priority.toUpperCase(),
                            short: true
                        },
                        {
                            title: 'Type',
                            value: notification.type,
                            short: true
                        }
                    ],
                    text: notification.message,
                    footer: 'SecureWatch',
                    ts: Math.floor(notification.createdAt.getTime() / 1000)
                }]
        };
        try {
            const response = await axios_1.default.post('https://slack.com/api/chat.postMessage', slackMessage, {
                headers: {
                    'Authorization': `Bearer ${this.config.notifications.slackConfig.botToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return {
                success: response.data.ok,
                messageId: response.data.ts,
                error: response.data.error,
                attempt: 1
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
                retryable: true,
                attempt: 1
            };
        }
    }
    getSlackColor(priority) {
        switch (priority) {
            case 'p1': return 'danger';
            case 'p2': return 'warning';
            case 'p3': return 'good';
            case 'p4': return '#36a64f';
            default: return '#36a64f';
        }
    }
    async sendTeams(notification) {
        if (!this.config.notifications.teamsConfig) {
            throw new Error('Teams configuration not found');
        }
        const teamsMessage = {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: notification.title,
            themeColor: this.getTeamsColor(notification.priority),
            sections: [{
                    activityTitle: notification.title,
                    activitySubtitle: `Priority: ${notification.priority.toUpperCase()} | Type: ${notification.type}`,
                    text: notification.message,
                    facts: [
                        {
                            name: 'Notification ID',
                            value: notification.id
                        },
                        {
                            name: 'Created',
                            value: notification.createdAt.toISOString()
                        }
                    ]
                }]
        };
        try {
            const response = await axios_1.default.post(this.config.notifications.teamsConfig.webhookUrl, teamsMessage);
            return {
                success: response.status === 200,
                messageId: `teams_${Date.now()}`,
                attempt: 1
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
                retryable: true,
                attempt: 1
            };
        }
    }
    getTeamsColor(priority) {
        switch (priority) {
            case 'p1': return 'FF0000';
            case 'p2': return 'FFA500';
            case 'p3': return '00FF00';
            case 'p4': return '0078D4';
            default: return '0078D4';
        }
    }
    async sendWebhook(notification) {
        // Generic webhook sender
        const webhookUrl = notification.metadata?.webhookUrl || this.config.notificationWebhook;
        if (!webhookUrl) {
            throw new Error('Webhook URL not configured');
        }
        const payload = {
            notificationId: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            recipient: notification.recipient,
            priority: notification.priority,
            timestamp: notification.createdAt.toISOString(),
            metadata: notification.metadata
        };
        try {
            const response = await axios_1.default.post(webhookUrl, payload, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SecureWatch-Notifications/1.0'
                }
            });
            return {
                success: response.status >= 200 && response.status < 300,
                messageId: `webhook_${Date.now()}`,
                attempt: 1
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
                retryable: true,
                attempt: 1
            };
        }
    }
    async sendPagerDuty(notification) {
        // Mock PagerDuty integration
        logger_1.logger.info(`Sending PagerDuty alert for ${notification.recipient}: ${notification.title}`);
        return {
            success: true,
            messageId: `pd_${Date.now()}`,
            attempt: 1
        };
    }
    // Helper Methods
    async recordDeliveryAttempt(attempt) {
        await this.db('notification_delivery_attempts').insert({
            id: attempt.id,
            notification_id: attempt.notificationId,
            channel: attempt.channel,
            status: attempt.status,
            attempt: attempt.attempt,
            timestamp: attempt.timestamp,
            error: attempt.error,
            metadata: JSON.stringify(attempt.metadata || {})
        });
    }
    async updateNotificationStatus(notificationId, status) {
        const updateData = { status };
        if (status === 'sent') {
            updateData.sent_at = new Date();
        }
        else if (status === 'delivered') {
            updateData.delivered_at = new Date();
        }
        await this.db('notifications')
            .where('id', notificationId)
            .update(updateData);
    }
    async retryDelivery(attempt) {
        const notification = await this.getNotification(attempt.notificationId);
        if (!notification)
            return;
        logger_1.logger.info(`Retrying delivery for notification ${attempt.notificationId}, attempt ${attempt.attempt}`);
        try {
            const result = await this.deliverToChannel(notification, attempt.channel);
            if (!result.success && result.retryable && attempt.attempt < 3) {
                this.retryQueue.push({
                    ...attempt,
                    attempt: attempt.attempt + 1,
                    timestamp: new Date()
                });
            }
        }
        catch (error) {
            logger_1.logger.error(`Retry failed for notification ${attempt.notificationId}:`, error);
        }
    }
    async getUserPreferences(userId, notificationType) {
        const prefs = await this.db('user_notification_preferences')
            .where({ user_id: userId, notification_type: notificationType })
            .first();
        return prefs ? {
            enabledChannels: JSON.parse(prefs.enabled_channels),
            priorityThreshold: prefs.priority_threshold,
            quietHoursEnabled: prefs.quiet_hours_enabled,
            quietHoursStart: prefs.quiet_hours_start,
            quietHoursEnd: prefs.quiet_hours_end
        } : null;
    }
    isQuietHours(preferences) {
        if (!preferences.quietHoursEnabled)
            return false;
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const startTime = this.timeToMinutes(preferences.quietHoursStart);
        const endTime = this.timeToMinutes(preferences.quietHoursEnd);
        if (startTime <= endTime) {
            return currentTime >= startTime && currentTime <= endTime;
        }
        else {
            // Quiet hours span midnight
            return currentTime >= startTime || currentTime <= endTime;
        }
    }
    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }
    // Public API Methods
    async getNotification(notificationId) {
        const row = await this.db('notifications').where('id', notificationId).first();
        if (!row)
            return null;
        return {
            id: row.id,
            type: row.type,
            title: row.title,
            message: row.message,
            recipient: row.recipient,
            channels: JSON.parse(row.channels),
            priority: row.priority,
            relatedEntityId: row.related_entity_id,
            relatedEntityType: row.related_entity_type,
            status: row.status,
            createdAt: new Date(row.created_at),
            sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
            deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    async getUserNotifications(userId, options) {
        let query = this.db('notifications').where('recipient', userId);
        if (options?.status) {
            query = query.where('status', options.status);
        }
        if (options?.type) {
            query = query.where('type', options.type);
        }
        // Get total count
        const totalQuery = query.clone();
        const totalResult = await totalQuery.count('* as count').first();
        const total = totalResult?.count || 0;
        // Apply pagination
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        if (options?.offset) {
            query = query.offset(options.offset);
        }
        const rows = await query.orderBy('created_at', 'desc');
        const notifications = rows.map(row => ({
            id: row.id,
            type: row.type,
            title: row.title,
            message: row.message,
            recipient: row.recipient,
            channels: JSON.parse(row.channels),
            priority: row.priority,
            relatedEntityId: row.related_entity_id,
            relatedEntityType: row.related_entity_type,
            status: row.status,
            createdAt: new Date(row.created_at),
            sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
            deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
            metadata: JSON.parse(row.metadata || '{}')
        }));
        return { notifications, total };
    }
    async updateUserPreferences(userId, preferences) {
        const existing = await this.db('user_notification_preferences')
            .where({ user_id: userId, notification_type: preferences.notificationType })
            .first();
        const data = {
            user_id: userId,
            notification_type: preferences.notificationType,
            enabled_channels: JSON.stringify(preferences.enabledChannels),
            priority_threshold: preferences.priorityThreshold,
            quiet_hours_enabled: preferences.quietHoursEnabled,
            quiet_hours_start: preferences.quietHoursStart,
            quiet_hours_end: preferences.quietHoursEnd,
            metadata: JSON.stringify(preferences.metadata || {})
        };
        if (existing) {
            await this.db('user_notification_preferences')
                .where({ user_id: userId, notification_type: preferences.notificationType })
                .update(data);
        }
        else {
            await this.db('user_notification_preferences').insert({
                id: (0, uuid_1.v4)(),
                ...data
            });
        }
    }
    async getNotificationStatistics() {
        const stats = await this.db('notifications')
            .select(this.db.raw('COUNT(*) as total'), this.db.raw('COUNT(CASE WHEN status = "sent" THEN 1 END) as sent'), this.db.raw('COUNT(CASE WHEN status = "delivered" THEN 1 END) as delivered'), this.db.raw('COUNT(CASE WHEN status = "failed" THEN 1 END) as failed'), this.db.raw('COUNT(CASE WHEN status = "pending" THEN 1 END) as pending'))
            .first();
        const recentActivity = await this.db('notifications')
            .where('created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
            .count('* as count')
            .first();
        return {
            total: stats.total,
            sent: stats.sent,
            delivered: stats.delivered,
            failed: stats.failed,
            pending: stats.pending,
            recentActivity: recentActivity?.count || 0,
            deliveryRate: stats.total > 0 ? (stats.sent / stats.total) * 100 : 0
        };
    }
    async loadTemplates() {
        const dbTemplates = await this.db('notification_templates').where('enabled', true);
        for (const row of dbTemplates) {
            this.templates.set(row.id, {
                id: row.id,
                name: row.name,
                type: row.type,
                channels: JSON.parse(row.channels),
                subject: row.subject,
                message: row.message,
                variables: JSON.parse(row.variables),
                enabled: row.enabled
            });
        }
        logger_1.logger.info(`Loaded ${this.templates.size} notification templates`);
    }
    async shutdown() {
        logger_1.logger.info('Shutting down Notification Service');
        // Process remaining notifications in queue
        while (this.deliveryQueue.length > 0) {
            const notification = this.deliveryQueue.shift();
            await this.processNotification(notification);
        }
        await this.db.destroy();
        logger_1.logger.info('Notification Service shutdown complete');
    }
}
exports.NotificationService = NotificationService;
