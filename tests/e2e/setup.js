/**
 * Puppeteer E2E Test Setup
 * Provides common utilities and configuration for end-to-end tests
 */

import puppeteer from "puppeteer";

/**
 * Default test configuration
 */
export const TEST_CONFIG = {
  headless: true,
  viewport: {
    width: 1280,
    height: 720,
  },
  baseUrl: "http://localhost:8000",
  timeout: 30000,
};

/**
 * Launch browser with test configuration
 * @param {Object} options - Optional browser launch options
 * @returns {Promise<import('puppeteer').Browser>}
 */
export async function launchBrowser(options = {}) {
  return await puppeteer.launch({
    headless: TEST_CONFIG.headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    ...options,
  });
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
  timeout = TEST_CONFIG.timeout,
) {
  await page.waitForSelector(selector, { visible: true, timeout });
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
    { timeout: TEST_CONFIG.timeout },
  );
}
