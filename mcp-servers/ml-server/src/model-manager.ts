import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { ModelMetadata, ModelManagerInterface } from './types';

// Promisify fs functions
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

/**
 * ModelManager handles the storage, retrieval, and management of ML models
 */
export class ModelManager implements ModelManagerInterface {
  private modelDir: string;
  private modelsMetadata: Map<string, ModelMetadata> = new Map();

  /**
   * Create a new ModelManager
   * @param modelDir Directory for storing ML models
   */
  constructor(modelDir: string = process.env.ML_MODEL_DIR || './models') {
    this.modelDir = modelDir;
  }

  /**
   * Initialize the model manager by creating directories and loading metadata
   */
  async initialize(): Promise<void> {
    try {
      // Create model directory if it doesn't exist
      await mkdir(this.modelDir, { recursive: true });
      
      // Create trained models directory if it doesn't exist
      const trainedModelsDir = path.join(this.modelDir, 'trained-models');
      await mkdir(trainedModelsDir, { recursive: true });
      
      // Load existing model metadata
      await this.loadModelMetadata();
      
      console.log(`Model manager initialized. Models directory: ${this.modelDir}`);
    } catch (error) {
      console.error('Failed to initialize model manager:', error);
      throw error;
    }
  }

  /**
   * Load model metadata from the models directory
   */
  private async loadModelMetadata(): Promise<void> {
    try {
      const metadataPath = path.join(this.modelDir, 'metadata.json');
      
      // Check if metadata file exists
      try {
        await stat(metadataPath);
      } catch (error) {
        // Create empty metadata file if it doesn't exist
        await writeFile(metadataPath, JSON.stringify([]), 'utf-8');
        return;
      }
      
      // Read and parse metadata
      const data = await readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(data) as ModelMetadata[];
      
      // Populate the metadata map
      this.modelsMetadata.clear();
      metadata.forEach(model => {
        this.modelsMetadata.set(model.id, model);
      });
      
      console.log(`Loaded metadata for ${this.modelsMetadata.size} models`);
    } catch (error) {
      console.error('Error loading model metadata:', error);
      throw error;
    }
  }

  /**
   * Save the current metadata to the metadata file
   */
  private async saveMetadataFile(): Promise<void> {
    try {
      const metadata = Array.from(this.modelsMetadata.values());
      const metadataPath = path.join(this.modelDir, 'metadata.json');
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving metadata file:', error);
      throw error;
    }
  }

  /**
   * Get all available models
   */
  async getModels(): Promise<ModelMetadata[]> {
    return Array.from(this.modelsMetadata.values());
  }

  /**
   * Get a specific model by ID
   * @param id Model ID
   */
  async getModel(id: string): Promise<ModelMetadata | null> {
    return this.modelsMetadata.get(id) || null;
  }

  /**
   * Save a model with its metadata
   * @param metadata Model metadata
   * @param modelData Model binary data
   */
  async saveModel(metadata: ModelMetadata, modelData: Uint8Array): Promise<string> {
    try {
      // Generate ID if not provided
      if (!metadata.id) {
        metadata.id = `model_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      }
      
      // Set timestamps
      const now = new Date().toISOString();
      metadata.createdAt = metadata.createdAt || now;
      metadata.updatedAt = now;
      
      // Save model data
      const modelPath = path.join(this.modelDir, 'trained-models', `${metadata.id}.model`);
      await writeFile(modelPath, modelData);
      
      // Update metadata map
      this.modelsMetadata.set(metadata.id, metadata);
      
      // Save metadata file
      await this.saveMetadataFile();
      
      console.log(`Model saved: ${metadata.id} (${metadata.name})`);
      return metadata.id;
    } catch (error) {
      console.error('Error saving model:', error);
      throw error;
    }
  }

  /**
   * Delete a model by ID
   * @param id Model ID
   */
  async deleteModel(id: string): Promise<boolean> {
    try {
      // Check if model exists
      if (!this.modelsMetadata.has(id)) {
        return false;
      }
      
      // Delete model file
      const modelPath = path.join(this.modelDir, 'trained-models', `${id}.model`);
      try {
        await unlink(modelPath);
      } catch (error) {
        console.warn(`Could not delete model file for ${id}:`, error);
      }
      
      // Remove from metadata
      this.modelsMetadata.delete(id);
      
      // Save updated metadata
      await this.saveMetadataFile();
      
      console.log(`Model deleted: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting model:', error);
      throw error;
    }
  }

  /**
   * Load model binary data
   * @param id Model ID
   */
  async loadModelData(id: string): Promise<Uint8Array | null> {
    try {
      // Check if model exists
      if (!this.modelsMetadata.has(id)) {
        return null;
      }
      
      // Load model file
      const modelPath = path.join(this.modelDir, 'trained-models', `${id}.model`);
      return await readFile(modelPath);
    } catch (error) {
      console.error(`Error loading model data for ${id}:`, error);
      return null;
    }
  }
}