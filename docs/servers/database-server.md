# Database MCP Server

## Overview

The Database MCP Server provides data storage, caching, and retrieval capabilities for the AI Business Analytics Agent. It leverages PostgreSQL for persistent storage and Redis for high-performance caching, offering tools to store analysis results, manage cache entries, and perform database operations.

## Technologies

- **PostgreSQL**: Primary database for persistent storage
- **Redis**: In-memory cache for high-performance data access
- **Node.js**: Runtime environment
- **TypeScript**: Programming language

## Architecture

The Database MCP Server acts as an abstraction layer over PostgreSQL and Redis, providing unified access to both systems through standardized tools and resources. It handles connection pooling, query execution, transaction management, and cache invalidation strategies.

```
┌─────────────────────────────────────────┐
│           Database MCP Server           │
├─────────────────────┬───────────────────┤
│   PostgreSQL Client │    Redis Client   │
├─────────────────────┴───────────────────┤
│            Connection Pooling           │
├─────────────────────────────────────────┤
│               MCP Protocol              │
└─────────────────────────────────────────┘
             │                 │
   ┌─────────▼─────┐   ┌───────▼───────┐
   │  PostgreSQL   │   │     Redis     │
   └───────────────┘   └───────────────┘
```

## Configuration

The Database MCP Server requires the following environment variables:

```bash
# PostgreSQL Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/analytics_db
DB_POOL_SIZE=10

# Redis Configuration
REDIS_URL=redis://localhost:6379
CACHE_DEFAULT_TTL=3600

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *
BACKUP_DIRECTORY=./backups
```

## Tools

### `store_data`

Stores data in the database or cache.

**Input Schema:**
```json
{
  "key": "String (required) - Unique key for the data",
  "data": "Any (required) - Data to store",
  "ttl": "Number (optional) - Time to live in seconds",
  "table": "String (optional) - Database table name"
}
```

**Output Schema:**
```json
{
  "success": "Boolean - Whether the operation was successful",
  "key": "String - The key used to store the data",
  "location": "String - Where the data was stored (db or cache)"
}
```

**Example:**
```javascript
// Store analysis results in the database
const result = await store_data({
  key: "analysis_123",
  data: { insights: [...], charts: [...] },
  table: "analysis_results"
});

// Store temporary data in the cache
const cacheResult = await store_data({
  key: "user_preferences_456",
  data: { theme: "dark", charts: ["bar", "line"] },
  ttl: 3600 // 1 hour
});
```

### `retrieve_data`

Retrieves data from the database or cache.

**Input Schema:**
```json
{
  "key": "String (required) - Key to retrieve",
  "table": "String (optional) - Database table name"
}
```

**Output Schema:**
```json
{
  "success": "Boolean - Whether the operation was successful",
  "data": "Any - Retrieved data",
  "source": "String - Where the data was retrieved from (db or cache)",
  "timestamp": "String - When the data was last updated"
}
```

**Example:**
```javascript
// Retrieve analysis results
const result = await retrieve_data({
  key: "analysis_123",
  table: "analysis_results"
});

// Retrieve from cache
const cacheData = await retrieve_data({
  key: "user_preferences_456"
});
```

### `update_cache`

Updates cache entries with new data.

**Input Schema:**
```json
{
  "key": "String (required) - Cache key to update",
  "data": "Any (required) - New data",
  "ttl": "Number (optional) - New time to live in seconds"
}
```

**Output Schema:**
```json
{
  "success": "Boolean - Whether the operation was successful",
  "key": "String - The updated cache key",
  "ttl": "Number - New TTL value"
}
```

### `delete_data`

Removes data from the database or cache.

**Input Schema:**
```json
{
  "key": "String (required) - Key to delete",
  "table": "String (optional) - Database table name",
  "location": "String (optional) - Where to delete from (db, cache, or both)"
}
```

**Output Schema:**
```json
{
  "success": "Boolean - Whether the operation was successful",
  "key": "String - The deleted key",
  "location": "String - Where the data was deleted from"
}
```

### `cleanup_expired`

Removes expired cache entries.

**Input Schema:**
```json
{
  "pattern": "String (optional) - Key pattern to match for cleanup"
}
```

**Output Schema:**
```json
{
  "success": "Boolean - Whether the operation was successful",
  "count": "Number - Number of entries cleaned up"
}
```

### `backup_data`

Creates a backup of database data.

**Input Schema:**
```json
{
  "tables": "Array (optional) - List of tables to backup",
  "format": "String (optional) - Backup format (sql, csv)",
  "compress": "Boolean (optional) - Whether to compress the backup"
}
```

**Output Schema:**
```json
{
  "success": "Boolean - Whether the operation was successful",
  "filename": "String - Backup file name",
  "size": "Number - Backup file size in bytes",
  "timestamp": "String - When the backup was created"
}
```

### `get_statistics`

Retrieves usage statistics for the database and cache.

**Input Schema:**
```json
{
  "type": "String (optional) - Type of statistics (db, cache, or both)"
}
```

**Output Schema:**
```json
{
  "database": {
    "tables": "Number - Count of tables",
    "size": "String - Total database size",
    "rows": "Object - Row counts per table"
  },
  "cache": {
    "keys": "Number - Count of cache keys",
    "memory": "String - Memory usage",
    "hitRate": "Number - Cache hit rate percentage"
  }
}
```

## Resources

### `db://tables`

Lists available database tables.

**Example Response:**
```json
{
  "tables": [
    {
      "name": "analysis_results",
      "rows": 256,
      "size": "4.2 MB"
    },
    {
      "name": "user_preferences",
      "rows": 128,
      "size": "1.1 MB"
    }
  ]
}
```

### `db://table/{name}/schema`

Provides schema information for a specific table.

**Example Response:**
```json
{
  "name": "analysis_results",
  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "nullable": false,
      "primary": true
    },
    {
      "name": "data",
      "type": "jsonb",
      "nullable": false
    },
    {
      "name": "created_at",
      "type": "timestamp",
      "nullable": false
    }
  ],
  "indexes": [
    {
      "name": "analysis_results_pkey",
      "columns": ["id"],
      "unique": true
    }
  ]
}
```

### `db://cache/stats`

Provides cache usage statistics.

**Example Response:**
```json
{
  "keyCount": 1024,
  "memoryUsed": "256 MB",
  "hitRate": 92.5,
  "missRate": 7.5,
  "avgTtl": 3600
}
```

## Error Handling

The Database MCP Server implements comprehensive error handling with the following error types:

- `DatabaseConnectionError`: Failed to connect to the database
- `QueryExecutionError`: SQL query execution failed
- `CacheConnectionError`: Failed to connect to Redis
- `KeyNotFoundError`: Requested key not found
- `ValidationError`: Invalid input parameters
- `BackupError`: Failed to create or restore a backup

All errors include detailed information about the cause, suggested solutions, and relevant context.

## Logging and Monitoring

The server logs all operations with appropriate log levels:

- `ERROR`: Connection failures, query errors
- `WARN`: Slow queries, cache misses
- `INFO`: Successful operations, statistics
- `DEBUG`: Query details, cache operations

Performance metrics are tracked for:

- Query execution time
- Cache hit/miss rates
- Connection pool usage
- Memory usage

## Security Considerations

- All database credentials are stored as environment variables
- Queries are parameterized to prevent SQL injection
- Input validation is performed on all tool parameters
- Redis is configured with authentication and TLS
- Backup files are encrypted when stored

## Examples

### Storing and Retrieving Analysis Results

```javascript
// Store analysis results
const storeResult = await store_data({
  key: "financial_analysis_q2_2024",
  data: {
    revenue: {
      q2_2024: 1250000,
      q1_2024: 1100000,
      growth: 13.6
    },
    insights: [
      "Revenue increased by 13.6% compared to Q1",
      "Product A was the top performer with 42% contribution"
    ],
    recommendations: [
      "Increase marketing budget for Product A",
      "Investigate declining sales in Region B"
    ]
  },
  table: "financial_analysis"
});

// Retrieve the results later
const analysisData = await retrieve_data({
  key: "financial_analysis_q2_2024",
  table: "financial_analysis"
});

// Store frequently accessed data in cache
await update_cache({
  key: "recent_analyses",
  data: ["financial_analysis_q2_2024", "market_share_2024", "competitor_analysis_2024"],
  ttl: 86400 // 24 hours
});
```

### Database Backup and Statistics

```javascript
// Create a backup before running major updates
const backup = await backup_data({
  tables: ["financial_analysis", "user_preferences"],
  format: "sql",
  compress: true
});

// Get database statistics
const stats = await get_statistics({
  type: "both" // Get both database and cache statistics
});

console.log(`Database size: ${stats.database.size}`);
console.log(`Cache hit rate: ${stats.cache.hitRate}%`);