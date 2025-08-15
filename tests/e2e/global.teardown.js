/**
 * Global teardown for E2E tests
 * Stops the development server after tests complete
 */

export default async function globalTeardown() {
  const pid = process.env.DEV_SERVER_PID;

  if (pid) {
    console.log("🛑 Stopping development server...");

    try {
      process.kill(parseInt(pid), "SIGTERM");
      console.log("✓ Development server stopped");
    } catch (error) {
      console.error("Error stopping development server:", error);

      // Force kill if SIGTERM doesn't work
      try {
        process.kill(parseInt(pid), "SIGKILL");
        console.log("✓ Development server force stopped");
      } catch (forceError) {
        console.error("Error force stopping development server:", forceError);
      }
    }
  }
}
