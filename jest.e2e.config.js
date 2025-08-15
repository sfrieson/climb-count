/**
 * Jest configuration for E2E tests with Puppeteer
 */

export default {
  displayName: "E2E Tests",
  testMatch: ["<rootDir>/tests/e2e/**/*.test.js"],
  testEnvironment: "node",
  testTimeout: 120000, // Increased to 2 minutes for stability
  maxWorkers: 1, // Run E2E tests sequentially to avoid port conflicts
  verbose: true,
  collectCoverage: false, // Coverage not meaningful for E2E tests
  transform: {},

  // Longer timeout for E2E tests
  globalSetup: "<rootDir>/tests/e2e/global.setup.js",
  globalTeardown: "<rootDir>/tests/e2e/global.teardown.js",
};
