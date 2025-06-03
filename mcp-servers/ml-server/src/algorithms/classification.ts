import { BaseAlgorithm } from './base-algorithm.js';
import { ClassifyDataParams, ModelMetadata } from '../types.js';

/**
 * Class for classification algorithms
 */
export class Classification extends BaseAlgorithm {
  /**
   * Create a new Classification instance
   */
  constructor() {
    super('Classification', 'python-scripts/classify_data.py');
  }

  /**
   * Train a classification model
   * @param params Parameters for classification
   */
  async trainClassifier(params: ClassifyDataParams): Promise<ModelMetadata> {
    try {
      // Set default method if not provided
      const method = params.method || 'random_forest';
      
      // Set default test split if not provided
      const testSplit = params.testSplit || 0.2;
      
      // Save data to temporary file for Python script to process
      const dataFilePath = await this.saveDataToTemp(params.data, `classification_data_${Date.now()}.json`);
      
      // Prepare features parameter
      const featuresParam = params.features ? `--features=${params.features.join(',')}` : '';
      
      // Execute Python script for classification model training
      const resultFilePath = await this.executePythonScript(
        this.pythonScriptPath,
        [
          `--data=${dataFilePath}`,
          `--target=${params.target}`,
          `--method=${method}`,
          `--test_split=${testSplit}`,
          featuresParam,
          `--output=classification_result_${Date.now()}.json`,
          '--mode=train'
        ]
      );
      
      // Read results including model metadata and trained model data
      const result = await this.readDataFromTemp(resultFilePath);
      
      // Create model metadata
      const modelMetadata: ModelMetadata = {
        id: `classification_${Date.now()}`,
        name: `${method}_classifier`,
        type: 'classification',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: result.metrics,
        hyperparameters: result.hyperparameters,
        features: params.features || result.features,
        target: params.target,
        description: `Classification model using ${method} algorithm`,
        version: '1.0.0'
      };
      
      return modelMetadata;
    } catch (error) {
      console.error('Error training classifier:', error);
      throw new Error(`Classification model training failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Use a trained classification model to predict
   * @param modelId ID of the trained model
   * @param data Data to classify
   */
  async predict(modelId: string, data: any[]): Promise<any> {
    try {
      // Save data to temporary file for Python script to process
      const dataFilePath = await this.saveDataToTemp(data, `prediction_data_${Date.now()}.json`);
      
      // Execute Python script for classification prediction
      const resultFilePath = await this.executePythonScript(
        this.pythonScriptPath,
        [
          `--data=${dataFilePath}`,
          `--model=${modelId}`,
          `--output=prediction_result_${Date.now()}.json`,
          '--mode=predict'
        ]
      );
      
      // Read and return prediction results
      return await this.readDataFromTemp(resultFilePath);
    } catch (error) {
      console.error('Error making predictions:', error);
      throw new Error(`Classification prediction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}