/**
 * Centralized Logging Utility for AI Business Analytics Agent
 * 
 * This module provides structured logging capabilities across all MCP servers
 * and main agent using Winston. It supports different log levels, formats,
 * and transports based on the environment.
 */

const winston = require('winston');
const { format, transports } = winston;
const path = require('path');
const fs = require('fs');

// Ensure log directory exists
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Get the service name (which MCP server or component)
const SERVICE_NAME = process.env.SERVICE_NAME || path.basename(process.cwd());

// Define custom format for structured logs
const structuredFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
  format.json()
);

// Console format for development
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss' }),
  format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] [${service}] ${level}: ${message} ${metaStr}`;
  })
);

// Define logger configuration based on environment
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  defaultMeta: { service: SERVICE_NAME },
  transports: [
    // Always log to console
    new transports.Console({
      format: process.env.NODE_ENV === 'production' ? structuredFormat : consoleFormat
    }),
    
    // In production, also log to files
    ...(process.env.NODE_ENV === 'production' ? [
      // Error logs
      new transports.File({
        filename: path.join(LOG_DIR, `${SERVICE_NAME}-error.log`),
        level: 'error',
        format: structuredFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      }),
      // Combined logs
      new transports.File({
        filename: path.join(LOG_DIR, `${SERVICE_NAME}-combined.log`),
        format: structuredFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      })
    ] : [])
  ]
});

/**
 * Log an event with additional context
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {string} message - Log message
 * @param {Object} context - Additional context information
 */
function logWithContext(level, message, context = {}) {
  logger.log(level, message, context);
}

// Export convenience methods
module.exports = {
  error: (message, context) => logWithContext('error', message, context),
  warn: (message, context) => logWithContext('warn', message, context),
  info: (message, context) => logWithContext('info', message, context),
  debug: (message, context) => logWithContext('debug', message, context),
  
  // Function execution logger with timing
  trackExecution: async (functionName, fn, context = {}) => {
    const startTime = Date.now();
    logger.debug(`Starting ${functionName}`, context);
    
    try {
      const result = await fn();
      const executionTime = Date.now() - startTime;
      
      logger.debug(`Completed ${functionName}`, {
        ...context,
        executionTime,
        success: true
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error(`Failed ${functionName}`, {
        ...context,
        executionTime,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  },
  
  // Raw winston logger for advanced usage
  winston: logger
};