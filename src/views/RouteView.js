import { dialogUtils } from "../utils/DialogUtils.js";

/**
 * View for managing route UI
 */
class RouteView {
  constructor() {
    this.colorMap = {
      green: "#4CAF50",
      yellow: "#FFC107",
      orange: "#FF5722",
      red: "#F44336",
      purple: "#9C27B0",
      black: "#212121",
      white: "#FAFAFA",
    };
  }

  /**
   * Show image preview when user selects a file
   */
  showImagePreview(file) {
    const preview = document.getElementById("image-preview");
    const previewImg = document.getElementById("preview-img");

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = "none";
    }
  }

  /**
   * Select color in the add route form
   */
  selectRouteColor(color) {
    document
      .querySelectorAll("#route-colors-add .color-btn")
      .forEach((btn) => btn.classList.remove("selected"));
    document
      .querySelector(`#route-colors-add [data-color="${color}"]`)
      .classList.add("selected");
  }

  /**
   * Get selected color from add route form
   */
  getSelectedRouteColor() {
    const selectedBtn = document.querySelector(
      "#route-colors-add .color-btn.selected",
    );
    return selectedBtn ? selectedBtn.dataset.color : null;
  }

  /**
   * Get route form data
   */
  getRouteFormData() {
    const fileInput = document.getElementById("route-image");
    return {
      image: fileInput.files[0] || null,
      name: document.getElementById("route-name").value.trim(),
      gym: document.getElementById("route-gym").value.trim(),
      notes: document.getElementById("route-notes").value.trim(),
    };
  }

  /**
   * Clear the route form
   */
  clearRouteForm() {
    document.getElementById("route-image").value = "";
    document.getElementById("route-name").value = "";
    document.getElementById("route-gym").value = "";
    document.getElementById("route-notes").value = "";
    document.getElementById("image-preview").style.display = "none";

    document
      .querySelectorAll("#route-colors-add .color-btn")
      .forEach((btn) => btn.classList.remove("selected"));
  }

  /**
   * Render all routes in the routes list
   */
  renderRoutes(routes) {
    const container = document.getElementById("routes-container");
    container.innerHTML = "";

    if (routes.length === 0) {
      container.innerHTML =
        "<p>No routes saved yet. Add your first route above!</p>";
      return;
    }

    routes
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach((route) => {
        const routeElement = this.createRouteCard(route);
        container.appendChild(routeElement);
      });
  }

  /**
   * Create a route card element
   */
  createRouteCard(route) {
    const routeCard = document.createElement("div");
    routeCard.className = "route-card";
    routeCard.dataset.routeId = route.id;

    const imageUrl =
      route.imageUrl ||
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
    const colorHex = this.getColorHex(route.color);

    routeCard.innerHTML = `
      <div class="route-image">
        <img src="${imageUrl}" alt="Route image" />
      </div>
      <div class="route-info">
        <h4>
          <span class="route-color-indicator" style="background-color: ${colorHex};"></span>
          ${route.name || "Unnamed Route"}
        </h4>
        <p><strong>Color:</strong> ${route.color.toUpperCase()}</p>
        ${route.gym ? `<p><strong>Gym:</strong> ${route.gym}</p>` : ""}
        ${route.notes ? `<p><strong>Notes:</strong> ${route.notes}</p>` : ""}
        <p><small>Added: ${new Date(route.createdAt).toLocaleDateString()}</small></p>
        <div class="route-actions">
          <button class="edit-route-btn" onclick="app.routeController.editRoute(${route.id})">
            Edit Route
          </button>
          <button class="delete-route-btn" onclick="app.routeController.deleteRoute(${route.id})">
            Delete Route
          </button>
        </div>
      </div>
    `;

    return routeCard;
  }

  /**
   * Update a route card with image URL
   */
  updateRouteCardImage(routeId, imageUrl) {
    const routeCard = document.querySelector(`[data-route-id="${routeId}"]`);
    if (routeCard) {
      const img = routeCard.querySelector(".route-image img");
      if (img && imageUrl) {
        img.src = imageUrl;
      }
    }
  }

  /**
   * Remove route card from DOM
   */
  removeRouteCard(routeId) {
    const routeCard = document.querySelector(`[data-route-id="${routeId}"]`);
    if (routeCard) {
      routeCard.remove();
    }
  }

  /**
   * Get color hex value
   */
  getColorHex(color) {
    return this.colorMap[color] || "#999";
  }

  /**
   * Show alert message
   */
  showAlert(message) {
    dialogUtils.showError(message);
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    dialogUtils.showSuccess(message);
  }

  /**
   * Show confirmation dialog
   */
  async showConfirm(message) {
    return await dialogUtils.showConfirm(message);
  }

  /**
   * Show route edit dialog
   */
  async showEditDialog(route) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "dialog-overlay";

      const dialog = document.createElement("div");
      dialog.className = "dialog";

      const colorOptions = Object.keys(this.colorMap)
        .map((color) => {
          const selected = color === route.color ? "selected" : "";
          return `<div class="color-btn ${color} ${selected}" data-color="${color}">${color.charAt(0).toUpperCase() + color.slice(1)}</div>`;
        })
        .join("");

      dialog.innerHTML = `
        <div class="dialog-header">
          <h3>Edit Route</h3>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label for="edit-route-image">Route Image</label>
            <input type="file" id="edit-route-image" accept="image/*" />
            <div id="edit-image-preview" class="image-preview">
              <img id="edit-preview-img" src="${route.imageUrl || ""}" style="max-width: 300px; max-height: 200px; border-radius: 8px" />
            </div>
          </div>
          
          <div class="form-group">
            <label>Route Color</label>
            <div class="route-colors" id="edit-route-colors">
              ${colorOptions}
            </div>
          </div>
          
          <div class="form-group">
            <label for="edit-route-name">Route Name</label>
            <input type="text" id="edit-route-name" value="${route.name || ""}" placeholder="e.g., Wall A - Route 3" />
          </div>
          
          <div class="form-group">
            <label for="edit-route-gym">Gym/Location</label>
            <input type="text" id="edit-route-gym" value="${route.gym || ""}" placeholder="Enter gym or climbing location" />
          </div>
          
          <div class="form-group">
            <label for="edit-route-notes">Notes</label>
            <input type="text" id="edit-route-notes" value="${route.notes || ""}" placeholder="Any additional notes about this route" />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-secondary" id="edit-cancel-btn">Cancel</button>
          <button class="dialog-btn dialog-btn-primary" id="edit-save-btn">Save Changes</button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Handle image preview
      const imageInput = dialog.querySelector("#edit-route-image");
      const preview = dialog.querySelector("#edit-image-preview");
      const previewImg = dialog.querySelector("#edit-preview-img");

      imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            previewImg.src = e.target.result;
            preview.style.display = "block";
          };
          reader.readAsDataURL(file);
        }
      });

      // Handle color selection
      const colorButtons = dialog.querySelectorAll(
        "#edit-route-colors .color-btn",
      );
      let selectedColor = route.color;

      colorButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          colorButtons.forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          selectedColor = btn.dataset.color;
        });
      });

      // Handle buttons
      dialog.querySelector("#edit-cancel-btn").addEventListener("click", () => {
        document.body.removeChild(overlay);
        resolve(null);
      });

      dialog.querySelector("#edit-save-btn").addEventListener("click", () => {
        const formData = {
          image: imageInput.files[0] || null,
          name: dialog.querySelector("#edit-route-name").value.trim(),
          color: selectedColor,
          gym: dialog.querySelector("#edit-route-gym").value.trim(),
          notes: dialog.querySelector("#edit-route-notes").value.trim(),
        };

        document.body.removeChild(overlay);
        resolve(formData);
      });

      // Close on overlay click
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
          resolve(null);
        }
      });
    });
  }
}

export { RouteView };
