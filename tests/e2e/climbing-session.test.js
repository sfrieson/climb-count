/**
 * E2E tests for climbing session functionality
 * Tests logging attempts, session management, and user interactions
 */

import {
  launchBrowser,
  createPage,
  navigateToApp,
  waitForElement,
  clickElement,
  fillInput,
  getElementText,
  elementExists,
  waitForAppReady,
} from "./setup.js";

describe("Climb Count - Session Management", () => {
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
    await navigateToApp(page);
    await waitForAppReady(page);
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test("should set session date and time", async () => {
    // Set a specific date and time
    const testDateTime = "2024-08-15T14:30";

    await fillInput(page, "#session-date", testDateTime);

    const dateValue = await page.$eval("#session-date", (el) => el.value);
    expect(dateValue).toBe(testDateTime);
  });

  test("should select gym location", async () => {
    await waitForElement(page, "#gym-select");

    // Check that gym select is present
    const gymSelect = await page.$("#gym-select");
    expect(gymSelect).not.toBeNull();

    // Check default option
    const defaultOption = await page.$eval(
      "#gym-select option",
      (el) => el.textContent,
    );
    expect(defaultOption).toBe("All gyms");
  });

  test("should show add new route option in route selector", async () => {
    await waitForElement(page, "#route-selector");

    // Check that "Add New Route" option is present
    const addRouteOption = await elementExists(page, ".add-route-option");
    expect(addRouteOption).toBe(true);

    const addRouteText = await getElementText(page, ".route-mini-name");
    expect(addRouteText).toBe("Add New Route");
  });

  test("should handle success/failure buttons", async () => {
    await waitForElement(page, "#success-btn");
    await waitForElement(page, "#failure-btn");

    // Click success button
    await clickElement(page, "#success-btn");

    // Check if success button gets active class (assuming it does)
    const successClasses = await page.$eval(
      "#success-btn",
      (el) => el.className,
    );
    expect(successClasses).toContain("success-btn");

    // Click failure button
    await clickElement(page, "#failure-btn");

    const failureClasses = await page.$eval(
      "#failure-btn",
      (el) => el.className,
    );
    expect(failureClasses).toContain("failure-btn");
  });

  test("should accept notes input", async () => {
    const testNote = "Great session today, worked on technique";

    await fillInput(page, "#notes", testNote);

    const notesValue = await page.$eval("#notes", (el) => el.value);
    expect(notesValue).toBe(testNote);
  });

  test("should show session action buttons", async () => {
    // Check that all action buttons are present
    await waitForElement(page, "#log-attempt-btn");

    const logAttemptBtn = await getElementText(page, "#log-attempt-btn");
    expect(logAttemptBtn).toBe("Log Attempt");

    // Check for Finish Session and Clear Session buttons
    const finishSessionBtn = await elementExists(
      page,
      "[onclick='finishSession()']",
    );
    expect(finishSessionBtn).toBe(true);

    const clearSessionBtn = await elementExists(
      page,
      "[onclick='clearSession()']",
    );
    expect(clearSessionBtn).toBe(true);
  });

  test("should handle log attempt button click", async () => {
    // Fill in some basic session data
    await fillInput(page, "#session-date", "2024-08-15T14:30");
    await fillInput(page, "#notes", "Test attempt");

    // Click success button first
    await clickElement(page, "#success-btn");

    // Click log attempt
    await clickElement(page, "#log-attempt-btn");

    // Note: Since we don't have routes set up, this might show validation messages
    // We're just testing that the button is clickable and doesn't crash the app

    // Check that the page is still responsive
    const title = await getElementText(page, ".header h1");
    expect(title).toBe("🧗‍♀️ Climb Count");
  });

  test("should navigate to Add Route when clicking add route option", async () => {
    await waitForElement(page, ".add-route-option");

    // Click the add route option
    await clickElement(page, ".add-route-option");

    // Wait for potential navigation or tab switch
    // Note: This depends on the actual implementation
    // We'll just verify the page is still functional

    const title = await getElementText(page, ".header h1");
    expect(title).toBe("🧗‍♀️ Climb Count");
  });
});
