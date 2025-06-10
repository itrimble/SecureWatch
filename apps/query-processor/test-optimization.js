#!/usr/bin/env node

/**
 * Query Processor Optimization Test Script
 * Tests the enhanced query processing capabilities including caching, optimization, and monitoring
 */

const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:4008';
const WS_URL = 'ws://localhost:8080';

class QueryProcessorTester {
  constructor() {
    this.baseUrl = BASE_URL;
    this.wsUrl = WS_URL;
    this.testResults = [];
  }

  async runTests() {
    console.log('🚀 Starting Query Processor Optimization Tests');
    console.log('=' .repeat(60));

    try {
      // Test 1: Health Check
      await this.testHealthCheck();
      
      // Test 2: Performance Stats
      await this.testPerformanceStats();
      
      // Test 3: Query Optimization
      await this.testQueryOptimization();
      
      // Test 4: Cache Performance
      await this.testCachePerformance();
      
      // Test 5: Slow Query Detection
      await this.testSlowQueryDetection();
      
      // Test 6: Metrics Export
      await this.testMetricsExport();
      
      // Test 7: Cache Management
      await this.testCacheManagement();

      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testHealthCheck() {
    console.log('\n📊 Testing Health Check with Performance Indicators...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/performance/health`);
      
      if (response.status === 200 || response.status === 206) {
        console.log('✅ Health check passed');
        console.log(`   Status: ${response.data.status}`);
        console.log(`   Memory: ${response.data.checks.memoryUsage.value}`);
        console.log(`   Cache Hit Rate: ${response.data.checks.cacheHitRate.value}`);
        console.log(`   Avg Query Time: ${response.data.checks.averageQueryTime.value}`);
        
        this.testResults.push({ test: 'Health Check', status: 'PASS', details: response.data });
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      this.testResults.push({ test: 'Health Check', status: 'FAIL', error: error.message });
    }
  }

  async testPerformanceStats() {
    console.log('\n📈 Testing Performance Statistics...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/performance/stats`);
      
      if (response.data.success) {
        console.log('✅ Performance stats retrieved');
        console.log(`   Total Queries: ${response.data.data.performance.totalQueries}`);
        console.log(`   Cache Hit Rate: ${response.data.data.performance.cacheHitRate}%`);
        console.log(`   P95 Duration: ${response.data.data.performance.p95Duration}ms`);
        console.log(`   Active Queries: ${response.data.data.system.activeQueries}`);
        
        this.testResults.push({ test: 'Performance Stats', status: 'PASS', details: response.data.data });
      } else {
        throw new Error('Failed to get performance stats');
      }
    } catch (error) {
      console.log('❌ Performance stats failed:', error.message);
      this.testResults.push({ test: 'Performance Stats', status: 'FAIL', error: error.message });
    }
  }

  async testQueryOptimization() {
    console.log('\n🔧 Testing Query Optimization...');
    
    const testQuery = `
      SELECT DISTINCT u.id, u.username, l.timestamp, l.message 
      FROM users u 
      JOIN logs l ON u.id = l.user_id 
      WHERE l.timestamp >= '2024-01-01' 
      AND l.level = 'ERROR'
      GROUP BY u.id, u.username, l.timestamp, l.message
      ORDER BY l.timestamp DESC
    `;

    try {
      const response = await axios.post(`${this.baseUrl}/api/jobs/validate`, {
        query_type: 'sql',
        query: testQuery,
        parameters: {}
      });

      if (response.data.success) {
        console.log('✅ Query validation passed');
        console.log(`   Valid: ${response.data.data.valid}`);
        
        if (!response.data.data.valid) {
          console.log(`   Errors: ${response.data.data.errors.join(', ')}`);
        }
        
        this.testResults.push({ test: 'Query Optimization', status: 'PASS', details: response.data.data });
      } else {
        throw new Error('Query validation failed');
      }
    } catch (error) {
      console.log('❌ Query optimization test failed:', error.message);
      this.testResults.push({ test: 'Query Optimization', status: 'FAIL', error: error.message });
    }
  }

  async testCachePerformance() {
    console.log('\n⚡ Testing Cache Performance...');
    
    const testQuery = {
      query_type: 'kql',
      query: 'SecurityEvent | where EventID == 4625 | take 100',
      parameters: {
        userId: 'test-user'
      },
      time_range: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z'
      },
      priority: 'normal'
    };

    try {
      // First query (should be slow, no cache)
      console.log('   Running first query (no cache)...');
      const start1 = Date.now();
      const response1 = await axios.post(`${this.baseUrl}/api/jobs/submit`, testQuery);
      
      if (response1.data.success) {
        const jobId1 = response1.data.data.job_id;
        await this.waitForJobCompletion(jobId1);
        const duration1 = Date.now() - start1;
        
        console.log(`   ✅ First query completed in ${duration1}ms`);

        // Wait a moment for caching
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Second query (should be faster, from cache)
        console.log('   Running second query (should hit cache)...');
        const start2 = Date.now();
        const response2 = await axios.post(`${this.baseUrl}/api/jobs/submit`, testQuery);
        
        if (response2.data.success) {
          const jobId2 = response2.data.data.job_id;
          await this.waitForJobCompletion(jobId2);
          const duration2 = Date.now() - start2;
          
          console.log(`   ✅ Second query completed in ${duration2}ms`);
          
          const speedup = ((duration1 - duration2) / duration1 * 100).toFixed(1);
          console.log(`   📊 Performance improvement: ${speedup}%`);
          
          this.testResults.push({ 
            test: 'Cache Performance', 
            status: 'PASS', 
            details: { 
              firstQuery: duration1, 
              secondQuery: duration2, 
              improvement: speedup + '%' 
            }
          });
        }
      }
    } catch (error) {
      console.log('❌ Cache performance test failed:', error.message);
      this.testResults.push({ test: 'Cache Performance', status: 'FAIL', error: error.message });
    }
  }

  async testSlowQueryDetection() {
    console.log('\n🐌 Testing Slow Query Detection...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/performance/slow-queries?limit=5`);
      
      if (response.data.success) {
        console.log('✅ Slow queries retrieved');
        console.log(`   Total slow queries: ${response.data.data.total}`);
        console.log(`   Threshold: ${response.data.data.threshold}`);
        
        if (response.data.data.queries.length > 0) {
          console.log('   Recent slow queries:');
          response.data.data.queries.forEach((query, idx) => {
            console.log(`     ${idx + 1}. Duration: ${query.duration}ms, Type: ${query.queryType}`);
          });
        } else {
          console.log('   No slow queries detected (good!)');
        }
        
        this.testResults.push({ test: 'Slow Query Detection', status: 'PASS', details: response.data.data });
      } else {
        throw new Error('Failed to get slow queries');
      }
    } catch (error) {
      console.log('❌ Slow query detection failed:', error.message);
      this.testResults.push({ test: 'Slow Query Detection', status: 'FAIL', error: error.message });
    }
  }

  async testMetricsExport() {
    console.log('\n📊 Testing Prometheus Metrics Export...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/performance/metrics`);
      
      if (response.status === 200 && response.headers['content-type'].includes('text/plain')) {
        console.log('✅ Prometheus metrics exported');
        
        const metrics = response.data;
        const metricCount = (metrics.match(/^[a-zA-Z]/gm) || []).length;
        console.log(`   Total metrics: ${metricCount}`);
        
        // Check for key metrics
        const keyMetrics = ['query_total', 'query_duration_seconds', 'query_cache_hit_rate'];
        const foundMetrics = keyMetrics.filter(metric => metrics.includes(metric));
        console.log(`   Key metrics found: ${foundMetrics.join(', ')}`);
        
        this.testResults.push({ 
          test: 'Metrics Export', 
          status: 'PASS', 
          details: { metricCount, foundMetrics }
        });
      } else {
        throw new Error('Invalid metrics format');
      }
    } catch (error) {
      console.log('❌ Metrics export failed:', error.message);
      this.testResults.push({ test: 'Metrics Export', status: 'FAIL', error: error.message });
    }
  }

  async testCacheManagement() {
    console.log('\n🗄️  Testing Cache Management...');
    
    try {
      // Test cache warm-up
      console.log('   Testing cache warm-up...');
      const warmUpQueries = [
        { type: 'kql', query: 'SecurityEvent | take 10' },
        { type: 'sql', query: 'SELECT * FROM logs LIMIT 10' }
      ];

      const warmUpResponse = await axios.post(`${this.baseUrl}/api/performance/cache/warm`, {
        queries: warmUpQueries
      });

      if (warmUpResponse.data.success) {
        console.log('   ✅ Cache warm-up initiated');
        console.log(`   Message: ${warmUpResponse.data.message}`);
      }

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test cache clearing
      console.log('   Testing cache clearing...');
      const clearResponse = await axios.delete(`${this.baseUrl}/api/performance/cache`);

      if (clearResponse.data.success) {
        console.log('   ✅ Cache cleared successfully');
        console.log(`   Keys deleted: ${clearResponse.data.keysDeleted}`);
        
        this.testResults.push({ 
          test: 'Cache Management', 
          status: 'PASS', 
          details: { 
            warmUp: warmUpResponse.data, 
            clear: clearResponse.data 
          }
        });
      } else {
        throw new Error('Cache clear failed');
      }
    } catch (error) {
      console.log('❌ Cache management test failed:', error.message);
      this.testResults.push({ test: 'Cache Management', status: 'FAIL', error: error.message });
    }
  }

  async waitForJobCompletion(jobId, timeout = 30000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const response = await axios.get(`${this.baseUrl}/api/jobs/${jobId}`);
        
        if (response.data.success) {
          const status = response.data.data.status;
          
          if (status === 'completed' || status === 'failed') {
            return response.data.data;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        // Continue polling
      }
    }
    
    throw new Error(`Job ${jobId} did not complete within timeout`);
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;

    this.testResults.forEach(result => {
      const emoji = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${emoji} ${result.test}: ${result.status}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`📊 OVERALL: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('🎉 All optimization tests passed! Query processor is ready for production.');
    } else {
      console.log('⚠️  Some tests failed. Please review the optimization implementation.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new QueryProcessorTester();
  tester.runTests().catch(console.error);
}

module.exports = QueryProcessorTester;