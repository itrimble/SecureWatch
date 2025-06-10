// playwright-interactivity-analysis.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class SecureWatchInteractivityAnalyzer {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      pages: {},
      summary: {
        totalElements: 0,
        workingElements: 0,
        brokenElements: 0,
        missingHandlers: 0,
        patterns: [],
        recommendations: [],
      },
    };
    this.baseUrl = 'http://localhost:4000';

    // Define all SecureWatch pages to test
    this.pages = [
      { path: '/', name: 'Home/Landing' },
      { path: '/dashboard', name: 'Main Dashboard' },
      { path: '/explorer', name: 'Search/Explorer' },
      { path: '/alerts', name: 'Alerts' },
      { path: '/alert-fatigue', name: 'Alert Fatigue' },
      { path: '/correlation', name: 'Correlation Engine' },
      { path: '/visualizations', name: 'Visualizations' },
      { path: '/marketplace', name: 'MCP Marketplace' },
      { path: '/notifications', name: 'Notifications' },
      { path: '/field-extraction', name: 'Field Extraction' },
      { path: '/incident-investigation', name: 'Incident Investigation' },
      { path: '/kql-analytics', name: 'KQL Analytics' },
      { path: '/education', name: 'Education Portal' },
      { path: '/reporting', name: 'Reporting' },
      { path: '/quick-start', name: 'Quick Start' },
      { path: '/settings', name: 'Settings' },
      { path: '/settings/log-sources', name: 'Log Sources Settings' },
      { path: '/settings/integrations', name: 'Integrations Settings' },
      { path: '/settings/rbac', name: 'RBAC Settings' },
      { path: '/settings/admin-users', name: 'Admin Users' },
      { path: '/settings/platform-status', name: 'Platform Status' },
      { path: '/settings/knowledge/lookups', name: 'Lookup Tables' },
      { path: '/auth', name: 'Authentication' },
      { path: '/auth-test', name: 'Auth Test' },
    ];

    // Define interactive element selectors
    this.interactiveSelectors = [
      // Buttons
      'button',
      '[role="button"]',
      'input[type="button"]',
      'input[type="submit"]',

      // Links
      'a[href]',
      '[role="link"]',

      // Navigation elements
      'nav a',
      '[role="navigation"] a',
      '.sidebar a',
      '.nav-item',
      '.menu-item',

      // Form controls
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      'input[type="search"]',
      'input[type="checkbox"]',
      'input[type="radio"]',
      'select',
      'textarea',

      // Interactive components
      '.clickable',
      '[data-testid*="button"]',
      '[data-testid*="link"]',
      '[onclick]',

      // Tabs and accordions
      '[role="tab"]',
      '[role="tabpanel"]',
      '[role="button"][aria-expanded]',

      // Dropdowns and menus
      '[role="menuitem"]',
      '[role="option"]',
      '.dropdown-item',

      // Cards and panels that might be clickable
      '.card[onclick]',
      '.panel[onclick]',
      '[data-clickable="true"]',

      // Icons that might be interactive
      'svg[onclick]',
      '.icon[onclick]',
      '[data-icon][onclick]',
    ];
  }

  async initialize() {
    console.log('🚀 Starting SecureWatch Interactivity Analysis...');
    this.browser = await chromium.launch({
      headless: false, // Set to true for CI/production
      slowMo: 100, // Slow down for better observation
    });
    this.page = await this.browser.newPage();

    // Set viewport for consistent testing
    await this.page.setViewportSize({ width: 1920, height: 1080 });

    // Add console logging to catch JavaScript errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    // Track failed requests
    this.page.on('requestfailed', (request) => {
      console.log('🔥 Failed Request:', request.url());
    });
  }

  async analyzePage(pageInfo) {
    const { path, name } = pageInfo;
    console.log(`\n📄 Analyzing page: ${name} (${path})`);

    const pageResults = {
      name,
      path,
      url: `${this.baseUrl}${path}`,
      elements: [],
      issues: [],
      screenshots: [],
      loadTime: 0,
      errors: [],
    };

    try {
      const startTime = Date.now();

      // Navigate to page
      const response = await this.page.goto(`${this.baseUrl}${path}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      pageResults.loadTime = Date.now() - startTime;

      if (!response.ok()) {
        pageResults.errors.push(
          `HTTP ${response.status()}: ${response.statusText()}`
        );
        return pageResults;
      }

      // Wait for page to be fully loaded
      await this.page.waitForTimeout(2000);

      // Take initial screenshot
      const screenshotPath = `screenshots/${name.replace(/[^a-zA-Z0-9]/g, '_')}_initial.png`;
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      pageResults.screenshots.push(screenshotPath);

      // Find all interactive elements
      const elements = await this.findInteractiveElements();

      console.log(`  Found ${elements.length} interactive elements`);

      // Test each element
      for (let i = 0; i < elements.length; i++) {
        const elementResult = await this.testElement(elements[i], i);
        pageResults.elements.push(elementResult);

        if (!elementResult.working) {
          pageResults.issues.push(elementResult);
        }
      }
    } catch (error) {
      console.error(`❌ Error analyzing page ${name}:`, error.message);
      pageResults.errors.push(error.message);
    }

    return pageResults;
  }

  async findInteractiveElements() {
    const elements = [];

    for (const selector of this.interactiveSelectors) {
      try {
        const foundElements = await this.page.$$(selector);

        for (const element of foundElements) {
          const elementInfo = await this.getElementInfo(element);
          if (elementInfo && this.isValidInteractiveElement(elementInfo)) {
            elements.push({
              element,
              selector,
              ...elementInfo,
            });
          }
        }
      } catch (error) {
        // Some selectors might not exist on all pages
        console.log(`⚠️  Selector ${selector} failed: ${error.message}`);
      }
    }

    return elements;
  }

  async getElementInfo(element) {
    try {
      const info = await element.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tagName: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 50) || '',
          href: el.href || '',
          type: el.type || '',
          role: el.getAttribute('role') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          className: el.className || '',
          id: el.id || '',
          disabled: el.disabled || false,
          visible:
            rect.width > 0 &&
            rect.height > 0 &&
            window.getComputedStyle(el).visibility !== 'hidden' &&
            window.getComputedStyle(el).display !== 'none',
          hasClickHandler:
            typeof el.onclick === 'function' ||
            el.getAttribute('onclick') !== null ||
            el.hasAttribute('data-testid') ||
            el.getAttribute('role') === 'button' ||
            el.tagName.toLowerCase() === 'button' ||
            el.tagName.toLowerCase() === 'a',
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        };
      });

      return info;
    } catch (error) {
      console.log(`⚠️  Failed to get element info: ${error.message}`);
      return null;
    }
  }

  isValidInteractiveElement(elementInfo) {
    // Filter out non-interactive or hidden elements
    return (
      elementInfo.visible &&
      elementInfo.boundingBox.width > 10 &&
      elementInfo.boundingBox.height > 10 &&
      !elementInfo.disabled
    );
  }

  async testElement(elementData, index) {
    const { element, selector, ...elementInfo } = elementData;

    console.log(
      `    Testing element ${index + 1}: ${elementInfo.tagName} - "${elementInfo.text}"`
    );

    const result = {
      index: index + 1,
      selector,
      elementInfo,
      working: false,
      issues: [],
      response: null,
      clickable: false,
      hasHandler: false,
      visualFeedback: false,
    };

    try {
      // Check if element has click handler
      result.hasHandler = elementInfo.hasClickHandler;

      if (
        !result.hasHandler &&
        elementInfo.tagName !== 'input' &&
        elementInfo.tagName !== 'select' &&
        elementInfo.tagName !== 'textarea'
      ) {
        result.issues.push('No click handler detected');
      }

      // Test clickability
      const isClickable =
        (await element.isEnabled()) && (await element.isVisible());
      result.clickable = isClickable;

      if (!isClickable) {
        result.issues.push('Element not clickable (disabled or hidden)');
        return result;
      }

      // Scroll element into view
      await element.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);

      // Test interaction based on element type
      if (elementInfo.tagName === 'input') {
        result.response = await this.testInputElement(element, elementInfo);
      } else if (elementInfo.tagName === 'select') {
        result.response = await this.testSelectElement(element);
      } else if (elementInfo.tagName === 'textarea') {
        result.response = await this.testTextareaElement(element);
      } else {
        result.response = await this.testClickElement(element, elementInfo);
      }

      // Check for visual feedback after interaction
      await this.page.waitForTimeout(1000);
      result.visualFeedback = await this.checkVisualFeedback(element);

      // Determine if element is working
      result.working =
        result.response.success &&
        (result.hasHandler || this.isFormElement(elementInfo.tagName)) &&
        result.clickable;

      if (!result.working && result.issues.length === 0) {
        result.issues.push('Element appears non-functional');
      }
    } catch (error) {
      result.issues.push(`Interaction failed: ${error.message}`);
      console.log(`    ❌ Error testing element: ${error.message}`);
    }

    return result;
  }

  async testClickElement(element, elementInfo) {
    try {
      // Record initial state
      const initialUrl = this.page.url();
      const initialContent = await this.page.content();

      // Attempt click
      await element.click({ timeout: 5000 });
      await this.page.waitForTimeout(1500);

      // Check for changes
      const newUrl = this.page.url();
      const newContent = await this.page.content();

      const urlChanged = newUrl !== initialUrl;
      const contentChanged = newContent !== initialContent;

      return {
        success: true,
        action: 'click',
        urlChanged,
        contentChanged,
        newUrl: urlChanged ? newUrl : null,
        changes: urlChanged || contentChanged,
      };
    } catch (error) {
      return {
        success: false,
        action: 'click',
        error: error.message,
      };
    }
  }

  async testInputElement(element, elementInfo) {
    try {
      const testValue = this.getTestValue(elementInfo.type);

      await element.clear();
      await element.type(testValue);

      const value = await element.inputValue();

      return {
        success: value === testValue,
        action: 'input',
        testValue,
        actualValue: value,
        changes: true,
      };
    } catch (error) {
      return {
        success: false,
        action: 'input',
        error: error.message,
      };
    }
  }

  async testSelectElement(element) {
    try {
      const options = await element.$$('option');
      if (options.length > 1) {
        await element.selectOption({ index: 1 });
        return {
          success: true,
          action: 'select',
          changes: true,
        };
      }
      return {
        success: false,
        action: 'select',
        error: 'No options available',
      };
    } catch (error) {
      return {
        success: false,
        action: 'select',
        error: error.message,
      };
    }
  }

  async testTextareaElement(element) {
    try {
      const testValue = 'Test content for textarea';
      await element.clear();
      await element.type(testValue);

      const value = await element.inputValue();

      return {
        success: value === testValue,
        action: 'textarea',
        changes: true,
      };
    } catch (error) {
      return {
        success: false,
        action: 'textarea',
        error: error.message,
      };
    }
  }

  async checkVisualFeedback(element) {
    try {
      // Check for common visual feedback indicators
      const feedback = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        return {
          hasActiveState: el.matches(':active'),
          hasFocusState: el.matches(':focus'),
          hasHoverState: el.matches(':hover'),
          opacity: styles.opacity,
          transform: styles.transform,
          backgroundColor: styles.backgroundColor,
          borderColor: styles.borderColor,
          cursor: styles.cursor,
        };
      });

      return (
        feedback.hasActiveState ||
        feedback.hasFocusState ||
        feedback.cursor === 'pointer' ||
        feedback.transform !== 'none'
      );
    } catch (error) {
      return false;
    }
  }

  getTestValue(inputType) {
    const testValues = {
      text: 'test input',
      email: 'test@example.com',
      password: 'testpass123',
      search: 'test search',
      number: '123',
      tel: '123-456-7890',
      url: 'https://example.com',
    };
    return testValues[inputType] || 'test';
  }

  isFormElement(tagName) {
    return ['input', 'select', 'textarea', 'button'].includes(tagName);
  }

  async generateReport() {
    console.log('\n📊 Generating comprehensive report...');

    const timestamp = new Date().toISOString();
    const reportData = {
      metadata: {
        timestamp,
        baseUrl: this.baseUrl,
        totalPages: this.pages.length,
        ...this.results.summary,
      },
      pages: this.results.pages,
      patterns: this.analyzePatterns(),
      recommendations: this.generateRecommendations(),
    };

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(reportData);
    const htmlPath = `reports/interactivity-analysis-${timestamp.split('T')[0]}.html`;
    fs.writeFileSync(htmlPath, htmlReport);

    // Generate JSON report
    const jsonPath = `reports/interactivity-analysis-${timestamp.split('T')[0]}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));

    console.log(`📄 Reports generated:`);
    console.log(`   HTML: ${htmlPath}`);
    console.log(`   JSON: ${jsonPath}`);

    return reportData;
  }

  analyzePatterns() {
    const patterns = [];
    const allElements = [];

    // Collect all elements from all pages
    Object.values(this.results.pages).forEach((page) => {
      allElements.push(...page.elements);
    });

    // Pattern: Missing click handlers
    const missingHandlers = allElements.filter(
      (el) => !el.hasHandler && !this.isFormElement(el.elementInfo.tagName)
    );
    if (missingHandlers.length > 0) {
      patterns.push({
        type: 'Missing Click Handlers',
        count: missingHandlers.length,
        description: 'Interactive-looking elements without click handlers',
        severity: 'high',
      });
    }

    // Pattern: Non-working buttons
    const brokenButtons = allElements.filter(
      (el) => el.elementInfo.tagName === 'button' && !el.working
    );
    if (brokenButtons.length > 0) {
      patterns.push({
        type: 'Non-functional Buttons',
        count: brokenButtons.length,
        description: "Buttons that don't respond to clicks",
        severity: 'critical',
      });
    }

    // Pattern: Links without href
    const badLinks = allElements.filter(
      (el) => el.elementInfo.tagName === 'a' && !el.elementInfo.href
    );
    if (badLinks.length > 0) {
      patterns.push({
        type: 'Links Without Href',
        count: badLinks.length,
        description: 'Anchor tags without proper href attributes',
        severity: 'medium',
      });
    }

    return patterns;
  }

  generateRecommendations() {
    const recommendations = [];
    const patterns = this.analyzePatterns();

    patterns.forEach((pattern) => {
      switch (pattern.type) {
        case 'Missing Click Handlers':
          recommendations.push({
            priority: 'High',
            title: 'Add Click Handlers to Interactive Elements',
            description: `${pattern.count} elements appear clickable but lack proper event handlers`,
            action:
              'Add onClick handlers or convert to proper button/link elements',
          });
          break;

        case 'Non-functional Buttons':
          recommendations.push({
            priority: 'Critical',
            title: 'Fix Non-functional Buttons',
            description: `${pattern.count} buttons don't respond to user interaction`,
            action: 'Implement proper button functionality and event handlers',
          });
          break;

        case 'Links Without Href':
          recommendations.push({
            priority: 'Medium',
            title: 'Fix Navigation Links',
            description: `${pattern.count} links are missing href attributes`,
            action:
              'Add proper href attributes or convert to buttons for actions',
          });
          break;
      }
    });

    // Universal navigation recommendation
    recommendations.push({
      priority: 'High',
      title: 'Implement Universal Navigation Header',
      description:
        'Add consistent navigation across all pages as identified in UX analysis',
      action:
        'Create UniversalNavigation component and apply to all page layouts',
    });

    return recommendations;
  }

  generateHTMLReport(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SecureWatch Interactivity Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1a1d21; border-bottom: 3px solid #ff4444; padding-bottom: 10px; }
        h2 { color: #252a31; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #ff4444; }
        .stat-label { color: #666; margin-top: 5px; }
        .page-section { margin: 30px 0; padding: 20px; border: 1px solid #eee; border-radius: 6px; }
        .element-list { max-height: 400px; overflow-y: auto; }
        .element-item { padding: 10px; margin: 5px 0; border-left: 4px solid #ddd; background: #f9f9f9; }
        .element-item.working { border-left-color: #28a745; }
        .element-item.broken { border-left-color: #dc3545; }
        .issues { color: #dc3545; font-size: 0.9em; margin-top: 5px; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
        .priority-critical { border-left: 4px solid #dc3545; }
        .priority-high { border-left: 4px solid #fd7e14; }
        .priority-medium { border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 SecureWatch Interactivity Analysis Report</h1>
        <p><strong>Generated:</strong> ${data.metadata.timestamp}</p>
        <p><strong>Base URL:</strong> ${data.metadata.baseUrl}</p>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${data.metadata.totalPages}</div>
                <div class="stat-label">Pages Tested</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.metadata.totalElements}</div>
                <div class="stat-label">Total Elements</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.metadata.workingElements}</div>
                <div class="stat-label">Working Elements</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.metadata.brokenElements}</div>
                <div class="stat-label">Broken Elements</div>
            </div>
        </div>

        <h2>🚨 Critical Issues & Recommendations</h2>
        <div class="recommendations">
            ${data.recommendations
              .map(
                (rec) => `
                <div class="recommendation priority-${rec.priority.toLowerCase()}">
                    <strong>${rec.title}</strong> (${rec.priority} Priority)<br>
                    ${rec.description}<br>
                    <em>Action: ${rec.action}</em>
                </div>
            `
              )
              .join('')}
        </div>

        <h2>📊 Patterns Identified</h2>
        ${data.patterns
          .map(
            (pattern) => `
            <div class="pattern">
                <strong>${pattern.type}:</strong> ${pattern.count} instances - ${pattern.description}
            </div>
        `
          )
          .join('')}

        <h2>📄 Page-by-Page Analysis</h2>
        ${Object.values(data.pages)
          .map(
            (page) => `
            <div class="page-section">
                <h3>${page.name} (${page.path})</h3>
                <p><strong>Load Time:</strong> ${page.loadTime}ms</p>
                <p><strong>Elements Found:</strong> ${page.elements.length}</p>
                <p><strong>Issues:</strong> ${page.issues.length}</p>
                
                ${
                  page.errors.length > 0
                    ? `
                    <div class="errors">
                        <strong>Errors:</strong>
                        <ul>${page.errors.map((error) => `<li>${error}</li>`).join('')}</ul>
                    </div>
                `
                    : ''
                }
                
                <div class="element-list">
                    ${page.elements
                      .map(
                        (el) => `
                        <div class="element-item ${el.working ? 'working' : 'broken'}">
                            <strong>${el.elementInfo.tagName}</strong> - "${el.elementInfo.text}" 
                            ${el.working ? '✅' : '❌'}
                            ${el.issues.length > 0 ? `<div class="issues">Issues: ${el.issues.join(', ')}</div>` : ''}
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        `
          )
          .join('')}
    </div>
</body>
</html>`;
  }

  async run() {
    try {
      await this.initialize();

      // Create output directories
      fs.mkdirSync('screenshots', { recursive: true });
      fs.mkdirSync('reports', { recursive: true });

      // Test each page
      for (const pageInfo of this.pages) {
        const pageResults = await this.analyzePage(pageInfo);
        this.results.pages[pageInfo.path] = pageResults;

        // Update summary statistics
        this.results.summary.totalElements += pageResults.elements.length;
        this.results.summary.workingElements += pageResults.elements.filter(
          (el) => el.working
        ).length;
        this.results.summary.brokenElements += pageResults.elements.filter(
          (el) => !el.working
        ).length;
        this.results.summary.missingHandlers += pageResults.elements.filter(
          (el) => !el.hasHandler
        ).length;
      }

      // Generate final report
      const report = await this.generateReport();

      console.log('\n🎉 Analysis Complete!');
      console.log(
        `📊 Summary: ${this.results.summary.workingElements}/${this.results.summary.totalElements} elements working properly`
      );

      return report;
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the analysis
(async () => {
  const analyzer = new SecureWatchInteractivityAnalyzer();
  await analyzer.run();
})();
