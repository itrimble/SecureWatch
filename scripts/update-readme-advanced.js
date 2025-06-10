#!/usr/bin/env node

/**
 * SecureWatch Advanced README Auto-Updater
 *
 * This enhanced script fetches real-time data from GitHub API and other sources
 * to update the README with accurate metrics and information.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// For GitHub API (install via: npm install axios)
let axios;
try {
  axios = require('axios');
} catch (e) {
  console.warn('⚠️  axios not available, using basic mode');
}

class AdvancedSecureWatchREADMEUpdater {
  constructor() {
    this.currentDate = new Date().toISOString();
    this.shortDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    this.githubToken = process.env.GITHUB_TOKEN;
    this.repoName = process.env.GITHUB_REPOSITORY || 'itrimble/SecureWatch';
  }

  /**
   * Fetch real GitHub metrics
   */
  async fetchGitHubMetrics() {
    if (!axios || !this.githubToken) {
      console.log('📊 Using offline metrics calculation');
      return this.calculateOfflineMetrics();
    }

    try {
      const headers = {
        Authorization: `token ${this.githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      };

      // Fetch repository info
      const repoResponse = await axios.get(
        `https://api.github.com/repos/${this.repoName}`,
        { headers }
      );
      const repo = repoResponse.data;

      // Fetch latest release
      let latestRelease = null;
      try {
        const releaseResponse = await axios.get(
          `https://api.github.com/repos/${this.repoName}/releases/latest`,
          { headers }
        );
        latestRelease = releaseResponse.data;
      } catch (e) {
        console.log('No releases found');
      }

      // Fetch workflow runs
      let buildStatus = 'unknown';
      try {
        const workflowResponse = await axios.get(
          `https://api.github.com/repos/${this.repoName}/actions/runs?per_page=1&status=completed`,
          { headers }
        );
        if (workflowResponse.data.workflow_runs.length > 0) {
          buildStatus =
            workflowResponse.data.workflow_runs[0].conclusion === 'success'
              ? 'passing'
              : 'failing';
        }
      } catch (e) {
        console.log('Could not fetch workflow status');
      }

      // Fetch contributors
      let contributorCount = 0;
      try {
        const contributorsResponse = await axios.get(
          `https://api.github.com/repos/${this.repoName}/contributors`,
          { headers }
        );
        contributorCount = contributorsResponse.data.length;
      } catch (e) {
        console.log('Could not fetch contributors');
      }

      // Fetch commit activity
      let lastCommitDate = this.shortDate;
      try {
        const commitsResponse = await axios.get(
          `https://api.github.com/repos/${this.repoName}/commits?per_page=1`,
          { headers }
        );
        if (commitsResponse.data.length > 0) {
          lastCommitDate = new Date(
            commitsResponse.data[0].commit.author.date
          ).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      } catch (e) {
        console.log('Could not fetch last commit');
      }

      console.log('✅ Fetched real-time GitHub metrics');
      return {
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        watchers: repo.subscribers_count || 0,
        issues: repo.open_issues_count || 0,
        size: repo.size || 0,
        language: repo.language || 'TypeScript',
        contributorCount,
        lastCommitDate,
        buildStatus,
        latestRelease: latestRelease
          ? {
              version: latestRelease.tag_name,
              date: new Date(latestRelease.published_at).toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }
              ),
              downloads: latestRelease.assets.reduce(
                (total, asset) => total + asset.download_count,
                0
              ),
            }
          : null,
      };
    } catch (error) {
      console.warn(
        '⚠️  GitHub API error, falling back to offline metrics:',
        error.message
      );
      return this.calculateOfflineMetrics();
    }
  }

  /**
   * Calculate metrics without API access
   */
  calculateOfflineMetrics() {
    const metrics = {
      stars: 0,
      forks: 0,
      watchers: 0,
      issues: 0,
      size: 0,
      language: 'TypeScript',
      contributorCount: 1,
      lastCommitDate: this.shortDate,
      buildStatus: 'passing',
      latestRelease: null,
    };

    try {
      // Get last commit date
      const lastCommit = execSync('git log -1 --format=%cd --date=short', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      metrics.lastCommitDate = new Date(lastCommit.trim()).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }
      );
    } catch (e) {
      console.warn('Could not get git info');
    }

    return metrics;
  }

  /**
   * Update README with advanced metrics
   */
  async updateWithAdvancedMetrics(content) {
    const metrics = await this.fetchGitHubMetrics();

    // Update badges with real data
    content = content.replace(
      /Stars.*?github\.com\/itrimble\/SecureWatch\?style=social/,
      `Stars](https://img.shields.io/github/stars/itrimble/SecureWatch?style=social&label=⭐%20${metrics.stars})](https://github.com/itrimble/SecureWatch`
    );

    content = content.replace(
      /Forks.*?github\.com\/itrimble\/SecureWatch\?style=social/,
      `Forks](https://img.shields.io/github/forks/itrimble/SecureWatch?style=social&label=🍴%20${metrics.forks})](https://github.com/itrimble/SecureWatch`
    );

    content = content.replace(
      /Contributors.*?github\.com\/itrimble\/SecureWatch\/graphs\/contributors/,
      `Contributors](https://img.shields.io/github/contributors/itrimble/SecureWatch?label=👥%20${metrics.contributorCount})](https://github.com/itrimble/SecureWatch/graphs/contributors`
    );

    // Update build status badge
    const buildColor =
      metrics.buildStatus === 'passing' ? 'brightgreen' : 'red';
    content = content.replace(
      /build-[a-z]+-[a-z]+/g,
      `build-${metrics.buildStatus}-${buildColor}`
    );

    // Add metrics section
    const metricsSection = this.generateMetricsSection(metrics);

    // Insert metrics before the final section
    const beforeFinalSection = content.lastIndexOf('---');
    if (beforeFinalSection !== -1) {
      const before = content.substring(0, beforeFinalSection);
      const after = content.substring(beforeFinalSection);
      content = before + metricsSection + '\n\n' + after;
    }

    console.log('📊 Updated README with advanced metrics');
    return content;
  }

  /**
   * Generate metrics section
   */
  generateMetricsSection(metrics) {
    return `## 📈 Platform Metrics & Statistics

<div align="center">

### 🚀 Repository Stats
| Metric | Value | Last Updated |
|--------|-------|--------------|
| ⭐ GitHub Stars | **${metrics.stars.toLocaleString()}** | ${this.shortDate} |
| 🍴 Forks | **${metrics.forks.toLocaleString()}** | ${this.shortDate} |
| 👁️ Watchers | **${metrics.watchers.toLocaleString()}** | ${this.shortDate} |
| 🐛 Open Issues | **${metrics.issues.toLocaleString()}** | ${this.shortDate} |
| 👥 Contributors | **${metrics.contributorCount.toLocaleString()}** | ${this.shortDate} |
| 📁 Repository Size | **${(metrics.size / 1024).toFixed(1)} MB** | ${this.shortDate} |

### 🔧 Development Activity
| Metric | Status | Details |
|--------|--------|---------|
| 🏗️ Build Status | **${metrics.buildStatus.toUpperCase()}** | Automated CI/CD Pipeline |
| 📅 Last Commit | **${metrics.lastCommitDate}** | Active Development |
| 🌐 Primary Language | **${metrics.language}** | Type-Safe Codebase |
| 🔄 Auto-Updates | **Every 6 Hours** | README Automation |

${
  metrics.latestRelease
    ? `### 🎉 Latest Release
| Details | Information |
|---------|-------------|
| 📦 Version | **${metrics.latestRelease.version}** |
| 📅 Release Date | **${metrics.latestRelease.date}** |
| 📥 Downloads | **${metrics.latestRelease.downloads.toLocaleString()}** |`
    : ''
}

</div>

> 🤖 **Automated Metrics**: This section is automatically updated every 6 hours using GitHub Actions and real-time API data.

`;
  }

  /**
   * Main execution function
   */
  async run() {
    try {
      console.log('🚀 Starting Advanced SecureWatch README update...');

      const readmeContent = fs.readFileSync(
        '/Users/ian/Scripts/SecureWatch/README.md',
        'utf8'
      );
      let updatedContent = readmeContent;

      // Apply advanced updates
      updatedContent = await this.updateWithAdvancedMetrics(updatedContent);

      // Apply basic updates from the original script
      updatedContent = await this.updateLastUpdated(updatedContent);
      updatedContent = await this.updateVersionInfo(updatedContent);
      updatedContent = await this.updateServiceCount(updatedContent);

      // Write the updated content back
      fs.writeFileSync(
        '/Users/ian/Scripts/SecureWatch/README.md',
        updatedContent,
        'utf8'
      );

      console.log('✅ Advanced README.md update completed!');
      console.log(`📅 Updated on: ${this.shortDate}`);
    } catch (error) {
      console.error('❌ Error in advanced update:', error);
      process.exit(1);
    }
  }

  /**
   * Update last updated timestamp
   */
  async updateLastUpdated(content) {
    const timestamp = `Last auto-updated: ${this.shortDate}`;

    const lines = content.split('\n');
    const lastLineIndex = lines.length - 1;

    const timestampPattern = /Last auto-updated:/;
    const existingTimestampIndex = lines.findIndex((line) =>
      timestampPattern.test(line)
    );

    if (existingTimestampIndex !== -1) {
      lines[existingTimestampIndex] = `> ${timestamp}`;
    } else {
      lines.splice(lastLineIndex, 0, '', `> ${timestamp}`);
    }

    return lines.join('\n');
  }

  /**
   * Update version information from package.json
   */
  async updateVersionInfo(content) {
    try {
      const packageJson = JSON.parse(
        fs.readFileSync('/Users/ian/Scripts/SecureWatch/package.json', 'utf8')
      );
      const version = packageJson.version || '2.2.0';

      content = content.replace(
        /version-[0-9]+\.[0-9]+\.[0-9]+-blue/g,
        `version-${version}-blue`
      );
      content = content.replace(/v[0-9]+\.[0-9]+\.[0-9]+/g, `v${version}`);

      console.log(`📦 Updated version to: v${version}`);
    } catch (error) {
      console.warn('⚠️  Could not update version info:', error.message);
    }

    return content;
  }

  /**
   * Count and update service information
   */
  async updateServiceCount(content) {
    try {
      const appsDir = '/Users/ian/Scripts/SecureWatch/apps';
      if (fs.existsSync(appsDir)) {
        const services = fs.readdirSync(appsDir).filter((dir) => {
          const dirPath = path.join(appsDir, dir);
          return (
            fs.statSync(dirPath).isDirectory() &&
            fs.existsSync(path.join(dirPath, 'package.json'))
          );
        });

        const serviceCount = services.length;
        content = content.replace(
          /services-[0-9]+%20core-orange/g,
          `services-${serviceCount}%20core-orange`
        );
        content = content.replace(
          /[0-9]+ core services/g,
          `${serviceCount} core services`
        );

        console.log(`🔧 Updated service count to: ${serviceCount}`);
      }
    } catch (error) {
      console.warn('⚠️  Could not update service count:', error.message);
    }

    return content;
  }
}

// Execute the advanced updater
const updater = new AdvancedSecureWatchREADMEUpdater();
updater.run().catch(console.error);
