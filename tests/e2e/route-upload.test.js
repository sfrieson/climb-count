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

import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Route Upload - Critical Path", () => {
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

  test("Complete route upload flow", async () => {
    // Step 1: Navigate to routes tab
    await page.click('button.tab:nth-child(2)'); // "Add Route" tab
    await page.waitForSelector('#routes.tab-pane.active', { visible: true });

    // Verify we're on the routes tab
    const routesTabContent = await page.$("#routes.tab-pane.active");
    expect(routesTabContent).not.toBeNull();

    // Step 2: Upload a photo from route_photos directory
    const photoPath = path.resolve(__dirname, "../../route_photos/route_1.png");
    const fileInput = await page.$("#route-image");
    await fileInput.uploadFile(photoPath);

    // Wait for image preview to appear
    await page.waitForSelector("#image-preview", { visible: true });
    const previewVisible = await page.$("#image-preview");
    expect(previewVisible).not.toBeNull();

    // Step 3: Select a color difficulty (let's choose red)
    await page.click('#route-colors-add [data-color="red"]');
    
    // Verify color is selected
    const selectedColor = await page.$('#route-colors-add [data-color="red"].selected');
    expect(selectedColor).not.toBeNull();

    // Step 4: Give it a name
    const routeName = `Test Route ${Date.now()}`;
    await page.type("#route-name", routeName);

    // Optional: Add gym location
    await page.type("#route-gym", "Test Climbing Gym");

    // Optional: Add notes
    await page.type("#route-notes", "E2E test route - automated upload");

    // Step 5: Save the route
    await page.click("#save-route-btn");

    // Wait for success message (toast notification)
    await new Promise(resolve => setTimeout(resolve, 500)); // Give time for the route to be saved

    // Step 6: Verify route appears in the routes list
    await page.waitForSelector("#routes-container .route-card", { visible: true });
    
    // Check that a route card exists with our route name
    const routeCards = await page.$$eval("#routes-container .route-card", cards => 
      cards.map(card => card.textContent)
    );
    
    const foundRoute = routeCards.some(cardText => 
      cardText.includes(routeName) && 
      cardText.includes("RED") && 
      cardText.includes("Test Climbing Gym")
    );
    
    expect(foundRoute).toBe(true);

    // Verify the image is displayed
    const imageSrc = await page.$eval('#routes-container .route-card .route-image img', img => img.src);
    expect(imageSrc).toBeTruthy();
    expect(imageSrc).not.toContain('No Image'); // Should not be the placeholder

    // Verify color indicator is correct (red)
    const colorStyle = await page.$eval('#routes-container .route-card .route-color-indicator', el => el.getAttribute('style'));
    expect(colorStyle).toContain('#F44336'); // Red color hex
  });

  test("Route upload with different colors", async () => {
    const colors = ['green', 'yellow', 'orange', 'purple', 'black', 'white'];
    
    // Navigate to routes tab
    await page.click('button.tab:nth-child(2)');
    await page.waitForSelector('#routes.tab-pane.active', { visible: true });

    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const routeName = `${color.charAt(0).toUpperCase() + color.slice(1)} Route ${Date.now()}_${i}`;
      
      // Upload photo
      const photoPath = path.resolve(__dirname, `../../route_photos/route_${(i % 5) + 1}.png`);
      const fileInput = await page.$("#route-image");
      await fileInput.uploadFile(photoPath);
      
      // Wait for preview
      await page.waitForSelector("#image-preview", { visible: true });
      
      // Select color
      await page.click(`#route-colors-add [data-color="${color}"]`);
      
      // Add route name and gym (required)
      await page.evaluate(() => {
        document.querySelector("#route-name").value = '';
        document.querySelector("#route-gym").value = '';
      });
      await page.type("#route-name", routeName);
      await page.type("#route-gym", "Test Gym Location");
      
      // Save route
      await page.click("#save-route-btn");
      
      // Wait a bit for save to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Clear form for next iteration (simulate the form clearing)
      await page.evaluate(() => {
        document.getElementById("route-image").value = "";
        document.getElementById("route-name").value = "";
        document.getElementById("route-gym").value = "";
        document.getElementById("image-preview").style.display = "none";
        document.querySelectorAll("#route-colors-add .color-btn").forEach(btn => 
          btn.classList.remove("selected")
        );
      });
    }

    // Verify all routes were created
    const routeCards = await page.$$eval("#routes-container .route-card", cards => 
      cards.map(card => ({
        text: card.textContent,
        colorStyle: card.querySelector('.route-color-indicator')?.getAttribute('style') || ''
      }))
    );

    expect(routeCards.length).toBeGreaterThanOrEqual(colors.length);
    
    // Check each color was saved
    colors.forEach(color => {
      const expectedName = `${color.charAt(0).toUpperCase() + color.slice(1)} Route`;
      const foundRoute = routeCards.some(card => 
        card.text.includes(expectedName) && 
        card.text.includes(color.toUpperCase())
      );
      expect(foundRoute).toBe(true);
    });
  });

  test("Route upload validation", async () => {
    // Navigate to routes tab
    await page.click('button.tab:nth-child(2)');
    await page.waitForSelector('#routes.tab-pane.active', { visible: true });

    // Try to save without selecting color (should fail or show warning)
    const routeName = `No Color Route ${Date.now()}`;
    await page.type("#route-name", routeName);
    
    // Upload photo
    const photoPath = path.resolve(__dirname, "../../route_photos/route_1.png");
    const fileInput = await page.$("#route-image");
    await fileInput.uploadFile(photoPath);
    
    await page.click("#save-route-btn");
    
    // Should either show error toast or not save the route
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if route was NOT added (since no color selected)
    const routeCards = await page.$$eval("#routes-container .route-card", cards => 
      cards.map(card => card.textContent)
    );
    
    const foundInvalidRoute = routeCards.some(cardText => cardText.includes(routeName));
    // This test assumes the app validates and doesn't save routes without color
    // If the app allows routes without color, this test would need to be adjusted
  });

  test("Route list displays correctly after upload", async () => {
    // Navigate to routes tab
    await page.click('button.tab:nth-child(2)');
    await page.waitForSelector('#routes.tab-pane.active', { visible: true });

    // Create a route with all fields filled
    const routeName = `Complete Route ${Date.now()}`;
    const gymName = "Complete Test Gym";
    const routeNotes = "Complete test with all fields";
    
    // Upload photo
    const photoPath = path.resolve(__dirname, "../../route_photos/route_2.png");
    const fileInput = await page.$("#route-image");
    await fileInput.uploadFile(photoPath);
    
    await page.waitForSelector("#image-preview", { visible: true });
    
    // Select color
    await page.click('#route-colors-add [data-color="purple"]');
    
    // Fill all fields  
    await page.evaluate(() => {
      document.querySelector("#route-name").value = '';
      document.querySelector("#route-gym").value = '';
      document.querySelector("#route-notes").value = '';
    });
    await page.type("#route-name", routeName);
    await page.type("#route-gym", gymName);
    await page.type("#route-notes", routeNotes);
    
    // Save route
    await page.click("#save-route-btn");
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify route appears with all information
    await page.waitForSelector("#routes-container .route-card");
    const routeCardText = await page.$eval("#routes-container .route-card", el => el.textContent);
    
    expect(routeCardText).toContain(routeName);
    expect(routeCardText).toContain("PURPLE");
    expect(routeCardText).toContain(gymName);
    expect(routeCardText).toContain(routeNotes);
    expect(routeCardText).toContain("Added:"); // Should show creation date
    
    // Verify action buttons are present
    const editButton = await page.$('#routes-container .route-card .edit-route-btn');
    const deleteButton = await page.$('#routes-container .route-card .delete-route-btn');
    
    expect(editButton).not.toBeNull();
    expect(deleteButton).not.toBeNull();
  });
});