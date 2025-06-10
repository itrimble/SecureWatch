# 🤖 README Automation Guide

This guide explains how SecureWatch automatically keeps its README.md up-to-date with the latest platform information, metrics, and documentation links.

## 🚀 Overview

The SecureWatch README automation system uses GitHub Actions to automatically update the main README.md file with:

- **Platform Metrics**: Service counts, version information, build status
- **Repository Statistics**: Stars, forks, contributors, last commit dates
- **Documentation Links**: Validation and updates of internal documentation
- **Release Information**: Latest version and release notes from changelog
- **Architecture Diagrams**: Updated service counts and platform stats

## 📋 Features

### 🔄 Automatic Updates

- **Every 6 hours**: Comprehensive updates with GitHub API data
- **Daily at 9 AM UTC**: Daily metrics refresh
- **On code changes**: Triggered by package.json, changelog, or workflow changes
- **Manual triggers**: Run on-demand via GitHub Actions interface

### 📊 Update Types

| Type               | Description                         | Use Case                        |
| ------------------ | ----------------------------------- | ------------------------------- |
| **Basic**          | Essential updates only              | Quick refresh without API calls |
| **Comprehensive**  | Full update with GitHub API data    | Complete metrics and statistics |
| **Metrics Only**   | Repository stats and service counts | Focus on numerical data         |
| **Version Update** | Package versions and release info   | After version bumps             |

### 🛡️ Safety Features

- **Backup & Rollback**: Automatic backup before changes
- **Validation**: Structure and content validation
- **Change Detection**: Only commits when meaningful changes exist
- **Failure Handling**: Comprehensive error handling and notifications

## 🔧 Files Structure

```
SecureWatch/
├── .github/workflows/
│   ├── update-readme.yml          # Basic automation workflow
│   └── readme-automation.yml      # Advanced automation suite
├── scripts/
│   ├── update-readme.js           # Basic update script
│   ├── update-readme-advanced.js  # Advanced script with GitHub API
│   └── package.json              # Script dependencies
└── README.md                     # Auto-updated main README
```

## ⚙️ Configuration

### Environment Variables

```yaml
GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # Required for API access
UPDATE_TYPE: comprehensive # Update strategy
FORCE_UPDATE: false # Force update flag
```

### Script Configuration

The automation scripts can be configured by modifying the constants at the top of each file:

```javascript
// update-readme.js
const README_PATH = path.join(process.cwd(), 'README.md');
const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');
const CHANGELOG_PATH = path.join(process.cwd(), 'docs/CHANGELOG.md');
```

## 🚀 Usage

### Manual Trigger

1. Go to **Actions** tab in GitHub repository
2. Select **📝 README Automation Suite**
3. Click **Run workflow**
4. Choose update type and options
5. Click **Run workflow** button

### Automated Triggers

The automation runs automatically on:

- **Schedule**: Every 6 hours and daily at 9 AM UTC
- **Push events**: Changes to package.json, CHANGELOG.md, or workflows
- **Pull requests**: README.md changes trigger validation

### Local Testing

```bash
# Test basic update locally
cd scripts
npm install
node update-readme.js

# Test advanced update with GitHub API
export GITHUB_TOKEN="your-token"
export GITHUB_REPOSITORY="itrimble/SecureWatch"
node update-readme-advanced.js
```

## 📝 What Gets Updated

### Version Information

- Package.json version → Badge and text updates
- Changelog latest release → Release information
- Service count from apps/ directory

### Repository Metrics (Advanced Mode)

- ⭐ GitHub stars count
- 🍴 Fork count
- 👥 Contributor count
- 🐛 Open issues
- 📅 Last commit date
- 🏗️ Build status from CI

### Content Sections

- **Architecture diagrams** with current service counts
- **Service health endpoints** with accurate counts
- **Documentation links** validation
- **Platform metrics table** with live data
- **Last updated timestamp**

## 🔍 Monitoring

### Workflow Status

Monitor automation status via:

- GitHub Actions tab
- Workflow summary pages
- Commit history for auto-updates
- Repository insights and traffic

### Update History

All automatic updates include detailed commit messages with:

- Update type and timestamp
- Lines added/removed
- Changed sections
- Workflow run information

### Logs and Debugging

Check workflow logs for:

```
🚀 Starting SecureWatch README update...
📦 Updated version to: v2.2.0
🔧 Updated service count to: 13
🏗️ Updated build status
📚 Found 46 documentation files
📊 Updated platform metrics
✅ README.md updated successfully!
```

## 🛠️ Customization

### Adding New Metrics

To add new automatic updates, modify the update scripts:

```javascript
// Add to update-readme.js
async updateCustomMetric(content) {
    try {
        // Your custom logic here
        const newValue = await calculateCustomMetric();
        content = content.replace(/old-pattern/g, newValue);
        console.log(`📊 Updated custom metric to: ${newValue}`);
    } catch (error) {
        console.warn('⚠️ Could not update custom metric:', error.message);
    }
    return content;
}
```

### Changing Update Frequency

Modify the cron schedule in the workflow file:

```yaml
on:
  schedule:
    - cron: '0 */3 * * *' # Every 3 hours instead of 6
    - cron: '0 6 * * *' # 6 AM UTC instead of 9 AM
```

### Adding New Update Types

Extend the workflow with new update strategies:

```yaml
- name: Execute custom update
  if: env.UPDATE_TYPE == 'custom'
  run: |
    echo "🔧 Running custom update..."
    node scripts/custom-update.js
```

## 🚨 Troubleshooting

### Common Issues

| Issue             | Cause                         | Solution                      |
| ----------------- | ----------------------------- | ----------------------------- |
| No updates        | No changes detected           | Use force update option       |
| API errors        | Rate limiting or token issues | Check token permissions       |
| Script errors     | Missing dependencies          | Run `npm install` in scripts/ |
| Validation failed | Corrupted README              | Check backup files            |

### Debug Mode

Enable debug logging by setting environment variables:

```bash
NODE_ENV=development
DEBUG=true
```

### Recovery

If automation fails:

1. Check GitHub Actions logs
2. Restore from README.md.backup if needed
3. Run workflow manually
4. Contact maintainers if persistent issues

## 📚 Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SecureWatch Development Guide](DEVELOPMENT_GUIDE.md)
- [CI/CD Pipeline Documentation](CI_CD_GUIDE.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

## 🤝 Contributing

To improve the README automation:

1. **Test changes locally** before submitting PRs
2. **Update this documentation** for any new features
3. **Follow semantic versioning** for script changes
4. **Add appropriate logging** for debugging

### Example Contribution Workflow

```bash
# 1. Fork and clone repository
git clone https://github.com/yourusername/SecureWatch.git

# 2. Create feature branch
git checkout -b feature/readme-automation-improvement

# 3. Make changes to scripts or workflows
# 4. Test locally
cd scripts && node update-readme.js

# 5. Commit and push
git commit -m "feat: improve README automation with new metrics"
git push origin feature/readme-automation-improvement

# 6. Create pull request
```

---

**🤖 This automation ensures SecureWatch documentation stays current with minimal manual intervention, providing users with accurate, up-to-date information about the platform.**
