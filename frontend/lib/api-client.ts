/**
 * API Client for connecting frontend to live backend services
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  source_identifier: string;
  log_file: string;
  message: string;
  enriched_data: {
    event_id: string;
    severity: string;
    hostname: string;
    ip_address: string | null;
    user_id: string;
    process_name: string;
    process_id: number;
    tags: string[];
    event_type_id: string | number;
  };
}

export interface SearchParams {
  limit?: number;
  offset?: number;
  eventId?: string;
  keywords?: string;
  user?: string;
  sourceIp?: string;
  logLevel?: string;
  timeRangeStart?: string;
  timeRangeEnd?: string;
}

class ApiClient {
  private baseUrl: string;
  private searchApiUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    this.searchApiUrl = process.env.NEXT_PUBLIC_SEARCH_API_URL || 'http://localhost:4004';
  }

  /**
   * Fetch logs from the search API backend
   */
  async fetchLogs(params: SearchParams = {}): Promise<LogEntry[]> {
    try {
      // First try to get logs from the live search API
      const searchApiResponse = await this.fetchFromSearchApi(params);
      if (searchApiResponse) {
        return searchApiResponse;
      }
    } catch (error) {
      console.warn('[ApiClient] Search API unavailable, falling back to frontend API:', error);
    }

    // Fallback to frontend mock API
    return this.fetchFromFrontendApi(params);
  }

  /**
   * Fetch logs from the live search API backend
   */
  private async fetchFromSearchApi(params: SearchParams): Promise<LogEntry[] | null> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.eventId) queryParams.append('eventId', params.eventId);
      if (params.keywords) queryParams.append('keywords', params.keywords);
      if (params.user) queryParams.append('user', params.user);
      if (params.sourceIp) queryParams.append('sourceIp', params.sourceIp);
      if (params.logLevel) queryParams.append('logLevel', params.logLevel);
      if (params.timeRangeStart) queryParams.append('timeRangeStart', params.timeRangeStart);
      if (params.timeRangeEnd) queryParams.append('timeRangeEnd', params.timeRangeEnd);

      const url = `${this.searchApiUrl}/api/v1/search/logs?${queryParams.toString()}`;
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header when auth is implemented
          // 'Authorization': `Bearer ${token}`
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Search API responded with status: ${response.status}`);
      }

      const data = await response.json();
      return this.transformSearchApiResponse(data);
    } catch (error) {
      console.error('[ApiClient] Error fetching from search API:', error);
      throw error;
    }
  }

  /**
   * Fetch logs from the frontend mock API (fallback)
   */
  private async fetchFromFrontendApi(params: SearchParams): Promise<LogEntry[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const url = `${this.baseUrl}/api/logs?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Frontend API responded with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[ApiClient] Error fetching from frontend API:', error);
      throw error;
    }
  }

  /**
   * Transform search API response to match frontend expected format
   */
  private transformSearchApiResponse(data: any): LogEntry[] {
    // If search API returns data in a different format, transform it here
    if (Array.isArray(data)) {
      return data;
    }
    
    if (data.results && Array.isArray(data.results)) {
      return data.results;
    }
    
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    console.warn('[ApiClient] Unexpected search API response format:', data);
    return [];
  }

  /**
   * Check if search API is available
   */
  async isSearchApiAvailable(): Promise<boolean> {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.searchApiUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const health = await response.json();
        return health.status === 'healthy';
      }
      
      return false;
    } catch (error) {
      console.log('[ApiClient] Search API health check failed:', error);
      return false;
    }
  }

  /**
   * Get API status information
   */
  async getApiStatus() {
    const searchApiAvailable = await this.isSearchApiAvailable();
    
    return {
      searchApi: {
        available: searchApiAvailable,
        url: this.searchApiUrl,
      },
      frontendApi: {
        available: true, // Assume frontend API is always available
        url: this.baseUrl,
      },
      usingLiveBackend: searchApiAvailable,
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();