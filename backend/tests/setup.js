/**
 * Jest Test Setup
 *
 * Runs before all tests to configure the test environment
 * Created: Phase 3.1 - Testing Infrastructure
 */

import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.BACKEND_PORT = '8001'; // Different port for tests
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock environment variables for tests (if .env.test doesn't exist)
if (!process.env.FIRECRAWL_API_KEY) {
  process.env.FIRECRAWL_API_KEY = 'test_firecrawl_key';
}

if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test_openai_key';
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:test@localhost:5432/automation_test_db';
}

// Global test timeout
jest.setTimeout(10000);

// Suppress console output during tests (optional - comment out if debugging)
global.console = {
  ...console,
  log: jest.fn(), // Silence console.log
  debug: jest.fn(), // Silence console.debug
  info: jest.fn(), // Silence console.info
  warn: jest.fn(), // Keep warnings
  error: jest.fn(), // Keep errors for debugging
};

// Global test helpers
global.testHelpers = {
  // Helper to create mock request/response objects
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  }),

  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  },

  mockNext: () => jest.fn(),
};

console.log('✅ Jest test environment initialized');
