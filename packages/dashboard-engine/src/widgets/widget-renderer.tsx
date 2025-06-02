import React from 'react';
import { WidgetRenderer, BaseWidget, WidgetProps } from '../types/widget.types';
import ChartWidgetComponent from './chart-widget';
import TableWidgetComponent from './table-widget';
import MetricWidgetComponent from './metric-widget';
import AlertSummaryWidgetComponent from './alert-summary-widget';

export class DefaultWidgetRenderer implements WidgetRenderer {
  render(widget: BaseWidget, data: any, props: WidgetProps) {
    const componentProps = {
      ...props,
      widget,
      data
    };

    switch (widget.type) {
      case 'chart':
        return <ChartWidgetComponent {...componentProps} />;
        
      case 'table':
        return <TableWidgetComponent {...componentProps} />;
        
      case 'metric':
        return <MetricWidgetComponent {...componentProps} />;
        
      case 'alert-summary':
        return <AlertSummaryWidgetComponent {...componentProps} />;
        
      case 'timeline':
        return this.renderTimelineWidget(widget, data, props);
        
      case 'map':
        return this.renderMapWidget(widget, data, props);
        
      case 'text':
        return this.renderTextWidget(widget, data, props);
        
      case 'threat-feed':
        return this.renderThreatFeedWidget(widget, data, props);
        
      case 'log-volume':
        return this.renderLogVolumeWidget(widget, data, props);
        
      case 'performance-stats':
        return this.renderPerformanceStatsWidget(widget, data, props);
        
      case 'security-score':
        return this.renderSecurityScoreWidget(widget, data, props);
        
      case 'event-timeline':
        return this.renderEventTimelineWidget(widget, data, props);
        
      case 'geo-map':
        return this.renderGeoMapWidget(widget, data, props);
        
      case 'network-graph':
        return this.renderNetworkGraphWidget(widget, data, props);
        
      case 'heat-map':
        return this.renderHeatMapWidget(widget, data, props);
        
      case 'correlation-matrix':
        return this.renderCorrelationMatrixWidget(widget, data, props);
        
      default:
        return this.renderUnsupportedWidget(widget, props);
    }
  }

  canRender(type: string): boolean {
    const supportedTypes = [
      'chart', 'table', 'metric', 'alert-summary', 'timeline', 'map', 'text',
      'threat-feed', 'log-volume', 'performance-stats', 'security-score',
      'event-timeline', 'geo-map', 'network-graph', 'heat-map', 'correlation-matrix'
    ];
    return supportedTypes.includes(type);
  }

  getDefaultConfig(type: string): Partial<BaseWidget> {
    // This is handled by the WidgetFactory
    return {};
  }

  // Security-specific widget renderers
  private renderTimelineWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    return (
      <div className="widget-container timeline-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {props.editable && (
            <button onClick={props.onEdit} className="widget-edit-btn">⚙️</button>
          )}
        </div>
        <div className="widget-content">
          <div className="timeline-placeholder">
            📅 Timeline visualization coming soon
            <br />
            <small>Events: {data?.data?.length || 0}</small>
          </div>
        </div>
      </div>
    );
  }

  private renderMapWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    return (
      <div className="widget-container map-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {props.editable && (
            <button onClick={props.onEdit} className="widget-edit-btn">⚙️</button>
          )}
        </div>
        <div className="widget-content">
          <div className="map-placeholder">
            🗺️ Geographic map visualization
            <br />
            <small>Data points: {data?.data?.length || 0}</small>
          </div>
        </div>
      </div>
    );
  }

  private renderTextWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    const content = widget.visualization.options.content || 'No content';
    const format = widget.visualization.options.format || 'plain';

    return (
      <div className="widget-container text-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {props.editable && (
            <button onClick={props.onEdit} className="widget-edit-btn">⚙️</button>
          )}
        </div>
        <div className="widget-content">
          <div className={`text-content ${format}`}>
            {format === 'markdown' ? (
              <div dangerouslySetInnerHTML={{ __html: this.parseMarkdown(content) }} />
            ) : format === 'html' ? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <div className="plain-text">{content}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  private renderThreatFeedWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    const threats = data?.data || [];

    return (
      <div className="widget-container threat-feed-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {props.onRefresh && (
            <button onClick={props.onRefresh} className="widget-refresh-btn">🔄</button>
          )}
        </div>
        <div className="widget-content">
          <div className="threat-feed">
            {threats.length === 0 ? (
              <div className="no-threats">🛡️ No active threats</div>
            ) : (
              threats.slice(0, 5).map((threat: any, index: number) => (
                <div key={index} className="threat-item">
                  <div className="threat-severity" data-severity={threat.severity}>
                    {threat.severity?.toUpperCase()}
                  </div>
                  <div className="threat-info">
                    <div className="threat-title">{threat.title || threat.name}</div>
                    <div className="threat-description">{threat.description}</div>
                    <div className="threat-meta">
                      <span className="threat-source">{threat.source}</span>
                      <span className="threat-time">{new Date(threat.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  private renderLogVolumeWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    const volume = data?.data?.volume || 0;
    const rate = data?.data?.rate || 0;

    return (
      <div className="widget-container log-volume-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <div className="log-volume-stats">
            <div className="volume-metric">
              <div className="metric-value">{volume.toLocaleString()}</div>
              <div className="metric-label">Total Logs</div>
            </div>
            <div className="rate-metric">
              <div className="metric-value">{rate.toLocaleString()}/s</div>
              <div className="metric-label">Current Rate</div>
            </div>
          </div>
          <div className="volume-chart-placeholder">
            📊 Volume trend chart
          </div>
        </div>
      </div>
    );
  }

  private renderPerformanceStatsWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    const stats = data?.data || {};

    return (
      <div className="widget-container performance-stats-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <div className="performance-grid">
            <div className="perf-stat">
              <div className="stat-value">{stats.cpu || '0'}%</div>
              <div className="stat-label">CPU Usage</div>
            </div>
            <div className="perf-stat">
              <div className="stat-value">{stats.memory || '0'}%</div>
              <div className="stat-label">Memory Usage</div>
            </div>
            <div className="perf-stat">
              <div className="stat-value">{stats.disk || '0'}%</div>
              <div className="stat-label">Disk Usage</div>
            </div>
            <div className="perf-stat">
              <div className="stat-value">{stats.network || '0'} MB/s</div>
              <div className="stat-label">Network I/O</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderSecurityScoreWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    const score = data?.data?.score || 0;
    const maxScore = data?.data?.maxScore || 100;
    const percentage = (score / maxScore) * 100;

    const getScoreColor = (pct: number) => {
      if (pct >= 80) return '#10b981';
      if (pct >= 60) return '#f59e0b';
      return '#ef4444';
    };

    return (
      <div className="widget-container security-score-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <div className="security-score-display">
            <div className="score-circle">
              <svg viewBox="0 0 100 100" className="score-svg">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={getScoreColor(percentage)}
                  strokeWidth="8"
                  strokeDasharray={`${percentage * 2.83} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="score-text">
                <div className="score-value">{score}</div>
                <div className="score-max">/ {maxScore}</div>
              </div>
            </div>
            <div className="score-details">
              <div className="score-percentage">{percentage.toFixed(1)}%</div>
              <div className="score-label">Security Score</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderEventTimelineWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    return (
      <div className="widget-container event-timeline-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <div className="event-timeline-placeholder">
            ⏱️ Event timeline visualization
            <br />
            <small>Events over time</small>
          </div>
        </div>
      </div>
    );
  }

  private renderGeoMapWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    return (
      <div className="widget-container geo-map-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <div className="geo-map-placeholder">
            🌍 Geographic threat map
            <br />
            <small>Global threat indicators</small>
          </div>
        </div>
      </div>
    );
  }

  private renderNetworkGraphWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    return (
      <div className="widget-container network-graph-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <div className="network-graph-placeholder">
            🕸️ Network topology and connections
            <br />
            <small>Node and edge visualization</small>
          </div>
        </div>
      </div>
    );
  }

  private renderHeatMapWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    return (
      <div className="widget-container heat-map-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <div className="heat-map-placeholder">
            🔥 Heat map visualization
            <br />
            <small>Intensity mapping</small>
          </div>
        </div>
      </div>
    );
  }

  private renderCorrelationMatrixWidget(widget: BaseWidget, data: any, props: WidgetProps) {
    return (
      <div className="widget-container correlation-matrix-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content">
          <div className="correlation-matrix-placeholder">
            📊 Correlation matrix
            <br />
            <small>Statistical relationships</small>
          </div>
        </div>
      </div>
    );
  }

  private renderUnsupportedWidget(widget: BaseWidget, props: WidgetProps) {
    return (
      <div className="widget-container unsupported-widget">
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {props.editable && (
            <button onClick={props.onEdit} className="widget-edit-btn">⚙️</button>
          )}
        </div>
        <div className="widget-content">
          <div className="unsupported-message">
            ❓ Unsupported widget type: {widget.type}
          </div>
        </div>
      </div>
    );
  }

  private parseMarkdown(content: string): string {
    // Basic markdown parsing - in a real implementation, use a proper markdown parser
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  }
}

export default DefaultWidgetRenderer;