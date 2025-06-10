import { EventEmitter } from 'events';
import { 
  DashboardConfig, 
  WidgetInstance, 
  Filter, 
  TimeRange,
  RefreshConfig,
  DashboardTemplate,
  DashboardExport
} from './dashboard-types';

export class DashboardEngine extends EventEmitter {
  private dashboards: Map<string, DashboardConfig> = new Map();
  private activeDashboard: string | null = null;
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private dataCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private templates: Map<string, DashboardTemplate> = new Map();

  constructor() {
    super();
    this.initializeTemplates();
  }

  /**
   * Load a dashboard configuration
   */
  async loadDashboard(dashboardId: string): Promise<DashboardConfig | null> {
    try {
      // Try to get from memory first
      if (this.dashboards.has(dashboardId)) {
        return this.dashboards.get(dashboardId)!;
      }

      // Load from API or local storage
      const dashboard = await this.fetchDashboard(dashboardId);
      if (dashboard) {
        this.dashboards.set(dashboardId, dashboard);
        this.emit('dashboardLoaded', dashboard);
      }
      
      return dashboard;
    } catch (error) {
      this.emit('error', `Failed to load dashboard ${dashboardId}:`, error);
      return null;
    }
  }

  /**
   * Save dashboard configuration
   */
  async saveDashboard(dashboard: DashboardConfig): Promise<boolean> {
    try {
      // Update metadata
      dashboard.metadata.lastModified = new Date().toISOString();
      dashboard.metadata.version = this.incrementVersion(dashboard.metadata.version);

      // Save to storage
      await this.persistDashboard(dashboard);
      
      // Update in-memory cache
      this.dashboards.set(dashboard.id, dashboard);
      
      this.emit('dashboardSaved', dashboard);
      return true;
    } catch (error) {
      this.emit('error', `Failed to save dashboard ${dashboard.id}:`, error);
      return false;
    }
  }

  /**
   * Set active dashboard and start refresh timers
   */
  async setActiveDashboard(dashboardId: string): Promise<boolean> {
    try {
      // Stop existing timers
      this.stopRefreshTimers();

      const dashboard = await this.loadDashboard(dashboardId);
      if (!dashboard) {
        return false;
      }

      this.activeDashboard = dashboardId;
      this.startRefreshTimers(dashboard);
      
      this.emit('activeDashboardChanged', dashboard);
      return true;
    } catch (error) {
      this.emit('error', `Failed to set active dashboard ${dashboardId}:`, error);
      return false;
    }
  }

  /**
   * Update widget configuration
   */
  async updateWidget(dashboardId: string, widgetId: string, updates: Partial<WidgetInstance>): Promise<boolean> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      // Find and update the widget
      let widgetUpdated = false;
      for (const row of dashboard.layout.rows) {
        for (const column of row.columns) {
          if (column.widget.id === widgetId) {
            column.widget = { ...column.widget, ...updates };
            widgetUpdated = true;
            break;
          }
        }
        if (widgetUpdated) break;
      }

      if (!widgetUpdated) {
        throw new Error(`Widget ${widgetId} not found in dashboard ${dashboardId}`);
      }

      await this.saveDashboard(dashboard);
      this.emit('widgetUpdated', { dashboardId, widgetId, updates });
      
      return true;
    } catch (error) {
      this.emit('error', `Failed to update widget ${widgetId}:`, error);
      return false;
    }
  }

  /**
   * Add a new widget to dashboard
   */
  async addWidget(dashboardId: string, rowId: string, widget: WidgetInstance): Promise<boolean> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      const row = dashboard.layout.rows.find(r => r.id === rowId);
      if (!row) {
        throw new Error(`Row ${rowId} not found in dashboard ${dashboardId}`);
      }

      // Add widget to the row
      row.columns.push({
        id: `col-${Date.now()}`,
        width: 3, // Default width
        widget,
        responsive: {
          mobile: { width: 12, visible: true },
          tablet: { width: 6, visible: true },
          desktop: { width: 3, visible: true }
        }
      });

      await this.saveDashboard(dashboard);
      this.emit('widgetAdded', { dashboardId, rowId, widget });
      
      return true;
    } catch (error) {
      this.emit('error', `Failed to add widget to dashboard ${dashboardId}:`, error);
      return false;
    }
  }

  /**
   * Remove widget from dashboard
   */
  async removeWidget(dashboardId: string, widgetId: string): Promise<boolean> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      // Find and remove the widget
      for (const row of dashboard.layout.rows) {
        const columnIndex = row.columns.findIndex(col => col.widget.id === widgetId);
        if (columnIndex !== -1) {
          row.columns.splice(columnIndex, 1);
          await this.saveDashboard(dashboard);
          this.emit('widgetRemoved', { dashboardId, widgetId });
          return true;
        }
      }

      throw new Error(`Widget ${widgetId} not found in dashboard ${dashboardId}`);
    } catch (error) {
      this.emit('error', `Failed to remove widget ${widgetId}:`, error);
      return false;
    }
  }

  /**
   * Apply global filters to dashboard
   */
  async applyGlobalFilters(dashboardId: string, filters: Filter[]): Promise<boolean> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      dashboard.layout.globalFilters = filters;
      await this.saveDashboard(dashboard);
      
      // Refresh all widgets that use global filters
      this.refreshWidgetsWithGlobalFilters(dashboard);
      
      this.emit('globalFiltersApplied', { dashboardId, filters });
      return true;
    } catch (error) {
      this.emit('error', `Failed to apply global filters to dashboard ${dashboardId}:`, error);
      return false;
    }
  }

  /**
   * Update dashboard time range
   */
  async updateTimeRange(dashboardId: string, timeRange: TimeRange): Promise<boolean> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      dashboard.layout.timeRange = timeRange;
      await this.saveDashboard(dashboard);
      
      // Refresh all time-sensitive widgets
      this.refreshTimeSensitiveWidgets(dashboard);
      
      this.emit('timeRangeUpdated', { dashboardId, timeRange });
      return true;
    } catch (error) {
      this.emit('error', `Failed to update time range for dashboard ${dashboardId}:`, error);
      return false;
    }
  }

  /**
   * Refresh widget data
   */
  async refreshWidget(dashboardId: string, widgetId: string): Promise<boolean> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      const widget = this.findWidget(dashboard, widgetId);
      if (!widget) {
        throw new Error(`Widget ${widgetId} not found`);
      }

      // Clear cache for this widget
      this.clearWidgetCache(widgetId);

      // Fetch fresh data
      const data = await this.fetchWidgetData(widget);
      
      this.emit('widgetDataRefreshed', { dashboardId, widgetId, data });
      return true;
    } catch (error) {
      this.emit('error', `Failed to refresh widget ${widgetId}:`, error);
      return false;
    }
  }

  /**
   * Get widget data with caching
   */
  async getWidgetData(widget: WidgetInstance): Promise<any> {
    const cacheKey = this.generateCacheKey(widget);
    const cached = this.dataCache.get(cacheKey);

    // Check if cache is valid
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Fetch fresh data
    const data = await this.fetchWidgetData(widget);
    
    // Cache the data
    const ttl = widget.config.dataSource.cache?.ttl || 300000; // 5 minutes default
    this.dataCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });

    return data;
  }

  /**
   * Create dashboard from template
   */
  async createFromTemplate(templateId: string, customConfig: Partial<DashboardConfig>): Promise<DashboardConfig | null> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      const dashboardConfig: DashboardConfig = {
        ...template.config,
        ...customConfig,
        id: customConfig.id || `dashboard-${Date.now()}`,
        metadata: {
          ...template.config.metadata,
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          templateId,
          isTemplate: false
        }
      };

      await this.saveDashboard(dashboardConfig);
      this.emit('dashboardCreatedFromTemplate', { templateId, dashboardConfig });
      
      return dashboardConfig;
    } catch (error) {
      this.emit('error', `Failed to create dashboard from template ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Export dashboard configuration
   */
  async exportDashboard(dashboardId: string, options: { includeData?: boolean } = {}): Promise<DashboardExport | null> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      const exportData: DashboardExport = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        dashboard,
        dependencies: this.getDashboardDependencies(dashboard),
        metadata: {
          format: 'json',
          includeData: options.includeData || false,
          includeDependencies: true
        }
      };

      this.emit('dashboardExported', { dashboardId, exportData });
      return exportData;
    } catch (error) {
      this.emit('error', `Failed to export dashboard ${dashboardId}:`, error);
      return null;
    }
  }

  /**
   * Import dashboard configuration
   */
  async importDashboard(exportData: DashboardExport): Promise<boolean> {
    try {
      const dashboard = exportData.dashboard;
      
      // Generate new ID to avoid conflicts
      dashboard.id = `imported-${Date.now()}`;
      dashboard.metadata.created = new Date().toISOString();
      dashboard.metadata.lastModified = new Date().toISOString();

      await this.saveDashboard(dashboard);
      this.emit('dashboardImported', { dashboard });
      
      return true;
    } catch (error) {
      this.emit('error', 'Failed to import dashboard:', error);
      return false;
    }
  }

  /**
   * Get dashboard performance metrics
   */
  getPerformanceMetrics(dashboardId: string): any {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return null;
    }

    return {
      widgetCount: this.countWidgets(dashboard),
      cacheHitRate: this.calculateCacheHitRate(),
      averageLoadTime: dashboard.metadata.usage.averageViewTime,
      errorRate: dashboard.metadata.usage.errorRate,
      refreshRate: this.getRefreshRate(dashboard)
    };
  }

  // Private methods

  private async fetchDashboard(dashboardId: string): Promise<DashboardConfig | null> {
    // Implementation would fetch from API or local storage
    // For now, return null
    return null;
  }

  private async persistDashboard(dashboard: DashboardConfig): Promise<void> {
    // Implementation would save to API or local storage
    // For now, just store in memory
    this.dashboards.set(dashboard.id, dashboard);
  }

  private async fetchWidgetData(widget: WidgetInstance): Promise<any> {
    // Implementation would fetch data based on widget configuration
    // This would integrate with the KQL engine, APIs, etc.
    return {};
  }

  private startRefreshTimers(dashboard: DashboardConfig): void {
    for (const row of dashboard.layout.rows) {
      for (const column of row.columns) {
        const widget = column.widget;
        if (widget.refresh.enabled && widget.refresh.autoRefresh) {
          const timer = setInterval(() => {
            this.refreshWidget(dashboard.id, widget.id);
          }, widget.refresh.interval);
          
          this.refreshTimers.set(widget.id, timer);
        }
      }
    }
  }

  private stopRefreshTimers(): void {
    for (const [widgetId, timer] of this.refreshTimers) {
      clearInterval(timer);
    }
    this.refreshTimers.clear();
  }

  private refreshWidgetsWithGlobalFilters(dashboard: DashboardConfig): void {
    // Implementation would refresh widgets that use global filters
  }

  private refreshTimeSensitiveWidgets(dashboard: DashboardConfig): void {
    // Implementation would refresh widgets that depend on time range
  }

  private findWidget(dashboard: DashboardConfig, widgetId: string): WidgetInstance | null {
    for (const row of dashboard.layout.rows) {
      for (const column of row.columns) {
        if (column.widget.id === widgetId) {
          return column.widget;
        }
      }
    }
    return null;
  }

  private generateCacheKey(widget: WidgetInstance): string {
    return `widget-${widget.id}-${JSON.stringify(widget.config.dataSource)}`;
  }

  private clearWidgetCache(widgetId: string): void {
    for (const [key, _] of this.dataCache) {
      if (key.includes(widgetId)) {
        this.dataCache.delete(key);
      }
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private getDashboardDependencies(dashboard: DashboardConfig): string[] {
    // Extract dependencies like data sources, external APIs, etc.
    return [];
  }

  private countWidgets(dashboard: DashboardConfig): number {
    let count = 0;
    for (const row of dashboard.layout.rows) {
      count += row.columns.length;
    }
    return count;
  }

  private calculateCacheHitRate(): number {
    // Implementation would calculate cache hit rate
    return 0.85; // Placeholder
  }

  private getRefreshRate(dashboard: DashboardConfig): number {
    // Calculate average refresh rate across all widgets
    let totalInterval = 0;
    let count = 0;
    
    for (const row of dashboard.layout.rows) {
      for (const column of row.columns) {
        if (column.widget.refresh.enabled) {
          totalInterval += column.widget.refresh.interval;
          count++;
        }
      }
    }
    
    return count > 0 ? totalInterval / count : 0;
  }

  private initializeTemplates(): void {
    // Load pre-built dashboard templates
    // This would typically load from a configuration file or API
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopRefreshTimers();
    this.dataCache.clear();
    this.dashboards.clear();
    this.removeAllListeners();
  }
}