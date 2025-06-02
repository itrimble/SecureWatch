import { DataSource } from '../types/dashboard.types';
import { WidgetDataProvider } from '../types/widget.types';
import { KQLEngine } from '@securewatch/kql-engine';

export class DefaultDataProvider implements WidgetDataProvider {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();
  private kqlEngine?: KQLEngine;
  private apiEndpoints: Map<string, string> = new Map();

  constructor(options: {
    kqlEngine?: KQLEngine;
    apiEndpoints?: Record<string, string>;
    defaultCacheTTL?: number;
  } = {}) {
    this.kqlEngine = options.kqlEngine;
    this.apiEndpoints = new Map(Object.entries(options.apiEndpoints || {}));
  }

  async fetchData(dataSource: DataSource, params: any = {}): Promise<any> {
    const cacheKey = this.getCacheKey(dataSource, params);
    
    // Check cache first
    const cached = this.getCachedData(dataSource);
    if (cached !== null) {
      return cached;
    }

    let data: any;

    switch (dataSource.type) {
      case 'query':
        data = await this.executeQuery(dataSource, params);
        break;
      
      case 'api':
        data = await this.fetchFromAPI(dataSource, params);
        break;
      
      case 'static':
        data = this.getStaticData(dataSource);
        break;
      
      case 'streaming':
        data = await this.setupStreaming(dataSource, params);
        break;
      
      default:
        throw new Error(`Unsupported data source type: ${dataSource.type}`);
    }

    // Cache the result
    this.setCachedData(dataSource, data, dataSource.params?.cacheTTL || 300000); // 5 min default

    return data;
  }

  subscribeToUpdates(dataSource: DataSource, callback: (data: any) => void): () => void {
    const key = this.getDataSourceKey(dataSource);
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    
    this.subscriptions.get(key)!.add(callback);

    // Setup streaming if needed
    if (dataSource.type === 'streaming') {
      this.setupStreamingSubscription(dataSource, callback);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }

  getCachedData(dataSource: DataSource): any | null {
    const key = this.getDataSourceKey(dataSource);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  invalidateCache(dataSource: DataSource): void {
    const key = this.getDataSourceKey(dataSource);
    this.cache.delete(key);
  }

  // Private methods
  private async executeQuery(dataSource: DataSource, params: any): Promise<any> {
    if (!this.kqlEngine) {
      throw new Error('KQL Engine not configured for query data source');
    }

    const query = typeof dataSource.value === 'string' ? dataSource.value : dataSource.value.query;
    if (!query) {
      throw new Error('Query is required for query data source');
    }

    // Replace parameters in query
    const processedQuery = this.processQueryParameters(query, params, dataSource.params);

    const context = {
      organizationId: params.organizationId || 'default',
      userId: params.userId,
      timeRange: params.timeRange,
      filters: params.filters || []
    };

    const result = await this.kqlEngine.executeQuery(processedQuery, context);
    
    return {
      data: result.rows,
      columns: result.columns,
      totalRows: result.totalRows,
      executionTime: result.executionTime,
      query: processedQuery
    };
  }

  private async fetchFromAPI(dataSource: DataSource, params: any): Promise<any> {
    const endpoint = typeof dataSource.value === 'string' ? dataSource.value : dataSource.value.endpoint;
    if (!endpoint) {
      throw new Error('Endpoint is required for API data source');
    }

    // Resolve endpoint URL
    const url = this.resolveEndpoint(endpoint, params);
    
    const requestOptions: RequestInit = {
      method: dataSource.params?.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...dataSource.params?.headers
      },
      timeout: dataSource.timeout || 30000
    };

    if (dataSource.params?.body) {
      requestOptions.body = JSON.stringify(dataSource.params.body);
    }

    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  private getStaticData(dataSource: DataSource): any {
    return dataSource.value;
  }

  private async setupStreaming(dataSource: DataSource, params: any): Promise<any> {
    // For now, return initial data and setup WebSocket connection
    const endpoint = typeof dataSource.value === 'string' ? dataSource.value : dataSource.value.endpoint;
    
    // Return initial empty data for streaming sources
    return {
      data: [],
      streaming: true,
      endpoint
    };
  }

  private setupStreamingSubscription(dataSource: DataSource, callback: (data: any) => void): void {
    const endpoint = typeof dataSource.value === 'string' ? dataSource.value : dataSource.value.endpoint;
    
    if (!endpoint) {
      return;
    }

    // Setup WebSocket connection
    try {
      const wsUrl = endpoint.replace(/^http/, 'ws');
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('Error parsing streaming data:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        // Implement reconnection logic here
      };
    } catch (error) {
      console.error('Error setting up streaming connection:', error);
    }
  }

  private processQueryParameters(query: string, params: any, dataSourceParams: any = {}): string {
    let processedQuery = query;

    // Replace time range parameters
    if (params.timeRange) {
      processedQuery = processedQuery.replace(/\{timeRange\}/g, params.timeRange.value);
    }

    // Replace custom parameters
    const allParams = { ...dataSourceParams, ...params };
    for (const [key, value] of Object.entries(allParams)) {
      if (typeof value === 'string' || typeof value === 'number') {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        processedQuery = processedQuery.replace(regex, String(value));
      }
    }

    return processedQuery;
  }

  private resolveEndpoint(endpoint: string, params: any): string {
    let url = endpoint;

    // Resolve named endpoints
    if (this.apiEndpoints.has(endpoint)) {
      url = this.apiEndpoints.get(endpoint)!;
    }

    // Replace parameters in URL
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' || typeof value === 'number') {
        url = url.replace(`{${key}}`, String(value));
      }
    }

    return url;
  }

  private getDataSourceKey(dataSource: DataSource): string {
    return JSON.stringify({
      type: dataSource.type,
      value: dataSource.value,
      params: dataSource.params
    });
  }

  private getCacheKey(dataSource: DataSource, params: any): string {
    return `${this.getDataSourceKey(dataSource)}-${JSON.stringify(params)}`;
  }

  private setCachedData(dataSource: DataSource, data: any, ttl: number): void {
    const key = this.getDataSourceKey(dataSource);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Utility methods for external use
  setAPIEndpoint(name: string, url: string): void {
    this.apiEndpoints.set(name, url);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Notify subscribers of data updates
  private notifySubscribers(dataSource: DataSource, data: any): void {
    const key = this.getDataSourceKey(dataSource);
    const callbacks = this.subscriptions.get(key);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in data subscription callback:', error);
        }
      });
    }
  }
}