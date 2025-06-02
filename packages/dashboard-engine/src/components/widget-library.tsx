import React, { useState, useMemo } from 'react';
import { WidgetFactory, BaseWidget } from '../types/widget.types';

interface WidgetLibraryProps {
  widgetFactory: WidgetFactory;
  onWidgetSelect: (widgetType: string) => void;
  onWidgetCreate: (widget: Partial<BaseWidget>) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface WidgetCategory {
  name: string;
  description: string;
  widgets: WidgetTypeInfo[];
}

interface WidgetTypeInfo {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({
  widgetFactory,
  onWidgetSelect,
  onWidgetCreate,
  isOpen,
  onClose,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWidget, setSelectedWidget] = useState<WidgetTypeInfo | null>(null);

  const widgetTypes = useMemo((): WidgetTypeInfo[] => [
    {
      type: 'chart',
      name: 'Chart',
      description: 'Visualize data with various chart types (line, bar, pie, etc.)',
      icon: '📊',
      category: 'Visualization',
      difficulty: 'beginner',
      tags: ['chart', 'graph', 'visualization', 'analytics']
    },
    {
      type: 'table',
      name: 'Data Table',
      description: 'Display tabular data with sorting, filtering, and pagination',
      icon: '📋',
      category: 'Data Display',
      difficulty: 'beginner',
      tags: ['table', 'data', 'grid', 'list']
    },
    {
      type: 'metric',
      name: 'Metric',
      description: 'Show key performance indicators and metrics',
      icon: '🎯',
      category: 'KPI',
      difficulty: 'beginner',
      tags: ['metric', 'kpi', 'number', 'gauge']
    },
    {
      type: 'alert-summary',
      name: 'Alert Summary',
      description: 'Security alerts overview with severity and status breakdown',
      icon: '🚨',
      category: 'Security',
      difficulty: 'intermediate',
      tags: ['alerts', 'security', 'incidents', 'threats']
    },
    {
      type: 'timeline',
      name: 'Timeline',
      description: 'Event timeline with chronological visualization',
      icon: '📅',
      category: 'Security',
      difficulty: 'intermediate',
      tags: ['timeline', 'events', 'chronology', 'history']
    },
    {
      type: 'map',
      name: 'Geographic Map',
      description: 'Geographic visualization of data points',
      icon: '🗺️',
      category: 'Visualization',
      difficulty: 'advanced',
      tags: ['map', 'geographic', 'location', 'geo']
    },
    {
      type: 'text',
      name: 'Text Widget',
      description: 'Static or dynamic text content with markdown support',
      icon: '📝',
      category: 'Content',
      difficulty: 'beginner',
      tags: ['text', 'content', 'markdown', 'static']
    },
    {
      type: 'threat-feed',
      name: 'Threat Feed',
      description: 'Live threat intelligence feed and indicators',
      icon: '🛡️',
      category: 'Security',
      difficulty: 'advanced',
      tags: ['threats', 'intelligence', 'feed', 'ioc']
    },
    {
      type: 'log-volume',
      name: 'Log Volume',
      description: 'Monitor log ingestion volume and rates',
      icon: '📈',
      category: 'Operations',
      difficulty: 'intermediate',
      tags: ['logs', 'volume', 'ingestion', 'monitoring']
    },
    {
      type: 'performance-stats',
      name: 'Performance Stats',
      description: 'System performance metrics (CPU, Memory, Disk)',
      icon: '⚡',
      category: 'Operations',
      difficulty: 'intermediate',
      tags: ['performance', 'system', 'monitoring', 'health']
    },
    {
      type: 'security-score',
      name: 'Security Score',
      description: 'Overall security posture score and assessment',
      icon: '🏆',
      category: 'Security',
      difficulty: 'advanced',
      tags: ['score', 'posture', 'assessment', 'rating']
    },
    {
      type: 'network-graph',
      name: 'Network Graph',
      description: 'Network topology and connection visualization',
      icon: '🕸️',
      category: 'Security',
      difficulty: 'advanced',
      tags: ['network', 'topology', 'connections', 'graph']
    },
    {
      type: 'heat-map',
      name: 'Heat Map',
      description: 'Intensity-based visualization of data patterns',
      icon: '🔥',
      category: 'Visualization',
      difficulty: 'intermediate',
      tags: ['heatmap', 'intensity', 'patterns', 'visualization']
    },
    {
      type: 'correlation-matrix',
      name: 'Correlation Matrix',
      description: 'Statistical correlation analysis between variables',
      icon: '🔗',
      category: 'Analytics',
      difficulty: 'advanced',
      tags: ['correlation', 'matrix', 'statistics', 'analysis']
    }
  ], []);

  const categories = useMemo((): WidgetCategory[] => {
    const categoryMap = new Map<string, WidgetTypeInfo[]>();
    
    widgetTypes.forEach(widget => {
      if (!categoryMap.has(widget.category)) {
        categoryMap.set(widget.category, []);
      }
      categoryMap.get(widget.category)!.push(widget);
    });

    return Array.from(categoryMap.entries()).map(([name, widgets]) => ({
      name,
      description: getCategoryDescription(name),
      widgets: widgets.sort((a, b) => a.name.localeCompare(b.name))
    }));
  }, [widgetTypes]);

  const filteredWidgets = useMemo(() => {
    let filtered = widgetTypes;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(widget =>
        widget.name.toLowerCase().includes(searchLower) ||
        widget.description.toLowerCase().includes(searchLower) ||
        widget.tags.some(tag => tag.includes(searchLower))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(widget => widget.category === selectedCategory);
    }

    return filtered;
  }, [widgetTypes, searchTerm, selectedCategory]);

  const handleWidgetClick = (widget: WidgetTypeInfo) => {
    setSelectedWidget(widget);
  };

  const handleCreateWidget = () => {
    if (!selectedWidget) return;

    const defaultConfig = widgetFactory.getDefaultConfig(selectedWidget.type);
    onWidgetCreate({
      ...defaultConfig,
      id: `${selectedWidget.type}-${Date.now()}`
    });
    onClose();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`widget-library-overlay ${className}`}>
      <div className="widget-library">
        <div className="library-header">
          <h2>Widget Library</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="library-content">
          <div className="library-sidebar">
            {/* Search */}
            <div className="search-section">
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="widget-search"
              />
            </div>

            {/* Category Filter */}
            <div className="category-section">
              <h3>Categories</h3>
              <div className="category-list">
                <button
                  className={`category-item ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  All Widgets ({widgetTypes.length})
                </button>
                {categories.map(category => (
                  <button
                    key={category.name}
                    className={`category-item ${selectedCategory === category.name ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    {category.name} ({category.widgets.length})
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="library-main">
            <div className="widgets-grid">
              {filteredWidgets.map(widget => (
                <div
                  key={widget.type}
                  className={`widget-card ${selectedWidget?.type === widget.type ? 'selected' : ''}`}
                  onClick={() => handleWidgetClick(widget)}
                >
                  <div className="widget-icon">{widget.icon}</div>
                  <div className="widget-info">
                    <h4 className="widget-name">{widget.name}</h4>
                    <p className="widget-description">{widget.description}</p>
                    <div className="widget-meta">
                      <span className="widget-category">{widget.category}</span>
                      <span 
                        className="widget-difficulty"
                        style={{ color: getDifficultyColor(widget.difficulty) }}
                      >
                        {widget.difficulty}
                      </span>
                    </div>
                    <div className="widget-tags">
                      {widget.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredWidgets.length === 0 && (
              <div className="no-widgets">
                <div className="no-widgets-icon">🔍</div>
                <h3>No widgets found</h3>
                <p>Try adjusting your search or category filter</p>
              </div>
            )}
          </div>
        </div>

        {/* Widget Details Panel */}
        {selectedWidget && (
          <div className="widget-details-panel">
            <div className="details-header">
              <div className="details-icon">{selectedWidget.icon}</div>
              <div className="details-info">
                <h3>{selectedWidget.name}</h3>
                <p>{selectedWidget.description}</p>
              </div>
            </div>

            <div className="details-content">
              <div className="detail-section">
                <strong>Category:</strong> {selectedWidget.category}
              </div>
              <div className="detail-section">
                <strong>Difficulty:</strong>
                <span 
                  className="difficulty-badge"
                  style={{ color: getDifficultyColor(selectedWidget.difficulty) }}
                >
                  {selectedWidget.difficulty}
                </span>
              </div>
              <div className="detail-section">
                <strong>Tags:</strong>
                <div className="tags-list">
                  {selectedWidget.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="details-actions">
              <button
                className="btn-primary"
                onClick={handleCreateWidget}
              >
                Add to Dashboard
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  onWidgetSelect(selectedWidget.type);
                  onClose();
                }}
              >
                Configure & Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'Visualization': 'Charts, graphs, and visual representations of data',
    'Data Display': 'Tables, lists, and structured data presentation',
    'KPI': 'Key performance indicators and business metrics',
    'Security': 'Security-focused widgets for threat monitoring and analysis',
    'Content': 'Text, documentation, and informational widgets',
    'Operations': 'System monitoring and operational metrics',
    'Analytics': 'Advanced analytics and statistical visualizations'
  };
  
  return descriptions[category] || 'Various dashboard widgets';
}

export default WidgetLibrary;