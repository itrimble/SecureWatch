import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { LookupService, EnrichmentEngine } from '@securewatch/lookup-service';
import { Redis } from 'redis';

// Database connection
const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'securewatch',
  user: process.env.DB_USER || 'securewatch',
  password: process.env.DB_PASSWORD || 'securewatch_dev',
});

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'securewatch_dev',
});

const lookupService = new LookupService(dbPool, redis);
const enrichmentEngine = new EnrichmentEngine(dbPool, lookupService);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      data, 
      rules = [], 
      enableExternalLookups = false,
      batchSize = 100 
    } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data array is required' },
        { status: 400 }
      );
    }

    if (data.length > 10000) {
      return NextResponse.json(
        { error: 'Maximum 10,000 records allowed per request' },
        { status: 400 }
      );
    }

    // Process in batches for large datasets
    const results = [];
    const totalBatches = Math.ceil(data.length / batchSize);
    let totalLookups = 0;
    let totalExternalLookups = 0;
    let appliedRules: string[] = [];
    let allErrors: string[] = [];

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, data.length);
      const batch = data.slice(start, end);

      const batchResult = await enrichmentEngine.enrichData({
        data: batch,
        rules: rules.length > 0 ? rules : undefined,
        enableExternalLookups
      });

      results.push(...batchResult.enrichedData);
      totalLookups += batchResult.lookupCount;
      totalExternalLookups += batchResult.externalLookupCount;
      
      // Merge applied rules (unique)
      batchResult.appliedRules.forEach(ruleId => {
        if (!appliedRules.includes(ruleId)) {
          appliedRules.push(ruleId);
        }
      });
      
      allErrors.push(...batchResult.errors);
    }

    return NextResponse.json({
      enrichedData: results,
      statistics: {
        originalRecords: data.length,
        enrichedRecords: results.length,
        appliedRules,
        totalLookups,
        totalExternalLookups,
        errorCount: allErrors.length
      },
      errors: allErrors.length > 0 ? allErrors : undefined
    });

  } catch (error) {
    console.error('Search enrichment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to enrich search results',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'rules') {
      const rules = await enrichmentEngine.getActiveRules();
      return NextResponse.json(rules);
    }

    if (action === 'api-configs') {
      const configs = await enrichmentEngine.getActiveAPIConfigs();
      // Remove sensitive information
      const publicConfigs = configs.map(config => ({
        id: config.id,
        name: config.name,
        description: config.description,
        baseUrl: config.baseUrl,
        rateLimit: config.rateLimit,
        timeout: config.timeout,
        fieldMapping: config.fieldMapping
      }));
      return NextResponse.json(publicConfigs);
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Enrichment GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve enrichment information' },
      { status: 500 }
    );
  }
}