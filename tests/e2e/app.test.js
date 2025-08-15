/**
 * E2E tests for Climb Count application
 * Tests core navigation and basic functionality
 */

import {
  launchBrowser,
  createPage,
  navigateToApp,
  waitForElement,
  clickElement,
  getElementText,
  waitForAppReady,
} from "./setup.js";

describe("Climb Count App - Basic Navigation", () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await launchBrowser();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await createPage(browser);
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test("should load the application successfully", async () => {
    await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });
    
    // Just check the page title first to ensure basic loading works
    const title = await page.title();
    expect(title).toBe("Climb Count - Track Your Climbing Progress");
  });

  test("should have all main navigation tabs", async () => {
    await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });

    // Wait for tabs to be present
    await page.waitForSelector(".tab", { timeout: 10000 });

    // Check all tabs are present
    const tabs = await page.$$eval(".tab", (elements) =>
      elements.map((el) => el.textContent.trim()),
    );

    expect(tabs).toEqual([
      "Log Session",
      "Add Route",
      "Sessions",
      "Statistics",
    ]);
  });

  test("should navigate between tabs correctly", async () => {
    await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });

    // Wait for tabs to be present
    await page.waitForSelector(".tab", { timeout: 10000 });

    // Initially, Log Session tab should be active
    const initialActiveTab = await page.$eval(".tab.active", (el) =>
      el.textContent.trim(),
    );
    expect(initialActiveTab).toBe("Log Session");

    // Click on Add Route tab
    await page.click(".tab:nth-child(2)");

    // Wait for tab to become active
    await page.waitForFunction(() => {
      const activeTab = document.querySelector(".tab.active");
      return activeTab && activeTab.textContent.trim() === "Add Route";
    }, { timeout: 10000 });

    // Check that Add Route tab is now active
    const activeTab = await page.$eval(".tab.active", (el) =>
      el.textContent.trim(),
    );
    expect(activeTab).toBe("Add Route");
  });

  test("should show Log Session form elements", async () => {
    await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });

    // Check that main form elements are present
    await page.waitForSelector("#session-date", { timeout: 10000 });
    await page.waitForSelector("#gym-select", { timeout: 5000 });
    await page.waitForSelector("#route-selector", { timeout: 5000 });
    await page.waitForSelector("#success-btn", { timeout: 5000 });
    await page.waitForSelector("#failure-btn", { timeout: 5000 });
    await page.waitForSelector("#notes", { timeout: 5000 });
    await page.waitForSelector("#log-attempt-btn", { timeout: 5000 });

    // Check Log Session header
    const header = await page.$eval("#log h2", (el) => el.textContent.trim());
    expect(header).toBe("New Climbing Session");
  });

  test("should show Add Route form elements", async () => {
    await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });

    // Navigate to Add Route tab
    await page.click(".tab:nth-child(2)");

    // Wait for Add Route content to be visible
    await page.waitForSelector("#routes", { timeout: 10000 });

    // Check that Add Route form elements are present
    await page.waitForSelector("#route-image", { timeout: 5000 });
    await page.waitForSelector("#route-colors-add", { timeout: 5000 });

    // Check that color options are present
    const colorButtons = await page.$$eval(
      "#route-colors-add .color-btn",
      (elements) => elements.map((el) => el.textContent.trim()),
    );

    expect(colorButtons).toContain("Green");
    expect(colorButtons).toContain("Yellow");
    expect(colorButtons).toContain("Red");
    expect(colorButtons).toContain("Purple");
    expect(colorButtons).toContain("Black");
  });
});
