/**
 * E2E tests for route management functionality
 * Tests adding routes, color selection, and image uploads
 */

import { launchBrowser, createPage } from "./setup.js";

describe("Climb Count - Route Management", () => {
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
    await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });

    // Navigate to Add Route tab
    await page.click(".tab:nth-child(2)");
    await page.waitForSelector("#routes", { timeout: 10000 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test("should display route image upload field", async () => {
    await page.waitForSelector("#route-image", { timeout: 10000 });

    const imageInput = await page.$("#route-image");
    expect(imageInput).not.toBeNull();

    // Check that it accepts image files
    const acceptAttribute = await page.$eval("#route-image", (el) =>
      el.getAttribute("accept"),
    );
    expect(acceptAttribute).toBe("image/*");
  });

  test("should display all route color options", async () => {
    await page.waitForSelector("#route-colors-add", { timeout: 10000 });

    const colorOptions = await page.$$eval(
      "#route-colors-add .color-btn",
      (elements) =>
        elements.map((el) => ({
          text: el.textContent.trim(),
          color: el.getAttribute("data-color"),
        })),
    );

    // Check that we have the expected colors
    const expectedColors = [
      { text: "Green", color: "green" },
      { text: "Yellow", color: "yellow" },
      { text: "Orange", color: "orange" },
      { text: "Red", color: "red" },
      { text: "Purple", color: "purple" },
      { text: "Black", color: "black" },
      { text: "White", color: "white" },
    ];

    expectedColors.forEach((expectedColor) => {
      const foundColor = colorOptions.find(
        (option) =>
          option.text === expectedColor.text &&
          option.color === expectedColor.color,
      );
      expect(foundColor).toBeDefined();
    });
  });

  test("should handle color selection", async () => {
    await page.waitForSelector("#route-colors-add", { timeout: 10000 });

    // Click on a color button
    const greenButton = await page.$(
      "#route-colors-add .color-btn[data-color='green']",
    );
    expect(greenButton).not.toBeNull();

    await page.click(
      "#route-colors-add .color-btn[data-color='green']",
    );

    // Verify the page is still responsive after color selection
    const header = await page.$eval("#routes h2", (el) => el.textContent.trim());
    expect(header).toBe("Add New Route");
  });

  test("should handle multiple color selections", async () => {
    await page.waitForSelector("#route-colors-add", { timeout: 10000 });

    // Click multiple color buttons
    await page.click(
      "#route-colors-add .color-btn[data-color='green']",
    );
    await page.click("#route-colors-add .color-btn[data-color='red']");
    await page.click(
      "#route-colors-add .color-btn[data-color='purple']",
    );

    // Verify the page remains functional
    const title = await page.$eval(".header h1", (el) => el.textContent.trim());
    expect(title).toBe("🧗‍♀️ Climb Count");
  });

  test("should show image preview area", async () => {
    // Check that image preview element exists (initially hidden)
    const imagePreview = await page.$("#image-preview");
    expect(imagePreview).not.toBeNull();

    // Check that it's initially hidden
    const isHidden = await page.$eval(
      "#image-preview",
      (el) => el.style.display === "none" || !el.offsetParent,
    );
    expect(isHidden).toBe(true);
  });

  test("should have proper form structure", async () => {
    // Check that form groups are properly structured
    const formGroups = await page.$$(".form-group");
    expect(formGroups.length).toBeGreaterThan(0);

    // Check for labels
    const labels = await page.$$eval("label", (elements) =>
      elements.map((el) => el.textContent.trim()),
    );

    expect(labels).toContain("Route Image");
    expect(labels).toContain("Route Color");
  });

  test("should navigate back to other tabs from route management", async () => {
    // We're already on Add Route tab, navigate back to Log Session
    await page.click(".tab:nth-child(1)");

    // Wait for Log Session tab to become active
    await page.waitForFunction(() => {
      const activeTab = document.querySelector(".tab.active");
      return activeTab && activeTab.textContent.trim() === "Log Session";
    }, { timeout: 10000 });

    // Verify we're back on Log Session
    const header = await page.$eval("#log h2", (el) => el.textContent.trim());
    expect(header).toBe("New Climbing Session");
  });
});
