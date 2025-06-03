/**
 * Load Testing for AI Business Analytics Agent
 * 
 * This test verifies the system's performance under concurrent load.
 * It simulates multiple users making requests simultaneously.
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration for the test
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const NUM_CONCURRENT_REQUESTS = 10;
const REQUESTS_PER_BATCH = 5;
const TEST_TIMEOUT = 120000; // 2 minutes

describe('System Load Testing', () => {
  // This is a longer running test
  jest.setTimeout(TEST_TIMEOUT);
  
  test('Should handle concurrent analysis requests', async () => {
    const startTime = performance.now();
    
    // Generate several batches of concurrent requests
    const batches = [];
    for (let batchIndex = 0; batchIndex < REQUESTS_PER_BATCH; batchIndex++) {
      const batchPromises = [];
      
      for (let i = 0; i < NUM_CONCURRENT_REQUESTS; i++) {
        const requestPromise = axios.post(`${API_URL}/analyze`, {
          problem: `Test concurrent request #${batchIndex}-${i}: How has our product performance changed over time?`,
          data_sources: ["sales_transactions", "product_metrics"],
          time_range: "last_3_months"
        }).catch(error => {
          // Log error but don't fail test - we're testing load capacity
          console.error(`Request ${batchIndex}-${i} failed:`, error.message);
          return { status: error.response?.status || 500, error: true };
        });
        
        batchPromises.push(requestPromise);
      }
      
      // Wait for all requests in this batch to complete before moving to next batch
      const batchResults = await Promise.all(batchPromises);
      batches.push(batchResults);
      
      // Small delay between batches to avoid overwhelming the system completely
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Analyze results
    let successfulRequests = 0;
    let failedRequests = 0;
    
    batches.forEach(batch => {
      batch.forEach(response => {
        if (response.error || response.status !== 200) {
          failedRequests++;
        } else {
          successfulRequests++;
        }
      });
    });
    
    const totalRequests = NUM_CONCURRENT_REQUESTS * REQUESTS_PER_BATCH;
    const successRate = (successfulRequests / totalRequests) * 100;
    
    console.log(`
    Load Test Results:
    -----------------
    Total Requests: ${totalRequests}
    Successful: ${successfulRequests}
    Failed: ${failedRequests}
    Success Rate: ${successRate.toFixed(2)}%
    Total Time: ${(totalTime / 1000).toFixed(2)} seconds
    Average Response Time: ${(totalTime / totalRequests).toFixed(2)} ms
    `);
    
    // Assert that at least 80% of requests were successful
    expect(successRate).toBeGreaterThanOrEqual(80);
  });
  
  test('Should maintain performance under sustained load', async () => {
    // Track response times across multiple requests
    const responseTimes = [];
    
    // Make 20 sequential requests and measure response time
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      
      await axios.get(`${API_URL}/health`).catch(error => {
        console.error(`Health check #${i} failed:`, error.message);
        return { status: error.response?.status || 500, time: performance.now() - start };
      });
      
      const end = performance.now();
      responseTimes.push(end - start);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Calculate statistics
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    console.log(`
    Sustained Load Results:
    ---------------------
    Average Response Time: ${avgResponseTime.toFixed(2)} ms
    Max Response Time: ${maxResponseTime.toFixed(2)} ms
    `);
    
    // Response times should be relatively consistent
    // The last few shouldn't be significantly higher than the first few
    const firstFive = responseTimes.slice(0, 5);
    const lastFive = responseTimes.slice(-5);
    
    const avgFirstFive = firstFive.reduce((sum, time) => sum + time, 0) / firstFive.length;
    const avgLastFive = lastFive.reduce((sum, time) => sum + time, 0) / lastFive.length;
    
    // Allow for some degradation, but not more than 50%
    const degradationFactor = avgLastFive / avgFirstFive;
    
    console.log(`
    Performance Degradation:
    ----------------------
    First 5 requests avg: ${avgFirstFive.toFixed(2)} ms
    Last 5 requests avg: ${avgLastFive.toFixed(2)} ms
    Degradation factor: ${degradationFactor.toFixed(2)}x
    `);
    
    expect(degradationFactor).toBeLessThan(1.5);
  });
});