/**
 * Jest setup for E2E tests
 */

// Increase timeout for E2E tests
jest.setTimeout(60000);

// Global error handler for unhandled promises
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Setup global test utilities if needed
global.testUtils = {
  // Add any global test utilities here
};
