#!/usr/bin/env node

/**
 * SecureWatch Concurrency Optimization Script
 * 
 * Automatically detects system architecture and optimizes turbo.json
 * concurrency settings for optimal build performance.
 * 
 * Usage:
 *   node scripts/optimize-concurrency.js
 *   npm run optimize:concurrency
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

function detectOptimalConcurrency() {
  const arch = os.arch();
  const platform = os.platform();
  const cpuCores = os.cpus().length;
  const totalMemory = os.totalmem() / (1024 * 1024 * 1024); // GB
  
  let multiplier;
  let description;
  
  // Architecture-specific multipliers
  if (arch === 'arm64' && platform === 'darwin') {
    multiplier = 1.5; // Apple Silicon
    description = 'Apple Silicon (ARM64 Darwin)';
  } else if (arch === 'x64') {
    multiplier = 1.3; // Intel/AMD
    description = platform === 'darwin' ? 'Intel Mac (x64 Darwin)' : 'Intel/AMD (x64)';
  } else if (arch.includes('mips')) {
    multiplier = 0.9; // MIPS embedded
    description = 'MIPS embedded system';
  } else if (arch.includes('arm')) {
    multiplier = 0.8; // ARM32
    description = 'ARM32 (Raspberry Pi)';
  } else {
    multiplier = 1.0; // Conservative default
    description = 'Unknown architecture (conservative)';
  }
  
  const concurrency = Math.max(1, Math.floor(cpuCores * multiplier));
  
  // Memory constraint check (conservative 2GB per concurrent task)
  const memoryLimitedConcurrency = Math.floor(totalMemory / 2);
  
  const finalConcurrency = Math.min(concurrency, memoryLimitedConcurrency);
  
  return {
    concurrency: finalConcurrency,
    description,
    cpuCores,
    totalMemory: totalMemory.toFixed(1),
    multiplier,
    memoryLimited: finalConcurrency === memoryLimitedConcurrency
  };
}

function updateTurboConfig() {
  const turboConfigPath = path.join(process.cwd(), 'turbo.json');
  
  if (!fs.existsSync(turboConfigPath)) {
    console.error('❌ turbo.json not found in current directory');
    console.error('   Make sure you\'re running this from the SecureWatch root directory');
    process.exit(1);
  }
  
  let config;
  try {
    config = JSON.parse(fs.readFileSync(turboConfigPath, 'utf8'));
  } catch (error) {
    console.error('❌ Failed to parse turbo.json:', error.message);
    process.exit(1);
  }
  
  const optimization = detectOptimalConcurrency();
  const originalConcurrency = config.concurrency;
  
  config.concurrency = optimization.concurrency;
  
  try {
    fs.writeFileSync(turboConfigPath, JSON.stringify(config, null, 2) + '\n');
  } catch (error) {
    console.error('❌ Failed to write turbo.json:', error.message);
    process.exit(1);
  }
  
  // Display results
  console.log('🚀 SecureWatch Concurrency Optimization');
  console.log('=====================================');
  console.log(`Architecture: ${optimization.description}`);
  console.log(`CPU cores: ${optimization.cpuCores}`);
  console.log(`Total memory: ${optimization.totalMemory}GB`);
  console.log(`Multiplier: ${optimization.multiplier}x`);
  console.log('');
  
  if (optimization.memoryLimited) {
    console.log(`⚠️  Memory-limited concurrency: ${optimization.concurrency}`);
    console.log('   Consider upgrading memory for better performance');
  } else {
    console.log(`✅ Optimal concurrency: ${optimization.concurrency}`);
  }
  
  if (originalConcurrency !== undefined) {
    if (originalConcurrency === optimization.concurrency) {
      console.log(`📊 No change needed (was: ${originalConcurrency})`);
    } else {
      console.log(`📊 Updated: ${originalConcurrency} → ${optimization.concurrency}`);
    }
  } else {
    console.log(`📊 Added concurrency setting: ${optimization.concurrency}`);
  }
  
  console.log('');
  console.log('💡 Performance Tips:');
  console.log('   • Use "npm run build:optimized" for memory-optimized builds');
  console.log('   • Monitor performance with "npm run performance:monitor"');
  console.log('   • Validate performance with "npm run performance:validate"');
  
  return optimization;
}

function generatePerformanceRecommendations(optimization) {
  console.log('');
  console.log('📈 Performance Recommendations');
  console.log('==============================');
  
  // Memory recommendations
  const recommendedMemory = optimization.concurrency * 2;
  if (optimization.totalMemory < recommendedMemory) {
    console.log(`💾 Memory: Current ${optimization.totalMemory}GB, recommended ${recommendedMemory}GB`);
    console.log('   Consider upgrading for optimal performance');
  } else {
    console.log(`💾 Memory: ${optimization.totalMemory}GB (sufficient)`);
  }
  
  // Node.js memory recommendations
  const nodeMemory = Math.min(8192, optimization.concurrency * 512);
  console.log(`🟢 Node.js memory: --max-old-space-size=${nodeMemory}`);
  
  // UV thread pool recommendations
  const uvThreadPool = optimization.cpuCores + 4;
  console.log(`🧵 UV thread pool: UV_THREADPOOL_SIZE=${uvThreadPool}`);
  
  // Environment-specific tips
  if (optimization.description.includes('Apple Silicon')) {
    console.log('');
    console.log('🍎 Apple Silicon Tips:');
    console.log('   • Efficient ARM64 architecture allows sustained high concurrency');
    console.log('   • Consider enabling turbo cache for fastest incremental builds');
    console.log('   • Monitor thermal throttling with Activity Monitor');
  }
  
  if (optimization.description.includes('Intel') || optimization.description.includes('AMD')) {
    console.log('');
    console.log('⚡ x86_64 Tips:');
    console.log('   • Monitor CPU temperature during intensive builds');
    console.log('   • Consider SSD storage for faster I/O operations');
    console.log('   • Use task manager to monitor memory pressure');
  }
  
  if (optimization.description.includes('ARM32') || optimization.description.includes('MIPS')) {
    console.log('');
    console.log('🔧 Embedded System Tips:');
    console.log('   • Use swap file for memory-intensive builds');
    console.log('   • Consider build caching to reduce rebuild frequency');
    console.log('   • Monitor storage space during builds');
  }
}

if (require.main === module) {
  try {
    const optimization = updateTurboConfig();
    generatePerformanceRecommendations(optimization);
    
    console.log('');
    console.log('✅ Concurrency optimization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Optimization failed:', error.message);
    process.exit(1);
  }
}

module.exports = { detectOptimalConcurrency, updateTurboConfig };