import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartData, ChartOptions, ChartType, GeneratedChart } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export class BaseChartGenerator {
  protected width: number;
  protected height: number;
  protected chartJSNodeCanvas: ChartJSNodeCanvas;

  constructor(width = 800, height = 600) {
    this.width = width;
    this.height = height;
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: this.width,
      height: this.height,
      backgroundColour: 'white',
      chartCallback: (ChartJS: any) => {
        // Optional chart.js plugins can be registered here
      }
    });
  }

  /**
   * Generate a unique ID for the chart
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Generate chart configuration
   */
  protected generateConfig(type: ChartType, data: ChartData, options: ChartOptions): any {
    // Apply default options if not provided
    const defaultOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
    };

    // Merge with provided options
    const mergedOptions = { ...defaultOptions, ...options };

    // Set dimensions from options if provided
    if (options.width) this.width = options.width;
    if (options.height) this.height = options.height;

    // Create chart.js config
    return {
      type,
      data,
      options: {
        ...mergedOptions,
        plugins: {
          title: mergedOptions.title ? {
            display: true,
            text: mergedOptions.title,
            font: {
              size: 16
            }
          } : undefined,
          legend: {
            display: mergedOptions.legend !== false,
            position: 'top',
          }
        },
        scales: {
          x: mergedOptions.xAxis ? {
            title: {
              display: !!mergedOptions.xAxis.title,
              text: mergedOptions.xAxis.title
            }
          } : undefined,
          y: mergedOptions.yAxis ? {
            title: {
              display: !!mergedOptions.yAxis.title,
              text: mergedOptions.yAxis.title
            },
            min: mergedOptions.yAxis.min,
            max: mergedOptions.yAxis.max
          } : undefined
        }
      }
    };
  }

  /**
   * Generate chart and return base64 image
   */
  protected async renderChart(config: any): Promise<string> {
    try {
      // Render the chart as a base64 string
      const image = await this.chartJSNodeCanvas.renderToDataURL(config);
      return image;
    } catch (error) {
      console.error('Error rendering chart:', error);
      throw new Error(`Failed to render chart: ${error}`);
    }
  }

  /**
   * Generate chart with the provided data and options
   */
  public async generate(type: ChartType, data: ChartData, options: ChartOptions = {}): Promise<GeneratedChart> {
    try {
      // Generate chart configuration
      const config = this.generateConfig(type, data, options);
      
      // Render chart to base64 image
      const imageBase64 = await this.renderChart(config);
      
      // Return generated chart object
      return {
        id: this.generateId(),
        type,
        data,
        options,
        imageBase64
      };
    } catch (error) {
      console.error('Error generating chart:', error);
      throw new Error(`Failed to generate chart: ${error}`);
    }
  }
}