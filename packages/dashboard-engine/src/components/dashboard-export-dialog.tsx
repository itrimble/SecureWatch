import React, { useState, useRef } from 'react';
import { DashboardConfig } from '../types/dashboard.types';
import { DashboardExportService, ExportOptions, ExportResult } from '../services/dashboard-export';

interface DashboardExportDialogProps {
  dashboard: DashboardConfig;
  dashboardElement: HTMLElement | null;
  isOpen: boolean;
  onClose: () => void;
  onExportComplete?: (result: ExportResult) => void;
  className?: string;
}

export const DashboardExportDialog: React.FC<DashboardExportDialogProps> = ({
  dashboard,
  dashboardElement,
  isOpen,
  onClose,
  onExportComplete,
  className = ''
}) => {
  const [exportOptions, setExportOptions] = useState<Partial<ExportOptions>>({
    format: 'pdf',
    includeData: true,
    includeImages: true,
    quality: 'high',
    pageSize: 'a4',
    orientation: 'landscape',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    includeMetadata: true,
    theme: 'light'
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExportResult, setLastExportResult] = useState<ExportResult | null>(null);
  
  const exportServiceRef = useRef<DashboardExportService | null>(null);

  // Initialize export service
  if (!exportServiceRef.current) {
    exportServiceRef.current = new DashboardExportService();
  }

  const handleExport = async () => {
    if (!dashboardElement || !exportServiceRef.current) {
      setExportError('Dashboard not ready for export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await exportServiceRef.current.exportDashboard(
        dashboard,
        dashboardElement,
        exportOptions as ExportOptions
      );

      clearInterval(progressInterval);
      setExportProgress(100);

      if (result.success && result.downloadUrl) {
        // Trigger download
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename || 'dashboard-export';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL after download
        setTimeout(() => {
          URL.revokeObjectURL(result.downloadUrl!);
        }, 1000);
      }

      setLastExportResult(result);
      onExportComplete?.(result);

      if (!result.success) {
        setExportError(result.error || 'Export failed');
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  const handlePrint = async () => {
    if (!dashboardElement || !exportServiceRef.current) {
      setExportError('Dashboard not ready for printing');
      return;
    }

    try {
      await exportServiceRef.current.printDashboard(
        dashboard,
        dashboardElement,
        exportOptions as ExportOptions
      );
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Print failed');
    }
  };

  const updateExportOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'High-quality PDF document suitable for printing and sharing';
      case 'png':
        return 'High-resolution image perfect for presentations and reports';
      case 'svg':
        return 'Scalable vector graphic that maintains quality at any size';
      case 'json':
        return 'Dashboard configuration and metadata for backup or sharing';
      case 'csv':
        return 'Comma-separated values for data analysis in spreadsheet applications';
      case 'xlsx':
        return 'Excel workbook with dashboard data and metadata';
      default:
        return '';
    }
  };

  const getFileSizeEstimate = () => {
    const widgetCount = dashboard.layout.rows.reduce((count, row) => count + row.columns.length, 0);
    const baseSize = widgetCount * 50; // KB per widget
    
    switch (exportOptions.format) {
      case 'pdf':
        return `${Math.round(baseSize * 2)}KB - ${Math.round(baseSize * 4)}KB`;
      case 'png':
        return `${Math.round(baseSize * 3)}KB - ${Math.round(baseSize * 8)}KB`;
      case 'svg':
        return `${Math.round(baseSize * 0.5)}KB - ${Math.round(baseSize * 1.5)}KB`;
      case 'json':
        return `${Math.round(baseSize * 0.1)}KB - ${Math.round(baseSize * 0.3)}KB`;
      case 'csv':
        return `${Math.round(baseSize * 0.05)}KB - ${Math.round(baseSize * 0.2)}KB`;
      case 'xlsx':
        return `${Math.round(baseSize * 1)}KB - ${Math.round(baseSize * 2)}KB`;
      default:
        return 'Unknown';
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`export-dialog-overlay ${className}`}>
      <div className="export-dialog">
        <div className="export-dialog-header">
          <h2>Export Dashboard</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="export-dialog-content">
          {/* Export Format Selection */}
          <div className="export-section">
            <h3>Export Format</h3>
            <div className="format-options">
              {[
                { value: 'pdf', label: 'PDF', icon: '📄' },
                { value: 'png', label: 'PNG Image', icon: '🖼️' },
                { value: 'svg', label: 'SVG Vector', icon: '📐' },
                { value: 'json', label: 'JSON Data', icon: '📋' },
                { value: 'csv', label: 'CSV Data', icon: '📊' },
                { value: 'xlsx', label: 'Excel', icon: '📈' }
              ].map(format => (
                <div
                  key={format.value}
                  className={`format-option ${exportOptions.format === format.value ? 'selected' : ''}`}
                  onClick={() => updateExportOption('format', format.value as any)}
                >
                  <span className="format-icon">{format.icon}</span>
                  <span className="format-label">{format.label}</span>
                </div>
              ))}
            </div>
            <p className="format-description">
              {getFormatDescription(exportOptions.format || 'pdf')}
            </p>
          </div>

          {/* Page Settings (for PDF/Print formats) */}
          {['pdf', 'png'].includes(exportOptions.format || '') && (
            <div className="export-section">
              <h3>Page Settings</h3>
              <div className="page-settings">
                <div className="setting-group">
                  <label>Page Size:</label>
                  <select
                    value={exportOptions.pageSize}
                    onChange={(e) => updateExportOption('pageSize', e.target.value as any)}
                  >
                    <option value="a4">A4</option>
                    <option value="a3">A3</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal</option>
                  </select>
                </div>
                
                <div className="setting-group">
                  <label>Orientation:</label>
                  <select
                    value={exportOptions.orientation}
                    onChange={(e) => updateExportOption('orientation', e.target.value as any)}
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Quality Settings */}
          {['pdf', 'png'].includes(exportOptions.format || '') && (
            <div className="export-section">
              <h3>Quality & Appearance</h3>
              <div className="quality-settings">
                <div className="setting-group">
                  <label>Quality:</label>
                  <select
                    value={exportOptions.quality}
                    onChange={(e) => updateExportOption('quality', e.target.value as any)}
                  >
                    <option value="high">High (Recommended)</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low (Faster)</option>
                  </select>
                </div>
                
                <div className="setting-group">
                  <label>Theme:</label>
                  <select
                    value={exportOptions.theme}
                    onChange={(e) => updateExportOption('theme', e.target.value as any)}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Content Options */}
          <div className="export-section">
            <h3>Content Options</h3>
            <div className="content-options">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportOptions.includeData}
                  onChange={(e) => updateExportOption('includeData', e.target.checked)}
                />
                <span>Include widget data</span>
              </label>
              
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportOptions.includeImages}
                  onChange={(e) => updateExportOption('includeImages', e.target.checked)}
                />
                <span>Include charts and images</span>
              </label>
              
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => updateExportOption('includeMetadata', e.target.checked)}
                />
                <span>Include dashboard metadata</span>
              </label>
            </div>
          </div>

          {/* Watermark (for PDF/Images) */}
          {['pdf', 'png', 'svg'].includes(exportOptions.format || '') && (
            <div className="export-section">
              <h3>Watermark (Optional)</h3>
              <input
                type="text"
                placeholder="Enter watermark text..."
                value={exportOptions.watermark || ''}
                onChange={(e) => updateExportOption('watermark', e.target.value || undefined)}
                className="watermark-input"
              />
            </div>
          )}

          {/* Export Info */}
          <div className="export-info">
            <div className="info-item">
              <span className="info-label">Dashboard:</span>
              <span className="info-value">{dashboard.title}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Widgets:</span>
              <span className="info-value">
                {dashboard.layout.rows.reduce((count, row) => count + row.columns.length, 0)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Estimated Size:</span>
              <span className="info-value">{getFileSizeEstimate()}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="export-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <span className="progress-text">
                {exportProgress < 100 ? 'Exporting...' : 'Export Complete!'}
              </span>
            </div>
          )}

          {/* Error Display */}
          {exportError && (
            <div className="export-error">
              <span className="error-icon">❌</span>
              <span className="error-message">{exportError}</span>
            </div>
          )}

          {/* Success Display */}
          {lastExportResult?.success && !isExporting && (
            <div className="export-success">
              <span className="success-icon">✅</span>
              <span className="success-message">
                Export completed! File size: {lastExportResult.size ? 
                  `${Math.round(lastExportResult.size / 1024)}KB` : 'Unknown'}
              </span>
            </div>
          )}
        </div>

        <div className="export-dialog-actions">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          
          {['pdf', 'png'].includes(exportOptions.format || '') && (
            <button
              className="btn-tertiary"
              onClick={handlePrint}
              disabled={isExporting || !dashboardElement}
            >
              🖨️ Print
            </button>
          )}
          
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={isExporting || !dashboardElement}
          >
            {isExporting ? (
              <>
                <span className="spinner-small" />
                Exporting...
              </>
            ) : (
              <>
                📤 Export {exportOptions.format?.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardExportDialog;