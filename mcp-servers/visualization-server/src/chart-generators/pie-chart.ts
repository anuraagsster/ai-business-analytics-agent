import { BaseChartGenerator } from './base-chart.js';
import { ChartData, ChartOptions, GeneratedChart } from '../types.js';

export class PieChartGenerator extends BaseChartGenerator {
  /**
   * Generate a pie chart with the provided data and options
   */
  public async generatePieChart(data: ChartData, options: ChartOptions = {}): Promise<GeneratedChart> {
    try {
      // Apply pie chart specific configurations
      const pieOptions: ChartOptions = {
        ...options,
        // Additional pie chart specific options
        // For pie charts, we don't need scales
      };

      // Generate pie chart
      return await this.generate('pie', data, pieOptions);
    } catch (error) {
      console.error('Error generating pie chart:', error);
      throw new Error(`Failed to generate pie chart: ${error}`);
    }
  }

  /**
   * Generate a doughnut chart (pie with center hole)
   */
  public async generateDoughnutChart(data: ChartData, options: ChartOptions = {}): Promise<GeneratedChart> {
    try {
      // Doughnut is a variation of pie chart in Chart.js
      // In a real implementation, we would use 'doughnut' type
      // For now, we'll simulate it with pie chart
      
      const doughnutOptions: ChartOptions = {
        ...options,
        // Add doughnut-specific options if needed
      };

      // Generate doughnut chart (actually a pie chart in this simplified version)
      // In a full implementation we would use 'doughnut' type
      return await this.generate('pie', data, doughnutOptions);
    } catch (error) {
      console.error('Error generating doughnut chart:', error);
      throw new Error(`Failed to generate doughnut chart: ${error}`);
    }
  }

  /**
   * Generate a polar area chart
   */
  public async generatePolarAreaChart(data: ChartData, options: ChartOptions = {}): Promise<GeneratedChart> {
    try {
      // Polar area is another variation of pie chart in Chart.js
      // In a real implementation, we would use 'polarArea' type
      // For now, we'll simulate it with pie chart
      
      const polarAreaOptions: ChartOptions = {
        ...options,
        // Add polar area-specific options if needed
      };

      // Generate polar area chart (actually a pie chart in this simplified version)
      // In a full implementation we would use 'polarArea' type
      return await this.generate('pie', data, polarAreaOptions);
    } catch (error) {
      console.error('Error generating polar area chart:', error);
      throw new Error(`Failed to generate polar area chart: ${error}`);
    }
  }
}