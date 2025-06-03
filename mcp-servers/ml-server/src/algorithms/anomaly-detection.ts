import { BaseAlgorithm } from './base-algorithm.js';
import { DetectAnomaliesParams } from '../types.js';

/**
 * Class for anomaly detection algorithms
 */
export class AnomalyDetection extends BaseAlgorithm {
  /**
   * Create a new AnomalyDetection instance
   */
  constructor() {
    super('AnomalyDetection', 'python-scripts/detect_anomalies.py');
  }

  /**
   * Detect anomalies in data
   * @param params Parameters for anomaly detection
   */
  async detectAnomalies(params: DetectAnomaliesParams): Promise<any> {
    try {
      // Set default method if not provided
      const method = params.method || 'isolation_forest';
      
      // Set default contamination if not provided
      const contamination = params.contamination || 0.1;
      
      // Save data to temporary file for Python script to process
      const dataFilePath = await this.saveDataToTemp(params.data, `anomaly_data_${Date.now()}.json`);
      
      // Prepare features parameter
      const featuresParam = params.features ? `--features=${params.features.join(',')}` : '';
      
      // Execute Python script for anomaly detection
      const resultFilePath = await this.executePythonScript(
        this.pythonScriptPath,
        [
          `--data=${dataFilePath}`,
          `--method=${method}`,
          `--contamination=${contamination}`,
          featuresParam,
          `--output=anomaly_result_${Date.now()}.json`
        ]
      );
      
      // Read and return results
      return await this.readDataFromTemp(resultFilePath);
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw new Error(`Anomaly detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}