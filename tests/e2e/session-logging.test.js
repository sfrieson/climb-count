/**
 * E2E Test: Session Logging Critical Path
 *
 * Tests the complete flow of logging a climbing session:
 * 1. Navigate to Log Session tab (should be default)
 * 2. Select routes and log attempts with success/failed results
 * 3. Edit an attempt that was accidentally marked as success and change to failed
 * 4. Finish session and save it
 * 5. View the session in the Sessions tab
 */

import path from "path";
import { fileURLToPath } from "url";
import {
  launchBrowser,
  createPage,
  navigateToApp,
  safeClick,
  safeType,
  smartDelay,
  waitForDOMSettle,
  waitForElementSmart,
  safeFileUpload,
} from "./setup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Session Logging - Critical Path", () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await launchBrowser();
  });

  beforeEach(async () => {
    page = await createPage(browser);
    await navigateToApp(page);

    // First ensure we have some routes to work with
    await safeClick(page, "button.tab:nth-child(2)"); // "Add Route" tab
    await page.waitForSelector("#routes.tab-pane.active", { visible: true });

    // Add a test route for logging if none exists
    const photoPath = path.resolve(__dirname, "../../route_photos/test/route_1.png");
    await safeFileUpload(page, "#route-image", photoPath);

    await page.waitForSelector("#image-preview", { visible: true });
    await safeClick(page, '#route-colors-add [data-color="red"]');
    await safeType(page, "#route-name", "Test Route Red", { clear: true });
    await safeType(page, "#route-gym", "Test Gym", { clear: true });
    await safeType(page, "#route-notes", "Test route for session logging", {
      clear: true,
    });
    await safeClick(page, "#save-route-btn");
    await waitForDOMSettle(page); // Replace 1000ms delay

    // Add another route for more variety
    await page.evaluate(() => {
      document.getElementById("route-image").value = "";
      document.getElementById("route-name").value = "";
      document.getElementById("route-gym").value = "";
      document.getElementById("route-notes").value = "";
      const preview = document.getElementById("image-preview");
      if (preview) preview.style.display = "none";
      document
        .querySelectorAll("#route-colors-add .color-btn")
        .forEach((btn) => btn.classList.remove("selected"));
    });

    const photoPath2 = path.resolve(
      __dirname,
      "../../route_photos/test/route_2.png"
    );
    await safeFileUpload(page, "#route-image", photoPath2);

    await page.waitForSelector("#image-preview", { visible: true });
    await safeClick(page, '#route-colors-add [data-color="green"]');
    await safeType(page, "#route-name", "Test Route Green", { clear: true });
    await safeType(page, "#route-gym", "Test Gym", { clear: true });
    await safeClick(page, "#save-route-btn");
    await waitForDOMSettle(page); // Replace 1000ms delay

    // Now go to Log Session tab
    await safeClick(page, "button.tab:nth-child(1)"); // "Log Session" tab
    await page.waitForSelector("#log.tab-pane.active", { visible: true });
  });

  afterEach(async () => {
    if (page) {
      try {
        await page.close();
      } catch (error) {
        // Page might already be closed
        console.log("Page close error (expected):", error.message);
      }
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test("Complete session logging flow", async () => {
    // Step 1: Verify we're on the Log Session tab
    const logTabContent = await page.$("#log.tab-pane.active");
    expect(logTabContent).not.toBeNull();

    // Step 2: Wait for routes to load and select first route
    await waitForElementSmart(
      page,
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    await smartDelay(100, 500); // Much shorter delay in headless

    // Get fresh route items each time to avoid stale elements
    let routeItems = await page.$$(
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    expect(routeItems.length).toBeGreaterThan(0);

    await safeClick(
      page,
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );

    // Wait for route selection to complete
    await page.waitForSelector(".route-selector-item.selected", {
      visible: true,
      timeout: 5000,
    });

    // Step 3: Mark first attempt as SUCCESS
    await safeClick(page, "#success-btn");
    await page.waitForSelector("#success-btn.selected", { visible: true });

    // Add notes for first attempt
    await safeType(page, "#notes", "First attempt - felt good!", {
      clear: true,
    });

    // Step 4: Log the first attempt
    await safeClick(page, "#log-attempt-btn");

    // Wait for session to start and attempt to be logged - DOM-based wait
    await waitForElementSmart(page, "#current-session");
    await waitForElementSmart(page, "#session-attempts .attempt-item");

    // Verify attempt appears in session attempts
    const sessionAttempts = await page.$("#session-attempts .attempt-item");
    expect(sessionAttempts).not.toBeNull();

    // Verify the attempt shows success
    const attemptText = await page.$eval(
      "#session-attempts .attempt-item",
      (el) => el.textContent
    );
    expect(attemptText).toContain("Success");

    // Step 5: Log second attempt on different route (FAILED)
    routeItems = await page.$$(
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    if (routeItems.length > 1) {
      await safeClick(
        page,
        '.route-selector-item[data-route-id]:not([data-route-id="add-new"]):not(.selected)'
      );
    }
    await safeClick(page, "#failure-btn");

    await safeType(
      page,
      "#notes",
      "Second attempt - struggled with the holds",
      { clear: true }
    );

    await safeClick(page, "#log-attempt-btn");
    await smartDelay(200, 1000); // Quick wait for DOM update

    // Verify we now have 2 attempts
    const allAttempts = await page.$$("#session-attempts .attempt-item");
    expect(allAttempts.length).toBe(2);
  });

  test("Edit attempt within session", async () => {
    // Set up a session with one attempt
    await waitForElementSmart(
      page,
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    await smartDelay(100, 500);

    await safeClick(
      page,
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    await page.waitForSelector(".route-selector-item.selected", {
      visible: true,
    });

    await safeClick(page, "#success-btn");
    await safeType(page, "#notes", "Originally marked as success", {
      clear: true,
    });
    await safeClick(page, "#log-attempt-btn");

    // Wait for attempt to be logged
    await waitForElementSmart(page, "#session-attempts .attempt-item");

    // Verify attempt is logged as success
    let attemptText = await page.$eval(
      "#session-attempts .attempt-item",
      (el) => el.textContent
    );
    expect(attemptText).toContain("Success");

    // Step 1: Click edit button on the attempt
    await safeClick(page, "#session-attempts .edit-attempt-btn");

    // Step 2: Wait for edit modal to appear
    await waitForElementSmart(page, "#edit-attempt-modal");

    // Step 3: Change from success to failed
    await safeClick(page, "#edit-attempt-modal .failure-btn");

    // Verify failed is selected in modal
    await page.waitForSelector("#edit-attempt-modal .failure-btn.selected", {
      visible: true,
    });

    // Step 4: Update notes
    await safeType(
      page,
      "#edit-notes",
      "Actually I fell on this one - correcting to failed",
      { clear: true }
    );

    // Step 5: Save changes
    await safeClick(page, '#edit-attempt-modal [data-action="save"]');

    // Wait for modal to close and changes to be saved - give more time for update
    await smartDelay(500, 1000);
    await page.waitForSelector("#edit-attempt-modal", {
      hidden: true,
      timeout: 5000,
    }); // Wait for modal to close

    // Step 6: Verify attempt is now marked as failed
    attemptText = await page.$eval(
      "#session-attempts .attempt-item",
      (el) => el.textContent
    );
    expect(attemptText).toContain("Failed");
    // The notes appear to be truncated in the UI display, so just check that it changed from Success to Failed
    // and that the original success text is gone
    expect(attemptText).not.toContain("Success");
    expect(attemptText).not.toContain("Originally marked as success");
  });

  test("Finish session and view in Sessions tab", async () => {
    // Create a complete session with multiple attempts
    await waitForElementSmart(
      page,
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    await smartDelay(100, 500);

    // Log 3 attempts: 2 success, 1 failed
    await safeClick(
      page,
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    await page.waitForSelector(".route-selector-item.selected", {
      visible: true,
    });
    await safeClick(page, "#success-btn");
    await safeType(page, "#notes", "First route - success", { clear: true });
    await safeClick(page, "#log-attempt-btn");
    await waitForDOMSettle(page);

    // Get fresh route items to avoid stale elements
    const routeItems = await page.$$(
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    if (routeItems.length > 1) {
      await safeClick(
        page,
        '.route-selector-item[data-route-id]:not([data-route-id="add-new"]):not(.selected)'
      );
    } else {
      await safeClick(
        page,
        '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
      );
    }
    await safeClick(page, "#failure-btn");
    await safeType(page, "#notes", "Second route - failed", { clear: true });
    await safeClick(page, "#log-attempt-btn");
    await waitForDOMSettle(page);

    await safeClick(
      page,
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    await safeClick(page, "#success-btn");
    await safeType(page, "#notes", "Back to first route - success again", {
      clear: true,
    });
    await safeClick(page, "#log-attempt-btn");
    await waitForDOMSettle(page);

    // Verify we have 3 attempts in current session
    const attempts = await page.$$("#session-attempts .attempt-item");
    expect(attempts.length).toBe(3);

    // Step 1: Finish the session
    await safeClick(page, 'button[onclick="finishSession()"]');

    // Wait for session to be saved - DOM-based wait
    await smartDelay(500, 2000); // Still need some wait for save operation

    // Step 2: Navigate to Sessions tab
    await safeClick(page, "button.tab:nth-child(3)"); // "Sessions" tab
    await page.waitForSelector("#sessions.tab-pane.active", { visible: true });

    // Step 3: Verify session appears in sessions list
    await waitForElementSmart(page, "#session-list .session-item");

    const sessionItem = await page.$("#session-list .session-item");
    expect(sessionItem).not.toBeNull();

    const sessionText = await page.evaluate(
      (el) => el.textContent,
      sessionItem
    );
    expect(sessionText).toContain("Test Gym");
    expect(sessionText).toContain("2/3"); // 2 successes out of 3 total
  });

  test("Edit attempt from completed session", async () => {
    // Create and finish a session first
    await waitForElementSmart(
      page,
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    await smartDelay(100, 500);

    await safeClick(
      page,
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    await page.waitForSelector(".route-selector-item.selected", {
      visible: true,
    });
    await safeClick(page, "#success-btn");
    await safeType(page, "#notes", "Session attempt to be edited later", {
      clear: true,
    });
    await safeClick(page, "#log-attempt-btn");
    await waitForDOMSettle(page);

    // Finish session
    await safeClick(page, 'button[onclick="finishSession()"]');
    await smartDelay(500, 2000); // Save operation needs some time

    // Go to Sessions tab
    await safeClick(page, "button.tab:nth-child(3)"); // "Sessions" tab
    await page.waitForSelector("#sessions.tab-pane.active", { visible: true });

    // Click on a timeline attempt to edit
    await waitForElementSmart(page, ".timeline-attempt");
    await safeClick(page, ".timeline-attempt");

    // Wait for edit modal
    await waitForElementSmart(page, "#edit-attempt-modal");

    // Change to failed
    await safeClick(page, "#edit-attempt-modal .failure-btn");

    // Update notes
    await safeType(
      page,
      "#edit-notes",
      "Edited from completed session - changed to failed",
      { clear: true }
    );

    // Save changes
    await safeClick(page, '#edit-attempt-modal [data-action="save"]');
    await waitForDOMSettle(page);

    // Verify changes are reflected in the session
    const sessionItem = await page.$("#session-list .session-item");
    const sessionText = await page.evaluate(
      (el) => el.textContent,
      sessionItem
    );
    expect(sessionText).toContain("0/1"); // Should now be 0 successes out of 1 total
    expect(sessionText).toContain("0.0%"); // 0% success rate
  });

  test("Session statistics and data validation", async () => {
    // Create a comprehensive session with different colored routes
    await waitForElementSmart(
      page,
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );
    await smartDelay(100, 500);
    const routeItems = await page.$$(
      '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
    );

    // Log attempts on different colored routes
    for (let i = 0; i < Math.min(routeItems.length, 2); i++) {
      await safeClick(
        page,
        '.route-selector-item[data-route-id]:not([data-route-id="add-new"])'
      );
      await page.waitForSelector(".route-selector-item.selected", {
        visible: true,
      });

      // Alternate between success and failure
      if (i % 2 === 0) {
        await safeClick(page, "#success-btn");
      } else {
        await safeClick(page, "#failure-btn");
      }

      await safeType(page, "#notes", `Attempt ${i + 1} for statistics test`, {
        clear: true,
      });
      await safeClick(page, "#log-attempt-btn");
      await waitForDOMSettle(page);
    }

    // Finish session
    await safeClick(page, 'button[onclick="finishSession()"]');
    await smartDelay(500, 2000);

    // Check Statistics tab with robust waiting and retry logic
    let tabActivated = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!tabActivated && attempts < maxAttempts) {
      attempts++;
      console.log(`Attempting to activate Statistics tab (attempt ${attempts}/${maxAttempts})`);
      
      try {
        await safeClick(page, "button.tab:nth-child(4)"); // "Statistics" tab
        await smartDelay(500, 1000); // Give tab time to respond
        
        // Wait for tab to become active
        await waitForElementSmart(page, "#stats.tab-pane.active", { timeout: 20000 });
        tabActivated = true;
        console.log("✅ Statistics tab activated successfully");
        
      } catch (error) {
        console.log(`❌ Statistics tab activation failed (attempt ${attempts}): ${error.message}`);
        if (attempts < maxAttempts) {
          await smartDelay(2000, 3000); // Wait longer between retries
        } else {
          throw new Error(`Failed to activate Statistics tab after ${maxAttempts} attempts`);
        }
      }
    }

    // Wait for DOM to settle after tab activation
    await waitForDOMSettle(page);

    // Verify statistics are updated with extended timeout
    await waitForElementSmart(page, "#stats-grid .stat-card", { timeout: 30000 });

    const statCards = await page.$$("#stats-grid .stat-card");
    expect(statCards.length).toBeGreaterThan(0);

    // Check for total sessions stat
    const statsText = await page.$eval("#stats-grid", (el) => el.textContent);
    expect(statsText).toContain("Total Sessions");
    expect(statsText).toContain("Total Attempts");
  });
});
