/**
 * Centralized Monitoring Utility for AI Business Analytics Agent
 * 
 * This module provides performance monitoring capabilities across all MCP servers
 * tracking metrics like execution time, error rates, and resource usage.
 * It can be configured to send metrics to different monitoring systems.
 */

const os = require('os');
const logger = require('../logging/logger');

// In-memory metrics storage
const metrics = {
  counters: {},
  gauges: {},
  histograms: {},
  timestamps: {}
};

// Initialize system metrics collection
let cpuUsageLastSample = process.cpuUsage();
let lastSampleTime = Date.now();

/**
 * Collect system metrics (CPU, memory, etc.)
 * @returns {Object} Current system metrics
 */
function collectSystemMetrics() {
  // Calculate CPU usage
  const currentTime = Date.now();
  const elapsedMs = currentTime - lastSampleTime;
  const currentCpuUsage = process.cpuUsage();
  
  const userUsageMicros = currentCpuUsage.user - cpuUsageLastSample.user;
  const systemUsageMicros = currentCpuUsage.system - cpuUsageLastSample.system;
  const totalUsageMicros = userUsageMicros + systemUsageMicros;
  
  // Convert to percentage (considering all cores)
  const cpuCount = os.cpus().length;
  const totalPossibleMicros = elapsedMs * 1000 * cpuCount;
  const cpuPercent = (totalUsageMicros / totalPossibleMicros) * 100;
  
  // Update for next sampling
  cpuUsageLastSample = currentCpuUsage;
  lastSampleTime = currentTime;
  
  // Memory usage
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercent = (usedMemory / totalMemory) * 100;
  
  return {
    cpu: {
      usage: cpuPercent.toFixed(2),
      cores: cpuCount
    },
    memory: {
      total: formatBytes(totalMemory),
      used: formatBytes(usedMemory),
      free: formatBytes(freeMemory),
      percent: memoryPercent.toFixed(2)
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Increment a counter metric
 * @param {string} name - Metric name
 * @param {number} value - Value to increment by (default: 1)
 * @param {Object} tags - Additional tags for the metric
 */
function incrementCounter(name, value = 1, tags = {}) {
  const key = getMetricKey(name, tags);
  metrics.counters[key] = (metrics.counters[key] || 0) + value;
}

/**
 * Set a gauge metric
 * @param {string} name - Metric name
 * @param {number} value - Value to set
 * @param {Object} tags - Additional tags for the metric
 */
function setGauge(name, value, tags = {}) {
  const key = getMetricKey(name, tags);
  metrics.gauges[key] = value;
}

/**
 * Record a value in a histogram
 * @param {string} name - Metric name
 * @param {number} value - Value to record
 * @param {Object} tags - Additional tags for the metric
 */
function recordHistogram(name, value, tags = {}) {
  const key = getMetricKey(name, tags);
  
  if (!metrics.histograms[key]) {
    metrics.histograms[key] = {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      values: []
    };
  }
  
  const histogram = metrics.histograms[key];
  histogram.count++;
  histogram.sum += value;
  histogram.min = Math.min(histogram.min, value);
  histogram.max = Math.max(histogram.max, value);
  
  // Store recent values (limited to 100 to avoid memory issues)
  histogram.values.push(value);
  if (histogram.values.length > 100) {
    histogram.values.shift();
  }
}

/**
 * Start timing an operation
 * @param {string} name - Operation name
 * @param {Object} tags - Additional tags for the metric
 * @returns {function} Function to call when operation completes
 */
function startTimer(name, tags = {}) {
  const startTime = process.hrtime.bigint();
  const key = getMetricKey(name, tags);
  
  // Store the start time
  metrics.timestamps[key] = startTime;
  
  // Return a function to stop the timer
  return () => {
    const endTime = process.hrtime.bigint();
    const durationNs = Number(endTime - startTime);
    const durationMs = durationNs / 1000000; // Convert ns to ms
    
    // Record in histogram
    recordHistogram(`${name}.duration`, durationMs, tags);
    
    // Remove the timestamp
    delete metrics.timestamps[key];
    
    return durationMs;
  };
}

/**
 * Generate a unique key for a metric based on name and tags
 * @param {string} name - Metric name
 * @param {Object} tags - Metric tags
 * @returns {string} Unique metric key
 */
function getMetricKey(name, tags) {
  const tagString = Object.entries(tags)
    .map(([key, value]) => `${key}:${value}`)
    .sort()
    .join(',');
  
  return tagString ? `${name}[${tagString}]` : name;
}

/**
 * Get all current metrics
 * @returns {Object} All metrics
 */
function getAllMetrics() {
  return {
    system: collectSystemMetrics(),
    counters: metrics.counters,
    gauges: metrics.gauges,
    histograms: metrics.histograms
  };
}

/**
 * Report metrics to the logging system
 */
function reportMetrics() {
  const allMetrics = getAllMetrics();
  logger.info('System metrics', { metrics: allMetrics.system });
  
  // Log any histograms with values
  Object.entries(allMetrics.histograms).forEach(([key, histogram]) => {
    if (histogram.count > 0) {
      logger.info(`Histogram: ${key}`, {
        count: histogram.count,
        avg: (histogram.sum / histogram.count).toFixed(2),
        min: histogram.min,
        max: histogram.max
      });
    }
  });
  
  // Reset counters after reporting
  metrics.counters = {};
}

// Export the monitoring API
module.exports = {
  incrementCounter,
  setGauge,
  recordHistogram,
  startTimer,
  getAllMetrics,
  reportMetrics,
  
  // Helper to track a function's execution
  trackFunction: (name, fn, tags = {}) => {
    const stopTimer = startTimer(name, tags);
    
    return async (...args) => {
      try {
        const result = await fn(...args);
        stopTimer();
        return result;
      } catch (error) {
        stopTimer();
        incrementCounter(`${name}.errors`, 1, tags);
        throw error;
      }
    };
  }
};