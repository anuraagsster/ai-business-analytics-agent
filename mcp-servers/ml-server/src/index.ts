/**
 * Machine Learning MCP Server
 * Provides ML capabilities for pattern recognition, anomaly detection, forecasting, and model training.
 */

import dotenv from 'dotenv';
import { ModelManager } from './model-manager.js';
import { AnomalyDetection } from './algorithms/anomaly-detection.js';
import { Classification } from './algorithms/classification.js';
import { Clustering } from './algorithms/clustering.js';
import { Regression } from './algorithms/regression.js';
import { TimeSeries } from './algorithms/timeseries.js';
import {
  TrainModelParams,
  PredictParams,
  AnalyzePatternsParams,
  DetectAnomaliesParams,
  ForecastTimeseriesParams,
  ClusterDataParams,
  ClassifyDataParams,
  FeatureImportanceParams
} from './types.js';

// Load environment variables
dotenv.config();

// Initialize model manager
const modelManager = new ModelManager(process.env.ML_MODEL_DIR);

// Initialize algorithm instances
const anomalyDetection = new AnomalyDetection();
const classification = new Classification();
const clustering = new Clustering();
const regression = new Regression();
const timeSeries = new TimeSeries();

/**
 * MCP Server class to handle client requests
 */
class MCPServer {
  private stdin: NodeJS.ReadStream;
  private stdout: NodeJS.WriteStream;
  private buffer: string = '';

  constructor() {
    this.stdin = process.stdin;
    this.stdout = process.stdout;
  }

  /**
   * Start the MCP server
   */
  async start() {
    try {
      // Initialize the model manager
      await modelManager.initialize();
      
      console.error('Machine Learning MCP Server started');
      
      // Set up event handlers
      this.stdin.on('data', (data) => this.handleData(data));
      this.stdin.on('end', () => process.exit(0));
      
      // Send server information
      this.sendServerInfo();
    } catch (error) {
      console.error('Error starting server:', error);
      process.exit(1);
    }
  }

  /**
   * Handle incoming data from the client
   * @param data Data received from the client
   */
  private handleData(data: Buffer) {
    this.buffer += data.toString();
    
    // Process complete messages
    let endIndex;
    while ((endIndex = this.buffer.indexOf('\n')) !== -1) {
      const message = this.buffer.substring(0, endIndex);
      this.buffer = this.buffer.substring(endIndex + 1);
      
      try {
        const parsedMessage = JSON.parse(message);
        this.processMessage(parsedMessage);
      } catch (error) {
        console.error('Error parsing message:', error);
        this.sendError('Invalid JSON message');
      }
    }
  }

  /**
   * Process a parsed message from the client
   * @param message Parsed message from the client
   */
  private async processMessage(message: any) {
    try {
      if (!message.type) {
        return this.sendError('Missing message type');
      }
      
      switch (message.type) {
        case 'tool':
          await this.handleToolRequest(message);
          break;
        case 'resource':
          await this.handleResourceRequest(message);
          break;
        case 'ping':
          this.sendResponse({ type: 'pong' });
          break;
        default:
          this.sendError(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      this.sendError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle a tool request from the client
   * @param message Tool request message
   */
  private async handleToolRequest(message: any) {
    if (!message.tool) {
      return this.sendError('Missing tool name');
    }
    
    const { tool, args, messageId } = message;
    
    try {
      let result;
      
      switch (tool) {
        case 'train_model':
          result = await this.trainModel(args as TrainModelParams);
          break;
        case 'predict':
          result = await this.predict(args as PredictParams);
          break;
        case 'analyze_patterns':
          result = await this.analyzePatterns(args as AnalyzePatternsParams);
          break;
        case 'detect_anomalies':
          result = await this.detectAnomalies(args as DetectAnomaliesParams);
          break;
        case 'forecast_timeseries':
          result = await this.forecastTimeseries(args as ForecastTimeseriesParams);
          break;
        case 'cluster_data':
          result = await this.clusterData(args as ClusterDataParams);
          break;
        case 'classify_data':
          result = await this.classifyData(args as ClassifyDataParams);
          break;
        case 'feature_importance':
          result = await this.featureImportance(args as FeatureImportanceParams);
          break;
        default:
          return this.sendError(`Unknown tool: ${tool}`);
      }
      
      this.sendToolResponse(messageId, result);
    } catch (error) {
      console.error(`Error executing tool ${tool}:`, error);
      this.sendToolError(messageId, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Handle a resource request from the client
   * @param message Resource request message
   */
  private async handleResourceRequest(message: any) {
    if (!message.uri) {
      return this.sendError('Missing resource URI');
    }
    
    const { uri, messageId } = message;
    
    try {
      let result;
      
      // Process resource URI
      if (uri === 'ml://models') {
        // Return available models
        result = await modelManager.getModels();
      } else if (uri.startsWith('ml://model/')) {
        // Return specific model information
        const modelId = uri.substring('ml://model/'.length);
        result = await modelManager.getModel(modelId);
        
        if (!result) {
          return this.sendResourceError(messageId, `Model not found: ${modelId}`);
        }
      } else if (uri === 'ml://algorithms') {
        // Return available algorithms and their parameters
        result = this.getAvailableAlgorithms();
      } else {
        return this.sendResourceError(messageId, `Unknown resource URI: ${uri}`);
      }
      
      this.sendResourceResponse(messageId, result);
    } catch (error) {
      console.error(`Error handling resource request ${uri}:`, error);
      this.sendResourceError(messageId, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Send server information to the client
   */
  private sendServerInfo() {
    const toolSchemas = [
      {
        name: 'train_model',
        description: 'Train ML models on provided data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'array', description: 'Training data array' },
            target: { type: 'string', description: 'Target variable name' },
            features: { type: 'array', items: { type: 'string' }, description: 'Feature column names (optional)' },
            modelType: { type: 'string', enum: ['regression', 'classification', 'clustering', 'anomaly-detection', 'timeseries'], description: 'Type of model to train' },
            modelName: { type: 'string', description: 'Custom name for the model (optional)' },
            hyperparameters: { type: 'object', description: 'Model hyperparameters (optional)' },
            testSplit: { type: 'number', description: 'Proportion of data to use for testing (optional, default: 0.2)' },
            crossValidation: { type: 'boolean', description: 'Whether to use cross-validation (optional, default: false)' },
            seed: { type: 'number', description: 'Random seed for reproducibility (optional)' }
          },
          required: ['data', 'target', 'modelType']
        }
      },
      {
        name: 'predict',
        description: 'Make predictions using trained models',
        inputSchema: {
          type: 'object',
          properties: {
            modelId: { type: 'string', description: 'ID of the trained model' },
            data: { type: 'array', description: 'Data to make predictions on' }
          },
          required: ['modelId', 'data']
        }
      },
      {
        name: 'analyze_patterns',
        description: 'Identify patterns in data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'array', description: 'Dataset for pattern analysis' },
            method: { type: 'string', enum: ['correlation', 'pca', 'feature_importance'], description: 'Analysis method (optional, default: correlation)' },
            target: { type: 'string', description: 'Target variable for feature importance (required for feature_importance method)' }
          },
          required: ['data']
        }
      },
      {
        name: 'detect_anomalies',
        description: 'Detect anomalies and outliers in data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'array', description: 'Dataset for anomaly detection' },
            method: { type: 'string', enum: ['isolation_forest', 'one_class_svm', 'local_outlier_factor'], description: 'Detection method (optional, default: isolation_forest)' },
            contamination: { type: 'number', minimum: 0, maximum: 1, description: 'Expected proportion of outliers (optional, default: 0.1)' },
            features: { type: 'array', items: { type: 'string' }, description: 'Feature column names (optional)' }
          },
          required: ['data']
        }
      },
      {
        name: 'forecast_timeseries',
        description: 'Time series forecasting',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'array', description: 'Time series data' },
            timeColumn: { type: 'string', description: 'Column containing timestamps' },
            targetColumn: { type: 'string', description: 'Column to forecast' },
            horizon: { type: 'number', description: 'Number of time points to forecast' },
            method: { type: 'string', enum: ['arima', 'prophet', 'exponential_smoothing'], description: 'Forecasting method (optional, default: prophet)' },
            frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], description: 'Data frequency (optional, default: daily)' },
            seasonality: { type: 'boolean', description: 'Whether to model seasonality (optional, default: true)' }
          },
          required: ['data', 'timeColumn', 'targetColumn', 'horizon']
        }
      },
      {
        name: 'cluster_data',
        description: 'Perform data clustering',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'array', description: 'Dataset for clustering' },
            method: { type: 'string', enum: ['kmeans', 'dbscan', 'hierarchical'], description: 'Clustering method (optional, default: kmeans)' },
            features: { type: 'array', items: { type: 'string' }, description: 'Feature column names (optional)' },
            numClusters: { type: 'number', description: 'Number of clusters for K-means (optional, default: 3)' },
            eps: { type: 'number', description: 'Maximum distance between points for DBSCAN (optional)' },
            minSamples: { type: 'number', description: 'Minimum number of samples in a neighborhood for DBSCAN (optional)' }
          },
          required: ['data']
        }
      },
      {
        name: 'classify_data',
        description: 'Data classification',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'array', description: 'Dataset for classification' },
            target: { type: 'string', description: 'Target variable name' },
            features: { type: 'array', items: { type: 'string' }, description: 'Feature column names (optional)' },
            method: { type: 'string', enum: ['logistic_regression', 'random_forest', 'svm', 'naive_bayes'], description: 'Classification method (optional, default: random_forest)' },
            testSplit: { type: 'number', description: 'Proportion of data to use for testing (optional, default: 0.2)' }
          },
          required: ['data', 'target']
        }
      },
      {
        name: 'feature_importance',
        description: 'Analyze feature importance',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'array', description: 'Dataset for feature importance analysis' },
            target: { type: 'string', description: 'Target variable name' },
            features: { type: 'array', items: { type: 'string' }, description: 'Feature column names (optional)' },
            method: { type: 'string', enum: ['random_forest', 'permutation', 'shap'], description: 'Analysis method (optional, default: random_forest)' }
          },
          required: ['data', 'target']
        }
      }
    ];
    
    const resourceUriSchemas = [
      {
        uriPattern: 'ml://models',
        description: 'List of available trained models'
      },
      {
        uriPattern: 'ml://model/{id}',
        description: 'Specific model information and metrics'
      },
      {
        uriPattern: 'ml://algorithms',
        description: 'Available ML algorithms and their parameters'
      }
    ];
    
    const serverInfo = {
      type: 'server_info',
      name: 'ml-server',
      description: 'Machine Learning MCP Server for pattern recognition, anomaly detection, forecasting, and model training',
      version: '1.0.0',
      tools: toolSchemas,
      resources: resourceUriSchemas
    };
    
    this.sendResponse(serverInfo);
  }

  /**
   * Send a response to the client
   * @param data Response data
   */
  private sendResponse(data: any) {
    this.stdout.write(JSON.stringify(data) + '\n');
  }

  /**
   * Send an error response to the client
   * @param message Error message
   */
  private sendError(message: string) {
    this.sendResponse({
      type: 'error',
      error: message
    });
  }

  /**
   * Send a tool response to the client
   * @param messageId Original message ID
   * @param result Tool execution result
   */
  private sendToolResponse(messageId: string, result: any) {
    this.sendResponse({
      type: 'tool_response',
      messageId,
      result
    });
  }

  /**
   * Send a tool error response to the client
   * @param messageId Original message ID
   * @param error Error message
   */
  private sendToolError(messageId: string, error: string) {
    this.sendResponse({
      type: 'tool_error',
      messageId,
      error
    });
  }

  /**
   * Send a resource response to the client
   * @param messageId Original message ID
   * @param data Resource data
   */
  private sendResourceResponse(messageId: string, data: any) {
    this.sendResponse({
      type: 'resource_response',
      messageId,
      data
    });
  }

  /**
   * Send a resource error response to the client
   * @param messageId Original message ID
   * @param error Error message
   */
  private sendResourceError(messageId: string, error: string) {
    this.sendResponse({
      type: 'resource_error',
      messageId,
      error
    });
  }

  /**
   * Get a list of available ML algorithms and their parameters
   */
  private getAvailableAlgorithms() {
    return {
      regression: {
        description: 'Regression algorithms for predicting continuous variables',
        methods: ['linear_regression', 'random_forest_regressor', 'svr', 'gradient_boosting']
      },
      classification: {
        description: 'Classification algorithms for predicting categorical variables',
        methods: ['logistic_regression', 'random_forest', 'svm', 'naive_bayes']
      },
      clustering: {
        description: 'Clustering algorithms for grouping similar data points',
        methods: ['kmeans', 'dbscan', 'hierarchical']
      },
      anomaly_detection: {
        description: 'Anomaly detection algorithms for identifying outliers',
        methods: ['isolation_forest', 'one_class_svm', 'local_outlier_factor']
      },
      timeseries: {
        description: 'Time series forecasting algorithms',
        methods: ['arima', 'prophet', 'exponential_smoothing']
      }
    };
  }

  /**
   * Train a model
   * @param params Training parameters
   */
  private async trainModel(params: TrainModelParams) {
    console.error(`Training ${params.modelType} model with target: ${params.target}`);
    
    switch (params.modelType) {
      case 'regression':
        return await regression.trainModel(params);
      case 'classification':
        return await classification.trainClassifier(params as ClassifyDataParams);
      default:
        throw new Error(`Model type not supported for training: ${params.modelType}`);
    }
  }

  /**
   * Make predictions using a trained model
   * @param params Prediction parameters
   */
  private async predict(params: PredictParams) {
    const model = await modelManager.getModel(params.modelId);
    
    if (!model) {
      throw new Error(`Model not found: ${params.modelId}`);
    }
    
    console.error(`Making predictions with model: ${params.modelId} (${model.type})`);
    
    switch (model.type) {
      case 'regression':
        return await regression.predict(params.modelId, params.data);
      case 'classification':
        return await classification.predict(params.modelId, params.data);
      default:
        throw new Error(`Model type not supported for prediction: ${model.type}`);
    }
  }

  /**
   * Analyze patterns in data
   * @param params Analysis parameters
   */
  private async analyzePatterns(params: AnalyzePatternsParams) {
    console.error(`Analyzing patterns with method: ${params.method || 'correlation'}`);
    
    // In a real implementation, we would have a PatternAnalysis class
    // For now, return a mock result
    return {
      method: params.method || 'correlation',
      patterns: [
        { feature1: 'feature1', feature2: 'feature2', correlation: 0.85 },
        { feature1: 'feature1', feature2: 'feature3', correlation: 0.32 },
        { feature1: 'feature2', feature2: 'feature3', correlation: 0.65 }
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Detect anomalies in data
   * @param params Anomaly detection parameters
   */
  private async detectAnomalies(params: DetectAnomaliesParams) {
    console.error(`Detecting anomalies with method: ${params.method || 'isolation_forest'}`);
    return await anomalyDetection.detectAnomalies(params);
  }

  /**
   * Forecast time series data
   * @param params Forecasting parameters
   */
  private async forecastTimeseries(params: ForecastTimeseriesParams) {
    console.error(`Forecasting time series with method: ${params.method || 'prophet'}`);
    return await timeSeries.forecast(params);
  }

  /**
   * Cluster data
   * @param params Clustering parameters
   */
  private async clusterData(params: ClusterDataParams) {
    console.error(`Clustering data with method: ${params.method || 'kmeans'}`);
    return await clustering.clusterData(params);
  }

  /**
   * Classify data
   * @param params Classification parameters
   */
  private async classifyData(params: ClassifyDataParams) {
    console.error(`Classifying data with method: ${params.method || 'random_forest'}`);
    
    // For training and getting model metadata
    const modelMetadata = await classification.trainClassifier(params);
    
    // For immediate classification without saving the model
    // In a real implementation, we would use the trained model
    // For now, return a mock result with the model metadata
    return {
      modelMetadata,
      classifications: Array(params.data.length).fill(null).map(() => 
        Math.random() > 0.5 ? 'class_a' : 'class_b'
      ),
      probabilities: Array(params.data.length).fill(null).map(() => ({
        class_a: Math.random(),
        class_b: Math.random()
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze feature importance
   * @param params Feature importance parameters
   */
  private async featureImportance(params: FeatureImportanceParams) {
    console.error(`Analyzing feature importance with method: ${params.method || 'random_forest'}`);
    
    // In a real implementation, we would have a FeatureImportance class
    // For now, return a mock result
    const features = params.features || ['feature1', 'feature2', 'feature3', 'feature4'];
    
    return {
      method: params.method || 'random_forest',
      target: params.target,
      importances: features.map(feature => ({
        feature,
        importance: Math.random()
      })).sort((a, b) => b.importance - a.importance),
      timestamp: new Date().toISOString()
    };
  }
}

// Start the server
const server = new MCPServer();
server.start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});