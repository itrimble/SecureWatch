# SecureWatch Interactivity Analysis Scripts

## Overview

This directory contains Playwright scripts for analyzing the SecureWatch web application's UI/UX and interactivity. These scripts help identify broken interactive elements, missing click handlers, and areas for improvement.

## Scripts

### 1. `playwright-screenshot.js`

Simple script to take a full-page screenshot of your SecureWatch application.

**Usage:**

```bash
npm run screenshot
```

### 2. `playwright-interactivity-analysis.js`

Comprehensive analysis script that tests every interactive element across all SecureWatch pages.

**Features:**

- Tests all 23 SecureWatch pages automatically
- Identifies interactive elements (buttons, links, inputs, etc.)
- Tests click handlers and functionality
- Detects missing event handlers
- Checks for visual feedback
- Generates detailed HTML and JSON reports
- Takes screenshots of each page

**Usage:**

```bash
npm run analyze:interactivity
```

## Setup

1. **Install Dependencies:**

```bash
cd frontend
npm install
npm run playwright:install
```

2. **Start SecureWatch Application:**

```bash
# In the project root
npm run dev
# Or
make dev
```

3. **Run Analysis:**

```bash
# Simple screenshot
npm run screenshot

# Full interactivity analysis
npm run analyze:interactivity
```

## Output

### Screenshots

- Saved to `frontend/screenshots/` directory
- One per page tested
- Full-page captures

### Reports

Generated in `frontend/reports/` directory:

#### HTML Report (`interactivity-analysis-YYYY-MM-DD.html`)

- Visual dashboard with statistics
- Page-by-page breakdown
- Color-coded element status
- Issue summaries and recommendations

#### JSON Report (`interactivity-analysis-YYYY-MM-DD.json`)

- Machine-readable data
- Detailed element information
- Integration with CI/CD pipelines

## Analysis Coverage

### Pages Tested (23 total):

- Home/Landing (`/`)
- Main Dashboard (`/dashboard`)
- Search/Explorer (`/explorer`)
- Alerts (`/alerts`)
- Alert Fatigue (`/alert-fatigue`)
- Correlation Engine (`/correlation`)
- Visualizations (`/visualizations`)
- MCP Marketplace (`/marketplace`)
- Notifications (`/notifications`)
- Field Extraction (`/field-extraction`)
- Incident Investigation (`/incident-investigation`)
- KQL Analytics (`/kql-analytics`)
- Education Portal (`/education`)
- Reporting (`/reporting`)
- Quick Start (`/quick-start`)
- Settings (`/settings`)
- Log Sources Settings (`/settings/log-sources`)
- Integrations Settings (`/settings/integrations`)
- RBAC Settings (`/settings/rbac`)
- Admin Users (`/settings/admin-users`)
- Platform Status (`/settings/platform-status`)
- Lookup Tables (`/settings/knowledge/lookups`)
- Authentication (`/auth`)
- Auth Test (`/auth-test`)

### Element Types Tested:

- **Buttons**: `button`, `[role="button"]`, input buttons
- **Links**: `a[href]`, `[role="link"]`, navigation links
- **Form Controls**: text inputs, selects, textareas, checkboxes, radio buttons
- **Interactive Components**: clickable divs, custom components
- **Navigation**: sidebar items, menu items, tabs
- **Icons & Actions**: SVG icons, action buttons, dropdown items

### Issues Detected:

- ❌ Missing click handlers
- ❌ Non-functional buttons
- ❌ Links without href attributes
- ❌ Disabled/hidden elements
- ❌ Elements without visual feedback
- ❌ Form validation issues
- ❌ JavaScript errors during interaction

## Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Install Playwright
  run: |
    cd frontend
    npm ci
    npm run playwright:install

- name: Run Interactivity Analysis
  run: |
    cd frontend
    npm run dev &
    sleep 10
    npm run analyze:interactivity

- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: interactivity-reports
    path: frontend/reports/
```

## Configuration

### Modify Pages to Test

Edit the `pages` array in `playwright-interactivity-analysis.js`:

```javascript
this.pages = [
  { path: '/your-new-page', name: 'Your New Page' },
  // ... existing pages
];
```

### Customize Selectors

Edit the `interactiveSelectors` array to include custom components:

```javascript
this.interactiveSelectors = [
  // ... existing selectors
  '.your-custom-button',
  '[data-your-component]',
];
```

### Adjust Timeouts

Modify timing in the constructor:

```javascript
const response = await this.page.goto(url, {
  waitUntil: 'networkidle',
  timeout: 30000, // Increase for slower pages
});
```

## Troubleshooting

### Common Issues:

1. **"Page not found" errors**

   - Ensure SecureWatch is running on `http://localhost:4000`
   - Check that all pages exist and are accessible

2. **Browser crashes**

   - Add `--no-sandbox` flag for CI environments
   - Increase memory limits

3. **Elements not found**

   - Check if dynamic content needs longer wait times
   - Verify CSS selectors are correct

4. **Permission denied on screenshots/reports**
   - Ensure write permissions for output directories
   - Check disk space availability

### Debug Mode

Set `headless: false` in the browser launch options to watch the analysis in real-time:

```javascript
this.browser = await chromium.launch({
  headless: false, // Watch the browser
  slowMo: 500, // Slow down interactions
});
```

## Best Practices

1. **Run analysis regularly** - Include in your development workflow
2. **Review reports thoroughly** - Focus on high-priority issues first
3. **Fix patterns, not just individual elements** - Address systemic issues
4. **Update selectors** - Keep pace with component library changes
5. **Test on multiple browsers** - Extend script for cross-browser testing

## Expected Output Example

```
🚀 Starting SecureWatch Interactivity Analysis...

📄 Analyzing page: Main Dashboard (/dashboard)
  Found 47 interactive elements
    Testing element 1: button - "Search Logs"
    Testing element 2: a - "View All Alerts"
    ...

📄 Analyzing page: Search/Explorer (/explorer)
  Found 23 interactive elements
    ...

📊 Generating comprehensive report...
📄 Reports generated:
   HTML: reports/interactivity-analysis-2025-06-10.html
   JSON: reports/interactivity-analysis-2025-06-10.json

🎉 Analysis Complete!
📊 Summary: 156/180 elements working properly
```

This analysis directly addresses the navigation consistency issues identified in the UX analysis document and provides actionable data for implementing the recommended improvements.
