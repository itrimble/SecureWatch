// @ts-nocheck
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { LogEvent } from '../types';

export interface PatternMatch {
  id: string;
  name: string;
  pattern_type: string;
  severity: string;
  description: string;
  matched_events: LogEvent[];
  relevance_score: number;
}

export class PatternMatcher {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    logger.info('Pattern matcher initialized');
  }

  async findMatches(event: LogEvent, eventBuffer: Map<string, LogEvent[]>): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    try {
      // Check for common attack patterns
      
      // 1. Brute force authentication attempts
      const bruteForceMatch = await this.checkBruteForcePattern(event, eventBuffer);
      if (bruteForceMatch) {
        matches.push(bruteForceMatch);
      }

      // 2. Privilege escalation attempts
      const privEscMatch = await this.checkPrivilegeEscalationPattern(event, eventBuffer);
      if (privEscMatch) {
        matches.push(privEscMatch);
      }

      // 3. Lateral movement indicators
      const lateralMovementMatch = await this.checkLateralMovementPattern(event, eventBuffer);
      if (lateralMovementMatch) {
        matches.push(lateralMovementMatch);
      }

      // 4. Data exfiltration patterns
      const dataExfilMatch = await this.checkDataExfiltrationPattern(event, eventBuffer);
      if (dataExfilMatch) {
        matches.push(dataExfilMatch);
      }

    } catch (error) {
      logger.error('Error finding pattern matches:', error);
    }

    return matches;
  }

  private async checkBruteForcePattern(event: LogEvent, eventBuffer: Map<string, LogEvent[]>): Promise<PatternMatch | null> {
    // Look for multiple failed login attempts from same source
    if (event.event_id === '4625' || (event.auth_result === 'failure')) {
      const sourceIp = event.source_ip || event.ip_address;
      if (!sourceIp) return null;

      // Count failed login attempts in last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      let failedAttempts = 0;
      const relatedEvents: LogEvent[] = [];

      for (const events of eventBuffer.values()) {
        for (const bufferedEvent of events) {
          if (new Date(bufferedEvent.timestamp) > tenMinutesAgo &&
              (bufferedEvent.source_ip === sourceIp || bufferedEvent.ip_address === sourceIp) &&
              (bufferedEvent.event_id === '4625' || bufferedEvent.auth_result === 'failure')) {
            failedAttempts++;
            relatedEvents.push(bufferedEvent);
          }
        }
      }

      if (failedAttempts >= 5) {
        return {
          id: `brute-force-${sourceIp}-${Date.now()}`,
          name: 'Brute Force Authentication Attack',
          pattern_type: 'authentication',
          severity: 'high',
          description: `Multiple failed login attempts detected from IP ${sourceIp}`,
          matched_events: relatedEvents,
          relevance_score: Math.min(failedAttempts / 10, 1.0)
        };
      }
    }

    return null;
  }

  private async checkPrivilegeEscalationPattern(event: LogEvent, eventBuffer: Map<string, LogEvent[]>): Promise<PatternMatch | null> {
    // Look for admin/privilege elevation events
    const privEvents = ['4672', '4673', '4648', '592'];
    
    if (privEvents.includes(event.event_id || '') || 
        event.message?.toLowerCase().includes('administrator') ||
        event.user_name?.toLowerCase().includes('admin')) {
      
      const userName = event.user_name;
      if (!userName) return null;

      // Look for recent unusual activity from this user
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const relatedEvents: LogEvent[] = [event];
      
      for (const events of eventBuffer.values()) {
        for (const bufferedEvent of events) {
          if (new Date(bufferedEvent.timestamp) > oneHourAgo &&
              bufferedEvent.user_name === userName &&
              (privEvents.includes(bufferedEvent.event_id || '') || 
               bufferedEvent.message?.toLowerCase().includes('administrator'))) {
            relatedEvents.push(bufferedEvent);
          }
        }
      }

      if (relatedEvents.length >= 3) {
        return {
          id: `priv-esc-${userName}-${Date.now()}`,
          name: 'Privilege Escalation Attempt',
          pattern_type: 'privilege_escalation',
          severity: 'high',
          description: `Privilege escalation activity detected for user ${userName}`,
          matched_events: relatedEvents,
          relevance_score: Math.min(relatedEvents.length / 5, 1.0)
        };
      }
    }

    return null;
  }

  private async checkLateralMovementPattern(event: LogEvent, eventBuffer: Map<string, LogEvent[]>): Promise<PatternMatch | null> {
    // Look for network logon events or remote access
    const lateralEvents = ['4624', '4648', '528', '540'];
    
    if (lateralEvents.includes(event.event_id || '') && event.logon_type === '3') {
      const sourceIp = event.source_ip || event.ip_address;
      const userName = event.user_name;
      
      if (!sourceIp || !userName) return null;

      // Look for multiple hosts accessed by same user/IP
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const targetHosts = new Set<string>();
      const relatedEvents: LogEvent[] = [event];

      for (const events of eventBuffer.values()) {
        for (const bufferedEvent of events) {
          if (new Date(bufferedEvent.timestamp) > thirtyMinutesAgo &&
              (bufferedEvent.source_ip === sourceIp || bufferedEvent.ip_address === sourceIp) &&
              bufferedEvent.user_name === userName &&
              lateralEvents.includes(bufferedEvent.event_id || '')) {
            targetHosts.add(bufferedEvent.computer_name || bufferedEvent.hostname || 'unknown');
            relatedEvents.push(bufferedEvent);
          }
        }
      }

      if (targetHosts.size >= 3) {
        return {
          id: `lateral-movement-${userName}-${Date.now()}`,
          name: 'Lateral Movement Detection',
          pattern_type: 'lateral_movement',
          severity: 'medium',
          description: `Lateral movement detected: user ${userName} accessed ${targetHosts.size} different hosts`,
          matched_events: relatedEvents,
          relevance_score: Math.min(targetHosts.size / 5, 1.0)
        };
      }
    }

    return null;
  }

  private async checkDataExfiltrationPattern(event: LogEvent, eventBuffer: Map<string, LogEvent[]>): Promise<PatternMatch | null> {
    // Look for large file transfers, unusual network activity
    if (event.event_category === 'network' || event.event_id === '5156') {
      const sourceIp = event.source_ip || event.ip_address;
      const destinationIp = event.destination_ip;
      
      if (!sourceIp || !destinationIp) return null;

      // Check for high volume of outbound connections
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      let connectionCount = 0;
      const relatedEvents: LogEvent[] = [];

      for (const events of eventBuffer.values()) {
        for (const bufferedEvent of events) {
          if (new Date(bufferedEvent.timestamp) > fifteenMinutesAgo &&
              (bufferedEvent.source_ip === sourceIp) &&
              bufferedEvent.destination_ip &&
              (bufferedEvent.event_category === 'network' || bufferedEvent.event_id === '5156')) {
            connectionCount++;
            relatedEvents.push(bufferedEvent);
          }
        }
      }

      if (connectionCount >= 50) {
        return {
          id: `data-exfil-${sourceIp}-${Date.now()}`,
          name: 'Potential Data Exfiltration',
          pattern_type: 'data_exfiltration',
          severity: 'high',
          description: `High volume of outbound connections from ${sourceIp} (${connectionCount} connections)`,
          matched_events: relatedEvents,
          relevance_score: Math.min(connectionCount / 100, 1.0)
        };
      }
    }

    return null;
  }
}