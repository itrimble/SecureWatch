'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'unoperational';
  uptime?: number;
  responseTime?: number;
  port?: number;
  error?: string;
  cpu?: number;
  memory?: number;
  lastCheck?: Date;
  healthScore?: number;
}

export interface SystemResources {
  cpu: {
    percentage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    usedMB: number;
    totalMB: number;
    percentage: number;
  };
  disk: {
    usedGB: number;
    totalGB: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connectionsActive: number;
  };
}

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description?: string;
  source: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

export interface LogEntry {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  service: string;
  message: string;
  details?: any;
}

export interface PlatformMetrics {
  logIngestion: {
    eventsPerSecond: number;
    totalEvents: number;
    queueLength: number;
    activeSourcesCount: number;
    processingLatency: number;
  };
  correlationEngine: {
    activeRules: number;
    alertsGenerated: number;
    processingLatency: number;
    cacheHitRatio: number;
  };
  searchApi: {
    activeQueries: number;
    avgQueryTime: number;
    cacheHitRatio: number;
    indexSize: number;
  };
  database: {
    connections: number;
    avgQueryTime: number;
    storageUsed: number;
    storageTotal: number;
  };
}

export interface PlatformStatusData {
  services: ServiceStatus[];
  dockerServices: ServiceStatus[];
  systemResources: SystemResources;
  recentAlerts: Alert[];
  recentLogs: LogEntry[];
  platformMetrics: PlatformMetrics;
  overallHealth: {
    percentage: number;
    status: 'healthy' | 'degraded' | 'critical';
  };
  lastUpdated: Date;
}

interface PlatformStatusContextType {
  data: PlatformStatusData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
}

const PlatformStatusContext = createContext<PlatformStatusContextType | undefined>(undefined);

export function usePlatformStatus() {
  const context = useContext(PlatformStatusContext);
  if (context === undefined) {
    throw new Error('usePlatformStatus must be used within a PlatformStatusProvider');
  }
  return context;
}

export function PlatformStatusProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PlatformStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPlatformStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch data from multiple endpoints
      const [healthResponse, metricsResponse] = await Promise.allSettled([
        fetch('/api/health'),
        fetch('/api/platform-status/metrics')
      ]);

      let healthData = null;
      let metricsData = null;

      if (healthResponse.status === 'fulfilled' && healthResponse.value.ok) {
        healthData = await healthResponse.value.json();
      }

      if (metricsResponse.status === 'fulfilled' && metricsResponse.value.ok) {
        metricsData = await metricsResponse.value.json();
      }

      // If we don't have metrics endpoint yet, generate mock data
      if (!metricsData) {
        metricsData = generateMockMetrics();
      }

      // Transform and combine data
      const platformData: PlatformStatusData = {
        services: transformHealthToServices(healthData),
        dockerServices: generateMockDockerServices(),
        systemResources: generateMockSystemResources(),
        recentAlerts: generateMockAlerts(),
        recentLogs: generateMockLogs(),
        platformMetrics: metricsData,
        overallHealth: calculateOverallHealth(healthData),
        lastUpdated: new Date()
      };

      setData(platformData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch platform status');
    } finally {
      setIsLoading(false);
    }
  }, [setData, setLastUpdated, setIsLoading, setError]);

  const refreshData = useCallback(async () => {
    await fetchPlatformStatus();
  }, [fetchPlatformStatus]);

  // Initial load
  useEffect(() => {
    fetchPlatformStatus();
  }, [fetchPlatformStatus]);

  // Auto-refresh with improved performance
  useEffect(() => {
    if (!autoRefresh) return;

    let isActive = true;
    let timeoutId: NodeJS.Timeout;

    const scheduleNextRefresh = () => {
      if (isActive) {
        timeoutId = setTimeout(async () => {
          if (isActive) {
            await fetchPlatformStatus();
            scheduleNextRefresh();
          }
        }, 30000); // Increased to 30 seconds to reduce load
      }
    };

    // Start the refresh cycle
    scheduleNextRefresh();

    return () => {
      isActive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [autoRefresh, fetchPlatformStatus]);

  return (
    <PlatformStatusContext.Provider
      value={{
        data,
        isLoading,
        error,
        lastUpdated,
        refreshData,
        autoRefresh,
        setAutoRefresh,
      }}
    >
      {children}
    </PlatformStatusContext.Provider>
  );
}

// Helper functions to transform API data
function transformHealthToServices(healthData: any): ServiceStatus[] {
  if (!healthData) {
    return generateMockServices();
  }

  const services: ServiceStatus[] = [];

  // Add frontend service
  services.push({
    name: 'Frontend',
    status: healthData.status === 'healthy' ? 'operational' : 'degraded',
    uptime: healthData.uptime,
    port: 4000,
    healthScore: healthData.status === 'healthy' ? 98 : 65,
    lastCheck: new Date()
  });

  // Add backend services
  if (healthData.backends) {
    if (healthData.backends.searchApi) {
      services.push({
        name: 'Search API',
        status: healthData.backends.searchApi.status === 'healthy' ? 'operational' : 'unoperational',
        port: 4004,
        error: healthData.backends.searchApi.error,
        healthScore: healthData.backends.searchApi.status === 'healthy' ? 95 : 0,
        lastCheck: new Date()
      });
    }

    if (healthData.backends.logIngestion) {
      services.push({
        name: 'Log Ingestion',
        status: healthData.backends.logIngestion.status === 'healthy' ? 'operational' : 'unoperational',
        port: 4002,
        error: healthData.backends.logIngestion.error,
        healthScore: healthData.backends.logIngestion.status === 'healthy' ? 97 : 0,
        lastCheck: new Date()
      });
    }
  }

  return services;
}

function calculateOverallHealth(healthData: any): { percentage: number; status: 'healthy' | 'degraded' | 'critical' } {
  if (!healthData) {
    return { percentage: 0, status: 'critical' };
  }

  let totalServices = 1; // frontend
  let healthyServices = healthData.status === 'healthy' ? 1 : 0;

  if (healthData.backends) {
    if (healthData.backends.searchApi) {
      totalServices++;
      if (healthData.backends.searchApi.status === 'healthy') {
        healthyServices++;
      }
    }
    if (healthData.backends.logIngestion) {
      totalServices++;
      if (healthData.backends.logIngestion.status === 'healthy') {
        healthyServices++;
      }
    }
  }

  const percentage = Math.round((healthyServices / totalServices) * 100);
  let status: 'healthy' | 'degraded' | 'critical';

  if (percentage >= 90) status = 'healthy';
  else if (percentage >= 70) status = 'degraded';
  else status = 'critical';

  return { percentage, status };
}

// Mock data generators (to be replaced with real API calls)
function generateMockServices(): ServiceStatus[] {
  return [
    {
      name: 'Frontend',
      status: 'operational',
      uptime: 86400,
      responseTime: 45,
      port: 4000,
      cpu: 12,
      memory: 256,
      healthScore: 98,
      lastCheck: new Date()
    },
    {
      name: 'Search API',
      status: 'operational',
      uptime: 82800,
      responseTime: 78,
      port: 4004,
      cpu: 25,
      memory: 512,
      healthScore: 95,
      lastCheck: new Date()
    },
    {
      name: 'Log Ingestion',
      status: 'degraded',
      uptime: 75600,
      responseTime: 156,
      port: 4002,
      cpu: 45,
      memory: 1024,
      healthScore: 78,
      lastCheck: new Date()
    }
  ];
}

function generateMockDockerServices(): ServiceStatus[] {
  return [
    {
      name: 'PostgreSQL',
      status: 'operational',
      uptime: 172800,
      port: 5432,
      healthScore: 99,
      lastCheck: new Date()
    },
    {
      name: 'Redis',
      status: 'operational',
      uptime: 172800,
      port: 6379,
      healthScore: 97,
      lastCheck: new Date()
    },
    {
      name: 'Elasticsearch',
      status: 'operational',
      uptime: 86400,
      port: 9200,
      healthScore: 94,
      lastCheck: new Date()
    }
  ];
}

function generateMockSystemResources(): SystemResources {
  return {
    cpu: {
      percentage: 34.2,
      cores: 8,
      loadAverage: [1.2, 1.5, 1.8]
    },
    memory: {
      usedMB: 12800,
      totalMB: 16384,
      percentage: 78
    },
    disk: {
      usedGB: 250,
      totalGB: 500,
      percentage: 50
    },
    network: {
      bytesIn: 1024 * 1024 * 512,
      bytesOut: 1024 * 1024 * 256,
      connectionsActive: 45
    }
  };
}

function generateMockAlerts(): Alert[] {
  return [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      severity: 'critical',
      title: 'High CPU usage detected',
      description: 'Search API CPU usage above 90% for 5 minutes',
      source: 'Search API',
      status: 'active'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      severity: 'high',
      title: 'Log ingestion queue backing up',
      description: 'Queue length exceeding normal thresholds',
      source: 'Log Ingestion',
      status: 'acknowledged'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      severity: 'medium',
      title: 'Correlation rule updated',
      description: 'Rule #42 modified by admin user',
      source: 'Correlation Engine',
      status: 'resolved'
    }
  ];
}

function generateMockLogs(): LogEntry[] {
  const logs: LogEntry[] = [];
  const services = ['Frontend', 'Search API', 'Log Ingestion', 'Correlation Engine'];
  const levels: Array<'error' | 'warn' | 'info' | 'debug'> = ['error', 'warn', 'info', 'debug'];
  const messages = [
    'Processing request',
    'Query executed successfully',
    'Cache hit ratio: 89%',
    'Health check passed',
    'Background task completed',
    'Index updated',
    'Alert rule triggered',
    'Database connection established'
  ];

  for (let i = 0; i < 20; i++) {
    logs.push({
      timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60),
      level: levels[Math.floor(Math.random() * levels.length)],
      service: services[Math.floor(Math.random() * services.length)],
      message: messages[Math.floor(Math.random() * messages.length)]
    });
  }

  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function generateMockMetrics(): PlatformMetrics {
  return {
    logIngestion: {
      eventsPerSecond: 1247,
      totalEvents: 1_234_567,
      queueLength: 156,
      activeSourcesCount: 15,
      processingLatency: 23
    },
    correlationEngine: {
      activeRules: 42,
      alertsGenerated: 127,
      processingLatency: 15,
      cacheHitRatio: 89
    },
    searchApi: {
      activeQueries: 8,
      avgQueryTime: 45,
      cacheHitRatio: 76,
      indexSize: 25.6
    },
    database: {
      connections: 23,
      avgQueryTime: 12,
      storageUsed: 145.7,
      storageTotal: 500
    }
  };
}