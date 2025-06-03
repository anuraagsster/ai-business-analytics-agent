/**
 * Complete Workflow End-to-End Test
 * 
 * This test verifies the entire analytics workflow from user input to report delivery.
 * It tests all MCP servers working together in an integrated fashion.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration for the test
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_TIMEOUT = 60000; // 60 seconds

describe('Complete Analytics Workflow', () => {
  // This is a longer running test
  jest.setTimeout(TEST_TIMEOUT);
  
  let jobId;
  
  test('Should submit a business problem and receive a job ID', async () => {
    const response = await axios.post(`${API_URL}/analyze`, {
      problem: "Our revenue has declined 15% this quarter. What are the main contributing factors and what should we do about it?",
      data_sources: ["sales_transactions", "customer_data", "product_catalog"],
      time_range: "last_6_months"
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('job_id');
    expect(response.data).toHaveProperty('status', 'processing');
    
    jobId = response.data.job_id;
  });
  
  test('Should be able to check job status', async () => {
    // Skip if previous test failed
    if (!jobId) {
      console.warn('Skipping job status check because job ID is not available');
      return;
    }
    
    const response = await axios.get(`${API_URL}/job/${jobId}/status`);
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status');
    // Status should be either 'processing', 'completed', or 'failed'
    expect(['processing', 'completed', 'failed']).toContain(response.data.status);
  });
  
  test('Should eventually complete the job and have results available', async () => {
    // Skip if previous test failed
    if (!jobId) {
      console.warn('Skipping job completion check because job ID is not available');
      return;
    }
    
    // Poll until job is completed or test times out
    let jobCompleted = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!jobCompleted && attempts < maxAttempts) {
      const response = await axios.get(`${API_URL}/job/${jobId}/status`);
      
      if (response.data.status === 'completed') {
        jobCompleted = true;
      } else if (response.data.status === 'failed') {
        throw new Error(`Job failed: ${response.data.error}`);
      } else {
        // Wait 5 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    }
    
    expect(jobCompleted).toBe(true);
  });
  
  test('Should be able to retrieve analysis results', async () => {
    // Skip if previous test failed
    if (!jobId) {
      console.warn('Skipping results retrieval because job ID is not available');
      return;
    }
    
    const response = await axios.get(`${API_URL}/job/${jobId}/results`);
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('insights');
    expect(response.data).toHaveProperty('charts');
    expect(response.data).toHaveProperty('recommendations');
  });
  
  test('Should be able to download the PDF report', async () => {
    // Skip if previous test failed
    if (!jobId) {
      console.warn('Skipping PDF download because job ID is not available');
      return;
    }
    
    const response = await axios.get(`${API_URL}/job/${jobId}/report`, {
      responseType: 'arraybuffer'
    });
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    
    // Save PDF for manual inspection
    const pdfPath = path.join(__dirname, 'test-report.pdf');
    fs.writeFileSync(pdfPath, response.data);
    console.log(`PDF saved to: ${pdfPath}`);
  });
});