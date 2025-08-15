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

import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Session Logging - Critical Path", () => {
  let browser;
  let page;
  const baseURL = "http://localhost:8000";

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.NODE_ENV === "production",
      slowMo: process.env.NODE_ENV !== "production" ? 50 : 0,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(baseURL, { waitUntil: "networkidle0" });

    // First ensure we have some routes to work with
    await page.click('button.tab:nth-child(2)'); // "Add Route" tab
    await page.waitForSelector('#routes.tab-pane.active', { visible: true });

    // Add a test route for logging if none exists
    const photoPath = path.resolve(__dirname, "../../route_photos/route_1.png");
    const fileInput = await page.$("#route-image");
    await fileInput.uploadFile(photoPath);
    
    await page.waitForSelector("#image-preview", { visible: true });
    await page.click('#route-colors-add [data-color="red"]');
    await page.type("#route-name", "Test Route Red");
    await page.type("#route-gym", "Test Gym");
    await page.type("#route-notes", "Test route for session logging");
    await page.click("#save-route-btn");
    await new Promise(resolve => setTimeout(resolve, 500));

    // Add another route for more variety  
    await page.evaluate(() => {
      document.getElementById("route-image").value = "";
      document.getElementById("route-name").value = "";
      document.getElementById("route-gym").value = "";
      document.getElementById("route-notes").value = "";
      document.getElementById("image-preview").style.display = "none";
      document.querySelectorAll("#route-colors-add .color-btn").forEach(btn => 
        btn.classList.remove("selected")
      );
    });
    
    const photoPath2 = path.resolve(__dirname, "../../route_photos/route_2.png");
    const fileInput2 = await page.$("#route-image");
    await fileInput2.uploadFile(photoPath2);
    
    await page.waitForSelector("#image-preview", { visible: true });
    await page.click('#route-colors-add [data-color="green"]');
    await page.type("#route-name", "Test Route Green");
    await page.type("#route-gym", "Test Gym");
    await page.click("#save-route-btn");
    await new Promise(resolve => setTimeout(resolve, 500));

    // Now go to Log Session tab
    await page.click('button.tab:nth-child(1)'); // "Log Session" tab  
    await page.waitForSelector('#log.tab-pane.active', { visible: true });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
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

    // Step 2: Select first route (red route)
    await page.waitForSelector('.route-selector-item[data-route-id]:not([data-route-id="add-new"])', { visible: true });
    const routeItems = await page.$$('.route-selector-item[data-route-id]:not([data-route-id="add-new"])');
    expect(routeItems.length).toBeGreaterThan(0);
    
    await routeItems[0].click();
    
    // Verify route is selected
    const selectedRoute = await page.$('.route-selector-item.selected');
    expect(selectedRoute).not.toBeNull();

    // Step 3: Mark first attempt as SUCCESS
    await page.click('#success-btn');
    
    // Verify success is selected
    const selectedSuccess = await page.$('#success-btn.selected');
    expect(selectedSuccess).not.toBeNull();

    // Add notes for first attempt
    await page.type('#notes', 'First attempt - felt good!');

    // Step 4: Log the first attempt
    await page.click('#log-attempt-btn');
    
    // Wait for session to start and attempt to be logged
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify current session is shown
    await page.waitForSelector('#current-session', { visible: true });
    
    // Verify attempt appears in session attempts
    const sessionAttempts = await page.$('#session-attempts .attempt-item');
    expect(sessionAttempts).not.toBeNull();
    
    // Verify the attempt shows success
    const attemptText = await page.$eval('#session-attempts .attempt-item', el => el.textContent);
    expect(attemptText).toContain('Success');
    expect(attemptText).toContain('Test Route Red');
    expect(attemptText).toContain('First attempt - felt good!');

    // Step 5: Log second attempt on different route (FAILED)
    await page.click('.route-selector-item[data-route-id]:not([data-route-id="add-new"]):not(.selected)');
    await page.click('#failure-btn');
    
    await page.evaluate(() => document.getElementById('notes').value = '');
    await page.type('#notes', 'Second attempt - struggled with the holds');
    
    await page.click('#log-attempt-btn');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify we now have 2 attempts
    const allAttempts = await page.$$('#session-attempts .attempt-item');
    expect(allAttempts.length).toBe(2);

    // Step 6: Log third attempt on first route again (SUCCESS) 
    await routeItems[0].click();
    await page.click('#success-btn');
    
    await page.evaluate(() => document.getElementById('notes').value = '');
    await page.type('#notes', 'Third attempt - nailed it this time!');
    
    await page.click('#log-attempt-btn');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify we now have 3 attempts
    const allAttempts3 = await page.$$('#session-attempts .attempt-item');
    expect(allAttempts3.length).toBe(3);
  });

  test("Edit attempt within session", async () => {
    // Set up a session with one attempt
    await page.waitForSelector('.route-selector-item[data-route-id]:not([data-route-id="add-new"])', { visible: true });
    const routeItems = await page.$$('.route-selector-item[data-route-id]:not([data-route-id="add-new"])');
    
    await routeItems[0].click();
    await page.click('#success-btn');
    await page.type('#notes', 'Originally marked as success');
    await page.click('#log-attempt-btn');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify attempt is logged as success
    let attemptText = await page.$eval('#session-attempts .attempt-item', el => el.textContent);
    expect(attemptText).toContain('Success');

    // Step 1: Click edit button on the attempt
    await page.click('#session-attempts .edit-attempt-btn');
    
    // Step 2: Wait for edit modal to appear
    await page.waitForSelector('#edit-attempt-modal', { visible: true });
    
    // Step 3: Change from success to failed
    await page.click('#edit-attempt-modal .failure-btn');
    
    // Verify failed is selected in modal
    const failedSelected = await page.$('#edit-attempt-modal .failure-btn.selected');
    expect(failedSelected).not.toBeNull();
    
    // Step 4: Update notes
    await page.evaluate(() => document.getElementById('edit-notes').value = '');
    await page.type('#edit-notes', 'Actually I fell on this one - correcting to failed');
    
    // Step 5: Save changes
    await page.click('#edit-attempt-modal [data-action="save"]');
    
    // Wait for modal to close and changes to be saved
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 6: Verify attempt is now marked as failed
    attemptText = await page.$eval('#session-attempts .attempt-item', el => el.textContent);
    expect(attemptText).toContain('Failed');
    expect(attemptText).toContain('Actually I fell on this one - correcting to failed');
    expect(attemptText).not.toContain('Success');
  });

  test("Finish session and view in Sessions tab", async () => {
    // Create a complete session with multiple attempts
    await page.waitForSelector('.route-selector-item[data-route-id]:not([data-route-id="add-new"])', { visible: true });
    const routeItems = await page.$$('.route-selector-item[data-route-id]:not([data-route-id="add-new"])');
    
    // Log 3 attempts: 2 success, 1 failed
    await routeItems[0].click();
    await page.click('#success-btn');
    await page.type('#notes', 'First route - success');
    await page.click('#log-attempt-btn');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await routeItems[1] ? routeItems[1].click() : routeItems[0].click();
    await page.click('#failure-btn');
    await page.evaluate(() => document.getElementById('notes').value = '');
    await page.type('#notes', 'Second route - failed');
    await page.click('#log-attempt-btn');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await routeItems[0].click();
    await page.click('#success-btn');
    await page.evaluate(() => document.getElementById('notes').value = '');
    await page.type('#notes', 'Back to first route - success again');
    await page.click('#log-attempt-btn');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify we have 3 attempts in current session
    const attempts = await page.$$('#session-attempts .attempt-item');
    expect(attempts.length).toBe(3);

    // Step 1: Finish the session
    await page.click('button[onclick="finishSession()"]');
    
    // Wait for session to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Verify current session is hidden
    const currentSession = await page.$('#current-session[style*="none"]');
    expect(currentSession).not.toBeNull(); // Should be hidden

    // Step 3: Navigate to Sessions tab
    await page.click('button.tab:nth-child(3)'); // "Sessions" tab
    await page.waitForSelector('#sessions.tab-pane.active', { visible: true });
    
    // Step 4: Verify session appears in sessions list
    await page.waitForSelector('#session-list .session-item', { visible: true });
    
    const sessionItem = await page.$('#session-list .session-item');
    expect(sessionItem).not.toBeNull();
    
    const sessionText = await page.evaluate(el => el.textContent, sessionItem);
    expect(sessionText).toContain('Test Gym');
    expect(sessionText).toContain('2/3'); // 2 successes out of 3 total
    expect(sessionText).toContain('66.7%'); // Success rate

    // Step 5: Verify timeline shows all attempts
    const timeline = await page.$('#session-list .session-item [style*="timeline"]');
    if (timeline) {
      const timelineText = await timeline.textContent();
      expect(timelineText).toContain('Timeline:');
    }

    // Verify we can see attempt markers in timeline
    const timelineAttempts = await page.$$('#session-list .timeline-attempt');
    expect(timelineAttempts.length).toBe(3);
  });

  test("Edit attempt from completed session", async () => {
    // Create and finish a session first
    await page.waitForSelector('.route-selector-item[data-route-id]:not([data-route-id="add-new"])', { visible: true });
    const routeItems = await page.$$('.route-selector-item[data-route-id]:not([data-route-id="add-new"])');
    
    await routeItems[0].click();
    await page.click('#success-btn');
    await page.type('#notes', 'Session attempt to be edited later');
    await page.click('#log-attempt-btn');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Finish session
    await page.click('button[onclick="finishSession()"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Go to Sessions tab
    await page.click('button.tab:nth-child(3)'); // "Sessions" tab
    await page.waitForSelector('#sessions.tab-pane.active', { visible: true });
    
    // Click on a timeline attempt to edit
    await page.waitForSelector('.timeline-attempt', { visible: true });
    await page.click('.timeline-attempt');
    
    // Wait for edit modal
    await page.waitForSelector('#edit-attempt-modal', { visible: true });
    
    // Change to failed
    await page.click('#edit-attempt-modal .failure-btn');
    
    // Update notes
    await page.evaluate(() => document.getElementById('edit-notes').value = '');
    await page.type('#edit-notes', 'Edited from completed session - changed to failed');
    
    // Save changes
    await page.click('#edit-attempt-modal [data-action="save"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify changes are reflected in the session
    const sessionItem = await page.$('#session-list .session-item');
    const sessionText = await page.evaluate(el => el.textContent, sessionItem);
    expect(sessionText).toContain('0/1'); // Should now be 0 successes out of 1 total
    expect(sessionText).toContain('0.0%'); // 0% success rate
  });

  test("Session statistics and data validation", async () => {
    // Create a comprehensive session with different colored routes
    await page.waitForSelector('.route-selector-item[data-route-id]:not([data-route-id="add-new"])', { visible: true });
    const routeItems = await page.$$('.route-selector-item[data-route-id]:not([data-route-id="add-new"])');
    
    // Log attempts on different colored routes
    for (let i = 0; i < Math.min(routeItems.length, 2); i++) {
      await routeItems[i].click();
      
      // Alternate between success and failure
      if (i % 2 === 0) {
        await page.click('#success-btn');
      } else {
        await page.click('#failure-btn');
      }
      
      await page.evaluate(() => document.getElementById('notes').value = '');
      await page.type('#notes', `Attempt ${i + 1} for statistics test`);
      await page.click('#log-attempt-btn');
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Finish session
    await page.click('button[onclick="finishSession()"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check Statistics tab
    await page.click('button.tab:nth-child(4)'); // "Statistics" tab
    await page.waitForSelector('#stats.tab-pane.active', { visible: true });
    
    // Verify statistics are updated
    await page.waitForSelector('#stats-grid .stat-card', { visible: true });
    
    const statCards = await page.$$('#stats-grid .stat-card');
    expect(statCards.length).toBeGreaterThan(0);
    
    // Check for total sessions stat
    const statsText = await page.$eval('#stats-grid', el => el.textContent);
    expect(statsText).toContain('Total Sessions');
    expect(statsText).toContain('Total Attempts');
  });
});