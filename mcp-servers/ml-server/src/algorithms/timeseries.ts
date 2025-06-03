import { BaseAlgorithm } from './base-algorithm.js';
import { ForecastTimeseriesParams } from '../types.js';

/**
 * Class for time series forecasting algorithms
 */
export class TimeSeries extends BaseAlgorithm {
  /**
   * Create a new TimeSeries instance
   */
  constructor() {
    super('TimeSeries', 'python-scripts/forecast_timeseries.py');
  }

  /**
   * Forecast time series data
   * @param params Parameters for time series forecasting
   */
  async forecast(params: ForecastTimeseriesParams): Promise<any> {
    try {
      // Set default method if not provided
      const method = params.method || 'prophet';
      
      // Set default frequency if not provided
      const frequency = params.frequency || 'daily';
      
      // Set default seasonality flag if not provided
      const seasonality = params.seasonality !== undefined ? params.seasonality : true;
      
      // Save data to temporary file for Python script to process
      const dataFilePath = await this.saveDataToTemp(params.data, `timeseries_data_${Date.now()}.json`);
      
      // Execute Python script for time series forecasting
      const resultFilePath = await this.executePythonScript(
        this.pythonScriptPath,
        [
          `--data=${dataFilePath}`,
          `--time_column=${params.timeColumn}`,
          `--target_column=${params.targetColumn}`,
          `--horizon=${params.horizon}`,
          `--method=${method}`,
          `--frequency=${frequency}`,
          `--seasonality=${seasonality ? 'true' : 'false'}`,
          `--output=forecast_result_${Date.now()}.json`
        ]
      );
      
      // Read and return forecast results
      return await this.readDataFromTemp(resultFilePath);
    } catch (error) {
      console.error('Error forecasting time series:', error);
      throw new Error(`Time series forecasting failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}