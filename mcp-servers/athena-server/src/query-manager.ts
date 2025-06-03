import { AthenaClientWrapper } from './athena-client.js';
import { QueryExecution } from './types.js';

export class QueryManager {
  private athenaClient: AthenaClientWrapper;
  private runningQueries: Map<string, QueryExecution>;

  constructor(athenaClient: AthenaClientWrapper) {
    this.athenaClient = athenaClient;
    this.runningQueries = new Map();
  }

  async submitQuery(query: string, database?: string, workgroup?: string): Promise<string> {
    const queryExecutionId = await this.athenaClient.executeQuery(query, database, workgroup);
    const queryExecution = await this.athenaClient.getQueryStatus(queryExecutionId);
    this.runningQueries.set(queryExecutionId, queryExecution);
    return queryExecutionId;
  }

  async getQueryStatus(queryExecutionId: string): Promise<QueryExecution> {
    if (!this.runningQueries.has(queryExecutionId)) {
      const queryExecution = await this.athenaClient.getQueryStatus(queryExecutionId);
      this.runningQueries.set(queryExecutionId, queryExecution);
    }
    return this.runningQueries.get(queryExecutionId)!;
  }

  async getQueryResults(queryExecutionId: string, maxResults?: number, nextToken?: string) {
    return this.athenaClient.getQueryResults(queryExecutionId, maxResults, nextToken);
  }

  async cancelQuery(queryExecutionId: string): Promise<void> {
    await this.athenaClient.cancelQuery(queryExecutionId);
    this.runningQueries.delete(queryExecutionId);
  }

  // Optional: Method to poll query status and update runningQueries
  async pollQueryStatus(queryExecutionId: string): Promise<QueryExecution> {
    const queryExecution = await this.athenaClient.getQueryStatus(queryExecutionId);
    this.runningQueries.set(queryExecutionId, queryExecution);
    return queryExecution;
  }
}