import crypto from 'crypto';
import { HECToken, TokenUsageStats } from '../types/hec.types';
import logger from '../utils/logger';

export class TokenService {
  private tokens: Map<string, HECToken> = new Map();
  private usageStats: Map<string, TokenUsageStats> = new Map();
  private tokenCache: Map<string, { token: HECToken; cachedAt: number }> = new Map();
  private cacheTimeoutMs: number;

  constructor(cacheTimeoutMs: number = 300000) { // 5 minutes default
    this.cacheTimeoutMs = cacheTimeoutMs;
    this.initializeDefaultTokens();
  }

  /**
   * Initialize with some default tokens for testing
   */
  private initializeDefaultTokens(): void {
    const defaultTokens: Omit<HECToken, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Default HEC Token',
        token: this.generateSecureToken(),
        isActive: true,
        maxEventsPerSecond: 1000,
        usageCount: 0,
        organizationId: 'default',
        createdBy: 'system'
      },
      {
        name: 'Test Application Token',
        token: this.generateSecureToken(),
        isActive: true,
        allowedSources: ['app1', 'webapp'],
        allowedIndexes: ['application_logs'],
        maxEventsPerSecond: 500,
        usageCount: 0,
        organizationId: 'default',
        createdBy: 'system'
      }
    ];

    for (const tokenData of defaultTokens) {
      const token: HECToken = {
        id: crypto.randomUUID(),
        ...tokenData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.tokens.set(token.token, token);
      
      // Initialize usage stats
      this.usageStats.set(token.id, {
        tokenId: token.id,
        tokenName: token.name,
        eventsReceived: 0,
        bytesReceived: 0,
        lastUsed: new Date(),
        errorCount: 0,
        successRate: 1.0,
        topSources: [],
        topSourceTypes: []
      });

      logger.info('Initialized HEC token', { 
        tokenId: token.id, 
        name: token.name, 
        token: token.token.substring(0, 8) + '...' 
      });
    }
  }

  /**
   * Generate a cryptographically secure token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate a token and return the token object if valid
   */
  async validateToken(tokenString: string): Promise<HECToken | null> {
    // Check cache first
    const cached = this.tokenCache.get(tokenString);
    if (cached && (Date.now() - cached.cachedAt) < this.cacheTimeoutMs) {
      return cached.token;
    }

    // Fetch from tokens map (in production, this would be a database lookup)
    const token = this.tokens.get(tokenString);
    if (!token) {
      logger.warn('Invalid token attempted', { 
        token: tokenString.substring(0, 8) + '...' 
      });
      return null;
    }

    // Check if token is active
    if (!token.isActive) {
      logger.warn('Inactive token attempted', { 
        tokenId: token.id, 
        name: token.name 
      });
      return null;
    }

    // Check if token is expired
    if (token.expiresAt && token.expiresAt < new Date()) {
      logger.warn('Expired token attempted', { 
        tokenId: token.id, 
        name: token.name, 
        expiresAt: token.expiresAt 
      });
      return null;
    }

    // Update cache
    this.tokenCache.set(tokenString, {
      token,
      cachedAt: Date.now()
    });

    // Update last used
    token.lastUsed = new Date();
    token.usageCount++;

    return token;
  }

  /**
   * Check rate limits for a token
   */
  async checkRateLimit(token: HECToken, requestedEvents: number): Promise<boolean> {
    if (!token.maxEventsPerSecond) {
      return true; // No rate limit configured
    }

    // Simple rate limiting - in production, use Redis or more sophisticated rate limiting
    const stats = this.usageStats.get(token.id);
    if (!stats) {
      return true;
    }

    // Calculate current rate (events in last second)
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // This is a simplified implementation
    // In production, you'd track events in time windows
    const estimatedCurrentRate = stats.eventsReceived / ((now - stats.lastUsed.getTime()) / 1000 + 1);
    
    if (estimatedCurrentRate + requestedEvents > token.maxEventsPerSecond) {
      logger.warn('Rate limit exceeded', {
        tokenId: token.id,
        currentRate: estimatedCurrentRate,
        requestedEvents,
        maxEventsPerSecond: token.maxEventsPerSecond
      });
      return false;
    }

    return true;
  }

  /**
   * Update usage statistics for a token
   */
  async updateUsageStats(
    tokenId: string, 
    eventsCount: number, 
    bytesCount: number, 
    sources: string[], 
    sourceTypes: string[],
    isSuccess: boolean = true
  ): Promise<void> {
    const stats = this.usageStats.get(tokenId);
    if (!stats) {
      logger.warn('Usage stats not found for token', { tokenId });
      return;
    }

    // Update basic stats
    stats.eventsReceived += eventsCount;
    stats.bytesReceived += bytesCount;
    stats.lastUsed = new Date();

    if (!isSuccess) {
      stats.errorCount++;
    }

    // Update success rate
    const totalRequests = stats.eventsReceived + stats.errorCount;
    stats.successRate = (stats.eventsReceived) / totalRequests;

    // Update top sources
    this.updateTopSources(stats, sources);
    this.updateTopSourceTypes(stats, sourceTypes);

    logger.debug('Updated usage stats', {
      tokenId,
      eventsCount,
      bytesCount,
      totalEvents: stats.eventsReceived,
      successRate: stats.successRate
    });
  }

  /**
   * Update top sources tracking
   */
  private updateTopSources(stats: TokenUsageStats, sources: string[]): void {
    const sourceMap = new Map<string, number>();
    
    // Load existing counts
    for (const { source, count } of stats.topSources) {
      sourceMap.set(source, count);
    }

    // Add new sources
    for (const source of sources) {
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    }

    // Convert back to sorted array (top 10)
    stats.topSources = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Update top source types tracking
   */
  private updateTopSourceTypes(stats: TokenUsageStats, sourceTypes: string[]): void {
    const sourceTypeMap = new Map<string, number>();
    
    // Load existing counts
    for (const { sourcetype, count } of stats.topSourceTypes) {
      sourceTypeMap.set(sourcetype, count);
    }

    // Add new source types
    for (const sourcetype of sourceTypes) {
      sourceTypeMap.set(sourcetype, (sourceTypeMap.get(sourcetype) || 0) + 1);
    }

    // Convert back to sorted array (top 10)
    stats.topSourceTypes = Array.from(sourceTypeMap.entries())
      .map(([sourcetype, count]) => ({ sourcetype, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Create a new token
   */
  async createToken(tokenData: Omit<HECToken, 'id' | 'token' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<HECToken> {
    const token: HECToken = {
      id: crypto.randomUUID(),
      token: this.generateSecureToken(),
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...tokenData
    };

    this.tokens.set(token.token, token);
    
    // Initialize usage stats
    this.usageStats.set(token.id, {
      tokenId: token.id,
      tokenName: token.name,
      eventsReceived: 0,
      bytesReceived: 0,
      lastUsed: new Date(),
      errorCount: 0,
      successRate: 1.0,
      topSources: [],
      topSourceTypes: []
    });

    logger.info('Created new HEC token', { 
      tokenId: token.id, 
      name: token.name 
    });

    return token;
  }

  /**
   * Get all tokens (without actual token values)
   */
  async getAllTokens(): Promise<Omit<HECToken, 'token'>[]> {
    return Array.from(this.tokens.values()).map(({ token, ...tokenData }) => tokenData);
  }

  /**
   * Get usage statistics for all tokens
   */
  async getAllUsageStats(): Promise<TokenUsageStats[]> {
    return Array.from(this.usageStats.values());
  }

  /**
   * Get usage statistics for a specific token
   */
  async getTokenUsageStats(tokenId: string): Promise<TokenUsageStats | null> {
    return this.usageStats.get(tokenId) || null;
  }

  /**
   * Deactivate a token
   */
  async deactivateToken(tokenId: string): Promise<boolean> {
    for (const [tokenString, token] of this.tokens.entries()) {
      if (token.id === tokenId) {
        token.isActive = false;
        token.updatedAt = new Date();
        
        // Clear from cache
        this.tokenCache.delete(tokenString);
        
        logger.info('Deactivated HEC token', { tokenId, name: token.name });
        return true;
      }
    }
    return false;
  }

  /**
   * Clear token cache
   */
  clearCache(): void {
    this.tokenCache.clear();
    logger.info('Cleared token cache');
  }
}