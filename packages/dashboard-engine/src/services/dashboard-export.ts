import { DashboardConfig } from '../types/dashboard.types';

export interface ExportOptions {
  format: 'pdf' | 'png' | 'svg' | 'json' | 'csv' | 'xlsx';
  includeData: boolean;
  includeImages: boolean;
  quality: 'low' | 'medium' | 'high';
  pageSize: 'a4' | 'a3' | 'letter' | 'legal' | 'custom';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  customSize?: {
    width: number;
    height: number;
  };
  includeMetadata: boolean;
  watermark?: string;
  theme: 'light' | 'dark' | 'auto';
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  size?: number;
  error?: string;
  metadata?: {
    exportedAt: string;
    format: string;
    dashboard: {
      id: string;
      title: string;
      version: number;
    };
    pages?: number;
    widgets: number;
  };
}

export class DashboardExportService {
  private canvas: HTMLCanvasElement | null = null;
  private printStyleSheet: HTMLStyleElement | null = null;

  constructor() {
    // Create canvas for image generation
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);

    // Create print stylesheet
    this.createPrintStyleSheet();
  }

  async exportDashboard(
    dashboard: DashboardConfig,
    element: HTMLElement,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    const exportOptions: ExportOptions = {
      format: 'pdf',
      includeData: true,
      includeImages: true,
      quality: 'high',
      pageSize: 'a4',
      orientation: 'landscape',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      includeMetadata: true,
      theme: 'light',
      ...options
    };

    try {
      switch (exportOptions.format) {
        case 'pdf':
          return await this.exportToPDF(dashboard, element, exportOptions);
        case 'png':
          return await this.exportToImage(dashboard, element, exportOptions, 'png');
        case 'svg':
          return await this.exportToSVG(dashboard, element, exportOptions);
        case 'json':
          return await this.exportToJSON(dashboard, exportOptions);
        case 'csv':
          return await this.exportToCSV(dashboard, exportOptions);
        case 'xlsx':
          return await this.exportToExcel(dashboard, exportOptions);
        default:
          throw new Error(`Unsupported export format: ${exportOptions.format}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  async printDashboard(
    dashboard: DashboardConfig,
    element: HTMLElement,
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    const printOptions: ExportOptions = {
      format: 'pdf',
      includeData: false,
      includeImages: true,
      quality: 'high',
      pageSize: 'a4',
      orientation: 'landscape',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      includeMetadata: false,
      theme: 'light',
      ...options
    };

    // Apply print styles
    this.applyPrintStyles(element, printOptions);

    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window. Please check popup blockers.');
    }

    // Generate HTML for printing
    const printHTML = this.generatePrintHTML(dashboard, element, printOptions);
    
    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for images to load
    await this.waitForImages(printWindow.document);

    // Trigger print
    printWindow.focus();
    printWindow.print();
    
    // Close print window after printing
    setTimeout(() => {
      printWindow.close();
    }, 1000);

    // Remove print styles
    this.removePrintStyles(element);
  }

  private async exportToPDF(
    dashboard: DashboardConfig,
    element: HTMLElement,
    options: ExportOptions
  ): Promise<ExportResult> {
    // This would typically use a library like jsPDF or puppeteer
    // For this implementation, we'll simulate the process
    
    const filename = `${dashboard.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Simulate PDF generation
    const pdfBlob = await this.generatePDFBlob(dashboard, element, options);
    const downloadUrl = URL.createObjectURL(pdfBlob);

    return {
      success: true,
      downloadUrl,
      filename,
      size: pdfBlob.size,
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'pdf',
        dashboard: {
          id: dashboard.id,
          title: dashboard.title,
          version: dashboard.version
        },
        pages: this.calculatePages(element, options),
        widgets: this.countWidgets(dashboard)
      }
    };
  }

  private async exportToImage(
    dashboard: DashboardConfig,
    element: HTMLElement,
    options: ExportOptions,
    format: 'png' | 'jpeg'
  ): Promise<ExportResult> {
    if (!this.canvas) {
      throw new Error('Canvas not available for image export');
    }

    // Use html2canvas or similar library to capture element
    const imageBlob = await this.captureElementAsImage(element, options, format);
    const filename = `${dashboard.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.${format}`;
    const downloadUrl = URL.createObjectURL(imageBlob);

    return {
      success: true,
      downloadUrl,
      filename,
      size: imageBlob.size,
      metadata: {
        exportedAt: new Date().toISOString(),
        format,
        dashboard: {
          id: dashboard.id,
          title: dashboard.title,
          version: dashboard.version
        },
        widgets: this.countWidgets(dashboard)
      }
    };
  }

  private async exportToSVG(
    dashboard: DashboardConfig,
    element: HTMLElement,
    options: ExportOptions
  ): Promise<ExportResult> {
    const svgString = this.elementToSVG(element, options);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const filename = `${dashboard.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.svg`;
    const downloadUrl = URL.createObjectURL(svgBlob);

    return {
      success: true,
      downloadUrl,
      filename,
      size: svgBlob.size,
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'svg',
        dashboard: {
          id: dashboard.id,
          title: dashboard.title,
          version: dashboard.version
        },
        widgets: this.countWidgets(dashboard)
      }
    };
  }

  private async exportToJSON(
    dashboard: DashboardConfig,
    options: ExportOptions
  ): Promise<ExportResult> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0',
        generator: 'SecureWatch Dashboard Engine'
      },
      dashboard: options.includeMetadata ? dashboard : {
        id: dashboard.id,
        title: dashboard.title,
        description: dashboard.description,
        layout: dashboard.layout,
        timeRange: dashboard.timeRange,
        filters: dashboard.filters
      }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const jsonBlob = new Blob([jsonString], { type: 'application/json' });
    const filename = `${dashboard.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    const downloadUrl = URL.createObjectURL(jsonBlob);

    return {
      success: true,
      downloadUrl,
      filename,
      size: jsonBlob.size,
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'json',
        dashboard: {
          id: dashboard.id,
          title: dashboard.title,
          version: dashboard.version
        },
        widgets: this.countWidgets(dashboard)
      }
    };
  }

  private async exportToCSV(
    dashboard: DashboardConfig,
    options: ExportOptions
  ): Promise<ExportResult> {
    if (!options.includeData) {
      throw new Error('CSV export requires data to be included');
    }

    // Generate CSV data from dashboard widgets
    const csvData = this.generateCSVData(dashboard);
    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    const filename = `${dashboard.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    const downloadUrl = URL.createObjectURL(csvBlob);

    return {
      success: true,
      downloadUrl,
      filename,
      size: csvBlob.size,
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'csv',
        dashboard: {
          id: dashboard.id,
          title: dashboard.title,
          version: dashboard.version
        },
        widgets: this.countWidgets(dashboard)
      }
    };
  }

  private async exportToExcel(
    dashboard: DashboardConfig,
    options: ExportOptions
  ): Promise<ExportResult> {
    // This would typically use a library like SheetJS/xlsx
    // For this implementation, we'll simulate the process
    
    const excelBlob = await this.generateExcelBlob(dashboard, options);
    const filename = `${dashboard.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const downloadUrl = URL.createObjectURL(excelBlob);

    return {
      success: true,
      downloadUrl,
      filename,
      size: excelBlob.size,
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'xlsx',
        dashboard: {
          id: dashboard.id,
          title: dashboard.title,
          version: dashboard.version
        },
        widgets: this.countWidgets(dashboard)
      }
    };
  }

  private createPrintStyleSheet(): void {
    this.printStyleSheet = document.createElement('style');
    this.printStyleSheet.id = 'dashboard-print-styles';
    this.printStyleSheet.textContent = `
      @media print {
        @page {
          margin: 0.5in;
        }
        
        .dashboard-builder {
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .widget-container {
          break-inside: avoid;
          margin-bottom: 0.5in;
          page-break-inside: avoid;
        }
        
        .widget-actions,
        .editing-overlay,
        .editing-info,
        .selection-info {
          display: none !important;
        }
        
        .dashboard-header {
          border-bottom: 1px solid #ddd;
          padding-bottom: 0.25in;
          margin-bottom: 0.25in;
        }
        
        .dashboard-grid {
          display: block !important;
        }
        
        .grid-item {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          position: static !important;
          transform: none !important;
          margin-bottom: 0.25in;
        }
        
        .chart-widget .recharts-wrapper,
        .table-widget .table-container,
        .metric-widget .metric-display {
          background: white !important;
        }
        
        body {
          background: white !important;
        }
      }
    `;
    document.head.appendChild(this.printStyleSheet);
  }

  private applyPrintStyles(element: HTMLElement, options: ExportOptions): void {
    element.classList.add('print-mode');
    
    // Apply theme
    if (options.theme === 'light') {
      element.classList.add('light-theme');
      element.classList.remove('dark-theme');
    } else if (options.theme === 'dark') {
      element.classList.add('dark-theme');
      element.classList.remove('light-theme');
    }
  }

  private removePrintStyles(element: HTMLElement): void {
    element.classList.remove('print-mode', 'light-theme', 'dark-theme');
  }

  private generatePrintHTML(
    dashboard: DashboardConfig,
    element: HTMLElement,
    options: ExportOptions
  ): string {
    const styles = `
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          margin: ${options.margins.top}mm ${options.margins.right}mm ${options.margins.bottom}mm ${options.margins.left}mm;
          background: white;
        }
        .print-header {
          border-bottom: 2px solid #ddd;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .print-footer {
          position: fixed;
          bottom: ${options.margins.bottom}mm;
          left: ${options.margins.left}mm;
          right: ${options.margins.right}mm;
          text-align: center;
          font-size: 10px;
          color: #666;
        }
        ${options.watermark ? `
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 48px;
          color: rgba(0, 0, 0, 0.1);
          z-index: -1;
          pointer-events: none;
        }
        ` : ''}
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${dashboard.title} - Dashboard Export</title>
          <meta charset="utf-8">
          ${styles}
        </head>
        <body>
          ${options.watermark ? `<div class="watermark">${options.watermark}</div>` : ''}
          
          <div class="print-header">
            <h1>${dashboard.title}</h1>
            ${dashboard.description ? `<p>${dashboard.description}</p>` : ''}
            <p><small>Generated on ${new Date().toLocaleString()}</small></p>
          </div>
          
          ${element.outerHTML}
          
          <div class="print-footer">
            SecureWatch Dashboard - Page <span class="page-number"></span>
          </div>
        </body>
      </html>
    `;
  }

  private async waitForImages(document: Document): Promise<void> {
    const images = Array.from(document.querySelectorAll('img'));
    const promises = images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve);
        img.addEventListener('error', resolve);
      });
    });
    await Promise.all(promises);
  }

  // Helper methods for actual export generation (would use real libraries in production)
  private async generatePDFBlob(
    dashboard: DashboardConfig,
    element: HTMLElement,
    options: ExportOptions
  ): Promise<Blob> {
    // Simulate PDF generation - in real implementation would use jsPDF, puppeteer, etc.
    return new Blob(['%PDF-1.4 (simulated PDF content)'], { type: 'application/pdf' });
  }

  private async captureElementAsImage(
    element: HTMLElement,
    options: ExportOptions,
    format: 'png' | 'jpeg'
  ): Promise<Blob> {
    // Simulate image capture - in real implementation would use html2canvas
    const canvas = document.createElement('canvas');
    canvas.width = element.offsetWidth;
    canvas.height = element.offsetHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = options.theme === 'dark' ? '#1f2937' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = options.theme === 'dark' ? '#ffffff' : '#000000';
      ctx.font = '16px Arial';
      ctx.fillText(`${element.children.length} widgets exported`, 20, 30);
    }
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob([], { type: `image/${format}` }));
      }, `image/${format}`, options.quality === 'high' ? 0.9 : options.quality === 'medium' ? 0.7 : 0.5);
    });
  }

  private elementToSVG(element: HTMLElement, options: ExportOptions): string {
    // Simulate SVG generation
    return `
      <svg width="${element.offsetWidth}" height="${element.offsetHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${options.theme === 'dark' ? '#1f2937' : '#ffffff'}"/>
        <text x="20" y="30" font-family="Arial" font-size="16" fill="${options.theme === 'dark' ? '#ffffff' : '#000000'}">
          Dashboard: ${element.dataset.title || 'Exported Dashboard'}
        </text>
      </svg>
    `;
  }

  private generateCSVData(dashboard: DashboardConfig): string {
    // Simulate CSV generation from dashboard data
    const headers = ['Widget ID', 'Widget Type', 'Title', 'Row', 'Column'];
    const rows = [headers.join(',')];
    
    dashboard.layout.rows.forEach((row, rowIndex) => {
      row.columns.forEach((column, colIndex) => {
        const rowData = [
          column.widgetId,
          column.widgetConfig.type,
          `"${column.widgetConfig.title}"`,
          rowIndex + 1,
          colIndex + 1
        ];
        rows.push(rowData.join(','));
      });
    });
    
    return rows.join('\n');
  }

  private async generateExcelBlob(
    dashboard: DashboardConfig,
    options: ExportOptions
  ): Promise<Blob> {
    // Simulate Excel generation - in real implementation would use SheetJS
    return new Blob(['Excel content simulation'], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  private calculatePages(element: HTMLElement, options: ExportOptions): number {
    const pageHeight = options.pageSize === 'a4' ? 
      (options.orientation === 'portrait' ? 297 : 210) : 
      (options.orientation === 'portrait' ? 279 : 216); // Letter size
    
    const elementHeight = element.offsetHeight * 0.264583; // Convert px to mm
    return Math.ceil(elementHeight / (pageHeight - options.margins.top - options.margins.bottom));
  }

  private countWidgets(dashboard: DashboardConfig): number {
    return dashboard.layout.rows.reduce((count, row) => count + row.columns.length, 0);
  }

  destroy(): void {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    if (this.printStyleSheet && this.printStyleSheet.parentNode) {
      this.printStyleSheet.parentNode.removeChild(this.printStyleSheet);
    }
  }
}