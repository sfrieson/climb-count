/**
 * Jest configuration for E2E tests with Puppeteer
 */

export default {
  displayName: "E2E Tests",
  testMatch: ["<rootDir>/tests/e2e/**/*.test.js"],
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/e2e/jest.setup.js"],
  testTimeout: 60000,
  maxWorkers: 1, // Run E2E tests sequentially to avoid port conflicts
  verbose: true,
  collectCoverage: false, // Coverage not meaningful for E2E tests

  // Transform ES modules
  extensionsToTreatAsEsm: [".js"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  moduleNameMapping: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  // Longer timeout for E2E tests
  globalSetup: "<rootDir>/tests/e2e/global.setup.js",
  globalTeardown: "<rootDir>/tests/e2e/global.teardown.js",
};
