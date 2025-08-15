/**
 * Controller for managing route operations
 */
export class RouteController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.selectedColor = null;
    this.climbController = null; // Will be set by main.js

    this.initializeController();
  }

  /**
   * Initialize the route controller
   */
  initializeController() {
    this.setupEventListeners();
    this.loadRoutes();
  }

  /**
   * Set up event listeners for route management
   */
  setupEventListeners() {
    // Image file input
    const imageInput = document.getElementById("route-image");
    if (imageInput) {
      imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        this.view.showImagePreview(file);
      });
    }

    // Route color selection
    const colorButtons = document.querySelectorAll(
      "#route-colors-add .color-btn"
    );
    colorButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const color = btn.dataset.color;
        this.handleRouteColorSelection(color);
      });
    });

    // Save route button
    const saveRouteBtn = document.getElementById("save-route-btn");
    if (saveRouteBtn) {
      saveRouteBtn.addEventListener("click", () => {
        this.saveRoute();
      });
    }
  }

  /**
   * Handle route color selection
   */
  handleRouteColorSelection(color) {
    this.selectedColor = color;
    this.view.selectRouteColor(color);
  }

  /**
   * Save a new route
   */
  async saveRoute() {
    try {
      // Validate required fields
      if (!this.selectedColor) {
        this.view.showAlert("Please select a route color");
        return;
      }

      const formData = this.view.getRouteFormData();

      if (!formData.image) {
        this.view.showAlert("Please select an image for the route");
        return;
      }

      if (!formData.gym) {
        this.view.showAlert("Please enter a gym/location for the route");
        return;
      }

      // Convert image to ArrayBuffer for IndexedDB storage
      const imageArrayBuffer = await this.model.fileToArrayBuffer(
        formData.image
      );

      const routeData = {
        name: formData.name,
        color: this.selectedColor,
        gym: formData.gym,
        notes: formData.notes,
        image: imageArrayBuffer,
      };

      // Save to IndexedDB
      await this.model.saveRoute(routeData);

      this.view.showSuccess("Route saved successfully!");
      this.view.clearRouteForm();
      this.selectedColor = null;

      // Refresh the routes list
      await this.loadRoutes();
    } catch (error) {
      console.error("Error saving route:", error);
      this.view.showAlert("Error saving route: " + error.message);
    }
  }

  /**
   * Load and display all routes
   */
  async loadRoutes() {
    try {
      const routes = await this.model.getAllRoutes();

      // Create image URLs for display
      const routesWithUrls = routes.map((route) => ({
        ...route,
        imageUrl: this.model.createImageURL(route),
      }));

      this.view.renderRoutes(routesWithUrls);

      // Notify the main controller to refresh route selector
      if (this.climbController) {
        await this.climbController.loadRouteSelector();
      }
    } catch (error) {
      console.error("Error loading routes:", error);
    }
  }

  /**
   * Delete a route
   */
  async deleteRoute(routeId) {
    try {
      if (
        !(await this.view.showConfirm(
          "Are you sure you want to delete this route?"
        ))
      ) {
        return;
      }

      await this.model.deleteRoute(routeId);
      this.view.removeRouteCard(routeId);
      this.view.showSuccess("Route deleted successfully!");

      // Notify the main controller to refresh route selector
      if (this.climbController) {
        await this.climbController.loadRouteSelector();
      }
    } catch (error) {
      console.error("Error deleting route:", error);
      this.view.showAlert("Error deleting route: " + error.message);
    }
  }

  /**
   * Edit a route
   */
  async editRoute(routeId) {
    try {
      // Get the route data
      const route = await this.getRoute(routeId);
      if (!route) {
        this.view.showAlert("Route not found");
        return;
      }

      // Add image URL for display
      route.imageUrl = this.model.createImageURL(route);

      // Show edit dialog
      const editData = await this.view.showEditDialog(route);
      if (!editData) {
        return; // User cancelled
      }

      // Validate required fields
      if (!editData.color) {
        this.view.showAlert("Please select a route color");
        return;
      }

      if (!editData.gym) {
        this.view.showAlert("Please enter a gym/location for the route");
        return;
      }

      // Prepare update data
      const updateData = {
        name: editData.name,
        color: editData.color,
        gym: editData.gym,
        notes: editData.notes,
      };

      // Handle image update if provided
      if (editData.image) {
        updateData.image = await this.model.fileToArrayBuffer(editData.image);
      }

      // Update the route
      await this.model.updateRoute(routeId, updateData);

      this.view.showSuccess("Route updated successfully!");

      // Refresh the routes list
      await this.loadRoutes();

      // Notify the main controller to refresh route selector
      if (this.climbController) {
        await this.climbController.loadRouteSelector();
      }
    } catch (error) {
      console.error("Error editing route:", error);
      this.view.showAlert("Error updating route: " + error.message);
    }
  }

  /**
   * Get route by ID
   */
  async getRoute(routeId) {
    try {
      // Convert string ID to number (IndexedDB auto-increment keys are numbers)
      const numericId = parseInt(routeId, 10);
      if (isNaN(numericId)) {
        console.error("Invalid route ID:", routeId);
        return null;
      }
      return await this.model.getRouteById(numericId);
    } catch (error) {
      console.error("Error getting route:", error);
      return null;
    }
  }

  /**
   * Get routes by color
   */
  async getRoutesByColor(color) {
    try {
      return await this.model.getRoutesByColor(color);
    } catch (error) {
      console.error("Error getting routes by color:", error);
      return [];
    }
  }

  /**
   * Get routes by gym
   */
  async getRoutesByGym(gym) {
    try {
      return await this.model.getRoutesByGym(gym);
    } catch (error) {
      console.error("Error getting routes by gym:", error);
      return [];
    }
  }

  /**
   * Handle tab switch to routes
   */
  handleRouteTabSwitch() {
    this.loadRoutes();
  }
}
