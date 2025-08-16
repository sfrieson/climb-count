/**
 * Puppeteer E2E Test Setup
 * Provides common utilities and configuration for end-to-end tests
 */

import puppeteer from "puppeteer";

/**
 * Default test configuration
 */
export const TEST_CONFIG = {
  headless: process.env.HEADLESS !== "false", // Default: true (headless), only false when explicitly set
  viewport: {
    width: 1280,
    height: 720,
  },
  baseUrl: "http://localhost:8000",
  timeout: 45000, // Increased from 30000 to handle longer operations
};

/**
 * Launch browser with test configuration
 * @param {Object} options - Optional browser launch options
 * @returns {Promise<import('puppeteer').Browser>}
 */
export async function launchBrowser(options = {}) {
  const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  
  const launchOptions = {
    headless: TEST_CONFIG.headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Helps with stability in containers
      "--disable-gpu", // Helps with stability in headless mode
      "--disable-extensions",
      "--no-first-run",
      "--disable-default-apps",
      // Memory management for CI environments
      "--memory-pressure-off",
      "--max_old_space_size=4096",
      // Additional stability flags for CI
      ...(isCI ? [
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows", 
        "--disable-renderer-backgrounding",
        "--max-memory-usage=1024",
        "--js-flags=--max-old-space-size=512",
      ] : []),
    ],
    ...options,
  };

  // Add debug-friendly options when not in headless mode
  if (!TEST_CONFIG.headless) {
    console.log("🔍 Debug mode: Browser window will be visible");
    launchOptions.slowMo = 100; // Slow down actions by 100ms for better visibility
    launchOptions.devtools = false; // Keep devtools closed initially
  } else {
    console.log("🚀 Running in headless mode");
  }

  return await puppeteer.launch(launchOptions);
}

/**
 * Create a new page with default viewport and settings
 * @param {import('puppeteer').Browser} browser
 * @returns {Promise<import('puppeteer').Page>}
 */
export async function createPage(browser) {
  const page = await browser.newPage();
  await page.setViewport(TEST_CONFIG.viewport);

  // Set default timeout
  page.setDefaultTimeout(TEST_CONFIG.timeout);

  // Add console logging for debugging
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error("Browser console error:", msg.text());
    }
  });

  // Handle page crashes and errors
  page.on("error", (error) => {
    console.error("Page error:", error);
  });

  page.on("pageerror", (error) => {
    console.error("Page script error:", error);
  });

  return page;
}

/**
 * Navigate to the application
 * @param {import('puppeteer').Page} page
 * @param {string} path - Optional path to navigate to
 */
export async function navigateToApp(page, path = "") {
  const url = `${TEST_CONFIG.baseUrl}/${path}`;
  await page.goto(url, { waitUntil: "networkidle2" });
}

/**
 * Wait for element to be visible and ready
 * @param {import('puppeteer').Page} page
 * @param {string} selector
 * @param {number} timeout
 */
export async function waitForElement(
  page,
  selector,
  timeout = TEST_CONFIG.timeout
) {
  await page.waitForSelector(selector, { visible: true, timeout });
}

/**
 * Safe click that waits for element and handles stale element issues
 */
export async function safeClick(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { visible: true, timeout });

  // Add small delay to ensure element is stable
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    await page.click(selector);
  } catch (error) {
    if (
      error.message.includes("Node is detached") ||
      error.message.includes("Target closed")
    ) {
      // Re-find element and try again
      await page.waitForSelector(selector, { visible: true, timeout: 2000 });
      await page.click(selector);
    } else {
      throw error;
    }
  }
}

/**
 * Safe type that handles stale element issues
 */
export async function safeType(page, selector, text, options = {}) {
  await page.waitForSelector(selector, { visible: true, timeout: 5000 });

  // Clear field first if specified
  if (options.clear) {
    await page.evaluate((sel) => {
      document.querySelector(sel).value = "";
    }, selector);
  }

  try {
    await page.type(selector, text, { delay: 20 }); // Add delay between keystrokes
  } catch (error) {
    if (
      error.message.includes("Node is detached") ||
      error.message.includes("Target closed")
    ) {
      // Re-find element and try again
      await page.waitForSelector(selector, { visible: true, timeout: 2000 });
      await page.type(selector, text, { delay: 20 });
    } else {
      throw error;
    }
  }
}

/**
 * Wait for element to be stable (not changing position/content)
 */
export async function waitForStableElement(page, selector, timeout = 5000) {
  let lastBounds = null;
  let stableCount = 0;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const element = await page.$(selector);
      if (!element) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      const bounds = await element.boundingBox();

      if (
        lastBounds &&
        bounds &&
        Math.abs(bounds.x - lastBounds.x) < 1 &&
        Math.abs(bounds.y - lastBounds.y) < 1
      ) {
        stableCount++;
        if (stableCount >= 3) {
          // Element stable for 3 checks
          return element;
        }
      } else {
        stableCount = 0;
      }

      lastBounds = bounds;
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      // Element might be transitioning, continue waiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(
    `Element ${selector} did not become stable within ${timeout}ms`
  );
}

/**
 * Smart delay - uses shorter delays in headless mode, longer in visual mode
 */
export async function smartDelay(headlessMs = 50, visualMs = 300) {
  const delay = TEST_CONFIG.headless ? headlessMs : visualMs;
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Wait for DOM to stabilize after an action (much faster than fixed delays)
 */
export async function waitForDOMSettle(page) {
  // Simple smart delay based on headless mode
  const delay = TEST_CONFIG.headless ? 100 : 300;
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Wait for element with smart timeout based on mode
 */
export async function waitForElementSmart(page, selector, options = {}) {
  const timeout = TEST_CONFIG.headless ? 5000 : 10000;
  return page.waitForSelector(selector, {
    visible: true,
    timeout,
    ...options,
  });
}

/**
 * Wait for a specific condition to be true
 */
export async function waitForCondition(
  conditionFn,
  timeout = 5000,
  interval = 100
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await conditionFn();
      if (result) {
        return result;
      }
    } catch (error) {
      // Condition not met yet, continue waiting
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Wait for element to have specific content/text
 */
export async function waitForElementText(
  page,
  selector,
  expectedText,
  timeout = 5000
) {
  return waitForCondition(async () => {
    try {
      const element = await page.$(selector);
      if (!element) return false;

      const text = await page.evaluate((el) => el.textContent, element);
      return text && text.includes(expectedText);
    } catch (error) {
      return false;
    }
  }, timeout);
}

/**
 * Wait for element count to match expected
 */
export async function waitForElementCount(
  page,
  selector,
  expectedCount,
  timeout = 5000
) {
  return waitForCondition(async () => {
    try {
      const elements = await page.$$(selector);
      return elements.length === expectedCount;
    } catch (error) {
      return false;
    }
  }, timeout);
}

/**
 * Smart wait that replaces most setTimeout calls
 * Waits for DOM to settle after an action
 */
export async function waitForDOMUpdate(page, timeout = 1000) {
  // Wait for any pending DOM mutations to complete
  return page.evaluate((timeout) => {
    return new Promise((resolve) => {
      let mutationCount = 0;
      const observer = new MutationObserver(() => {
        mutationCount++;
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      // Give a small window for mutations to start
      setTimeout(() => {
        observer.disconnect();

        // If no mutations happened, resolve immediately
        if (mutationCount === 0) {
          resolve();
        } else {
          // Wait a bit more for mutations to settle
          setTimeout(resolve, Math.min(200, timeout));
        }
      }, 50);
    });
  }, timeout);
}

/**
 * Fill input field with text
 * @param {import('puppeteer').Page} page
 * @param {string} selector
 * @param {string} text
 */
export async function fillInput(page, selector, text) {
  await waitForElement(page, selector);
  await page.click(selector);
  await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    if (element) element.value = "";
  }, selector);
  await page.type(selector, text);
}

/**
 * Click element and wait for navigation if needed
 * @param {import('puppeteer').Page} page
 * @param {string} selector
 * @param {boolean} waitForNavigation
 */
export async function clickElement(page, selector, waitForNavigation = false) {
  await waitForElement(page, selector);

  if (waitForNavigation) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2" }),
      page.click(selector),
    ]);
  } else {
    await page.click(selector);
  }
}

/**
 * Get text content of element
 * @param {import('puppeteer').Page} page
 * @param {string} selector
 * @returns {Promise<string>}
 */
export async function getElementText(page, selector) {
  await waitForElement(page, selector);
  return await page.$eval(selector, (el) => el.textContent.trim());
}

/**
 * Check if element exists on page
 * @param {import('puppeteer').Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
export async function elementExists(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for application to be ready
 * @param {import('puppeteer').Page} page
 */
export async function waitForAppReady(page) {
  // Wait for main app container
  await waitForElement(page, "#app");

  // Wait for initial render to complete
  await page.waitForFunction(
    () => {
      const app = document.querySelector("#app");
      return app && app.children.length > 0;
    },
    { timeout: TEST_CONFIG.timeout }
  );
}

/**
 * Safe file upload with error handling and memory management
 * @param {import('puppeteer').Page} page
 * @param {string} selector - Input file selector
 * @param {string} filePath - Path to file to upload
 * @param {Object} options - Upload options
 */
export async function safeFileUpload(page, selector, filePath, options = {}) {
  const { timeout = 10000, retries = 2 } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 File upload attempt ${attempt}/${retries}: ${filePath}`);
      
      // Check if file exists and get size
      const fs = await import('fs');
      const stats = fs.statSync(filePath);
      console.log(`📁 File size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      // Find the file input
      await page.waitForSelector(selector, { visible: true, timeout });
      const fileInput = await page.$(selector);
      
      if (!fileInput) {
        throw new Error(`File input not found: ${selector}`);
      }
      
      // Upload the file
      await fileInput.uploadFile(filePath);
      
      // Wait a moment for the upload to process
      await smartDelay(500, 1000);
      
      console.log(`✅ File upload successful: ${filePath}`);
      return true;
      
    } catch (error) {
      console.error(`❌ File upload attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        throw new Error(`File upload failed after ${retries} attempts: ${error.message}`);
      }
      
      // Wait before retry
      await smartDelay(1000, 2000);
      
      // Try to clear any memory issues
      if (global.gc) {
        global.gc();
      }
    }
  }
}
