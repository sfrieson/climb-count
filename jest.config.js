export default {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testMatch: [
    "**/tests/basic-functionality.test.js",
    "**/tests/route-image.test.js",
  ],
  collectCoverageFrom: [
    "src/**/*.js",
    "!**/node_modules/**",
    "!**/tests/**",
    "!jest.config.js",
    "!eslint.config.js",
    "!vite.config.js",
  ],
};
