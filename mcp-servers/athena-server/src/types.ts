export interface AthenaConfig {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  ATHENA_WORKGROUP: string;
  ATHENA_OUTPUT_LOCATION: string;
}

export interface QueryExecution {
  QueryExecutionId: string;
  Query: string;
  Status: QueryExecutionStatus;
  Statistics?: QueryExecutionStatistics;
  ResultConfiguration?: QueryResultConfiguration;
}

export interface QueryExecutionStatus {
  State: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  SubmissionDateTime?: Date;
  CompletionDateTime?: Date;
  StateChangeReason?: string;
}

export interface QueryExecutionStatistics {
  EngineExecutionTimeInMillis?: number;
  DataScannedInBytes?: number;
  TotalExecutionTimeInMillis?: number;
  QueryQueueTimeInMillis?: number;
  ServiceProcessingTimeInMillis?: number;
}

export interface QueryResultConfiguration {
  OutputLocation?: string;
}

export interface QueryResults {
  ResultSet: ResultSet;
  NextToken?: string;
}

export interface ResultSet {
  Rows: Row[];
  ResultSetMetadata: ResultSetMetadata;
}

export interface Row {
  Data: Data[];
}

export interface Data {
  VarCharValue?: string;
}

export interface ResultSetMetadata {
  ColumnInfo: ColumnInfo[];
}

export interface ColumnInfo {
  Name: string;
  Type: string;
}

export interface Database {
  Name: string;
  Description?: string;
  Parameters?: Record<string, string>;
}

export interface TableMetadata {
  Name: string;
  CreateTime?: Date;
  LastAccessTime?: Date;
  TableType?: string;
  Columns: Column[];
  PartitionKeys: PartitionKey[];
  Parameters?: Record<string, string>;
}

export interface Column {
  Name: string;
  Type: string;
  Comment?: string;
}

export interface PartitionKey {
  Name: string;
  Type: string;
  Comment?: string;
}

export interface QueryCostEstimate {
  estimatedDataScanned: number;
  estimatedCost: number;
  estimatedExecutionTime: number;
}