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
    alert(message);
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    alert(message);
  }

  /**
   * Show confirmation dialog
   */
  showConfirm(message) {
    return confirm(message);
  }
}
