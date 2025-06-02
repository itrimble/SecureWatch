import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DashboardConfig } from '../types/dashboard.types';
import { WidgetDataProvider } from '../types/widget.types';
import { useMultipleRealTimeData, useConnectionStatus } from '../hooks/use-real-time-data';
import DashboardBuilder from './dashboard-builder';

interface RealTimeDashboardProps {
  dashboard: DashboardConfig;
  dataProvider: WidgetDataProvider;
  onDashboardChange?: (dashboard: DashboardConfig) => void;
  widgetFactory: any;
  className?: string;
}

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({
  dashboard,
  dataProvider,
  onDashboardChange,
  widgetFactory,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(dashboard.refreshInterval * 1000);
  
  const { isOnline, lastDisconnected, reconnectAttempts } = useConnectionStatus();

  // Extract data sources from all widgets
  const dataSources = useMemo(() => {
    const sources: Record<string, any> = {};
    
    dashboard.layout.rows.forEach(row => {
      row.columns.forEach(column => {
        sources[column.widgetId] = column.widgetConfig.dataSource;
      });
    });
    
    return sources;
  }, [dashboard.layout.rows]);

  // Setup real-time data management
  const {
    states: widgetStates,
    refresh,
    getWidgetData
  } = useMultipleRealTimeData(dataSources, {
    dataProvider,
    refreshInterval: isPaused ? 0 : refreshInterval,
    enabled: !isPaused && isOnline,
    onError: (widgetId, error) => {
      console.error(`Widget ${widgetId} error:`, error);
    },
    onDataUpdate: (widgetId, data) => {
      console.log(`Widget ${widgetId} updated:`, data);
    }
  });

  // Auto-pause when offline
  useEffect(() => {
    if (!isOnline) {
      setIsPaused(true);
    }
  }, [isOnline]);

  const handleToggleEdit = useCallback(() => {
    setIsEditing(prev => !prev);
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleRefreshAll = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleRefreshWidget = useCallback((widgetId: string) => {
    refresh(widgetId);
  }, [refresh]);

  const handleIntervalChange = useCallback((newInterval: number) => {
    setRefreshInterval(newInterval * 1000);
    
    // Update dashboard config if callback provided
    if (onDashboardChange) {
      onDashboardChange({
        ...dashboard,
        refreshInterval: newInterval,
        updatedAt: new Date().toISOString()
      });
    }
  }, [dashboard, onDashboardChange]);

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const widgetIds = Object.keys(widgetStates);
    const loadingCount = widgetIds.filter(id => widgetStates[id]?.loading).length;
    const errorCount = widgetIds.filter(id => widgetStates[id]?.error).length;
    const connectedCount = widgetIds.filter(id => widgetStates[id]?.isConnected).length;
    
    const lastUpdated = Math.max(
      ...widgetIds
        .map(id => widgetStates[id]?.lastUpdated?.getTime() || 0)
        .filter(time => time > 0)
    );

    return {
      totalWidgets: widgetIds.length,
      loadingCount,
      errorCount,
      connectedCount,
      lastUpdated: lastUpdated > 0 ? new Date(lastUpdated) : null
    };
  }, [widgetStates]);

  const getConnectionStatusIcon = () => {
    if (!isOnline) return '🔴';
    if (dashboardStats.errorCount > 0) return '🟡';
    if (dashboardStats.connectedCount === dashboardStats.totalWidgets) return '🟢';
    return '🟡';
  };

  const getConnectionStatusText = () => {
    if (!isOnline) return 'Offline';
    if (dashboardStats.errorCount > 0) return `${dashboardStats.errorCount} errors`;
    if (dashboardStats.loadingCount > 0) return 'Loading...';
    return 'Connected';
  };

  return (
    <div className={`real-time-dashboard ${className}`}>
      {/* Dashboard Controls */}
      <div className="dashboard-controls">
        <div className="control-group connection-status">
          <span className="status-icon">{getConnectionStatusIcon()}</span>
          <span className="status-text">{getConnectionStatusText()}</span>
          {reconnectAttempts > 0 && (
            <span className="reconnect-info">
              (Reconnect attempts: {reconnectAttempts})
            </span>
          )}
        </div>

        <div className="control-group refresh-controls">
          <button
            className={`control-btn pause-btn ${isPaused ? 'paused' : ''}`}
            onClick={handleTogglePause}
            title={isPaused ? 'Resume updates' : 'Pause updates'}
            disabled={!isOnline}
          >
            {isPaused ? '▶️' : '⏸️'}
          </button>
          
          <button
            className="control-btn refresh-btn"
            onClick={handleRefreshAll}
            title="Refresh all widgets"
            disabled={!isOnline || dashboardStats.loadingCount > 0}
          >
            🔄
          </button>
        </div>

        <div className="control-group interval-controls">
          <label htmlFor="refresh-interval">Refresh:</label>
          <select
            id="refresh-interval"
            value={refreshInterval / 1000}
            onChange={(e) => handleIntervalChange(Number(e.target.value))}
            className="interval-select"
          >
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={600}>10 minutes</option>
            <option value={0}>Manual only</option>
          </select>
        </div>

        <div className="control-group stats">
          <span className="stat">
            Widgets: {dashboardStats.connectedCount}/{dashboardStats.totalWidgets}
          </span>
          {dashboardStats.lastUpdated && (
            <span className="stat">
              Last update: {dashboardStats.lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <div className="offline-content">
            <span className="offline-icon">🔴</span>
            <span className="offline-text">
              You're offline. Dashboard updates are paused.
            </span>
            {lastDisconnected && (
              <span className="offline-time">
                Disconnected at {lastDisconnected.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Summary */}
      {dashboardStats.errorCount > 0 && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-text">
              {dashboardStats.errorCount} widget(s) have errors
            </span>
            <button
              className="error-refresh-btn"
              onClick={handleRefreshAll}
            >
              Retry All
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <DashboardBuilder
        dashboard={dashboard}
        onDashboardChange={onDashboardChange || (() => {})}
        widgetFactory={widgetFactory}
        isEditing={isEditing}
        onToggleEdit={handleToggleEdit}
        widgetData={widgetStates}
        onWidgetRefresh={handleRefreshWidget}
        className="real-time-dashboard-content"
      />

      {/* Real-time Indicators */}
      <div className="real-time-indicators">
        {Object.entries(widgetStates).map(([widgetId, state]) => (
          <div
            key={widgetId}
            className={`widget-indicator ${state.loading ? 'loading' : ''} ${state.error ? 'error' : ''} ${state.isConnected ? 'connected' : 'disconnected'}`}
            title={`${widgetId}: ${state.error || (state.isConnected ? 'Connected' : 'Disconnected')}`}
          >
            <div className="indicator-dot" />
          </div>
        ))}
      </div>

      {/* Global Loading Overlay */}
      {dashboardStats.loadingCount > 0 && (
        <div className="global-loading-indicator">
          <div className="loading-spinner" />
          <span className="loading-text">
            Loading {dashboardStats.loadingCount} widget(s)...
          </span>
        </div>
      )}

      {/* Performance Monitor */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-monitor">
          <div className="perf-stats">
            <div className="perf-stat">
              <span className="perf-label">Widgets:</span>
              <span className="perf-value">{dashboardStats.totalWidgets}</span>
            </div>
            <div className="perf-stat">
              <span className="perf-label">Active:</span>
              <span className="perf-value">{dashboardStats.connectedCount}</span>
            </div>
            <div className="perf-stat">
              <span className="perf-label">Interval:</span>
              <span className="perf-value">{refreshInterval / 1000}s</span>
            </div>
            <div className="perf-stat">
              <span className="perf-label">Status:</span>
              <span className="perf-value">{isPaused ? 'Paused' : 'Running'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeDashboard;