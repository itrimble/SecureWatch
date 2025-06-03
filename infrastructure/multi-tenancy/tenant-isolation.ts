/**
 * SecureWatch Multi-Tenancy Implementation
 * Provides complete tenant isolation with resource quotas and access controls
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { z } from 'zod';

// Tenant Configuration Schema
const TenantConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  domain: z.string().optional(),
  plan: z.enum(['basic', 'professional', 'enterprise']),
  status: z.enum(['active', 'suspended', 'pending']),
  settings: z.object({
    maxUsers: z.number().positive(),
    maxAgents: z.number().positive(),
    maxStorageGB: z.number().positive(),
    maxAPICallsPerHour: z.number().positive(),
    dataRetentionDays: z.number().positive(),
    enabledFeatures: z.array(z.string()),
    customBranding: z.boolean().default(false),
    ssoEnabled: z.boolean().default(false),
    ipWhitelist: z.array(z.string()).optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TenantConfig = z.infer<typeof TenantConfigSchema>;

// Resource Quota Schema
const ResourceQuotaSchema = z.object({
  tenantId: z.string().uuid(),
  quotas: z.object({
    cpu: z.object({
      limit: z.string(), // e.g., "2000m"
      used: z.string().default("0m"),
    }),
    memory: z.object({
      limit: z.string(), // e.g., "4Gi"
      used: z.string().default("0Mi"),
    }),
    storage: z.object({
      limit: z.string(), // e.g., "100Gi"
      used: z.string().default("0Gi"),
    }),
    networkIngress: z.object({
      limit: z.string(), // e.g., "10Gi"
      used: z.string().default("0Mi"),
    }),
    networkEgress: z.object({
      limit: z.string(), // e.g., "10Gi"
      used: z.string().default("0Mi"),
    }),
  }),
  lastUpdated: z.date(),
});

export type ResourceQuota = z.infer<typeof ResourceQuotaSchema>;

// Tenant Context
export interface TenantContext {
  tenant: TenantConfig;
  user: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
  quotas: ResourceQuota;
  namespace: string;
}

// Multi-Tenant Database Manager
export class MultiTenantDatabase {
  private connectionPools: Map<string, any> = new Map();
  private schemaCache: Map<string, string> = new Map();

  /**
   * Get database connection for a specific tenant
   */
  async getConnection(tenantId: string): Promise<any> {
    if (!this.connectionPools.has(tenantId)) {
      await this.createTenantConnection(tenantId);
    }
    return this.connectionPools.get(tenantId);
  }

  /**
   * Create isolated database connection for tenant
   */
  private async createTenantConnection(tenantId: string): Promise<void> {
    const schemaName = this.getTenantSchema(tenantId);
    
    // Create tenant-specific schema if it doesn't exist
    await this.createTenantSchema(schemaName);
    
    // Create connection pool with schema isolation
    const connection = {
      // In a real implementation, this would create a proper database connection
      schema: schemaName,
      tenantId,
      created: new Date(),
    };
    
    this.connectionPools.set(tenantId, connection);
    this.schemaCache.set(tenantId, schemaName);
  }

  /**
   * Generate tenant-specific schema name
   */
  private getTenantSchema(tenantId: string): string {
    const hash = createHash('sha256').update(tenantId).digest('hex').substring(0, 8);
    return `tenant_${hash}`;
  }

  /**
   * Create database schema for tenant
   */
  private async createTenantSchema(schemaName: string): Promise<void> {
    // In a real implementation, this would execute SQL to create schema
    console.log(`Creating schema: ${schemaName}`);
    
    const schemaSql = `
      CREATE SCHEMA IF NOT EXISTS ${schemaName};
      
      -- Create tenant-specific tables
      CREATE TABLE IF NOT EXISTS ${schemaName}.events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        source VARCHAR(255) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        message TEXT,
        raw_data JSONB,
        processed_data JSONB,
        tags TEXT[],
        agent_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS ${schemaName}.alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        severity VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'open',
        assigned_to VARCHAR(255),
        event_ids UUID[],
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS ${schemaName}.agents (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        hostname VARCHAR(255),
        ip_address INET,
        os_type VARCHAR(50),
        version VARCHAR(50),
        status VARCHAR(20) DEFAULT 'inactive',
        last_seen TIMESTAMPTZ,
        configuration JSONB,
        tags TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS ${schemaName}.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        roles TEXT[],
        permissions TEXT[],
        last_login TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON ${schemaName}.events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_source ON ${schemaName}.events(source);
      CREATE INDEX IF NOT EXISTS idx_events_type ON ${schemaName}.events(event_type);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON ${schemaName}.alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_status ON ${schemaName}.alerts(status);
      CREATE INDEX IF NOT EXISTS idx_agents_status ON ${schemaName}.agents(status);
    `;
    
    // Execute schema creation (in real implementation)
    console.log(`Schema SQL prepared for ${schemaName}`);
  }

  /**
   * Get tenant schema name
   */
  getSchemaName(tenantId: string): string {
    return this.schemaCache.get(tenantId) || this.getTenantSchema(tenantId);
  }
}

// Tenant Manager
export class TenantManager {
  private tenants: Map<string, TenantConfig> = new Map();
  private quotas: Map<string, ResourceQuota> = new Map();
  private database: MultiTenantDatabase;

  constructor() {
    this.database = new MultiTenantDatabase();
  }

  /**
   * Create a new tenant
   */
  async createTenant(config: Omit<TenantConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantConfig> {
    const tenant: TenantConfig = {
      ...config,
      id: this.generateTenantId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate tenant configuration
    const validatedTenant = TenantConfigSchema.parse(tenant);
    
    // Store tenant configuration
    this.tenants.set(tenant.id, validatedTenant);
    
    // Create tenant database schema
    await this.database.getConnection(tenant.id);
    
    // Initialize resource quotas
    await this.initializeResourceQuotas(tenant.id, tenant.plan);
    
    // Create Kubernetes namespace for tenant
    await this.createTenantNamespace(tenant.id);
    
    return validatedTenant;
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<TenantConfig | null> {
    return this.tenants.get(tenantId) || null;
  }

  /**
   * Update tenant configuration
   */
  async updateTenant(tenantId: string, updates: Partial<TenantConfig>): Promise<TenantConfig | null> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    const updatedTenant = {
      ...tenant,
      ...updates,
      updatedAt: new Date(),
    };

    const validatedTenant = TenantConfigSchema.parse(updatedTenant);
    this.tenants.set(tenantId, validatedTenant);

    return validatedTenant;
  }

  /**
   * Initialize resource quotas for tenant
   */
  private async initializeResourceQuotas(tenantId: string, plan: string): Promise<void> {
    const quotaLimits = this.getQuotaLimitsForPlan(plan);
    
    const quota: ResourceQuota = {
      tenantId,
      quotas: {
        cpu: { limit: quotaLimits.cpu, used: "0m" },
        memory: { limit: quotaLimits.memory, used: "0Mi" },
        storage: { limit: quotaLimits.storage, used: "0Gi" },
        networkIngress: { limit: quotaLimits.networkIngress, used: "0Mi" },
        networkEgress: { limit: quotaLimits.networkEgress, used: "0Mi" },
      },
      lastUpdated: new Date(),
    };

    this.quotas.set(tenantId, quota);
  }

  /**
   * Get quota limits based on plan
   */
  private getQuotaLimitsForPlan(plan: string): any {
    const quotaMap = {
      basic: {
        cpu: "1000m",
        memory: "2Gi",
        storage: "20Gi",
        networkIngress: "5Gi",
        networkEgress: "5Gi",
      },
      professional: {
        cpu: "4000m",
        memory: "8Gi",
        storage: "100Gi",
        networkIngress: "20Gi",
        networkEgress: "20Gi",
      },
      enterprise: {
        cpu: "16000m",
        memory: "32Gi",
        storage: "500Gi",
        networkIngress: "100Gi",
        networkEgress: "100Gi",
      },
    };

    return quotaMap[plan as keyof typeof quotaMap] || quotaMap.basic;
  }

  /**
   * Create Kubernetes namespace for tenant
   */
  private async createTenantNamespace(tenantId: string): Promise<void> {
    const namespaceName = this.getTenantNamespace(tenantId);
    
    // In a real implementation, this would use Kubernetes API
    console.log(`Creating Kubernetes namespace: ${namespaceName}`);
    
    const namespaceYaml = `
apiVersion: v1
kind: Namespace
metadata:
  name: ${namespaceName}
  labels:
    securewatch.io/tenant-id: ${tenantId}
    securewatch.io/isolation: enabled
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: ${namespaceName}
spec:
  hard:
    requests.cpu: ${this.quotas.get(tenantId)?.quotas.cpu.limit}
    requests.memory: ${this.quotas.get(tenantId)?.quotas.memory.limit}
    limits.cpu: ${this.quotas.get(tenantId)?.quotas.cpu.limit}
    limits.memory: ${this.quotas.get(tenantId)?.quotas.memory.limit}
    persistentvolumeclaims: "10"
    services: "20"
    pods: "50"
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: ${namespaceName}
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          securewatch.io/tenant-id: ${tenantId}
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          securewatch.io/tenant-id: ${tenantId}
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
    `;
    
    console.log(`Namespace YAML prepared for tenant: ${tenantId}`);
  }

  /**
   * Generate unique tenant ID
   */
  private generateTenantId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Get tenant namespace name
   */
  getTenantNamespace(tenantId: string): string {
    return `securewatch-tenant-${tenantId.substring(0, 8)}`;
  }

  /**
   * Get resource quotas for tenant
   */
  async getResourceQuotas(tenantId: string): Promise<ResourceQuota | null> {
    return this.quotas.get(tenantId) || null;
  }

  /**
   * Update resource usage
   */
  async updateResourceUsage(tenantId: string, resource: string, usage: string): Promise<void> {
    const quota = this.quotas.get(tenantId);
    if (!quota) return;

    const resourceKey = resource as keyof ResourceQuota['quotas'];
    if (quota.quotas[resourceKey]) {
      quota.quotas[resourceKey].used = usage;
      quota.lastUpdated = new Date();
    }
  }
}

// Tenant Isolation Middleware
export class TenantIsolationMiddleware {
  private tenantManager: TenantManager;

  constructor(tenantManager: TenantManager) {
    this.tenantManager = tenantManager;
  }

  /**
   * Middleware to extract and validate tenant context
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract tenant ID from various sources
        const tenantId = this.extractTenantId(req);
        
        if (!tenantId) {
          return res.status(400).json({
            error: 'Tenant ID required',
            code: 'TENANT_ID_MISSING'
          });
        }

        // Get tenant configuration
        const tenant = await this.tenantManager.getTenant(tenantId);
        if (!tenant) {
          return res.status(404).json({
            error: 'Tenant not found',
            code: 'TENANT_NOT_FOUND'
          });
        }

        // Check tenant status
        if (tenant.status !== 'active') {
          return res.status(403).json({
            error: 'Tenant access suspended',
            code: 'TENANT_SUSPENDED'
          });
        }

        // Get resource quotas
        const quotas = await this.tenantManager.getResourceQuotas(tenantId);
        
        // Create tenant context
        const tenantContext: TenantContext = {
          tenant,
          user: {
            id: req.headers['x-user-id'] as string || 'anonymous',
            email: req.headers['x-user-email'] as string || '',
            roles: (req.headers['x-user-roles'] as string || '').split(','),
            permissions: (req.headers['x-user-permissions'] as string || '').split(','),
          },
          quotas: quotas!,
          namespace: this.tenantManager.getTenantNamespace(tenantId),
        };

        // Attach tenant context to request
        (req as any).tenantContext = tenantContext;

        next();
      } catch (error) {
        console.error('Tenant isolation middleware error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'TENANT_MIDDLEWARE_ERROR'
        });
      }
    };
  }

  /**
   * Extract tenant ID from request
   */
  private extractTenantId(req: Request): string | null {
    // Try different sources for tenant ID
    const sources = [
      req.headers['x-tenant-id'],
      req.query.tenantId,
      req.params.tenantId,
      this.extractFromSubdomain(req),
      this.extractFromJWT(req),
    ];

    for (const source of sources) {
      if (source && typeof source === 'string') {
        return source;
      }
    }

    return null;
  }

  /**
   * Extract tenant ID from subdomain
   */
  private extractFromSubdomain(req: Request): string | null {
    const host = req.headers.host;
    if (!host) return null;

    const parts = host.split('.');
    if (parts.length >= 3) {
      // Assume first part is tenant subdomain
      return parts[0];
    }

    return null;
  }

  /**
   * Extract tenant ID from JWT token
   */
  private extractFromJWT(req: Request): string | null {
    const authorization = req.headers.authorization;
    if (!authorization) return null;

    // In a real implementation, this would decode and validate JWT
    // For now, just return a placeholder
    return null;
  }
}

// Tenant Resource Monitor
export class TenantResourceMonitor {
  private tenantManager: TenantManager;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(tenantManager: TenantManager) {
    this.tenantManager = tenantManager;
  }

  /**
   * Start monitoring tenant resource usage
   */
  startMonitoring(intervalMs: number = 60000): void {
    this.monitoringInterval = setInterval(async () => {
      await this.collectResourceMetrics();
    }, intervalMs);
    
    console.log('Tenant resource monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Tenant resource monitoring stopped');
  }

  /**
   * Collect resource metrics for all tenants
   */
  private async collectResourceMetrics(): Promise<void> {
    // In a real implementation, this would query Kubernetes metrics API
    console.log('Collecting tenant resource metrics...');
    
    // Mock implementation
    const tenantIds = ['tenant-1', 'tenant-2']; // Get from tenant manager
    
    for (const tenantId of tenantIds) {
      await this.collectTenantMetrics(tenantId);
    }
  }

  /**
   * Collect metrics for a specific tenant
   */
  private async collectTenantMetrics(tenantId: string): Promise<void> {
    try {
      // Query Kubernetes metrics for tenant namespace
      const namespace = this.tenantManager.getTenantNamespace(tenantId);
      
      // Mock resource usage data
      const metrics = {
        cpu: "500m",
        memory: "1Gi",
        storage: "10Gi",
        networkIngress: "100Mi",
        networkEgress: "50Mi",
      };

      // Update resource usage
      for (const [resource, usage] of Object.entries(metrics)) {
        await this.tenantManager.updateResourceUsage(tenantId, resource, usage);
      }

      // Check for quota violations
      await this.checkQuotaViolations(tenantId);
      
    } catch (error) {
      console.error(`Failed to collect metrics for tenant ${tenantId}:`, error);
    }
  }

  /**
   * Check for resource quota violations
   */
  private async checkQuotaViolations(tenantId: string): Promise<void> {
    const quotas = await this.tenantManager.getResourceQuotas(tenantId);
    if (!quotas) return;

    const violations: string[] = [];

    // Check each resource quota
    for (const [resource, quota] of Object.entries(quotas.quotas)) {
      const usedValue = this.parseResourceValue(quota.used);
      const limitValue = this.parseResourceValue(quota.limit);
      
      const usagePercent = (usedValue / limitValue) * 100;
      
      if (usagePercent > 90) {
        violations.push(`${resource}: ${usagePercent.toFixed(1)}% (${quota.used}/${quota.limit})`);
      }
    }

    if (violations.length > 0) {
      console.warn(`Quota violations for tenant ${tenantId}:`, violations);
      // In a real implementation, this would trigger alerts
    }
  }

  /**
   * Parse resource values (e.g., "1Gi" -> bytes)
   */
  private parseResourceValue(value: string): number {
    // Simplified parsing - in reality would handle all Kubernetes resource units
    const numericValue = parseFloat(value);
    
    if (value.includes('Gi')) {
      return numericValue * 1024 * 1024 * 1024;
    } else if (value.includes('Mi')) {
      return numericValue * 1024 * 1024;
    } else if (value.includes('m')) {
      return numericValue / 1000;
    }
    
    return numericValue;
  }
}

// Export singleton instances
export const tenantManager = new TenantManager();
export const tenantIsolationMiddleware = new TenantIsolationMiddleware(tenantManager);
export const tenantResourceMonitor = new TenantResourceMonitor(tenantManager);

// Helper function to get tenant context from request
export function getTenantContext(req: Request): TenantContext | null {
  return (req as any).tenantContext || null;
}

// Helper function to get tenant database connection
export async function getTenantDatabase(req: Request): Promise<any> {
  const context = getTenantContext(req);
  if (!context) {
    throw new Error('Tenant context not found');
  }
  
  return tenantManager['database'].getConnection(context.tenant.id);
}