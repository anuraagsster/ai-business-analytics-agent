/**
 * Type definitions for the ML MCP Server
 */

export type ModelType = 'regression' | 'classification' | 'clustering' | 'anomaly-detection' | 'timeseries';

export interface ModelMetadata {
  id: string;
  name: string;
  type: ModelType;
  createdAt: string;
  updatedAt: string;
  metrics?: Record<string, number>;
  hyperparameters?: Record<string, any>;
  features?: string[];
  target?: string;
  description?: string;
  version?: string;
}

export interface TrainModelParams {
  data: any[];
  target: string;
  features?: string[];
  modelType: ModelType;
  modelName?: string;
  hyperparameters?: Record<string, any>;
  testSplit?: number;
  crossValidation?: boolean;
  seed?: number;
}

export interface PredictParams {
  modelId: string;
  data: any[];
}

export interface AnalyzePatternsParams {
  data: any[];
  method?: 'correlation' | 'pca' | 'feature_importance';
  target?: string;
}

export interface DetectAnomaliesParams {
  data: any[];
  method?: 'isolation_forest' | 'one_class_svm' | 'local_outlier_factor';
  contamination?: number;
  features?: string[];
}

export interface ForecastTimeseriesParams {
  data: any[];
  timeColumn: string;
  targetColumn: string;
  horizon: number;
  method?: 'arima' | 'prophet' | 'exponential_smoothing';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  seasonality?: boolean;
}

export interface ClusterDataParams {
  data: any[];
  method?: 'kmeans' | 'dbscan' | 'hierarchical';
  features?: string[];
  numClusters?: number;
  eps?: number; // For DBSCAN
  minSamples?: number; // For DBSCAN
}

export interface ClassifyDataParams {
  data: any[];
  target: string;
  features?: string[];
  method?: 'logistic_regression' | 'random_forest' | 'svm' | 'naive_bayes';
  testSplit?: number;
}

export interface FeatureImportanceParams {
  data: any[];
  target: string;
  features?: string[];
  method?: 'random_forest' | 'permutation' | 'shap';
}

export interface ModelManagerInterface {
  initialize(): Promise<void>;
  getModels(): Promise<ModelMetadata[]>;
  getModel(id: string): Promise<ModelMetadata | null>;
  saveModel(metadata: ModelMetadata, modelData: Uint8Array): Promise<string>;
  deleteModel(id: string): Promise<boolean>;
  loadModelData(id: string): Promise<Uint8Array | null>;
}