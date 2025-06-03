import { Pool, PoolClient } from 'pg';
import { StoredData, DatabaseStats } from './types.js';

export class PostgresClient {
  private pool: Pool;

  constructor(connectionString: string, poolSize: number = 10) {
    this.pool = new Pool({
      connectionString,
      max: poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      client.release();
      console.log('PostgreSQL connected successfully');
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async storeData(key: string, data: any, table: string = 'cache_data', ttl?: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;
      
      // Create table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(255) UNIQUE NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          table_name VARCHAR(255)
        )
      `);

      // Insert or update data
      await client.query(`
        INSERT INTO ${table} (key, data, expires_at, table_name)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) 
        DO UPDATE SET 
          data = EXCLUDED.data,
          expires_at = EXCLUDED.expires_at,
          created_at = CURRENT_TIMESTAMP
      `, [key, JSON.stringify(data), expiresAt, table]);

    } finally {
      client.release();
    }
  }

  async retrieveData(key: string, table: string = 'cache_data'): Promise<any | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT data, expires_at 
        FROM ${table} 
        WHERE key = $1 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `, [key]);

      if (result.rows.length === 0) {
        return null;
      }

      return JSON.parse(result.rows[0].data);
    } finally {
      client.release();
    }
  }

  async deleteData(key: string, table: string = 'cache_data'): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        DELETE FROM ${table} WHERE key = $1
      `, [key]);

      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async cleanupExpired(table: string = 'cache_data'): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        DELETE FROM ${table} 
        WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
      `);

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async getStats(): Promise<DatabaseStats> {
    const client = await this.pool.connect();
    try {
      // Get table count
      const tablesResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      // Get total records (approximate)
      const recordsResult = await client.query(`
        SELECT SUM(n_tup_ins + n_tup_upd) as total_records
        FROM pg_stat_user_tables
      `);

      // Get database size
      const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);

      // Get active connections
      const connectionsResult = await client.query(`
        SELECT COUNT(*) as active_connections
        FROM pg_stat_activity
        WHERE state = 'active'
      `);

      return {
        total_tables: parseInt(tablesResult.rows[0].count),
        total_records: parseInt(recordsResult.rows[0].total_records || '0'),
        database_size: sizeResult.rows[0].size,
        active_connections: parseInt(connectionsResult.rows[0].active_connections)
      };
    } finally {
      client.release();
    }
  }

  async backup(tables?: string[], format: 'sql' | 'json' = 'sql'): Promise<string> {
    // This would typically use pg_dump for SQL format
    // For now, implementing a simple JSON backup
    const client = await this.pool.connect();
    try {
      const backupData: any = {};
      
      if (!tables) {
        // Get all user tables
        const tablesResult = await client.query(`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public'
        `);
        tables = tablesResult.rows.map(row => row.tablename);
      }

      for (const table of tables) {
        const result = await client.query(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
      }

      return JSON.stringify(backupData, null, 2);
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}