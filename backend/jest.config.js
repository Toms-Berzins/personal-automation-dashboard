/**
 * Jest Configuration for Backend Testing
 *
 * Configures Jest for testing Node.js backend with ES modules
 * Created: Phase 3.1 - Testing Infrastructure
 */

export default {
  // Use Node environment for backend tests
  testEnvironment: 'node',

  // Transform ES modules using babel-jest or ts-jest (we'll use native Node ESM)
  transform: {},

  // Module name mapper for ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/data/**', // Exclude static data
    '!src/server.js', // Exclude main entry point
  ],

  // Coverage thresholds (Phase 3.2 goal: 70%+)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],

  // Setup files (run before tests)
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test timeout (longer for integration tests)
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Detect open handles (helpful for debugging hanging tests)
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,
};
