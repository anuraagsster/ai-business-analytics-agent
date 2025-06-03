import { z } from 'zod';

// Database configuration schema
export const DatabaseConfigSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  DB_POOL_SIZE: z.number().default(10),
  CACHE_DEFAULT_TTL: z.number().default(3600),
  BACKUP_SCHEDULE: z.string().default('0 2 * * *')
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Tool input schemas
export const StoreDataSchema = z.object({
  key: z.string().describe('Unique key for the data'),
  data: z.any().describe('Data to store (any type)'),
  ttl: z.number().optional().describe('Time to live in seconds'),
  table: z.string().optional().describe('Database table name')
});

export const RetrieveDataSchema = z.object({
  key: z.string().describe('Key to retrieve data for'),
  table: z.string().optional().describe('Database table name')
});

export const UpdateCacheSchema = z.object({
  key: z.string().describe('Cache key to update'),
  data: z.any().describe('New data to store'),
  ttl: z.number().optional().describe('Time to live in seconds')
});

export const DeleteDataSchema = z.object({
  key: z.string().describe('Key to delete'),
  table: z.string().optional().describe('Database table name')
});

export const BackupDataSchema = z.object({
  tables: z.array(z.string()).optional().describe('Specific tables to backup'),
  format: z.enum(['sql', 'json']).default('sql').describe('Backup format')
});

export const RestoreDataSchema = z.object({
  backupFile: z.string().describe('Path to backup file'),
  format: z.enum(['sql', 'json']).default('sql').describe('Backup format')
});

// Data types
export interface StoredData {
  id: string;
  key: string;
  data: any;
  created_at: Date;
  expires_at?: Date;
  table_name?: string;
}

export interface CacheStats {
  total_keys: number;
  memory_usage: string;
  hit_rate: number;
  expired_keys: number;
}

export interface DatabaseStats {
  total_tables: number;
  total_records: number;
  database_size: string;
  active_connections: number;
}