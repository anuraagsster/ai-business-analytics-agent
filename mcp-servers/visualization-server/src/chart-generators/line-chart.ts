import { BaseChartGenerator } from './base-chart.js';
import { ChartData, ChartOptions, GeneratedChart } from '../types.js';

export class LineChartGenerator extends BaseChartGenerator {
  /**
   * Generate a line chart with the provided data and options
   */
  public async generateLineChart(data: ChartData, options: ChartOptions = {}): Promise<GeneratedChart> {
    try {
      // Apply line chart specific configurations
      const lineOptions: ChartOptions = {
        ...options,
        // Additional line chart specific options
        scales: {
          y: {
            beginAtZero: options.yAxis?.min === undefined,
            min: options.yAxis?.min,
            max: options.yAxis?.max,
            title: options.yAxis?.title ? {
              display: true,
              text: options.yAxis.title
            } : undefined
          },
          x: {
            title: options.xAxis?.title ? {
              display: true,
              text: options.xAxis.title
            } : undefined
          }
        }
      };

      // Generate line chart
      return await this.generate('line', data, lineOptions);
    } catch (error) {
      console.error('Error generating line chart:', error);
      throw new Error(`Failed to generate line chart: ${error}`);
    }
  }

  /**
   * Generate an area chart (line chart with filled area)
   */
  public async generateAreaChart(data: ChartData, options: ChartOptions = {}): Promise<GeneratedChart> {
    try {
      // Ensure each dataset has fill set to true
      const areaData: ChartData = {
        ...data,
        datasets: data.datasets.map(dataset => ({
          ...dataset,
          fill: true
        }))
      };

      // Create area chart configuration
      const areaOptions: ChartOptions = {
        ...options,
        scales: {
          y: {
            beginAtZero: options.yAxis?.min === undefined,
            min: options.yAxis?.min,
            max: options.yAxis?.max,
            title: options.yAxis?.title ? {
              display: true,
              text: options.yAxis.title
            } : undefined
          },
          x: {
            title: options.xAxis?.title ? {
              display: true,
              text: options.xAxis.title
            } : undefined
          }
        }
      };

      // Generate area chart (which is a line chart with fill)
      return await this.generate('line', areaData, areaOptions);
    } catch (error) {
      console.error('Error generating area chart:', error);
      throw new Error(`Failed to generate area chart: ${error}`);
    }
  }

  /**
   * Generate a multi-axis line chart (with multiple y-axes)
   */
  public async generateMultiAxisLineChart(data: ChartData, options: ChartOptions = {}): Promise<GeneratedChart> {
    try {
      // Multi-axis charts need special configuration in Chart.js
      // We'd need to implement this with proper Chart.js configuration
      // This is a placeholder for now
      
      // For a proper implementation, we would need to:
      // 1. Configure multiple y-axes
      // 2. Assign datasets to specific axes
      // 3. Handle colors and scaling appropriately
      
      return await this.generateLineChart(data, options);
    } catch (error) {
      console.error('Error generating multi-axis line chart:', error);
      throw new Error(`Failed to generate multi-axis line chart: ${error}`);
    }
  }
}