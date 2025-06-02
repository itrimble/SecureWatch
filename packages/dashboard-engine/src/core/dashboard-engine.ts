import { DashboardConfig, DashboardState, WidgetData, DashboardMetrics } from '../types/dashboard.types';
import { BaseWidget, WidgetFactory, WidgetDataProvider } from '../types/widget.types';
import { EventEmitter } from 'events';

export class DashboardEngine extends EventEmitter {
  private dashboards: Map<string, DashboardConfig> = new Map();
  private widgetData: Map<string, WidgetData> = new Map();
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private dataProvider: WidgetDataProvider;
  private widgetFactory: WidgetFactory;
  private metrics: Map<string, DashboardMetrics> = new Map();

  constructor(
    dataProvider: WidgetDataProvider,
    widgetFactory: WidgetFactory
  ) {
    super();
    this.dataProvider = dataProvider;
    this.widgetFactory = widgetFactory;
  }

  // Dashboard Management
  async createDashboard(config: Omit<DashboardConfig, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<DashboardConfig> {
    const now = new Date().toISOString();
    const dashboard: DashboardConfig = {
      ...config,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    this.dashboards.set(dashboard.id, dashboard);
    this.initializeDashboardMetrics(dashboard.id);
    this.emit('dashboard:created', dashboard);

    return dashboard;
  }

  async updateDashboard(id: string, updates: Partial<DashboardConfig>): Promise<DashboardConfig> {
    const existing = this.dashboards.get(id);
    if (!existing) {
      throw new Error(`Dashboard ${id} not found`);
    }

    const updated: DashboardConfig = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1
    };

    this.dashboards.set(id, updated);
    this.emit('dashboard:updated', updated, existing);

    // Restart refresh intervals if refresh interval changed
    if (updates.refreshInterval && updates.refreshInterval !== existing.refreshInterval) {
      this.stopDashboardRefresh(id);
      this.startDashboardRefresh(id);
    }

    return updated;
  }

  async deleteDashboard(id: string): Promise<void> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      throw new Error(`Dashboard ${id} not found`);
    }

    this.stopDashboardRefresh(id);
    this.dashboards.delete(id);
    this.metrics.delete(id);
    
    // Clean up widget data
    dashboard.layout.rows.forEach(row => {
      row.columns.forEach(column => {
        this.widgetData.delete(column.widgetId);
      });
    });

    this.emit('dashboard:deleted', dashboard);
  }

  getDashboard(id: string): DashboardConfig | null {
    return this.dashboards.get(id) || null;
  }

  listDashboards(userId?: string, filters?: any): DashboardConfig[] {
    const dashboards = Array.from(this.dashboards.values());
    
    let filtered = dashboards;
    
    if (userId) {
      filtered = filtered.filter(d => 
        d.createdBy === userId || 
        d.permissions.isPublic ||
        d.permissions.sharedWith.some(share => 
          share.type === 'user' && share.id === userId
        )
      );
    }

    if (filters) {
      if (filters.tags) {
        filtered = filtered.filter(d => 
          d.tags && d.tags.some(tag => filters.tags.includes(tag))
        );
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(d => 
          d.title.toLowerCase().includes(searchLower) ||
          d.description.toLowerCase().includes(searchLower)
        );
      }
    }

    return filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  // Widget Management
  async addWidget(dashboardId: string, rowId: string, widget: BaseWidget, position?: number): Promise<DashboardConfig> {
    const dashboard = this.getDashboard(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const row = dashboard.layout.rows.find(r => r.id === rowId);
    if (!row) {
      throw new Error(`Row ${rowId} not found`);
    }

    // Validate widget config
    const validation = this.widgetFactory.validateConfig(widget);
    if (!validation.valid) {
      throw new Error(`Invalid widget config: ${validation.errors.join(', ')}`);
    }

    const column = {
      id: this.generateId(),
      width: 6, // Default to half width
      widgetId: widget.id,
      widgetConfig: widget
    };

    if (position !== undefined && position >= 0 && position <= row.columns.length) {
      row.columns.splice(position, 0, column);
    } else {
      row.columns.push(column);
    }

    const updated = await this.updateDashboard(dashboardId, dashboard);
    this.emit('widget:added', widget, dashboardId, rowId);

    return updated;
  }

  async removeWidget(dashboardId: string, widgetId: string): Promise<DashboardConfig> {
    const dashboard = this.getDashboard(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    let found = false;
    for (const row of dashboard.layout.rows) {
      const columnIndex = row.columns.findIndex(c => c.widgetId === widgetId);
      if (columnIndex !== -1) {
        row.columns.splice(columnIndex, 1);
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    this.widgetData.delete(widgetId);
    const updated = await this.updateDashboard(dashboardId, dashboard);
    this.emit('widget:removed', widgetId, dashboardId);

    return updated;
  }

  async updateWidget(dashboardId: string, widgetId: string, updates: Partial<BaseWidget>): Promise<DashboardConfig> {
    const dashboard = this.getDashboard(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    let widget: BaseWidget | null = null;
    for (const row of dashboard.layout.rows) {
      const column = row.columns.find(c => c.widgetId === widgetId);
      if (column) {
        widget = { ...column.widgetConfig, ...updates };
        column.widgetConfig = widget;
        break;
      }
    }

    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    const validation = this.widgetFactory.validateConfig(widget);
    if (!validation.valid) {
      throw new Error(`Invalid widget config: ${validation.errors.join(', ')}`);
    }

    const updated = await this.updateDashboard(dashboardId, dashboard);
    this.emit('widget:updated', widget, dashboardId);

    return updated;
  }

  // Data Management
  async loadWidgetData(widgetId: string, force = false): Promise<WidgetData> {
    const startTime = performance.now();
    
    let widgetData = this.widgetData.get(widgetId);
    
    if (!force && widgetData && !this.isDataStale(widgetData)) {
      return widgetData;
    }

    const widget = this.findWidget(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    try {
      widgetData = {
        widgetId,
        data: null,
        loading: true,
        lastUpdated: new Date().toISOString()
      };
      
      this.widgetData.set(widgetId, widgetData);
      this.emit('widget:loading', widgetId);

      const data = await this.dataProvider.fetchData(widget.dataSource);
      const loadTime = performance.now() - startTime;

      widgetData = {
        widgetId,
        data,
        loading: false,
        lastUpdated: new Date().toISOString(),
        cacheHit: !force && !!this.dataProvider.getCachedData(widget.dataSource)
      };

      this.widgetData.set(widgetId, widgetData);
      this.emit('widget:loaded', widgetId, data, loadTime);

      return widgetData;
    } catch (error) {
      const errorData: WidgetData = {
        widgetId,
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString()
      };

      this.widgetData.set(widgetId, errorData);
      this.emit('widget:error', widgetId, error);

      return errorData;
    }
  }

  async refreshDashboard(dashboardId: string): Promise<void> {
    const dashboard = this.getDashboard(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const widgets = this.getDashboardWidgets(dashboard);
    const promises = widgets.map(widget => this.loadWidgetData(widget.id, true));

    try {
      await Promise.allSettled(promises);
      this.updateDashboardMetrics(dashboardId, { refreshCount: 1 });
      this.emit('dashboard:refreshed', dashboardId);
    } catch (error) {
      this.emit('dashboard:refresh-error', dashboardId, error);
    }
  }

  // Auto-refresh Management
  startDashboardRefresh(dashboardId: string): void {
    const dashboard = this.getDashboard(dashboardId);
    if (!dashboard || dashboard.refreshInterval <= 0) {
      return;
    }

    this.stopDashboardRefresh(dashboardId);

    const interval = setInterval(() => {
      this.refreshDashboard(dashboardId).catch(error => {
        console.error(`Auto-refresh failed for dashboard ${dashboardId}:`, error);
      });
    }, dashboard.refreshInterval * 1000);

    this.refreshIntervals.set(dashboardId, interval);
  }

  stopDashboardRefresh(dashboardId: string): void {
    const interval = this.refreshIntervals.get(dashboardId);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(dashboardId);
    }
  }

  // Metrics and Analytics
  getDashboardMetrics(dashboardId: string): DashboardMetrics | null {
    return this.metrics.get(dashboardId) || null;
  }

  updateDashboardMetrics(dashboardId: string, updates: Partial<DashboardMetrics>): void {
    const existing = this.metrics.get(dashboardId);
    if (existing) {
      this.metrics.set(dashboardId, { ...existing, ...updates });
    }
  }

  // Utility Methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private findWidget(widgetId: string): BaseWidget | null {
    for (const dashboard of this.dashboards.values()) {
      for (const row of dashboard.layout.rows) {
        for (const column of row.columns) {
          if (column.widgetId === widgetId) {
            return column.widgetConfig;
          }
        }
      }
    }
    return null;
  }

  private getDashboardWidgets(dashboard: DashboardConfig): BaseWidget[] {
    const widgets: BaseWidget[] = [];
    for (const row of dashboard.layout.rows) {
      for (const column of row.columns) {
        widgets.push(column.widgetConfig);
      }
    }
    return widgets;
  }

  private isDataStale(widgetData: WidgetData): boolean {
    const widget = this.findWidget(widgetData.widgetId);
    if (!widget || !widget.refreshInterval) {
      return false;
    }

    const lastUpdated = new Date(widgetData.lastUpdated);
    const staleThreshold = new Date(Date.now() - widget.refreshInterval * 1000);
    
    return lastUpdated < staleThreshold;
  }

  private initializeDashboardMetrics(dashboardId: string): void {
    this.metrics.set(dashboardId, {
      loadTime: 0,
      renderTime: 0,
      widgetCount: 0,
      dataSourceCount: 0,
      errorCount: 0,
      cacheHitRate: 0,
      refreshCount: 0,
      userInteractions: 0
    });
  }

  // Cleanup
  destroy(): void {
    // Stop all refresh intervals
    for (const interval of this.refreshIntervals.values()) {
      clearInterval(interval);
    }
    this.refreshIntervals.clear();

    // Clear data
    this.dashboards.clear();
    this.widgetData.clear();
    this.metrics.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}