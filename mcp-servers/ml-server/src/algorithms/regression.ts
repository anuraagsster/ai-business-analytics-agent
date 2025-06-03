import { BaseAlgorithm } from './base-algorithm.js';
import { TrainModelParams, ModelMetadata } from '../types.js';

/**
 * Class for regression algorithms
 */
export class Regression extends BaseAlgorithm {
  /**
   * Create a new Regression instance
   */
  constructor() {
    super('Regression', 'python-scripts/regression.py');
  }

  /**
   * Train a regression model
   * @param params Parameters for regression model training
   */
  async trainModel(params: TrainModelParams): Promise<ModelMetadata> {
    try {
      // Set default test split if not provided
      const testSplit = params.testSplit || 0.2;
      
      // Generate a random seed if not provided
      const seed = params.seed || Math.floor(Math.random() * 10000);
      
      // Save data to temporary file for Python script to process
      const dataFilePath = await this.saveDataToTemp(params.data, `regression_data_${Date.now()}.json`);
      
      // Prepare hyperparameters as JSON string if provided
      const hyperparamsArg = params.hyperparameters ? 
        `--hyperparams=${JSON.stringify(params.hyperparameters)}` : '';
      
      // Prepare features parameter
      const featuresParam = params.features ? 
        `--features=${params.features.join(',')}` : '';
      
      // Execute Python script for regression model training
      const resultFilePath = await this.executePythonScript(
        this.pythonScriptPath,
        [
          `--data=${dataFilePath}`,
          `--target=${params.target}`,
          `--test_split=${testSplit}`,
          `--seed=${seed}`,
          featuresParam,
          hyperparamsArg,
          `--cross_validation=${params.crossValidation ? 'true' : 'false'}`,
          `--output=regression_result_${Date.now()}.json`,
          '--mode=train'
        ].filter(Boolean) // Remove empty arguments
      );
      
      // Read results including model metadata and trained model data
      const result = await this.readDataFromTemp(resultFilePath);
      
      // Create model metadata
      const modelMetadata: ModelMetadata = {
        id: `regression_${Date.now()}`,
        name: params.modelName || `regression_model`,
        type: 'regression',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: result.metrics,
        hyperparameters: params.hyperparameters || result.hyperparameters,
        features: params.features || result.features,
        target: params.target,
        description: `Regression model for predicting ${params.target}`,
        version: '1.0.0'
      };
      
      return modelMetadata;
    } catch (error) {
      console.error('Error training regression model:', error);
      throw new Error(`Regression model training failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Use a trained regression model to make predictions
   * @param modelId ID of the trained model
   * @param data Data to make predictions on
   */
  async predict(modelId: string, data: any[]): Promise<any> {
    try {
      // Save data to temporary file for Python script to process
      const dataFilePath = await this.saveDataToTemp(data, `prediction_data_${Date.now()}.json`);
      
      // Execute Python script for prediction
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
      throw new Error(`Regression prediction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}