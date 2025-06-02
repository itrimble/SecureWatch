import { EventEmitter } from 'events';
import { AttackPattern, PatternMatchResult, AIEngineError } from '../types/ai.types';
import { logger } from '../utils/logger';

interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: string;
  source: string;
  destination?: string;
  user?: string;
  process?: string;
  command?: string;
  file?: string;
  network?: {
    srcIP: string;
    dstIP: string;
    port: number;
    protocol: string;
  };
  metadata: Record<string, any>;
}

interface PatternState {
  patternId: string;
  currentStep: number;
  matchedEvents: string[];
  timeline: Array<{
    timestamp: string;
    eventId: string;
    step: number;
  }>;
  startTime: number;
  confidence: number;
}

interface MITREMapping {
  tactic: string;
  technique: string;
  subTechnique?: string;
  description: string;
}

/**
 * Pattern Recognition Service for Attack Identification
 * Implements behavioral pattern matching for detecting coordinated attacks
 */
export class PatternRecognitionService extends EventEmitter {
  private attackPatterns: Map<string, AttackPattern> = new Map();
  private activePatterns: Map<string, PatternState[]> = new Map();
  private eventHistory: SecurityEvent[] = [];
  private maxHistorySize = 10000;
  private patternTimeout = 3600000; // 1 hour

  constructor() {
    super();
    this.initializeBuiltInPatterns();
    this.setupCleanupRoutines();
  }

  /**
   * Register a new attack pattern
   */
  registerPattern(pattern: AttackPattern): void {
    this.attackPatterns.set(pattern.id, pattern);
    this.activePatterns.set(pattern.id, []);
    
    this.emit('pattern:registered', pattern);
    logger.info(`Registered attack pattern: ${pattern.name} (${pattern.mitreId || 'No MITRE ID'})`);
  }

  /**
   * Process a security event and check for pattern matches
   */
  async processEvent(event: SecurityEvent): Promise<PatternMatchResult[]> {
    try {
      // Add event to history
      this.eventHistory.push(event);
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
      }

      const matches: PatternMatchResult[] = [];

      // Check all registered patterns
      for (const [patternId, pattern] of this.attackPatterns) {
        const patternMatches = await this.checkPatternMatch(pattern, event);
        matches.push(...patternMatches);
      }

      // Emit events for any new matches
      matches.forEach(match => {
        if (match.confidence > 0.7) {
          this.emit('pattern:matched', match);
          logger.warn(`Attack pattern detected: ${match.patternId}`, {
            confidence: match.confidence,
            riskScore: match.riskScore,
            events: match.matchedEvents.length
          });
        }
      });

      return matches;

    } catch (error) {
      logger.error('Error processing event for pattern recognition:', error);
      throw new AIEngineError(
        `Failed to process event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PATTERN_PROCESSING_FAILED',
        { eventId: event.id, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Analyze a batch of events for pattern matches
   */
  async analyzeEventBatch(events: SecurityEvent[]): Promise<PatternMatchResult[]> {
    const allMatches: PatternMatchResult[] = [];

    for (const event of events) {
      const matches = await this.processEvent(event);
      allMatches.push(...matches);
    }

    return this.consolidateMatches(allMatches);
  }

  /**
   * Get active pattern states
   */
  getActivePatterns(): Array<{
    patternId: string;
    patternName: string;
    activeInstances: number;
    oldestStart: string;
    avgConfidence: number;
  }> {
    const results: Array<{
      patternId: string;
      patternName: string;
      activeInstances: number;
      oldestStart: string;
      avgConfidence: number;
    }> = [];

    for (const [patternId, states] of this.activePatterns) {
      if (states.length > 0) {
        const pattern = this.attackPatterns.get(patternId);
        if (pattern) {
          const oldestStart = Math.min(...states.map(s => s.startTime));
          const avgConfidence = states.reduce((sum, s) => sum + s.confidence, 0) / states.length;

          results.push({
            patternId,
            patternName: pattern.name,
            activeInstances: states.length,
            oldestStart: new Date(oldestStart).toISOString(),
            avgConfidence
          });
        }
      }
    }

    return results;
  }

  /**
   * Get pattern statistics
   */
  getPatternStats(patternId: string): {
    totalMatches: number;
    avgConfidence: number;
    avgDuration: number;
    lastMatch: string;
    falsePositives: number;
  } {
    // This would be implemented with actual tracking in production
    return {
      totalMatches: 0,
      avgConfidence: 0,
      avgDuration: 0,
      lastMatch: new Date().toISOString(),
      falsePositives: 0
    };
  }

  private async checkPatternMatch(pattern: AttackPattern, event: SecurityEvent): Promise<PatternMatchResult[]> {
    const matches: PatternMatchResult[] = [];
    const activeStates = this.activePatterns.get(pattern.id) || [];

    // Check if event matches any indicator
    const matchingIndicators = this.getMatchingIndicators(pattern, event);
    
    if (matchingIndicators.length === 0) {
      return matches;
    }

    // For simple patterns (no sequence), check direct match
    if (!pattern.sequence || pattern.sequence.length === 0) {
      const confidence = this.calculateIndicatorConfidence(matchingIndicators);
      
      if (confidence > pattern.confidence) {
        matches.push({
          patternId: pattern.id,
          confidence,
          matchedEvents: [event.id],
          timeline: [{
            timestamp: event.timestamp,
            eventId: event.id,
            step: 1
          }],
          riskScore: this.calculateRiskScore(pattern, confidence, 1),
          recommendations: this.generateRecommendations(pattern)
        });
      }
      
      return matches;
    }

    // For sequence patterns, check step-by-step progression
    const newMatches = this.checkSequencePatterns(pattern, event, matchingIndicators, activeStates);
    matches.push(...newMatches);

    return matches;
  }

  private getMatchingIndicators(pattern: AttackPattern, event: SecurityEvent): Array<{ type: string; value: string; weight: number }> {
    const matching: Array<{ type: string; value: string; weight: number }> = [];

    for (const indicator of pattern.indicators) {
      if (this.doesIndicatorMatch(indicator, event)) {
        matching.push(indicator);
      }
    }

    return matching;
  }

  private doesIndicatorMatch(
    indicator: { type: string; value: string; weight: number },
    event: SecurityEvent
  ): boolean {
    switch (indicator.type) {
      case 'process_name':
        return event.process?.toLowerCase().includes(indicator.value.toLowerCase()) || false;
      
      case 'command_line':
        return event.command?.toLowerCase().includes(indicator.value.toLowerCase()) || false;
      
      case 'file_path':
        return event.file?.toLowerCase().includes(indicator.value.toLowerCase()) || false;
      
      case 'network_port':
        return event.network?.port === parseInt(indicator.value) || false;
      
      case 'ip_address':
        return event.network?.srcIP === indicator.value || event.network?.dstIP === indicator.value || false;
      
      case 'event_type':
        return event.eventType === indicator.value;
      
      case 'user_name':
        return event.user?.toLowerCase().includes(indicator.value.toLowerCase()) || false;
      
      case 'registry_key':
        return event.metadata.registryKey?.toLowerCase().includes(indicator.value.toLowerCase()) || false;
      
      case 'service_name':
        return event.metadata.serviceName?.toLowerCase().includes(indicator.value.toLowerCase()) || false;
      
      case 'hash':
        return event.metadata.fileHash === indicator.value || event.metadata.processHash === indicator.value;
      
      default:
        // Generic metadata match
        return Object.values(event.metadata).some(value => 
          String(value).toLowerCase().includes(indicator.value.toLowerCase())
        );
    }
  }

  private checkSequencePatterns(
    pattern: AttackPattern,
    event: SecurityEvent,
    matchingIndicators: Array<{ type: string; value: string; weight: number }>,
    activeStates: PatternState[]
  ): PatternMatchResult[] {
    const matches: PatternMatchResult[] = [];
    const eventTime = new Date(event.timestamp).getTime();

    // Check if this event advances any active pattern states
    for (let i = activeStates.length - 1; i >= 0; i--) {
      const state = activeStates[i];
      const nextStep = state.currentStep + 1;
      
      // Check if pattern has timed out
      if (eventTime - state.startTime > this.patternTimeout) {
        activeStates.splice(i, 1);
        continue;
      }

      if (pattern.sequence && nextStep <= pattern.sequence.length) {
        const stepCondition = pattern.sequence[nextStep - 1];
        
        if (this.doesEventMatchStep(event, stepCondition)) {
          // Advance the pattern state
          state.currentStep = nextStep;
          state.matchedEvents.push(event.id);
          state.timeline.push({
            timestamp: event.timestamp,
            eventId: event.id,
            step: nextStep
          });
          
          // Update confidence
          const indicatorConfidence = this.calculateIndicatorConfidence(matchingIndicators);
          state.confidence = (state.confidence * (nextStep - 1) + indicatorConfidence) / nextStep;

          // Check if pattern is complete
          if (nextStep === pattern.sequence.length) {
            const finalConfidence = Math.min(state.confidence, pattern.confidence);
            
            if (finalConfidence > pattern.confidence) {
              matches.push({
                patternId: pattern.id,
                confidence: finalConfidence,
                matchedEvents: [...state.matchedEvents],
                timeline: [...state.timeline],
                riskScore: this.calculateRiskScore(pattern, finalConfidence, nextStep),
                recommendations: this.generateRecommendations(pattern)
              });
            }
            
            // Remove completed pattern
            activeStates.splice(i, 1);
          }
        }
      }
    }

    // Check if this event can start a new pattern instance
    if (pattern.sequence && pattern.sequence.length > 0) {
      const firstStep = pattern.sequence[0];
      
      if (this.doesEventMatchStep(event, firstStep)) {
        const indicatorConfidence = this.calculateIndicatorConfidence(matchingIndicators);
        
        const newState: PatternState = {
          patternId: pattern.id,
          currentStep: 1,
          matchedEvents: [event.id],
          timeline: [{
            timestamp: event.timestamp,
            eventId: event.id,
            step: 1
          }],
          startTime: eventTime,
          confidence: indicatorConfidence
        };
        
        activeStates.push(newState);
      }
    }

    return matches;
  }

  private doesEventMatchStep(event: SecurityEvent, step: { step: number; condition: string; timeWindow?: number }): boolean {
    // Parse the condition (simplified parsing for demo)
    const condition = step.condition.toLowerCase();
    
    if (condition.includes('process') && condition.includes('create')) {
      return event.eventType === 'ProcessCreate';
    }
    
    if (condition.includes('network') && condition.includes('connection')) {
      return event.eventType === 'NetworkConnection';
    }
    
    if (condition.includes('file') && condition.includes('create')) {
      return event.eventType === 'FileCreate';
    }
    
    if (condition.includes('registry') && condition.includes('modify')) {
      return event.eventType === 'RegistryModify';
    }
    
    if (condition.includes('service') && condition.includes('install')) {
      return event.eventType === 'ServiceInstall';
    }
    
    // Generic event type match
    return event.eventType.toLowerCase().includes(condition);
  }

  private calculateIndicatorConfidence(indicators: Array<{ type: string; value: string; weight: number }>): number {
    if (indicators.length === 0) return 0;
    
    const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
    const weightedSum = indicators.reduce((sum, ind) => sum + ind.weight, 0);
    
    return Math.min(weightedSum / Math.max(totalWeight, 1), 1);
  }

  private calculateRiskScore(pattern: AttackPattern, confidence: number, stepsCompleted: number): number {
    let baseScore = 0;
    
    // Base score from severity
    switch (pattern.severity) {
      case 'critical': baseScore = 90; break;
      case 'high': baseScore = 70; break;
      case 'medium': baseScore = 50; break;
      case 'low': baseScore = 30; break;
    }
    
    // Adjust for confidence
    const confidenceMultiplier = confidence;
    
    // Adjust for pattern completion
    const completionMultiplier = pattern.sequence ? 
      stepsCompleted / pattern.sequence.length : 1;
    
    return Math.min(baseScore * confidenceMultiplier * completionMultiplier, 100);
  }

  private generateRecommendations(pattern: AttackPattern): string[] {
    const recommendations: string[] = [];
    
    // Generic recommendations based on MITRE technique
    if (pattern.mitreId?.startsWith('T1059')) { // Command and Scripting Interpreter
      recommendations.push('Monitor and restrict script execution');
      recommendations.push('Implement application whitelisting');
      recommendations.push('Review PowerShell/cmd execution logs');
    } else if (pattern.mitreId?.startsWith('T1055')) { // Process Injection
      recommendations.push('Enable process creation auditing');
      recommendations.push('Monitor for suspicious process relationships');
      recommendations.push('Implement endpoint detection and response');
    } else if (pattern.mitreId?.startsWith('T1071')) { // Application Layer Protocol
      recommendations.push('Monitor network traffic for anomalies');
      recommendations.push('Implement network segmentation');
      recommendations.push('Review firewall logs');
    }
    
    // Severity-based recommendations
    switch (pattern.severity) {
      case 'critical':
        recommendations.push('Immediately isolate affected systems');
        recommendations.push('Activate incident response procedures');
        break;
      case 'high':
        recommendations.push('Investigate within 1 hour');
        recommendations.push('Consider system isolation');
        break;
      case 'medium':
        recommendations.push('Monitor for additional indicators');
        recommendations.push('Review user activity');
        break;
      case 'low':
        recommendations.push('Log for trend analysis');
        recommendations.push('Schedule routine investigation');
        break;
    }
    
    return recommendations;
  }

  private consolidateMatches(matches: PatternMatchResult[]): PatternMatchResult[] {
    // Group matches by pattern ID and consolidate overlapping ones
    const grouped = new Map<string, PatternMatchResult[]>();
    
    matches.forEach(match => {
      if (!grouped.has(match.patternId)) {
        grouped.set(match.patternId, []);
      }
      grouped.get(match.patternId)!.push(match);
    });
    
    const consolidated: PatternMatchResult[] = [];
    
    for (const [patternId, patternMatches] of grouped) {
      if (patternMatches.length === 1) {
        consolidated.push(patternMatches[0]);
      } else {
        // Merge overlapping matches
        const merged = this.mergePatternMatches(patternMatches);
        consolidated.push(...merged);
      }
    }
    
    return consolidated;
  }

  private mergePatternMatches(matches: PatternMatchResult[]): PatternMatchResult[] {
    // Simple merging strategy - combine matches with overlapping events
    const merged: PatternMatchResult[] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < matches.length; i++) {
      if (processed.has(i)) continue;
      
      let currentMatch = { ...matches[i] };
      processed.add(i);
      
      // Look for overlapping matches
      for (let j = i + 1; j < matches.length; j++) {
        if (processed.has(j)) continue;
        
        const overlap = this.calculateEventOverlap(
          currentMatch.matchedEvents,
          matches[j].matchedEvents
        );
        
        if (overlap > 0.5) { // 50% overlap threshold
          // Merge the matches
          currentMatch = this.combineBomatches(currentMatch, matches[j]);
          processed.add(j);
        }
      }
      
      merged.push(currentMatch);
    }
    
    return merged;
  }

  private calculateEventOverlap(events1: string[], events2: string[]): number {
    const set1 = new Set(events1);
    const set2 = new Set(events2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private combineBomatches(match1: PatternMatchResult, match2: PatternMatchResult): PatternMatchResult {
    return {
      patternId: match1.patternId,
      confidence: Math.max(match1.confidence, match2.confidence),
      matchedEvents: [...new Set([...match1.matchedEvents, ...match2.matchedEvents])],
      timeline: [...match1.timeline, ...match2.timeline].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
      riskScore: Math.max(match1.riskScore, match2.riskScore),
      recommendations: [...new Set([...match1.recommendations, ...match2.recommendations])]
    };
  }

  private setupCleanupRoutines(): void {
    // Clean up expired pattern states every 5 minutes
    setInterval(() => {
      const now = Date.now();
      
      for (const [patternId, states] of this.activePatterns) {
        const activeStates = states.filter(state => 
          now - state.startTime <= this.patternTimeout
        );
        
        this.activePatterns.set(patternId, activeStates);
      }
    }, 5 * 60 * 1000);

    // Clean up old events from history every 10 minutes
    setInterval(() => {
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
      }
    }, 10 * 60 * 1000);
  }

  private initializeBuiltInPatterns(): void {
    // Living off the Land attack pattern
    this.registerPattern({
      id: 'lotl-powershell-execution',
      name: 'Living off the Land - PowerShell Execution',
      description: 'Detects suspicious PowerShell execution patterns',
      mitreId: 'T1059.001',
      severity: 'high',
      indicators: [
        { type: 'process_name', value: 'powershell.exe', weight: 0.6 },
        { type: 'command_line', value: '-enc', weight: 0.8 },
        { type: 'command_line', value: 'invoke-expression', weight: 0.9 },
        { type: 'command_line', value: 'downloadstring', weight: 0.9 }
      ],
      confidence: 0.7
    });

    // Lateral Movement pattern
    this.registerPattern({
      id: 'lateral-movement-rdp',
      name: 'Lateral Movement via RDP',
      description: 'Detects potential lateral movement using RDP',
      mitreId: 'T1021.001',
      severity: 'high',
      indicators: [
        { type: 'event_type', value: 'NetworkConnection', weight: 0.5 },
        { type: 'network_port', value: '3389', weight: 0.8 },
        { type: 'event_type', value: 'Logon', weight: 0.7 }
      ],
      sequence: [
        { step: 1, condition: 'network connection to port 3389' },
        { step: 2, condition: 'successful logon event', timeWindow: 300000 }
      ],
      confidence: 0.75
    });

    // Persistence via Registry
    this.registerPattern({
      id: 'persistence-registry-run',
      name: 'Persistence via Registry Run Keys',
      description: 'Detects persistence establishment through registry run keys',
      mitreId: 'T1547.001',
      severity: 'medium',
      indicators: [
        { type: 'event_type', value: 'RegistryModify', weight: 0.7 },
        { type: 'registry_key', value: 'software\\microsoft\\windows\\currentversion\\run', weight: 0.9 },
        { type: 'registry_key', value: 'software\\microsoft\\windows\\currentversion\\runonce', weight: 0.9 }
      ],
      confidence: 0.8
    });

    // Process Injection pattern
    this.registerPattern({
      id: 'process-injection',
      name: 'Process Injection Detection',
      description: 'Detects potential process injection techniques',
      mitreId: 'T1055',
      severity: 'high',
      indicators: [
        { type: 'process_name', value: 'svchost.exe', weight: 0.5 },
        { type: 'event_type', value: 'ProcessAccess', weight: 0.8 },
        { type: 'event_type', value: 'CreateRemoteThread', weight: 0.9 }
      ],
      sequence: [
        { step: 1, condition: 'process access event' },
        { step: 2, condition: 'create remote thread', timeWindow: 30000 }
      ],
      confidence: 0.8
    });

    // Credential Dumping
    this.registerPattern({
      id: 'credential-dumping-lsass',
      name: 'LSASS Memory Dumping',
      description: 'Detects attempts to dump LSASS memory for credential extraction',
      mitreId: 'T1003.001',
      severity: 'critical',
      indicators: [
        { type: 'process_name', value: 'lsass.exe', weight: 0.9 },
        { type: 'event_type', value: 'ProcessAccess', weight: 0.8 },
        { type: 'command_line', value: 'procdump', weight: 0.9 },
        { type: 'command_line', value: 'mimikatz', weight: 1.0 }
      ],
      confidence: 0.85
    });

    logger.info('Initialized built-in attack patterns', {
      patternCount: this.attackPatterns.size
    });
  }
}

export default PatternRecognitionService;