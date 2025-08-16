/**
 * E2E Test: Route Upload Critical Path
 *
 * Tests the complete flow of uploading a new route:
 * 1. Navigate to routes tab
 * 2. Upload a photo from route_photos directory
 * 3. Select a color difficulty
 * 4. Give it a name
 * 5. Save the route
 * 6. Verify it appears in the routes list
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

describe("Route Upload - Critical Path", () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await launchBrowser();
  });

  beforeEach(async () => {
    page = await createPage(browser);
    await navigateToApp(page);
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

  test("Complete route upload flow", async () => {
    // Step 1: Navigate to routes tab
    await safeClick(page, "button.tab:nth-child(2)"); // "Add Route" tab
    await page.waitForSelector("#routes.tab-pane.active", { visible: true });

    // Verify we're on the routes tab
    const routesTabContent = await page.$("#routes.tab-pane.active");
    expect(routesTabContent).not.toBeNull();

    // Step 2: Upload a photo from route_photos directory
    const photoPath = path.resolve(__dirname, "../../route_photos/test/route_1.png");
    await safeFileUpload(page, "#route-image", photoPath);

    // Wait for image preview to appear
    await page.waitForSelector("#image-preview", { visible: true });
    const previewVisible = await page.$("#image-preview");
    expect(previewVisible).not.toBeNull();

    // Step 3: Select a color difficulty (let's choose red)
    await safeClick(page, '#route-colors-add [data-color="red"]');

    // Verify color is selected
    const selectedColor = await page.$(
      '#route-colors-add [data-color="red"].selected'
    );
    expect(selectedColor).not.toBeNull();

    // Step 4: Give it a name
    const routeName = `Test Route ${Date.now()}`;
    await safeType(page, "#route-name", routeName, { clear: true });

    // Optional: Add gym location
    await safeType(page, "#route-gym", "Test Climbing Gym", { clear: true });

    // Optional: Add notes
    await safeType(page, "#route-notes", "E2E test route - automated upload", {
      clear: true,
    });

    // Step 5: Save the route
    await safeClick(page, "#save-route-btn");

    // Wait for route to be saved - DOM-based wait
    await waitForElementSmart(page, "#routes-container .route-card");

    // Step 6: Verify route appears in the routes list
    const routeCards = await page.$$eval(
      "#routes-container .route-card",
      (cards) => cards.map((card) => card.textContent)
    );

    const foundRoute = routeCards.some(
      (cardText) =>
        cardText.includes(routeName) &&
        cardText.includes("RED") &&
        cardText.includes("Test Climbing Gym")
    );

    expect(foundRoute).toBe(true);

    // Verify the image is displayed
    const imageSrc = await page.$eval(
      "#routes-container .route-card .route-image img",
      (img) => img.src
    );
    expect(imageSrc).toBeTruthy();
    expect(imageSrc).not.toContain("No Image"); // Should not be the placeholder

    // Verify color indicator is correct (red)
    const colorStyle = await page.$eval(
      "#routes-container .route-card .route-color-indicator",
      (el) => el.getAttribute("style")
    );
    expect(colorStyle).toContain("#F44336"); // Red color hex
  });

  test("Route upload with different colors", async () => {
    const colors = ["green", "yellow", "orange", "purple", "black"];

    // Navigate to routes tab
    await safeClick(page, "button.tab:nth-child(2)");
    await page.waitForSelector("#routes.tab-pane.active", { visible: true });

    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const routeName = `${color.charAt(0).toUpperCase() + color.slice(1)} Route ${Date.now()}_${i}`;

      // Upload photo
      const photoPath = path.resolve(
        __dirname,
        `../../route_photos/test/route_${(i % 5) + 1}.png`
      );
      await safeFileUpload(page, "#route-image", photoPath);

      // Wait for preview
      await page.waitForSelector("#image-preview", { visible: true });

      // Select color
      await safeClick(page, `#route-colors-add [data-color="${color}"]`);

      // Add route name and gym (required)
      await safeType(page, "#route-name", routeName, { clear: true });
      await safeType(page, "#route-gym", "Test Gym Location", { clear: true });

      // Save route
      await safeClick(page, "#save-route-btn");

      // Wait for route to be saved - much shorter delay
      await waitForDOMSettle(page);

      // Clear form for next iteration (simulate the form clearing)
      await page.evaluate(() => {
        document.getElementById("route-image").value = "";
        document.getElementById("route-name").value = "";
        document.getElementById("route-gym").value = "";
        const preview = document.getElementById("image-preview");
        if (preview) preview.style.display = "none";
        document
          .querySelectorAll("#route-colors-add .color-btn")
          .forEach((btn) => btn.classList.remove("selected"));
      });
    }

    // Verify all routes were created
    await waitForElementSmart(page, "#routes-container .route-card");
    const routeCards = await page.$$eval(
      "#routes-container .route-card",
      (cards) =>
        cards.map((card) => ({
          text: card.textContent,
          colorStyle:
            card
              .querySelector(".route-color-indicator")
              ?.getAttribute("style") || "",
        }))
    );

    expect(routeCards.length).toBeGreaterThanOrEqual(colors.length);

    // Check each color was saved
    colors.forEach((color) => {
      const expectedName = `${color.charAt(0).toUpperCase() + color.slice(1)} Route`;
      const foundRoute = routeCards.some(
        (card) =>
          card.text.includes(expectedName) &&
          card.text.includes(color.toUpperCase())
      );
      expect(foundRoute).toBe(true);
    });
  });

  test("Route upload validation", async () => {
    // Navigate to routes tab
    await safeClick(page, "button.tab:nth-child(2)");
    await page.waitForSelector("#routes.tab-pane.active", { visible: true });

    // Try to save without selecting color (should fail or show warning)
    const routeName = `No Color Route ${Date.now()}`;

    // Upload photo first
    const photoPath = path.resolve(__dirname, "../../route_photos/test/route_1.png");
    await safeFileUpload(page, "#route-image", photoPath);

    await page.waitForSelector("#image-preview", { visible: true });

    // Add name but no color
    await safeType(page, "#route-name", routeName, { clear: true });
    await safeType(page, "#route-gym", "Test Gym", { clear: true });

    // Try to save without color
    await safeClick(page, "#save-route-btn");

    // Wait for validation response
    await smartDelay(200, 1000);

    // Check if route was NOT added (since no color selected)
    const routeCards = await page.$$eval(
      "#routes-container .route-card",
      (cards) => cards.map((card) => card.textContent)
    );

    const foundInvalidRoute = routeCards.some((cardText) =>
      cardText.includes(routeName)
    );
    // This test assumes the app validates and doesn't save routes without color
    expect(foundInvalidRoute).toBe(false);
  });

  test("Route list displays correctly after upload", async () => {
    // Navigate to routes tab
    await safeClick(page, "button.tab:nth-child(2)");
    await page.waitForSelector("#routes.tab-pane.active", { visible: true });

    // Create a route with all fields filled
    const routeName = `Complete Route ${Date.now()}`;
    const gymName = "Complete Test Gym";
    const routeNotes = "Complete test with all fields";

    // Upload photo
    const photoPath = path.resolve(__dirname, "../../route_photos/test/route_2.png");
    await safeFileUpload(page, "#route-image", photoPath);

    await page.waitForSelector("#image-preview", { visible: true });

    // Select color
    await safeClick(page, '#route-colors-add [data-color="purple"]');

    // Fill all fields
    await safeType(page, "#route-name", routeName, { clear: true });
    await safeType(page, "#route-gym", gymName, { clear: true });
    await safeType(page, "#route-notes", routeNotes, { clear: true });

    // Save route
    await safeClick(page, "#save-route-btn");

    // Wait for route to be created and displayed - give more time for save operation
    await smartDelay(500, 1500); // Save operations need more time
    await waitForElementSmart(page, "#routes-container .route-card");

    // Find and verify the specific route we created
    const routeCards = await page.$$eval(
      "#routes-container .route-card",
      (cards) => cards.map((card) => card.textContent)
    );

    const ourRouteCard = routeCards.find((cardText) =>
      cardText.includes(routeName)
    );
    expect(ourRouteCard).toBeDefined();
    expect(ourRouteCard).toContain("PURPLE");
    expect(ourRouteCard).toContain(gymName);
    expect(ourRouteCard).toContain(routeNotes);
    expect(ourRouteCard).toContain("Added:"); // Should show creation date

    // Verify action buttons are present on any route card (they should all have them)
    const editButton = await page.$(
      "#routes-container .route-card .edit-route-btn"
    );
    const deleteButton = await page.$(
      "#routes-container .route-card .delete-route-btn"
    );

    expect(editButton).not.toBeNull();
    expect(deleteButton).not.toBeNull();
  });
});
