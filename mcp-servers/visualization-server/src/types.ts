/**
 * Types for the Data Visualization MCP Server
 */

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'histogram' | 'heatmap' | 'treemap';

export interface ChartOptions {
  title?: string;
  width?: number;
  height?: number;
  colors?: string[];
  xAxis?: {
    title?: string;
    labels?: string[];
  };
  yAxis?: {
    title?: string;
    min?: number;
    max?: number;
  };
  legend?: boolean;
  backgroundColor?: string;
  borderRadius?: number;
  animation?: boolean;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  
  // Chart.js specific options
  indexAxis?: 'x' | 'y';
  scales?: {
    x?: {
      stacked?: boolean;
      beginAtZero?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
    };
    y?: {
      stacked?: boolean;
      beginAtZero?: boolean;
      min?: number;
      max?: number;
      title?: {
        display?: boolean;
        text?: string;
      };
    };
  };
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

export interface ChartData {
  labels?: string[];
  datasets: ChartDataset[];
}

export interface TableOptions {
  title?: string;
  width?: number;
  height?: number;
  style?: {
    headerBackgroundColor?: string;
    headerTextColor?: string;
    rowAlternateColor?: string;
    borderColor?: string;
    fontFamily?: string;
  };
  pagination?: boolean;
  pageSize?: number;
  sortable?: boolean;
  exportable?: boolean;
  responsive?: boolean;
}

export interface TableColumn {
  header: string;
  field: string;
  width?: string;
  textAlign?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'currency' | 'date' | 'percent';
}

export interface TableData {
  columns: TableColumn[];
  rows: Record<string, any>[];
}

export interface DashboardOptions {
  title?: string;
  width?: number;
  height?: number;
  layout?: 'grid' | 'flex' | 'custom';
  columns?: number;
  backgroundColor?: string;
  padding?: number;
  gap?: number;
}

export interface DashboardItem {
  id: string;
  type: 'chart' | 'table' | 'text';
  content: any;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export interface Dashboard {
  options: DashboardOptions;
  items: DashboardItem[];
}

export interface ChartExportOptions {
  format: 'png' | 'svg' | 'jpeg';
  quality?: number;
  backgroundColor?: string;
  width?: number;
  height?: number;
}

export interface GeneratedChart {
  id: string;
  type: ChartType;
  data: ChartData;
  options: ChartOptions;
  imageBase64?: string;
}

export interface GeneratedTable {
  id: string;
  data: TableData;
  options: TableOptions;
  htmlContent: string;
}

export interface GeneratedDashboard {
  id: string;
  items: { id: string; content: GeneratedChart | GeneratedTable | string }[];
  options: DashboardOptions;
  htmlContent: string;
}