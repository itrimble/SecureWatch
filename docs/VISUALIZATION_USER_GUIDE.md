# SecureWatch Visualization User Guide

## 📋 Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [KQL Search & Visualization](#kql-search--visualization)
4. [Advanced Visualizations](#advanced-visualizations)
5. [Customizable Dashboards](#customizable-dashboards)
6. [Export and Reporting](#export-and-reporting)
7. [Tips and Best Practices](#tips-and-best-practices)

---

## 🚀 Getting Started

SecureWatch provides a comprehensive visualization suite designed for security operations centers (SOCs) and cybersecurity professionals. The platform offers multiple ways to analyze and visualize security data:

### Accessing the Platform
1. **Navigate to**: `http://localhost:4000`
2. **Main Navigation**: Use the sidebar to access different sections
3. **Key Sections**:
   - **Dashboard**: Overview and custom dashboards
   - **Explorer**: Data exploration with KQL search
   - **Visualizations**: Specialized analysis tools
   - **Alerts**: Security alert management
   - **Reporting**: Generate custom reports

---

## 📊 Dashboard Overview

### Security Overview Dashboard
The default dashboard provides a comprehensive view of your security posture:

#### Key Metrics Cards
- **Critical Severity**: 646 events (+12% trend)
- **High Severity**: 2,411 events (+8% trend)  
- **Medium Severity**: 5,068 events (-3% trend)
- **Low Severity**: 241 events (-15% trend)
- **Informational**: 1,452 events (+2% trend)

#### Performance Metrics
- **Active Threats**: Current threat count with trend indicators
- **Security Score**: Overall security posture percentage
- **Events/Hour**: Real-time event processing rate
- **Active Users**: Current authenticated users

#### Recent Alerts Panel
- Real-time security alerts with severity indicators
- Click-through to detailed investigation
- Source identification and timestamps
- Color-coded severity levels (Critical=Red, High=Orange, etc.)

#### System Health Monitor
- **CPU Usage**: Real-time processor utilization
- **Memory Usage**: RAM consumption tracking
- **Disk Usage**: Storage utilization
- **Network I/O**: Network activity monitoring

### Custom Dashboard Mode
Switch to the "Custom Dashboard" tab for personalized layouts:

1. **Click "Edit"** to enter edit mode
2. **Add Widgets** using the widget library
3. **Drag and Drop** to rearrange components
4. **Resize Widgets** using dropdown controls
5. **Save Layout** to preserve your configuration

---

## 🔍 KQL Search & Visualization

### Accessing KQL Search
Navigate to **Explorer** → **KQL Search & Visualization** tab

### Query Interface Features

#### 1. Query Editor
- **Syntax Highlighting**: KQL syntax coloring
- **Auto-completion**: IntelliSense for field names and functions
- **Query Validation**: Real-time syntax checking
- **Multi-line Support**: Complex query composition

#### 2. Predefined Templates
Click any template to load into the editor:

- **Critical Security Events**: `logs | where enriched_data.severity == "Critical"`
- **Top Event Sources**: `logs | summarize event_count = count() by source_identifier`
- **Authentication Events**: `logs | where message contains "login" or message contains "auth"`
- **Error Analysis**: `logs | where message contains "error"`
- **Network Activity**: `logs | where source_identifier contains "network"`

#### 3. Query Execution
1. **Write or select** a KQL query
2. **Click "Execute Query"** button
3. **View results** in multiple formats
4. **Export data** if needed

### Visualization Types

#### Table View
- **Raw Data Display**: Complete result set in tabular format
- **Sortable Columns**: Click headers to sort data
- **Searchable**: Filter results within the table
- **Pagination**: Navigate through large result sets

#### Bar Chart
- **Category Comparison**: Compare values across different categories
- **Interactive**: Hover for detailed values
- **Responsive**: Automatically adjusts to data size
- **Color Coded**: Professional SIEM color scheme

#### Line Chart
- **Trend Analysis**: Show changes over time
- **Multiple Series**: Compare different metrics
- **Zoom/Pan**: Interactive data exploration
- **Time-based X-axis**: Chronological data representation

#### Area Chart
- **Volume Visualization**: Filled area charts for volume data
- **Stacked Areas**: Multiple metrics in one view
- **Smooth Curves**: Professional data presentation
- **Gradient Fill**: Visual depth and appeal

#### Pie Chart
- **Proportional Data**: Show distribution percentages
- **Category Breakdown**: Up to 10 categories displayed
- **Interactive Labels**: Hover for detailed information
- **Legend**: Clear category identification

#### Timeline View
- **Chronological Events**: Events displayed in time order
- **Event Details**: Expandable event information
- **Time Navigation**: Scroll through time periods
- **Event Grouping**: Related events grouped together

### Query Examples

#### Basic Security Analysis
```kql
logs
| where timestamp >= ago(1h)
| where enriched_data.severity in ("High", "Critical")
| summarize count() by enriched_data.severity
| sort by count_ desc
```

#### Failed Authentication Detection
```kql
logs
| where message contains "failed" and message contains "login"
| where timestamp >= ago(24h)
| summarize failed_attempts = count() by bin(timestamp, 1h)
| sort by timestamp asc
```

#### Top Error Sources
```kql
logs
| where message contains "error"
| where timestamp >= ago(6h)
| summarize error_count = count() by source_identifier
| sort by error_count desc
| limit 10
```

---

## 🎨 Advanced Visualizations

Navigate to **Visualizations** section for specialized analysis tools:

### Interactive Heatmaps

#### User Activity Heatmap
- **Purpose**: Visualize login patterns by hour and day of week
- **Use Case**: Identify unusual access patterns, after-hours activity
- **Features**: 
  - Hover for detailed activity counts
  - Color intensity represents activity levels
  - Filter by activity intensity
  - Export visualizations

#### Security Events Heatmap
- **Purpose**: Map security events by time and severity
- **Use Case**: Spot attack patterns, identify peak threat times
- **Features**:
  - Severity-based color coding
  - Time-based pattern analysis
  - Interactive data points
  - Real-time updates

#### System Performance Heatmap
- **Purpose**: Monitor resource utilization patterns
- **Use Case**: Identify performance bottlenecks, capacity planning
- **Features**:
  - Multi-metric visualization
  - Threshold-based alerting
  - Historical trend analysis
  - Drill-down capabilities

### Network Correlation Graphs

#### Attack Scenario Modeling
Switch between different threat scenarios:

1. **Lateral Movement Attack**
   - Visualizes APT-style attack progression
   - Shows compromise path from initial access to domain controller
   - Color-coded by risk level and entity type

2. **Data Exfiltration**
   - Maps data flow from database to external destination
   - Shows volume and method of data transfer
   - Identifies suspicious large transfers

3. **Insider Threat**
   - Models malicious insider activity patterns
   - Shows unusual access and data movement
   - Behavioral anomaly visualization

4. **Network Topology**
   - Basic infrastructure relationship mapping
   - Shows normal communication patterns
   - Baseline for anomaly detection

#### Interactive Features
- **Click Nodes**: View detailed entity information
- **Zoom Controls**: Navigate large networks
- **Filter Options**: Show/hide by risk level
- **Export**: Save graphs as images

### Threat Geolocation Maps

#### Global Threat Visualization
- **Real-time Threat Mapping**: IP addresses plotted on world map
- **Threat Intelligence**: Country-level threat analysis
- **Interactive Markers**: Click for detailed threat information
- **Risk Color Coding**: Critical (red), High (orange), Medium (yellow), Low (green)

#### Features
- **Map Themes**: Dark, Satellite, Terrain, Light modes
- **Filtering**: Filter by threat level or country
- **Statistics Panel**: Threat counts and distribution
- **Export Options**: Save maps and data

#### Threat Information Panel
Click any marker to view:
- IP address and geolocation
- Threat type and activity
- Event count and last seen
- ASN and ISP information
- Recommended actions

---

## 🎛️ Customizable Dashboards

### Widget Library

#### Analytics Widgets
- **Events Over Time**: Line chart showing event trends
- **Top Event IDs**: Bar chart of most common events
- **KPI Metrics**: Key performance indicators

#### Security Widgets
- **Security Heatmap**: Interactive security event patterns
- **Recent Alerts**: Latest security alerts feed
- **Threat Intelligence**: Global threat indicators

#### Intelligence Widgets
- **Network Correlation**: Entity relationship graphs
- **Threat Geolocation**: Global threat map

#### System Widgets
- **System Health**: Infrastructure monitoring
- **Data Sources**: Source status monitoring

### Dashboard Customization

#### Adding Widgets
1. **Click "Add Widget"** button
2. **Browse categories** (Analytics, Security, Intelligence, System)
3. **Select widget type** from the dialog
4. **Click to add** to your dashboard

#### Arranging Widgets
1. **Enter Edit Mode** by clicking "Edit"
2. **Drag widgets** to new positions
3. **Resize widgets** using the size dropdown
4. **Remove widgets** using the X button

#### Widget Sizes
- **Small**: Single column, compact view
- **Medium**: Two columns, standard view  
- **Large**: Three columns, detailed view
- **Full**: Four columns, maximum space

#### Saving Layouts
1. **Arrange widgets** as desired
2. **Click "Save Layout"** 
3. **Name your layout** for future use
4. **Switch between layouts** using the dropdown

---

## 📤 Export and Reporting

### Data Export Options

#### CSV Export
- **Table Data**: Export any table view to CSV format
- **Filtered Results**: Export only filtered/searched data
- **Custom Filename**: Automatic timestamp naming
- **Use Case**: Further analysis in Excel or other tools

#### JSON Export  
- **Structured Data**: Complete data structure preservation
- **API Integration**: Use in other applications
- **Programmatic Analysis**: Process with scripts
- **Use Case**: Custom integration and automation

#### Visual Export
- **Chart Images**: Export visualizations as images
- **Dashboard Screenshots**: Capture complete dashboard views
- **Report Generation**: Include in presentations
- **Use Case**: Documentation and reporting

### Report Generation

#### Automated Reports
- **Scheduled Exports**: Set up recurring data exports
- **Email Delivery**: Automatic report distribution
- **Custom Templates**: Predefined report formats
- **Time-based**: Daily, weekly, monthly schedules

#### Custom Reports
- **Query-based**: Use KQL queries as report sources
- **Multi-visualization**: Combine charts and tables
- **Executive Summaries**: High-level security overview
- **Detailed Analysis**: In-depth technical reports

---

## 💡 Tips and Best Practices

### Query Optimization

#### Performance Tips
1. **Use time filters early**: `| where timestamp >= ago(1h)`
2. **Limit result sets**: `| limit 100`
3. **Use indexed fields**: timestamp, source_identifier, severity
4. **Avoid expensive operations**: Complex regex, large joins

#### Query Writing Best Practices
1. **Start simple**: Begin with basic filters, add complexity gradually
2. **Test incrementally**: Run partial queries to verify logic
3. **Use templates**: Start with predefined queries and modify
4. **Comment complex queries**: Add explanatory comments

### Visualization Best Practices

#### Chart Selection
- **Time Series Data**: Use line or area charts
- **Categories**: Use bar or pie charts
- **Relationships**: Use network graphs
- **Patterns**: Use heatmaps
- **Geographic Data**: Use geolocation maps

#### Dashboard Design
1. **Logical Grouping**: Group related widgets together
2. **Size Appropriately**: Match widget size to content importance
3. **Minimize Clutter**: Don't overcrowd dashboards
4. **Update Regularly**: Review and refresh layouts periodically

### Security Analysis Workflows

#### Incident Investigation
1. **Start with Overview**: Check dashboard for anomalies
2. **Drill Down**: Use KQL to investigate specific timeframes
3. **Correlate Events**: Use network graphs to map relationships
4. **Geolocation Check**: Verify source locations on threat map
5. **Timeline Analysis**: Use timeline view for event sequence

#### Threat Hunting
1. **Baseline Normal**: Understand typical patterns using heatmaps
2. **Identify Anomalies**: Look for unusual patterns or spikes
3. **Hypothesis Testing**: Use KQL to test specific theories
4. **Pattern Recognition**: Use visualizations to spot trends
5. **Documentation**: Export findings for further analysis

#### Monitoring and Alerting
1. **Real-time Monitoring**: Use live dashboard widgets
2. **Threshold Setting**: Configure appropriate alert levels
3. **Pattern Monitoring**: Watch for known attack patterns
4. **Trend Analysis**: Monitor long-term security trends
5. **Performance Monitoring**: Keep system health in view

### Troubleshooting

#### Common Issues
- **Slow Queries**: Add time filters, reduce result sets
- **No Data**: Verify data sources and time ranges
- **Visualization Errors**: Check data format compatibility
- **Dashboard Issues**: Refresh browser, check network connectivity

#### Getting Help
- **Documentation**: Refer to API guides and examples
- **Query Validation**: Use the KQL validator before execution
- **Error Messages**: Read error details for specific guidance
- **Community**: Check GitHub issues for common solutions

---

## 🎯 Quick Reference

### Keyboard Shortcuts
- **Ctrl/Cmd + Enter**: Execute KQL query
- **Ctrl/Cmd + S**: Save dashboard layout
- **Ctrl/Cmd + R**: Refresh current view
- **Esc**: Exit edit mode

### Color Coding Standards
- **Critical Severity**: Red (#ef4444)
- **High Severity**: Orange (#f59e0b)
- **Medium Severity**: Yellow (#eab308)
- **Low Severity**: Green (#10b981)
- **Information**: Gray (#6b7280)

### Time Range Shortcuts
- **ago(1h)**: Last hour
- **ago(24h)**: Last 24 hours
- **ago(7d)**: Last 7 days
- **ago(30d)**: Last 30 days

For additional assistance or advanced features, refer to the KQL API Guide or contact your system administrator.