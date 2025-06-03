#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk';
import { AthenaClientWrapper } from './athena-client.js';
import { QueryManager } from './query-manager.js';
import { AthenaConfig } from './types.js';

class AthenaServer {
  private server: Server;
  private athenaClient: AthenaClientWrapper;
  private queryManager: QueryManager;

  constructor() {
    this.server = new Server(
      {
        name: 'athena-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize Athena client and query manager
    const config: AthenaConfig = {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
      AWS_REGION: process.env.AWS_REGION || 'us-east-1',
      ATHENA_WORKGROUP: process.env.ATHENA_WORKGROUP || 'primary',
      ATHENA_OUTPUT_LOCATION: process.env.ATHENA_OUTPUT_LOCATION || ''
    };

    this.athenaClient = new AthenaClientWrapper(config);
    this.queryManager = new QueryManager(this.athenaClient);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'execute_query',
            description: 'Execute SQL query on AWS Athena',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'SQL query to execute' },
                database: { type: 'string', description: 'Database name' },
                workgroup: { type: 'string', description: 'Athena workgroup (optional)' }
              },
              required: ['query']
            }
          },
          {
            name: 'list_databases',
            description: 'List available databases',
            inputSchema: {
              type: 'object',
              properties: {
                catalogName: { type: 'string', description: 'Catalog name (default: AwsDataCatalog)' }
              }
            }
          },
          {
            name: 'list_tables',
            description: 'List tables in a database',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                catalogName: { type: 'string', description: 'Catalog name (default: AwsDataCatalog)' }
              },
              required: ['database']
            }
          },
          {
            name: 'describe_table',
            description: 'Get table schema information',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                table: { type: 'string', description: 'Table name' },
                catalogName: { type: 'string', description: 'Catalog name (default: AwsDataCatalog)' }
              },
              required: ['database', 'table']
            }
          },
          {
            name: 'get_query_status',
            description: 'Check query execution status',
            inputSchema: {
              type: 'object',
              properties: {
                queryExecutionId: { type: 'string', description: 'Query execution ID' }
              },
              required: ['queryExecutionId']
            }
          },
          {
            name: 'get_query_results',
            description: 'Retrieve query results',
            inputSchema: {
              type: 'object',
              properties: {
                queryExecutionId: { type: 'string', description: 'Query execution ID' },
                maxResults: { type: 'number', description: 'Maximum number of results to return' },
                nextToken: { type: 'string', description: 'Token for pagination' }
              },
              required: ['queryExecutionId']
            }
          },
          {
            name: 'cancel_query',
            description: 'Cancel running queries',
            inputSchema: {
              type: 'object',
              properties: {
                queryExecutionId: { type: 'string', description: 'Query execution ID' }
              },
              required: ['queryExecutionId']
            }
          },
          {
            name: 'estimate_query_cost',
            description: 'Estimate query execution cost',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'SQL query to estimate cost for' },
                database: { type: 'string', description: 'Database name' }
              },
              required: ['query']
            }
          }
        ]
      };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'athena://databases',
            mimeType: 'application/json',
            name: 'List of available databases'
          },
          {
            uri: 'athena://database/{name}/tables',
            mimeType: 'application/json',
            name: 'Tables in a specific database'
          },
          {
            uri: 'athena://table/{database}/{table}/schema',
            mimeType: 'application/json',
            name: 'Table schema information'
          }
        ]
      };
    });

    // Handle resource requests
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      const { uri } = request.params;

      try {
        if (uri === 'athena://databases') {
          const databases = await this.athenaClient.listDatabases();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(databases.map(db => db.Name))
              }
            ]
          };
        }

        const dbTablesMatch = uri.match(/^athena:\/\/database\/([^/]+)\/tables$/);
        if (dbTablesMatch) {
          const databaseName = dbTablesMatch[1];
          const tables = await this.athenaClient.listTables(databaseName);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(tables)
              }
            ]
          };
        }

        const tableSchemaMatch = uri.match(/^athena:\/\/table\/([^/]+)\/([^/]+)\/schema$/);
        if (tableSchemaMatch) {
          const [, database, table] = tableSchemaMatch;
          const metadata = await this.athenaClient.describeTable(database, table);
          const columns = metadata.Columns.map(col => ({
            name: col.Name,
            type: col.Type,
            comment: col.Comment
          }));

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(columns)
              }
            ]
          };
        }

        throw new Error(`Unknown resource: ${uri}`);
      } catch (error) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
            }
          ]
        };
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'execute_query': {
            const { query, database, workgroup } = args as { 
              query: string; 
              database?: string; 
              workgroup?: string;
            };
            
            const queryId = await this.queryManager.submitQuery(query, database, workgroup);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    queryExecutionId: queryId,
                    message: 'Query submitted successfully'
                  })
                }
              ]
            };
          }

          case 'get_query_status': {
            const { queryExecutionId } = args as { queryExecutionId: string };
            const status = await this.queryManager.getQueryStatus(queryExecutionId);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(status)
                }
              ]
            };
          }

          case 'get_query_results': {
            const { queryExecutionId, maxResults, nextToken } = args as { 
              queryExecutionId: string; 
              maxResults?: number; 
              nextToken?: string 
            };
            
            const results = await this.queryManager.getQueryResults(queryExecutionId, maxResults, nextToken);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results)
                }
              ]
            };
          }

          case 'cancel_query': {
            const { queryExecutionId } = args as { queryExecutionId: string };
            await this.queryManager.cancelQuery(queryExecutionId);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message: 'Query cancelled successfully'
                  })
                }
              ]
            };
          }

          case 'list_databases': {
            const { catalogName } = args as { catalogName?: string };
            const databases = await this.athenaClient.listDatabases(catalogName);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(databases)
                }
              ]
            };
          }

          case 'list_tables': {
            const { database, catalogName } = args as { 
              database: string; 
              catalogName?: string 
            };
            
            const tables = await this.athenaClient.listTables(database, catalogName);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ tables })
                }
              ]
            };
          }

          case 'describe_table': {
            const { database, table, catalogName } = args as { 
              database: string; 
              table: string; 
              catalogName?: string 
            };
            
            const metadata = await this.athenaClient.describeTable(database, table, catalogName);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(metadata)
                }
              ]
            };
          }

          case 'estimate_query_cost': {
            const { query, database } = args as { 
              query: string; 
              database?: string 
            };
            
            const costEstimate = await this.athenaClient.estimateQueryCost(query, database);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(costEstimate)
                }
              ]
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Athena MCP server running on stdio');
  }
}

// Start the server
const server = new AthenaServer();
server.start().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Athena MCP server shutting down');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Athena MCP server shutting down');
  process.exit(0);
});