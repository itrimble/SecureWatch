import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertSummaryWidget, WidgetProps } from '../types/widget.types';

interface AlertSummaryWidgetProps extends WidgetProps {
  widget: AlertSummaryWidget;
}

interface AlertData {
  id: string;
  severity: string;
  status: string;
  timestamp: string;
  title: string;
  description?: string;
  source?: string;
}

export const AlertSummaryWidgetComponent: React.FC<AlertSummaryWidgetProps> = ({
  widget,
  data,
  loading,
  error,
  onRefresh,
  onDrilldown,
  onEdit,
  editable = false,
  className = ''
}) => {
  const { visualization } = widget;
  const { options } = visualization;

  const alertData = useMemo(() => {
    if (!data || !data.data) return [];
    return Array.isArray(data.data) ? data.data : [];
  }, [data]);

  const severityStats = useMemo(() => {
    const stats = alertData.reduce((acc: Record<string, number>, alert: AlertData) => {
      const severity = alert[options.severityField] || 'unknown';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(stats).map(([severity, count]) => ({
      severity,
      count,
      color: options.severityColors?.[severity] || '#6b7280'
    })).sort((a, b) => {
      const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
      const aIndex = severityOrder.indexOf(a.severity);
      const bIndex = severityOrder.indexOf(b.severity);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }, [alertData, options.severityField, options.severityColors]);

  const statusStats = useMemo(() => {
    const stats = alertData.reduce((acc: Record<string, number>, alert: AlertData) => {
      const status = alert[options.statusField] || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(stats).map(([status, count]) => ({
      status,
      count,
      color: options.statusColors?.[status] || '#6b7280'
    }));
  }, [alertData, options.statusField, options.statusColors]);

  const trendData = useMemo(() => {
    if (!options.showTrend || !alertData.length) return [];

    // Group alerts by hour over the last 24 hours
    const now = new Date();
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      return {
        hour: hour.getHours(),
        timestamp: hour.toISOString(),
        count: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
    });

    alertData.forEach((alert: AlertData) => {
      const alertTime = new Date(alert[options.timeField]);
      const hourIndex = Math.floor((now.getTime() - alertTime.getTime()) / (1000 * 60 * 60));
      
      if (hourIndex >= 0 && hourIndex < 24) {
        const dataPoint = hours[23 - hourIndex];
        dataPoint.count++;
        
        const severity = alert[options.severityField]?.toLowerCase() || 'low';
        if (dataPoint.hasOwnProperty(severity)) {
          (dataPoint as any)[severity]++;
        }
      }
    });

    return hours;
  }, [alertData, options.showTrend, options.timeField, options.severityField]);

  const recentAlerts = useMemo(() => {
    const sorted = [...alertData]
      .sort((a, b) => new Date(b[options.timeField]).getTime() - new Date(a[options.timeField]).getTime())
      .slice(0, options.maxAlerts || 5);

    return sorted;
  }, [alertData, options.timeField, options.maxAlerts]);

  const totalAlerts = alertData.length;
  const criticalAlerts = severityStats.find(s => s.severity === 'critical')?.count || 0;
  const openAlerts = statusStats.find(s => s.status === 'open')?.count || 0;

  if (loading) {
    return (
      <div className={`widget-container ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content loading">
          <div className="spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`widget-container error ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {onRefresh && (
            <button onClick={onRefresh} className="widget-refresh-btn">
              🔄
            </button>
          )}
        </div>
        <div className="widget-content">
          <div className="error-message">❌ {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`widget-container alert-summary-widget ${className}`}>
      <div className="widget-header">
        <div className="widget-title-section">
          <h3 className="widget-title">{widget.title}</h3>
          {widget.description && (
            <p className="widget-description">{widget.description}</p>
          )}
        </div>
        <div className="widget-actions">
          {onRefresh && (
            <button onClick={onRefresh} className="widget-action-btn refresh-btn">
              🔄
            </button>
          )}
          {editable && (
            <button onClick={onEdit} className="widget-action-btn edit-btn">
              ⚙️
            </button>
          )}
        </div>
      </div>

      <div className="widget-content">
        {totalAlerts === 0 ? (
          <div className="no-data">
            🔔 No alerts found
          </div>
        ) : (
          <div className="alert-summary-content">
            {/* Summary Cards */}
            <div className="alert-summary-cards">
              <div className="summary-card total">
                <div className="card-value">{totalAlerts}</div>
                <div className="card-label">Total Alerts</div>
              </div>
              <div className="summary-card critical">
                <div className="card-value">{criticalAlerts}</div>
                <div className="card-label">Critical</div>
              </div>
              <div className="summary-card open">
                <div className="card-value">{openAlerts}</div>
                <div className="card-label">Open</div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="alert-charts">
              {/* Severity Distribution */}
              <div className="chart-section severity-chart">
                <h4>By Severity</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={severityStats}
                      dataKey="count"
                      nameKey="severity"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      onClick={onDrilldown ? (entry) => onDrilldown({ type: 'severity', ...entry }) : undefined}
                    >
                      {severityStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="severity-legend">
                  {severityStats.map((stat) => (
                    <div key={stat.severity} className="legend-item">
                      <div 
                        className="legend-color"
                        style={{ backgroundColor: stat.color }}
                      />
                      <span className="legend-label">
                        {stat.severity} ({stat.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Distribution */}
              <div className="chart-section status-chart">
                <h4>By Status</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="count" 
                      onClick={onDrilldown ? (entry) => onDrilldown({ type: 'status', ...entry }) : undefined}
                    >
                      {statusStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trend Chart */}
            {options.showTrend && trendData.length > 0 && (
              <div className="chart-section trend-chart">
                <h4>24-Hour Trend</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                    <YAxis />
                    <Tooltip labelFormatter={(hour) => `${hour}:00`} />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="critical" stroke="#dc3545" strokeWidth={1} />
                    <Line type="monotone" dataKey="high" stroke="#fd7e14" strokeWidth={1} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Alerts */}
            <div className="recent-alerts-section">
              <h4>Recent Alerts</h4>
              <div className="alerts-list">
                {recentAlerts.map((alert: AlertData) => (
                  <div 
                    key={alert.id} 
                    className="alert-item"
                    onClick={onDrilldown ? () => onDrilldown({ type: 'alert', alert }) : undefined}
                  >
                    <div className="alert-header">
                      <span 
                        className={`severity-badge ${alert[options.severityField]}`}
                        style={{ 
                          backgroundColor: options.severityColors?.[alert[options.severityField]] || '#6b7280' 
                        }}
                      >
                        {alert[options.severityField]?.toUpperCase()}
                      </span>
                      <span 
                        className={`status-badge ${alert[options.statusField]}`}
                        style={{ 
                          backgroundColor: options.statusColors?.[alert[options.statusField]] || '#6b7280' 
                        }}
                      >
                        {alert[options.statusField]?.toUpperCase()}
                      </span>
                      <span className="alert-time">
                        {new Date(alert[options.timeField]).toLocaleString()}
                      </span>
                    </div>
                    <div className="alert-title">{alert.title}</div>
                    {alert.description && (
                      <div className="alert-description">{alert.description}</div>
                    )}
                    {alert.source && (
                      <div className="alert-source">Source: {alert.source}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {data?.query && (
        <div className="widget-footer">
          <small className="query-info">
            Query executed in {data.executionTime}ms • {totalAlerts} alerts
          </small>
        </div>
      )}
    </div>
  );
};

export default AlertSummaryWidgetComponent;