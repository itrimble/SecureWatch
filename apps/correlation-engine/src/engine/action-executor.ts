import { Pool } from 'pg';
import axios from 'axios';
import { logger } from '../utils/logger';
import { CorrelationRule, CorrelationIncident, LogEvent } from '../types';

export interface Action {
  id: string;
  type: string;
  config: any;
  enabled: boolean;
}

export class ActionExecutor {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    logger.info('Action executor initialized');
  }

  async executeActions(
    rule: CorrelationRule, 
    incident: CorrelationIncident, 
    event: LogEvent
  ): Promise<void> {
    try {
      // Get configured actions for this rule
      const actions = await this.getRuleActions(rule.id);

      for (const action of actions) {
        if (!action.enabled) continue;

        try {
          await this.executeAction(action, rule, incident, event);
          await this.logActionExecution(action.id, incident.id, 'success');
        } catch (error) {
          logger.error('Action execution failed:', {
            actionId: action.id,
            actionType: action.type,
            incidentId: incident.id,
            error: error.message
          });
          await this.logActionExecution(action.id, incident.id, 'failure', error.message);
        }
      }

    } catch (error) {
      logger.error('Error executing actions:', error);
    }
  }

  private async executeAction(
    action: Action,
    rule: CorrelationRule,
    incident: CorrelationIncident,
    event: LogEvent
  ): Promise<void> {
    switch (action.type) {
      case 'email_notification':
        await this.sendEmailNotification(action, rule, incident, event);
        break;

      case 'webhook':
        await this.executeWebhook(action, rule, incident, event);
        break;

      case 'slack_notification':
        await this.sendSlackNotification(action, rule, incident, event);
        break;

      case 'create_ticket':
        await this.createTicket(action, rule, incident, event);
        break;

      case 'isolate_host':
        await this.isolateHost(action, rule, incident, event);
        break;

      case 'block_ip':
        await this.blockIpAddress(action, rule, incident, event);
        break;

      case 'disable_user':
        await this.disableUser(action, rule, incident, event);
        break;

      default:
        logger.warn('Unknown action type:', action.type);
    }
  }

  private async sendEmailNotification(
    action: Action,
    rule: CorrelationRule,
    incident: CorrelationIncident,
    event: LogEvent
  ): Promise<void> {
    const emailConfig = action.config;
    
    const subject = `SecureWatch Alert: ${incident.title}`;
    const body = this.generateEmailBody(rule, incident, event);

    // TODO: Implement actual email sending
    logger.info('Email notification sent:', {
      to: emailConfig.recipients,
      subject,
      incidentId: incident.id
    });
  }

  private async executeWebhook(
    action: Action,
    rule: CorrelationRule,
    incident: CorrelationIncident,
    event: LogEvent
  ): Promise<void> {
    const webhookConfig = action.config;
    
    const payload = {
      event_type: 'security_incident',
      incident: {
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        type: incident.incident_type,
        status: incident.status,
        created_at: incident.created_at,
        event_count: incident.event_count,
        affected_assets: incident.affected_assets
      },
      rule: {
        id: rule.id,
        name: rule.name,
        description: rule.description
      },
      triggering_event: {
        id: event.id,
        timestamp: event.timestamp,
        source: event.source,
        event_id: event.event_id,
        message: event.message
      }
    };

    const response = await axios.post(webhookConfig.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SecureWatch-SIEM/1.0',
        ...webhookConfig.headers
      },
      timeout: 10000
    });

    logger.info('Webhook executed successfully:', {
      url: webhookConfig.url,
      status: response.status,
      incidentId: incident.id
    });
  }

  private async sendSlackNotification(
    action: Action,
    rule: CorrelationRule,
    incident: CorrelationIncident,
    event: LogEvent
  ): Promise<void> {
    const slackConfig = action.config;
    
    const message = {
      text: `🚨 Security Alert: ${incident.title}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Incident:* ${incident.title}\n*Severity:* ${incident.severity.toUpperCase()}\n*Type:* ${incident.incident_type}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Description:* ${incident.description}\n*Event Count:* ${incident.event_count}\n*First Seen:* ${incident.first_seen}`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Rule: ${rule.name} | Incident ID: ${incident.id}`
            }
          ]
        }
      ]
    };

    await axios.post(slackConfig.webhook_url, message, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    logger.info('Slack notification sent:', {
      channel: slackConfig.channel,
      incidentId: incident.id
    });
  }

  private async createTicket(
    action: Action,
    rule: CorrelationRule,
    incident: CorrelationIncident,
    event: LogEvent
  ): Promise<void> {
    const ticketConfig = action.config;
    
    const ticket = {
      title: incident.title,
      description: incident.description,
      priority: this.mapSeverityToPriority(incident.severity),
      category: incident.incident_type,
      source: 'SecureWatch SIEM',
      metadata: {
        incident_id: incident.id,
        rule_id: rule.id,
        event_count: incident.event_count,
        affected_assets: incident.affected_assets
      }
    };

    // TODO: Implement actual ticket creation based on ticketing system
    logger.info('Ticket created:', {
      system: ticketConfig.system,
      title: ticket.title,
      priority: ticket.priority,
      incidentId: incident.id
    });
  }

  private async isolateHost(
    action: Action,
    rule: CorrelationRule,
    incident: CorrelationIncident,
    event: LogEvent
  ): Promise<void> {
    const isolationConfig = action.config;
    const hostName = event.computer_name || event.hostname;
    
    if (!hostName) {
      throw new Error('No hostname available for isolation');
    }

    // TODO: Implement actual host isolation
    logger.info('Host isolation initiated:', {
      hostname: hostName,
      incidentId: incident.id,
      method: isolationConfig.method
    });
  }

  private async blockIpAddress(
    action: Action,
    rule: CorrelationRule,
    incident: CorrelationIncident,
    event: LogEvent
  ): Promise<void> {
    const blockConfig = action.config;
    const ipAddress = event.source_ip || event.ip_address;
    
    if (!ipAddress) {
      throw new Error('No IP address available for blocking');
    }

    // TODO: Implement actual IP blocking
    logger.info('IP address blocked:', {
      ip: ipAddress,
      incidentId: incident.id,
      firewall: blockConfig.firewall_endpoint
    });
  }

  private async disableUser(
    action: Action,
    rule: CorrelationRule,
    incident: CorrelationIncident,
    event: LogEvent
  ): Promise<void> {
    const userConfig = action.config;
    const userName = event.user_name;
    
    if (!userName) {
      throw new Error('No username available for disabling');
    }

    // TODO: Implement actual user disabling
    logger.info('User account disabled:', {
      username: userName,
      incidentId: incident.id,
      directory: userConfig.directory_service
    });
  }

  private async getRuleActions(ruleId: string): Promise<Action[]> {
    try {
      const query = `
        SELECT a.* FROM actions a
        JOIN rule_actions ra ON a.id = ra.action_id
        WHERE ra.rule_id = $1 AND a.enabled = true
        ORDER BY ra.execution_order
      `;
      
      const result = await this.db.query(query, [ruleId]);
      return result.rows as Action[];

    } catch (error) {
      logger.error('Error getting rule actions:', error);
      return [];
    }
  }

  private async logActionExecution(
    actionId: string,
    incidentId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO action_executions (
          action_id, incident_id, status, error_message, executed_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `;
      
      await this.db.query(query, [actionId, incidentId, status, errorMessage || null]);

    } catch (error) {
      logger.error('Error logging action execution:', error);
    }
  }

  private generateEmailBody(
    rule: CorrelationRule,
    incident: CorrelationIncident,
    event: LogEvent
  ): string {
    return `
Security Incident Alert

Incident ID: ${incident.id}
Title: ${incident.title}
Severity: ${incident.severity.toUpperCase()}
Type: ${incident.incident_type}
Status: ${incident.status}

Description:
${incident.description}

Rule Information:
- Name: ${rule.name}
- Description: ${rule.description}

Incident Details:
- First Seen: ${incident.first_seen}
- Last Seen: ${incident.last_seen}
- Event Count: ${incident.event_count}
- Affected Assets: ${incident.affected_assets.join(', ')}

Triggering Event:
- Event ID: ${event.event_id}
- Source: ${event.source}
- Timestamp: ${event.timestamp}
- Message: ${event.message}

This alert was generated by SecureWatch SIEM.
    `.trim();
  }

  private mapSeverityToPriority(severity: string): string {
    const mapping: Record<string, string> = {
      'critical': 'P1',
      'high': 'P2',
      'medium': 'P3',
      'low': 'P4'
    };
    
    return mapping[severity.toLowerCase()] || 'P3';
  }
}