/**
 * Global setup for E2E tests
 * Starts the development server before running tests
 */

import { spawn } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";

const sleep = promisify(setTimeout);

let devServer;

/**
 * Check if server is ready
 */
async function waitForServer(url, timeout = 30000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log("✓ Development server is ready");
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }

    await sleep(500);
  }

  throw new Error(`Server did not start within ${timeout}ms`);
}

export default async function globalSetup() {
  console.log("🚀 Starting development server for E2E tests...");

  // Start the development server
  devServer = spawn("npm", ["run", "dev"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "test" },
  });

  // Store process ID for cleanup
  process.env.DEV_SERVER_PID = devServer.pid.toString();

  // Handle server output
  devServer.stdout.on("data", (data) => {
    const output = data.toString();
    if (output.includes("Local:")) {
      console.log("Development server output:", output.trim());
    }
  });

  devServer.stderr.on("data", (data) => {
    console.error("Development server error:", data.toString());
  });

  // Wait for server to be ready
  try {
    await waitForServer("http://localhost:8000");
  } catch (error) {
    console.error("Failed to start development server:", error);
    if (devServer) {
      devServer.kill();
    }
    throw error;
  }
}
