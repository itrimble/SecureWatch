import { NextResponse } from 'next/server';

const SEARCH_API_URL = process.env.SEARCH_API_URL || 'http://localhost:4004';
const LOG_INGESTION_URL = process.env.LOG_INGESTION_URL || 'http://localhost:4002';

async function checkBackendHealth(url: string, serviceName: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${url}/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return { service: serviceName, status: 'healthy', ...data };
    } else {
      return { service: serviceName, status: 'unhealthy', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { 
      service: serviceName, 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function GET() {
  try {
    const [searchApiHealth, logIngestionHealth] = await Promise.all([
      checkBackendHealth(SEARCH_API_URL, 'search-api'),
      checkBackendHealth(LOG_INGESTION_URL, 'log-ingestion'),
    ]);

    const allHealthy = searchApiHealth.status === 'healthy' && 
                      logIngestionHealth.status === 'healthy';

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'frontend',
      version: '1.0.0',
      uptime: process.uptime(),
      backends: {
        searchApi: searchApiHealth,
        logIngestion: logIngestionHealth,
      },
    }, {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'frontend',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
  }
}