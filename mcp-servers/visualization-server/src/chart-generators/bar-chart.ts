import { BaseChartGenerator } from './base-chart.js';
import { ChartData, ChartOptions, GeneratedChart } from '../types.js';

export class BarChartGenerator extends BaseChartGenerator {
  /**
   * Generate a bar chart with the provided data and options
   */
  public async generateBarChart(data: ChartData, options: ChartOptions = {}): Promise<GeneratedChart> {
    try {
      // Apply bar chart specific configurations
      const barOptions: ChartOptions = {
        ...options,
        // Additional bar chart specific options
        scales: {
          y: {
            beginAtZero: true,
            min: options.yAxis?.min,
            max: options.yAxis?.max,
            title: options.yAxis?.title ? {
              display: true,
              text: options.yAxis.title
            } : undefined
          }
        }
      };

      // Generate bar chart
      return await this.generate('bar', data, barOptions);
    } catch (error) {
      console.error('Error generating bar chart:', error);
      throw new Error(`Failed to generate bar chart: ${error}`);
    }
  }

  /**
   * Generate a stacked bar chart
   */
  public async generateStackedBarChart(data: ChartData, options: ChartOptions = {}): Promise<GeneratedChart> {
    try {
      // Create stacked bar chart configuration
      const stackedOptions: ChartOptions = {
        ...options,
        scales: {
          x: {
            stacked: true,
            title: options.xAxis?.title ? {
              display: true,
              text: options.xAxis.title
            } : undefined
          },
          y: {
            stacked: true,
            beginAtZero: true,
            min: options.yAxis?.min,
            max: options.yAxis?.max,
            title: options.yAxis?.title ? {
              display: true,
              text: options.yAxis.title
            } : undefined
          }
        }
      };

      // Generate stacked bar chart
      return await this.generate('bar', data, stackedOptions);
    } catch (error) {
      console.error('Error generating stacked bar chart:', error);
      throw new Error(`Failed to generate stacked bar chart: ${error}`);
    }
  }

  /**
   * Generate a horizontal bar chart
   */
  public async generateHorizontalBarChart(data: ChartData, options: ChartOptions = {}): Promise<GeneratedChart> {
    try {
      // Create horizontal bar chart configuration
      const horizontalOptions: ChartOptions = {
        ...options,
        indexAxis: 'y' as any // Type issue in chartjs typings
      };

      // Generate horizontal bar chart
      return await this.generate('bar', data, horizontalOptions);
    } catch (error) {
      console.error('Error generating horizontal bar chart:', error);
      throw new Error(`Failed to generate horizontal bar chart: ${error}`);
    }
  }
}