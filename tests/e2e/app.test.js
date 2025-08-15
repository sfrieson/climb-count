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
    await navigateToApp(page);
    await waitForAppReady(page);

    // Check that the main title is present
    const title = await getElementText(page, ".header h1");
    expect(title).toBe("🧗‍♀️ Climb Count");

    // Check that the subtitle is present
    const subtitle = await getElementText(page, ".header p");
    expect(subtitle).toBe(
      "Track your climbing progress and improve your skills",
    );
  });

  test("should have all main navigation tabs", async () => {
    await navigateToApp(page);
    await waitForAppReady(page);

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
    await navigateToApp(page);
    await waitForAppReady(page);

    // Initially, Log Session tab should be active
    const initialActiveTab = await page.$eval(".tab.active", (el) =>
      el.textContent.trim(),
    );
    expect(initialActiveTab).toBe("Log Session");

    // Click on Add Route tab
    await clickElement(page, ".tab:nth-child(2)");

    // Wait for tab to become active
    await page.waitForFunction(() => {
      const activeTab = document.querySelector(".tab.active");
      return activeTab && activeTab.textContent.trim() === "Add Route";
    });

    // Check that Add Route tab is now active
    const activeTab = await page.$eval(".tab.active", (el) =>
      el.textContent.trim(),
    );
    expect(activeTab).toBe("Add Route");

    // Check that the Add Route content is visible
    const addRouteHeader = await getElementText(page, "#routes h2");
    expect(addRouteHeader).toBe("Add New Route");
  });

  test("should show Log Session form elements", async () => {
    await navigateToApp(page);
    await waitForAppReady(page);

    // Check that main form elements are present
    await waitForElement(page, "#session-date");
    await waitForElement(page, "#gym-select");
    await waitForElement(page, "#route-selector");
    await waitForElement(page, "#success-btn");
    await waitForElement(page, "#failure-btn");
    await waitForElement(page, "#notes");
    await waitForElement(page, "#log-attempt-btn");

    // Check Log Session header
    const header = await getElementText(page, "#log h2");
    expect(header).toBe("New Climbing Session");
  });

  test("should show Add Route form elements", async () => {
    await navigateToApp(page);
    await waitForAppReady(page);

    // Navigate to Add Route tab
    await clickElement(page, ".tab:nth-child(2)");

    // Wait for Add Route content to be visible
    await waitForElement(page, "#routes");

    // Check that Add Route form elements are present
    await waitForElement(page, "#route-image");
    await waitForElement(page, "#route-colors-add");

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
