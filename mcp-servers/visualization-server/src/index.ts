#!/usr/bin/env node

import { createMcpServer, McpTool, McpResourceHandler } from '@modelcontextprotocol/sdk';
import { BarChartGenerator } from './chart-generators/bar-chart.js';
import { LineChartGenerator } from './chart-generators/line-chart.js';
import { PieChartGenerator } from './chart-generators/pie-chart.js';
import { TableGenerator } from './chart-generators/table-generator.js';
import { ExportManager } from './export-manager.js';
import { ChartData, ChartOptions, TableData, TableOptions, ChartExportOptions, DashboardOptions, DashboardItem } from './types.js';
import { randomUUID } from 'crypto';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

// For importing JSON files in ESM
const require = createRequire(import.meta.url);

// Initialize chart generators
const barChartGenerator = new BarChartGenerator();
const lineChartGenerator = new LineChartGenerator();
const pieChartGenerator = new PieChartGenerator();
const tableGenerator = new TableGenerator();

// Initialize export manager
const chartOutputDir = process.env.CHART_OUTPUT_DIR || './charts';
const exportManager = new ExportManager(chartOutputDir);

// Server settings
const DEFAULT_CHART_WIDTH = parseInt(process.env.DEFAULT_CHART_WIDTH || '800', 10);
const DEFAULT_CHART_HEIGHT = parseInt(process.env.DEFAULT_CHART_HEIGHT || '600', 10);
const CHART_CACHE_TTL = parseInt(process.env.CHART_CACHE_TTL || '3600', 10);

// In-memory storage for generated charts and templates
const generatedCharts = new Map();
const generatedTables = new Map();
const generatedDashboards = new Map();

// Load chart templates if available
let chartTemplates = {};
let dashboardLayouts = {};

try {
  const templatesPath = path.join(process.cwd(), 'templates', 'chart-templates.json');
  const layoutsPath = path.join(process.cwd(), 'templates', 'dashboard-layouts.json');
  
  if (fs.existsSync(templatesPath)) {
    chartTemplates = require(templatesPath);
  }
  
  if (fs.existsSync(layoutsPath)) {
    dashboardLayouts = require(layoutsPath);
  }
} catch (error) {
  console.warn('Could not load templates:', error);
}

// Define MCP tools
const createChartTool: McpTool = {
  name: 'create_chart',
  description: 'Create various types of charts',
  inputSchema: {
    type: 'object',
    properties: {
      type: { 
        type: 'string', 
        enum: ['bar', 'line', 'pie', 'scatter', 'area', 'histogram'],
        description: 'Type of chart to create'
      },
      data: { 
        type: 'object',
        description: 'Chart data with labels and datasets',
        properties: {
          labels: {
            type: 'array',
            items: { type: 'string' }
          },
          datasets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                data: { type: 'array', items: { type: 'number' } }
              }
            }
          }
        },
        required: ['datasets']
      },
      options: {
        type: 'object',
        description: 'Chart appearance and behavior options',
        properties: {
          title: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          colors: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    required: ['type', 'data']
  },
  handler: async ({ type, data, options = {} }) => {
    try {
      // Apply default dimensions if not specified
      if (!options.width) options.width = DEFAULT_CHART_WIDTH;
      if (!options.height) options.height = DEFAULT_CHART_HEIGHT;

      let generatedChart;

      // Generate chart based on type
      switch (type) {
        case 'bar':
          generatedChart = await barChartGenerator.generateBarChart(data, options);
          break;
        case 'line':
          generatedChart = await lineChartGenerator.generateLineChart(data, options);
          break;
        case 'area':
          generatedChart = await lineChartGenerator.generateAreaChart(data, options);
          break;
        case 'pie':
          generatedChart = await pieChartGenerator.generatePieChart(data, options);
          break;
        default:
          throw new Error(`Chart type '${type}' not supported`);
      }

      // Store the generated chart
      generatedCharts.set(generatedChart.id, generatedChart);
      
      // Return chart details
      return {
        id: generatedChart.id,
        type: generatedChart.type,
        imageDataUrl: generatedChart.imageBase64
      };
    } catch (error) {
      console.error('Error creating chart:', error);
      throw new Error(`Failed to create chart: ${error}`);
    }
  }
};

const createTableTool: McpTool = {
  name: 'create_table',
  description: 'Generate formatted HTML tables',
  inputSchema: {
    type: 'object',
    properties: {
      columns: {
        type: 'array',
        description: 'Table column definitions',
        items: {
          type: 'object',
          properties: {
            header: { type: 'string' },
            field: { type: 'string' },
            width: { type: 'string' },
            textAlign: { type: 'string', enum: ['left', 'center', 'right'] },
            format: { type: 'string', enum: ['text', 'number', 'currency', 'date', 'percent'] }
          },
          required: ['header', 'field']
        }
      },
      rows: {
        type: 'array',
        description: 'Table data rows',
        items: { type: 'object' }
      },
      options: {
        type: 'object',
        description: 'Table appearance and behavior options',
        properties: {
          title: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          pagination: { type: 'boolean' },
          pageSize: { type: 'number' },
          sortable: { type: 'boolean' },
          responsive: { type: 'boolean' }
        }
      }
    },
    required: ['columns', 'rows']
  },
  handler: async ({ columns, rows, options = {} }) => {
    try {
      const tableData = { columns, rows };
      
      // Generate table with responsive option if specified
      const generatedTable = options.responsive
        ? tableGenerator.generateResponsiveTable(tableData, options)
        : tableGenerator.generateTable(tableData, options);
      
      // Store the generated table
      generatedTables.set(generatedTable.id, generatedTable);
      
      // Return table details
      return {
        id: generatedTable.id,
        htmlContent: generatedTable.htmlContent
      };
    } catch (error) {
      console.error('Error creating table:', error);
      throw new Error(`Failed to create table: ${error}`);
    }
  }
};

const createDashboardTool: McpTool = {
  name: 'create_dashboard',
  description: 'Create dashboard layouts',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Dashboard title' },
      layout: { 
        type: 'string',
        enum: ['grid', 'flex', 'custom'],
        description: 'Layout type for dashboard'
      },
      items: {
        type: 'array',
        description: 'Dashboard items (charts, tables, text)',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID of a chart or table' },
            type: { 
              type: 'string',
              enum: ['chart', 'table', 'text'],
              description: 'Item type'
            },
            content: { 
              description: 'Content for text items or options for charts/tables'
            },
            width: { type: 'number', description: 'Width in pixels or percentage' },
            height: { type: 'number', description: 'Height in pixels' }
          },
          required: ['type']
        }
      },
      options: {
        type: 'object',
        description: 'Dashboard options',
        properties: {
          width: { type: 'number' },
          height: { type: 'number' },
          columns: { type: 'number' },
          backgroundColor: { type: 'string' },
          padding: { type: 'number' },
          gap: { type: 'number' }
        }
      }
    },
    required: ['items']
  },
  handler: async ({ title, layout = 'grid', items, options = {} }) => {
    try {
      const dashboardId = randomUUID();
      
      // Create dashboard HTML
      let dashboardHtml = `
        <div class="dashboard" style="
          width: ${options.width || '100%'};
          height: ${options.height || 'auto'};
          background-color: ${options.backgroundColor || '#ffffff'};
          padding: ${options.padding || 20}px;
        ">
          ${title ? `<h1 style="text-align: center;">${title}</h1>` : ''}
          <div class="dashboard-container" style="
            display: ${layout === 'grid' ? 'grid' : 'flex'};
            ${layout === 'grid' ? `grid-template-columns: repeat(${options.columns || 2}, 1fr);` : 'flex-wrap: wrap;'}
            gap: ${options.gap || 20}px;
          ">
      `;
      
      // Process each dashboard item
      for (const item of items) {
        dashboardHtml += `
          <div class="dashboard-item" style="
            ${item.width ? `width: ${item.width}px;` : ''}
            ${item.height ? `height: ${item.height}px;` : ''}
            margin-bottom: 20px;
          ">
        `;
        
        // Add item content based on type
        switch (item.type) {
          case 'chart':
            const chart = generatedCharts.get(item.id);
            if (chart) {
              dashboardHtml += `
                <h3>${chart.options.title || 'Chart'}</h3>
                <div class="chart-container">
                  <img src="${chart.imageBase64}" alt="Chart" style="max-width: 100%;">
                </div>
              `;
            } else {
              dashboardHtml += `<p>Chart not found (ID: ${item.id})</p>`;
            }
            break;
            
          case 'table':
            const table = generatedTables.get(item.id);
            if (table) {
              dashboardHtml += table.htmlContent;
            } else {
              dashboardHtml += `<p>Table not found (ID: ${item.id})</p>`;
            }
            break;
            
          case 'text':
            dashboardHtml += `<div class="text-content">${item.content || ''}</div>`;
            break;
        }
        
        dashboardHtml += `</div>`;
      }
      
      dashboardHtml += `
          </div>
        </div>
      `;
      
      // Store the generated dashboard
      generatedDashboards.set(dashboardId, {
        id: dashboardId,
        title,
        htmlContent: dashboardHtml
      });
      
      // Return dashboard details
      return {
        id: dashboardId,
        htmlContent: dashboardHtml
      };
    } catch (error) {
      console.error('Error creating dashboard:', error);
      throw new Error(`Failed to create dashboard: ${error}`);
    }
  }
};

const exportChartTool: McpTool = {
  name: 'export_chart',
  description: 'Export charts as images (PNG, SVG)',
  inputSchema: {
    type: 'object',
    properties: {
      chartId: { 
        type: 'string',
        description: 'ID of the chart to export'
      },
      format: { 
        type: 'string',
        enum: ['png', 'svg', 'jpeg'],
        description: 'Output file format',
        default: 'png'
      },
      quality: { 
        type: 'number',
        description: 'Image quality (0-1) for JPEG',
        minimum: 0,
        maximum: 1
      },
      width: { type: 'number', description: 'Output width' },
      height: { type: 'number', description: 'Output height' }
    },
    required: ['chartId']
  },
  handler: async ({ chartId, format = 'png', quality, width, height }) => {
    try {
      const chart = generatedCharts.get(chartId);
      if (!chart) {
        throw new Error(`Chart not found with ID: ${chartId}`);
      }
      
      const exportOptions: ChartExportOptions = {
        format,
        quality,
        width,
        height
      };
      
      const filePath = await exportManager.exportChart(chart, exportOptions);
      
      return {
        filePath,
        format
      };
    } catch (error) {
      console.error('Error exporting chart:', error);
      throw new Error(`Failed to export chart: ${error}`);
    }
  }
};

const createHeatmapTool: McpTool = {
  name: 'create_heatmap',
  description: 'Generate heatmap visualizations',
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        description: 'Heatmap data array of arrays, values determine color intensity',
        items: {
          type: 'array',
          items: { type: 'number' }
        }
      },
      xLabels: {
        type: 'array',
        description: 'Labels for x-axis',
        items: { type: 'string' }
      },
      yLabels: {
        type: 'array',
        description: 'Labels for y-axis',
        items: { type: 'string' }
      },
      options: {
        type: 'object',
        description: 'Heatmap options',
        properties: {
          title: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          colorScale: { 
            type: 'array',
            description: 'Color scale array',
            items: { type: 'string' }
          }
        }
      }
    },
    required: ['data']
  },
  handler: async ({ data, xLabels, yLabels, options = {} }) => {
    try {
      // This is a placeholder - a real implementation would use
      // a specialized heatmap visualization library
      
      // For now, we'll use a simple approach by converting the heatmap
      // data to a format that can be displayed using the bar chart
      
      // Return a placeholder response for now
      const heatmapId = randomUUID();
      
      return {
        id: heatmapId,
        message: "Heatmap creation not fully implemented yet. This is a placeholder response."
      };
    } catch (error) {
      console.error('Error creating heatmap:', error);
      throw new Error(`Failed to create heatmap: ${error}`);
    }
  }
};

const createTreemapTool: McpTool = {
  name: 'create_treemap',
  description: 'Create treemap visualizations',
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        description: 'Hierarchical data for treemap',
        properties: {
          name: { type: 'string' },
          value: { type: 'number' },
          children: { type: 'array' }
        }
      },
      options: {
        type: 'object',
        description: 'Treemap options',
        properties: {
          title: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          colorScale: { 
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    },
    required: ['data']
  },
  handler: async ({ data, options = {} }) => {
    try {
      // This is a placeholder - a real implementation would use
      // a specialized treemap visualization library
      
      // Return a placeholder response for now
      const treemapId = randomUUID();
      
      return {
        id: treemapId,
        message: "Treemap creation not fully implemented yet. This is a placeholder response."
      };
    } catch (error) {
      console.error('Error creating treemap:', error);
      throw new Error(`Failed to create treemap: ${error}`);
    }
  }
};

const combineChartsTool: McpTool = {
  name: 'combine_charts',
  description: 'Combine multiple charts into one visualization',
  inputSchema: {
    type: 'object',
    properties: {
      chartIds: {
        type: 'array',
        description: 'IDs of charts to combine',
        items: { type: 'string' }
      },
      layout: {
        type: 'string',
        enum: ['horizontal', 'vertical', 'grid'],
        description: 'Layout for combined charts',
        default: 'vertical'
      },
      title: { type: 'string', description: 'Title for combined chart' },
      options: {
        type: 'object',
        description: 'Options for combined chart',
        properties: {
          width: { type: 'number' },
          height: { type: 'number' },
          backgroundColor: { type: 'string' }
        }
      }
    },
    required: ['chartIds']
  },
  handler: async ({ chartIds, layout = 'vertical', title, options = {} }) => {
    try {
      // This is essentially creating a mini-dashboard with just charts
      // For now, we'll create a simple HTML layout with the charts
      
      // Verify all charts exist
      const charts = chartIds.map(id => {
        const chart = generatedCharts.get(id);
        if (!chart) {
          throw new Error(`Chart not found with ID: ${id}`);
        }
        return chart;
      });
      
      // Create combined visualization HTML
      let combinedHtml = `
        <div class="combined-charts" style="
          width: ${options.width || '100%'};
          background-color: ${options.backgroundColor || '#ffffff'};
          padding: 20px;
        ">
          ${title ? `<h2 style="text-align: center;">${title}</h2>` : ''}
          <div class="charts-container" style="
            display: ${layout === 'grid' ? 'grid' : 'flex'};
            ${layout === 'grid' ? 'grid-template-columns: repeat(2, 1fr);' : ''}
            flex-direction: ${layout === 'horizontal' ? 'row' : 'column'};
            gap: 20px;
            ${layout === 'horizontal' ? 'flex-wrap: wrap;' : ''}
          ">
      `;
      
      // Add each chart
      for (const chart of charts) {
        combinedHtml += `
          <div class="chart-item" style="
            margin-bottom: 15px;
            ${layout === 'horizontal' ? 'flex: 1;' : ''}
          ">
            ${chart.options.title ? `<h3>${chart.options.title}</h3>` : ''}
            <div class="chart-container">
              <img src="${chart.imageBase64}" alt="Chart" style="max-width: 100%;">
            </div>
          </div>
        `;
      }
      
      combinedHtml += `
          </div>
        </div>
      `;
      
      const combinedId = randomUUID();
      
      // Store as a dashboard for simplicity
      generatedDashboards.set(combinedId, {
        id: combinedId,
        title: title || 'Combined Charts',
        htmlContent: combinedHtml
      });
      
      return {
        id: combinedId,
        htmlContent: combinedHtml
      };
    } catch (error) {
      console.error('Error combining charts:', error);
      throw new Error(`Failed to combine charts: ${error}`);
    }
  }
};

// Resource handlers
const chartTypesResourceHandler: McpResourceHandler = {
  uri: 'viz://chart-types',
  handler: async () => {
    return {
      chartTypes: [
        { 
          type: 'bar',
          description: 'Bar chart for comparing discrete data points',
          variations: ['stacked', 'horizontal']
        },
        { 
          type: 'line',
          description: 'Line chart for showing trends over time',
          variations: ['area', 'multi-axis']
        },
        { 
          type: 'pie',
          description: 'Pie chart for showing proportions of a whole',
          variations: ['doughnut', 'polar']
        },
        { 
          type: 'scatter',
          description: 'Scatter plot for showing correlation between variables',
          variations: []
        },
        { 
          type: 'heatmap',
          description: 'Heatmap for visualizing data density or intensity',
          variations: []
        },
        { 
          type: 'treemap',
          description: 'Treemap for visualizing hierarchical data',
          variations: []
        }
      ]
    };
  }
};

const templatesResourceHandler: McpResourceHandler = {
  uri: 'viz://templates',
  handler: async () => {
    return {
      chartTemplates,
      dashboardLayouts
    };
  }
};

const chartResourceHandler: McpResourceHandler = {
  uri: 'viz://chart/{id}',
  handler: async ({ id }) => {
    const chart = generatedCharts.get(id);
    if (!chart) {
      throw new Error(`Chart not found with ID: ${id}`);
    }
    
    return {
      id: chart.id,
      type: chart.type,
      options: chart.options,
      imageDataUrl: chart.imageBase64
    };
  }
};

// Create and start the MCP server
const server = createMcpServer({
  name: 'visualization-server',
  description: 'MCP server for data visualization and chart generation',
  tools: [
    createChartTool,
    createTableTool,
    createDashboardTool,
    exportChartTool,
    createHeatmapTool,
    createTreemapTool,
    combineChartsTool
  ],
  resources: [
    chartTypesResourceHandler,
    templatesResourceHandler,
    chartResourceHandler
  ],
  stdioMode: 'pipe', // This is the default, change to 'inherit' for debugging
  logLevel: 'info'
});

// Log server startup
console.log('Data Visualization MCP Server starting...');

// Start the server
server.start();