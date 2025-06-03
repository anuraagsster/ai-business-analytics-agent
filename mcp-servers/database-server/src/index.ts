#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PostgresClient } from './postgres-client.js';
import { RedisClient } from './redis-client.js';
import {
  DatabaseConfigSchema,
  StoreDataSchema,
  RetrieveDataSchema,
  UpdateCacheSchema,
  DeleteDataSchema,
  BackupDataSchema,
  RestoreDataSchema,
} from './types.js';

class DatabaseServer {
  private server: Server;
  private postgres: PostgresClient;
  private redis: RedisClient;

  constructor() {
    this.server = new Server(
      {
        name: 'database-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize database clients
    const config = DatabaseConfigSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://analytics_user:analytics_password@localhost:5432/analytics_db',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      DB_POOL_SIZE: parseInt(process.env.DB_POOL_SIZE || '10'),
      CACHE_DEFAULT_TTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'),
      BACKUP_SCHEDULE: process.env.BACKUP_SCHEDULE || '0 2 * * *'
    });

    this.postgres = new PostgresClient(config.DATABASE_URL, config.DB_POOL_SIZE);
    this.redis = new RedisClient(config.REDIS_URL, config.CACHE_DEFAULT_TTL);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'store_data',
            description: 'Store data with optional TTL',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'Unique key for the data' },
                data: { description: 'Data to store (any type)' },
                ttl: { type: 'number', description: 'Time to live in seconds' },
                table: { type: 'string', description: 'Database table name' }
              },
              required: ['key', 'data']
            }
          },
          {
            name: 'retrieve_data',
            description: 'Retrieve stored data by key',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'Key to retrieve data for' },
                table: { type: 'string', description: 'Database table name' }
              },
              required: ['key']
            }
          },
          {
            name: 'update_cache',
            description: 'Update cache entries',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'Cache key to update' },
                data: { description: 'New data to store' },
                ttl: { type: 'number', description: 'Time to live in seconds' }
              },
              required: ['key', 'data']
            }
          },
          {
            name: 'delete_data',
            description: 'Remove data entries',
            inputSchema: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'Key to delete' },
                table: { type: 'string', description: 'Database table name' }
              },
              required: ['key']
            }
          },
          {
            name: 'cleanup_expired',
            description: 'Remove expired cache entries',
            inputSchema: {
              type: 'object',
              properties: {
                table: { type: 'string', description: 'Database table name' }
              }
            }
          },
          {
            name: 'backup_data',
            description: 'Create data backups',
            inputSchema: {
              type: 'object',
              properties: {
                tables: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Specific tables to backup' 
                },
                format: { 
                  type: 'string', 
                  enum: ['sql', 'json'],
                  default: 'sql',
                  description: 'Backup format' 
                }
              }
            }
          },
          {
            name: 'get_statistics',
            description: 'Get database usage statistics',
            inputSchema: {
              type: 'object',
              properties: {}
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
            uri: 'db://tables',
            mimeType: 'application/json',
            name: 'Available database tables'
          },
          {
            uri: 'db://cache/stats',
            mimeType: 'application/json',
            name: 'Cache usage statistics'
          }
        ]
      };
    });

    // Handle resource requests
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'db://tables') {
        // Return list of tables (simplified)
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                tables: ['analysis_jobs', 'query_results', 'analysis_results', 'reports', 'ml_models', 'cache_data']
              })
            }
          ]
        };
      }

      if (uri === 'db://cache/stats') {
        const stats = await this.redis.getStats();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(stats)
            }
          ]
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'store_data': {
            const { key, data, ttl, table } = StoreDataSchema.parse(args);
            
            if (table) {
              await this.postgres.storeData(key, data, table, ttl);
            } else {
              await this.redis.set(key, data, ttl);
            }

            return {
              content: [
                {
                  type: 'text',
                  text: `Data stored successfully with key: ${key}`
                }
              ]
            };
          }

          case 'retrieve_data': {
            const { key, table } = RetrieveDataSchema.parse(args);
            
            let data;
            if (table) {
              data = await this.postgres.retrieveData(key, table);
            } else {
              data = await this.redis.get(key);
            }

            return {
              content: [
                {
                  type: 'text',
                  text: data ? JSON.stringify(data, null, 2) : 'No data found'
                }
              ]
            };
          }

          case 'update_cache': {
            const { key, data, ttl } = UpdateCacheSchema.parse(args);
            await this.redis.set(key, data, ttl);

            return {
              content: [
                {
                  type: 'text',
                  text: `Cache updated successfully for key: ${key}`
                }
              ]
            };
          }

          case 'delete_data': {
            const { key, table } = DeleteDataSchema.parse(args);
            
            let deleted;
            if (table) {
              deleted = await this.postgres.deleteData(key, table);
            } else {
              deleted = await this.redis.delete(key);
            }

            return {
              content: [
                {
                  type: 'text',
                  text: deleted ? `Data deleted successfully: ${key}` : `No data found for key: ${key}`
                }
              ]
            };
          }

          case 'cleanup_expired': {
            const { table } = args as { table?: string };
            
            let cleaned;
            if (table) {
              cleaned = await this.postgres.cleanupExpired(table);
            } else {
              cleaned = await this.redis.cleanupExpired();
            }

            return {
              content: [
                {
                  type: 'text',
                  text: `Cleaned up ${cleaned} expired entries`
                }
              ]
            };
          }

          case 'backup_data': {
            const { tables, format } = BackupDataSchema.parse(args);
            const backup = await this.postgres.backup(tables, format);

            return {
              content: [
                {
                  type: 'text',
                  text: `Backup created successfully. Size: ${backup.length} characters`
                }
              ]
            };
          }

          case 'get_statistics': {
            const dbStats = await this.postgres.getStats();
            const cacheStats = await this.redis.getStats();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    database: dbStats,
                    cache: cacheStats
                  }, null, 2)
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
    // Connect to databases
    await this.postgres.connect();
    await this.redis.connect();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Database MCP server running on stdio');
  }

  async stop() {
    await this.postgres.close();
    await this.redis.close();
  }
}

// Start the server
const server = new DatabaseServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});