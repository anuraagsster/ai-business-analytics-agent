import { 
  AthenaClient, 
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  StopQueryExecutionCommand,
  ListDatabasesCommand,
  ListTableMetadataCommand,
  GetTableMetadataCommand
} from '@aws-sdk/client-athena';
import { AthenaConfig, QueryExecution, QueryResults, TableMetadata, Database, QueryCostEstimate } from './types.js';

export class AthenaClientWrapper {
  private client: AthenaClient;
  private config: AthenaConfig;

  constructor(config: AthenaConfig) {
    this.config = config;
    this.client = new AthenaClient({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  async executeQuery(query: string, database?: string, workgroup?: string): Promise<string> {
    try {
      const command = new StartQueryExecutionCommand({
        QueryString: query,
        QueryExecutionContext: database ? { Database: database } : undefined,
        WorkGroup: workgroup || this.config.ATHENA_WORKGROUP,
        ResultConfiguration: {
          OutputLocation: this.config.ATHENA_OUTPUT_LOCATION
        }
      });

      const response = await this.client.send(command);
      return response.QueryExecutionId!;
    } catch (error) {
      throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQueryStatus(queryExecutionId: string): Promise<QueryExecution> {
    try {
      const command = new GetQueryExecutionCommand({
        QueryExecutionId: queryExecutionId
      });

      const response = await this.client.send(command);
      
      if (!response.QueryExecution) {
        throw new Error('Query execution not found');
      }

      return {
        QueryExecutionId: response.QueryExecution.QueryExecutionId!,
        Query: response.QueryExecution.Query!,
        Status: {
          State: response.QueryExecution.Status?.State as any,
          SubmissionDateTime: response.QueryExecution.Status?.SubmissionDateTime,
          CompletionDateTime: response.QueryExecution.Status?.CompletionDateTime,
          StateChangeReason: response.QueryExecution.Status?.StateChangeReason
        },
        Statistics: response.QueryExecution.Statistics ? {
          EngineExecutionTimeInMillis: response.QueryExecution.Statistics.EngineExecutionTimeInMillis,
          DataScannedInBytes: response.QueryExecution.Statistics.DataScannedInBytes,
          TotalExecutionTimeInMillis: response.QueryExecution.Statistics.TotalExecutionTimeInMillis,
          QueryQueueTimeInMillis: response.QueryExecution.Statistics.QueryQueueTimeInMillis,
          ServiceProcessingTimeInMillis: response.QueryExecution.Statistics.ServiceProcessingTimeInMillis
        } : undefined,
        ResultConfiguration: response.QueryExecution.ResultConfiguration ? {
          OutputLocation: response.QueryExecution.ResultConfiguration.OutputLocation
        } : undefined
      };
    } catch (error) {
      throw new Error(`Failed to get query status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQueryResults(queryExecutionId: string, maxResults?: number, nextToken?: string): Promise<QueryResults> {
    try {
      const command = new GetQueryResultsCommand({
        QueryExecutionId: queryExecutionId,
        MaxResults: maxResults,
        NextToken: nextToken
      });

      const response = await this.client.send(command);
      
      if (!response.ResultSet) {
        throw new Error('No results found');
      }

      return {
        ResultSet: {
          Rows: response.ResultSet.Rows?.map(row => ({
            Data: row.Data?.map(data => ({
              VarCharValue: data.VarCharValue
            })) || []
          })) || [],
          ResultSetMetadata: {
            ColumnInfo: response.ResultSet.ResultSetMetadata?.ColumnInfo?.map(col => ({
              Name: col.Name!,
              Type: col.Type!
            })) || []
          }
        },
        NextToken: response.NextToken
      };
    } catch (error) {
      throw new Error(`Failed to get query results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelQuery(queryExecutionId: string): Promise<void> {
    try {
      const command = new StopQueryExecutionCommand({
        QueryExecutionId: queryExecutionId
      });

      await this.client.send(command);
    } catch (error) {
      throw new Error(`Failed to cancel query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listDatabases(catalogName: string = 'AwsDataCatalog'): Promise<Database[]> {
    try {
      const command = new ListDatabasesCommand({
        CatalogName: catalogName
      });

      const response = await this.client.send(command);
      
      return response.DatabaseList?.map(db => ({
        Name: db.Name!,
        Description: db.Description,
        Parameters: db.Parameters
      })) || [];
    } catch (error) {
      throw new Error(`Failed to list databases: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listTables(database: string, catalogName: string = 'AwsDataCatalog'): Promise<string[]> {
    try {
      const command = new ListTableMetadataCommand({
        CatalogName: catalogName,
        DatabaseName: database
      });

      const response = await this.client.send(command);
      
      return response.TableMetadataList?.map(table => table.Name!) || [];
    } catch (error) {
      throw new Error(`Failed to list tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async describeTable(database: string, table: string, catalogName: string = 'AwsDataCatalog'): Promise<TableMetadata> {
    try {
      const command = new GetTableMetadataCommand({
        CatalogName: catalogName,
        DatabaseName: database,
        TableName: table
      });

      const response = await this.client.send(command);
      
      if (!response.TableMetadata) {
        throw new Error('Table metadata not found');
      }

      return {
        Name: response.TableMetadata.Name!,
        CreateTime: response.TableMetadata.CreateTime,
        LastAccessTime: response.TableMetadata.LastAccessTime,
        TableType: response.TableMetadata.TableType,
        Columns: response.TableMetadata.Columns?.map(col => ({
          Name: col.Name!,
          Type: col.Type!,
          Comment: col.Comment
        })) || [],
        PartitionKeys: response.TableMetadata.PartitionKeys?.map(key => ({
          Name: key.Name!,
          Type: key.Type!,
          Comment: key.Comment
        })) || [],
        Parameters: response.TableMetadata.Parameters
      };
    } catch (error) {
      throw new Error(`Failed to describe table: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async estimateQueryCost(query: string, database?: string): Promise<QueryCostEstimate> {
    // This is a simplified estimation
    // In a real implementation, you might use AWS Cost Explorer API or historical data
    
    // Estimate based on query complexity and typical data scan patterns
    const queryLower = query.toLowerCase();
    let estimatedDataScanned = 1024 * 1024; // 1MB base
    
    // Increase estimate based on query patterns
    if (queryLower.includes('select *')) {
      estimatedDataScanned *= 10; // Full table scans are expensive
    }
    if (queryLower.includes('join')) {
      estimatedDataScanned *= 5; // Joins increase data scan
    }
    if (queryLower.includes('group by')) {
      estimatedDataScanned *= 2; // Aggregations require more data
    }
    
    // AWS Athena pricing: $5 per TB scanned
    const estimatedCost = (estimatedDataScanned / (1024 * 1024 * 1024 * 1024)) * 5;
    
    // Estimate execution time based on data size
    const estimatedExecutionTime = Math.max(5, estimatedDataScanned / (1024 * 1024 * 10)); // 10MB/sec processing rate
    
    return {
      estimatedDataScanned,
      estimatedCost,
      estimatedExecutionTime
    };
  }

  async waitForQueryCompletion(queryExecutionId: string, maxWaitTime: number = 300000): Promise<QueryExecution> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getQueryStatus(queryExecutionId);
      
      if (status.Status.State === 'SUCCEEDED' || status.Status.State === 'FAILED' || status.Status.State === 'CANCELLED') {
        return status;
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Query execution timeout');
  }
}