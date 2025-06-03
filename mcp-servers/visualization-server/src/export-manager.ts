import { ChartExportOptions, GeneratedChart, GeneratedTable } from './types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export class ExportManager {
  private outputDir: string;

  constructor(outputDir?: string) {
    // Get the current directory if we're using ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Set output directory, default to ../charts relative to this file
    this.outputDir = outputDir || path.join(__dirname, '..', 'charts');
    
    // Ensure the output directory exists
    this.ensureOutputDirExists();
  }

  /**
   * Ensure the output directory exists
   */
  private ensureOutputDirExists(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Export a chart to a file
   */
  public async exportChart(chart: GeneratedChart, options: ChartExportOptions): Promise<string> {
    try {
      if (!chart.imageBase64) {
        throw new Error('Chart does not have image data to export');
      }

      // Extract the base64 data (remove the data:image/png;base64, prefix)
      const base64Data = chart.imageBase64.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid base64 image data');
      }

      // Determine file extension based on format
      let fileExtension = '.png';
      switch (options.format) {
        case 'svg':
          fileExtension = '.svg';
          break;
        case 'jpeg':
          fileExtension = '.jpg';
          break;
      }

      // Generate a filename based on chart id and type
      const filename = `${chart.id}-${chart.type}${fileExtension}`;
      const filePath = path.join(this.outputDir, filename);

      // Write the file
      fs.writeFileSync(filePath, base64Data, 'base64');

      return filePath;
    } catch (error) {
      console.error('Error exporting chart:', error);
      throw new Error(`Failed to export chart: ${error}`);
    }
  }

  /**
   * Export a table to an HTML file
   */
  public exportTableToHtml(table: GeneratedTable): string {
    try {
      // Generate a filename based on table id
      const filename = `${table.id}-table.html`;
      const filePath = path.join(this.outputDir, filename);

      // Create a complete HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${table.options.title || 'Table Export'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          ${table.htmlContent}
        </body>
        </html>
      `;

      // Write the file
      fs.writeFileSync(filePath, htmlContent);

      return filePath;
    } catch (error) {
      console.error('Error exporting table to HTML:', error);
      throw new Error(`Failed to export table to HTML: ${error}`);
    }
  }

  /**
   * Export a table to CSV
   */
  public exportTableToCsv(table: GeneratedTable): string {
    try {
      // Generate a filename based on table id
      const filename = `${table.id}-table.csv`;
      const filePath = path.join(this.outputDir, filename);

      // Start with headers
      let csvContent = table.data.columns.map(col => `"${col.header}"`).join(',') + '\n';

      // Add rows
      for (const row of table.data.rows) {
        const rowValues = table.data.columns.map(col => {
          const value = row[col.field];
          // Escape quotes in string values and wrap in quotes
          return typeof value === 'string' 
            ? `"${value.replace(/"/g, '""')}"`
            : `${value}`;
        });
        csvContent += rowValues.join(',') + '\n';
      }

      // Write the file
      fs.writeFileSync(filePath, csvContent);

      return filePath;
    } catch (error) {
      console.error('Error exporting table to CSV:', error);
      throw new Error(`Failed to export table to CSV: ${error}`);
    }
  }

  /**
   * Export a dashboard to HTML
   */
  public exportDashboardToHtml(dashboardHtml: string, title: string): string {
    try {
      // Generate a filename
      const filename = `dashboard-${Date.now()}.html`;
      const filePath = path.join(this.outputDir, filename);

      // Create a complete HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title || 'Dashboard Export'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .dashboard-container {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              justify-content: center;
            }
            .dashboard-item {
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: 15px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          ${dashboardHtml}
        </body>
        </html>
      `;

      // Write the file
      fs.writeFileSync(filePath, htmlContent);

      return filePath;
    } catch (error) {
      console.error('Error exporting dashboard:', error);
      throw new Error(`Failed to export dashboard: ${error}`);
    }
  }
}