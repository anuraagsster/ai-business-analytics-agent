import { BaseAlgorithm } from './base-algorithm.js';
import { ClusterDataParams } from '../types.js';

/**
 * Class for clustering algorithms
 */
export class Clustering extends BaseAlgorithm {
  /**
   * Create a new Clustering instance
   */
  constructor() {
    super('Clustering', 'python-scripts/cluster_data.py');
  }

  /**
   * Perform clustering on data
   * @param params Parameters for clustering
   */
  async clusterData(params: ClusterDataParams): Promise<any> {
    try {
      // Set default method if not provided
      const method = params.method || 'kmeans';
      
      // Save data to temporary file for Python script to process
      const dataFilePath = await this.saveDataToTemp(params.data, `clustering_data_${Date.now()}.json`);
      
      // Prepare command arguments
      const args = [
        `--data=${dataFilePath}`,
        `--method=${method}`,
        `--output=clustering_result_${Date.now()}.json`
      ];
      
      // Add optional parameters if provided
      if (params.features) {
        args.push(`--features=${params.features.join(',')}`);
      }
      
      if (params.numClusters && method === 'kmeans') {
        args.push(`--num_clusters=${params.numClusters}`);
      }
      
      if (params.eps && method === 'dbscan') {
        args.push(`--eps=${params.eps}`);
      }
      
      if (params.minSamples && method === 'dbscan') {
        args.push(`--min_samples=${params.minSamples}`);
      }
      
      // Execute Python script for clustering
      const resultFilePath = await this.executePythonScript(
        this.pythonScriptPath,
        args
      );
      
      // Read and return results
      return await this.readDataFromTemp(resultFilePath);
    } catch (error) {
      console.error('Error clustering data:', error);
      throw new Error(`Clustering failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}