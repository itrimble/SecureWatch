import { Router, Request, Response } from 'express';
import { TokenService } from '../services/token.service';
import { KafkaService } from '../services/kafka.service';
import { HECMetrics, HECHealthStatus } from '../types/hec.types';
import logger from '../utils/logger';

export class AdminRoutes {
  private router: Router;
  private tokenService: TokenService;
  private kafkaService: KafkaService;
  private startTime: Date;

  constructor(tokenService: TokenService, kafkaService: KafkaService) {
    this.router = Router();
    this.tokenService = tokenService;
    this.kafkaService = kafkaService;
    this.startTime = new Date();

    this.setupRoutes();
  }

  /**
   * Setup all admin routes
   */
  private setupRoutes(): void {
    // Tokens management
    this.router.get('/tokens', this.getTokens.bind(this));
    this.router.post('/tokens', this.createToken.bind(this));
    this.router.delete('/tokens/:tokenId', this.deactivateToken.bind(this));
    this.router.get('/tokens/:tokenId/stats', this.getTokenStats.bind(this));

    // System metrics and health
    this.router.get('/metrics', this.getMetrics.bind(this));
    this.router.get('/health', this.getHealthStatus.bind(this));
    this.router.get('/status', this.getSystemStatus.bind(this));

    // Cache management
    this.router.post('/cache/clear', this.clearCache.bind(this));

    // Kafka management
    this.router.get('/kafka/status', this.getKafkaStatus.bind(this));
    this.router.post('/kafka/reconnect', this.reconnectKafka.bind(this));
  }

  /**
   * Get all tokens (without actual token values)
   */
  private async getTokens(req: Request, res: Response): Promise<void> {
    try {
      const tokens = await this.tokenService.getAllTokens();
      res.json({
        success: true,
        data: tokens,
        count: tokens.length
      });
    } catch (error) {
      logger.error('Failed to get tokens', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tokens'
      });
    }
  }

  /**
   * Create a new token
   */
  private async createToken(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        allowedSources,
        allowedIndexes,
        maxEventsPerSecond,
        expiresAt,
        organizationId = 'default',
        createdBy = 'admin'
      } = req.body;

      // Basic validation
      if (!name || typeof name !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Token name is required and must be a string'
        });
        return;
      }

      const tokenData = {
        name,
        isActive: true,
        allowedSources,
        allowedIndexes,
        maxEventsPerSecond,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        organizationId,
        createdBy
      };

      const token = await this.tokenService.createToken(tokenData);

      logger.info('Created new HEC token via admin API', {
        tokenId: token.id,
        name: token.name,
        createdBy
      });

      res.status(201).json({
        success: true,
        data: {
          id: token.id,
          name: token.name,
          token: token.token, // Include actual token in response for new tokens
          isActive: token.isActive,
          allowedSources: token.allowedSources,
          allowedIndexes: token.allowedIndexes,
          maxEventsPerSecond: token.maxEventsPerSecond,
          expiresAt: token.expiresAt,
          createdAt: token.createdAt,
          organizationId: token.organizationId,
          createdBy: token.createdBy
        }
      });
    } catch (error) {
      logger.error('Failed to create token', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create token'
      });
    }
  }

  /**
   * Deactivate a token
   */
  private async deactivateToken(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        res.status(400).json({
          success: false,
          error: 'Token ID is required'
        });
        return;
      }

      const success = await this.tokenService.deactivateToken(tokenId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Token not found'
        });
        return;
      }

      logger.info('Deactivated HEC token via admin API', { tokenId });

      res.json({
        success: true,
        message: 'Token deactivated successfully'
      });
    } catch (error) {
      logger.error('Failed to deactivate token', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate token'
      });
    }
  }

  /**
   * Get usage statistics for a specific token
   */
  private async getTokenStats(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        res.status(400).json({
          success: false,
          error: 'Token ID is required'
        });
        return;
      }

      const stats = await this.tokenService.getTokenUsageStats(tokenId);

      if (!stats) {
        res.status(404).json({
          success: false,
          error: 'Token stats not found'
        });
        return;
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get token stats', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve token statistics'
      });
    }
  }

  /**
   * Get overall system metrics
   */
  private async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const allTokenStats = await this.tokenService.getAllUsageStats();
      
      // Calculate aggregate metrics
      const totalEvents = allTokenStats.reduce((sum, stats) => sum + stats.eventsReceived, 0);
      const totalBytes = allTokenStats.reduce((sum, stats) => sum + stats.bytesReceived, 0);
      const totalErrors = allTokenStats.reduce((sum, stats) => sum + stats.errorCount, 0);
      
      const uptime = Date.now() - this.startTime.getTime();
      const uptimeSeconds = uptime / 1000;
      
      const eventsPerSecond = uptimeSeconds > 0 ? totalEvents / uptimeSeconds : 0;
      const bytesPerSecond = uptimeSeconds > 0 ? totalBytes / uptimeSeconds : 0;
      const successRate = totalEvents > 0 ? (totalEvents - totalErrors) / totalEvents : 1;

      // Find peak events per second (simplified calculation)
      const peakEventsPerSecond = Math.max(...allTokenStats.map(stats => {
        const tokenUptime = Date.now() - stats.lastUsed.getTime();
        const tokenUptimeSeconds = Math.max(tokenUptime / 1000, 1);
        return stats.eventsReceived / tokenUptimeSeconds;
      }), 0);

      const metrics: HECMetrics = {
        totalEvents,
        eventsPerSecond,
        bytesReceived: totalBytes,
        bytesPerSecond,
        errorCount: totalErrors,
        successRate,
        lastEventTime: allTokenStats.length > 0 ? 
          new Date(Math.max(...allTokenStats.map(s => s.lastUsed.getTime()))) : 
          undefined,
        peakEventsPerSecond,
        activeTokens: allTokenStats.filter(stats => {
          // Consider token active if used in last hour
          const lastUsedHour = Date.now() - stats.lastUsed.getTime();
          return lastUsedHour < 3600000; // 1 hour
        }).length
      };

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics'
      });
    }
  }

  /**
   * Get comprehensive health status
   */
  private async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const kafkaHealth = await this.kafkaService.healthCheck();
      const allTokens = await this.tokenService.getAllTokens();
      const allTokenStats = await this.tokenService.getAllUsageStats();

      const uptime = Date.now() - this.startTime.getTime();
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Calculate error rate
      const totalEvents = allTokenStats.reduce((sum, stats) => sum + stats.eventsReceived, 0);
      const totalErrors = allTokenStats.reduce((sum, stats) => sum + stats.errorCount, 0);
      const errorRate = totalEvents > 0 ? totalErrors / totalEvents : 0;

      // Calculate current load (simplified)
      const eventsPerSecond = allTokenStats.reduce((sum, stats) => {
        const tokenUptime = Date.now() - stats.lastUsed.getTime();
        const tokenUptimeSeconds = Math.max(tokenUptime / 1000, 1);
        return sum + (stats.eventsReceived / tokenUptimeSeconds);
      }, 0);

      // Determine overall health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      const errors: string[] = [];

      if (!kafkaHealth.connected) {
        status = 'unhealthy';
        errors.push('Kafka connection failed');
      }

      if (errorRate > 0.1) { // More than 10% error rate
        status = status === 'healthy' ? 'degraded' : 'unhealthy';
        errors.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      }

      if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) { // More than 90% memory usage
        status = status === 'healthy' ? 'degraded' : status;
        errors.push('High memory usage');
      }

      const healthStatus: HECHealthStatus = {
        status,
        uptime: uptime / 1000, // Convert to seconds
        version: process.env.npm_package_version || '1.0.0',
        kafka: {
          connected: kafkaHealth.connected,
          lastError: kafkaHealth.lastError,
          messagesPerSecond: eventsPerSecond
        },
        tokens: {
          total: allTokens.length,
          active: allTokens.filter(token => token.isActive).length,
          expired: allTokens.filter(token => token.expiresAt && token.expiresAt < new Date()).length
        },
        performance: {
          currentLoad: eventsPerSecond,
          memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
          eventsPerSecond,
          errorRate
        },
        errors: errors.length > 0 ? errors : undefined
      };

      const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
      res.status(statusCode).json({
        success: true,
        data: healthStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get health status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve health status'
      });
    }
  }

  /**
   * Get simple system status
   */
  private async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const kafkaConnected = this.kafkaService.isKafkaConnected();
      const uptime = process.uptime();
      
      res.json({
        success: true,
        data: {
          status: kafkaConnected ? 'operational' : 'degraded',
          uptime,
          kafka: {
            connected: kafkaConnected,
            attempts: this.kafkaService.getConnectionAttempts()
          },
          node: {
            version: process.version,
            platform: process.platform,
            memory: process.memoryUsage()
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get system status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system status'
      });
    }
  }

  /**
   * Clear token cache
   */
  private async clearCache(req: Request, res: Response): Promise<void> {
    try {
      this.tokenService.clearCache();
      
      logger.info('Cleared HEC token cache via admin API');
      
      res.json({
        success: true,
        message: 'Cache cleared successfully'
      });
    } catch (error) {
      logger.error('Failed to clear cache', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache'
      });
    }
  }

  /**
   * Get Kafka connection status
   */
  private async getKafkaStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.kafkaService.healthCheck();
      
      res.json({
        success: true,
        data: {
          connected: health.connected,
          lastError: health.lastError,
          connectionAttempts: this.kafkaService.getConnectionAttempts()
        }
      });
    } catch (error) {
      logger.error('Failed to get Kafka status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve Kafka status'
      });
    }
  }

  /**
   * Reconnect to Kafka
   */
  private async reconnectKafka(req: Request, res: Response): Promise<void> {
    try {
      await this.kafkaService.disconnect();
      await this.kafkaService.connect();
      
      logger.info('Reconnected to Kafka via admin API');
      
      res.json({
        success: true,
        message: 'Kafka reconnection initiated'
      });
    } catch (error) {
      logger.error('Failed to reconnect to Kafka', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reconnect to Kafka'
      });
    }
  }

  /**
   * Get the configured router
   */
  getRouter(): Router {
    return this.router;
  }
}