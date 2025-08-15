import { dialogUtils } from "../utils/DialogUtils.js";

class ClimbView {
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

  setCurrentDateTime() {
    const now = new Date();
    const localDateTime = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000,
    );
    document.getElementById("session-date").value = localDateTime
      .toISOString()
      .slice(0, 16);
  }

  showCurrentSession() {
    document.getElementById("current-session").style.display = "block";
  }

  hideCurrentSession() {
    document.getElementById("current-session").style.display = "none";
  }

  renderCurrentSessionAttempts(attempts) {
    const container = document.getElementById("session-attempts");
    container.innerHTML = "";

    attempts.forEach((attempt) => {
      const attemptElement = document.createElement("div");
      attemptElement.className = "attempt-item";

      let routeInfo = "Unknown Route";
      if (attempt.route) {
        const colorHex = this.getColorHex(attempt.route.color);
        routeInfo = `
          <span class="attempt-color" style="background-color: ${colorHex}"></span>
          <strong>${attempt.route.name || "Unnamed Route"}</strong>
          <br><small>${attempt.route.color.toUpperCase()}${attempt.route.gym ? ` • ${attempt.route.gym}` : ""}</small>
        `;
      }

      attemptElement.innerHTML = `
                <div>
                    ${routeInfo}
                    ${
  attempt.notes
    ? `<br><small>Notes: ${attempt.notes}</small>`
    : ""
}
                </div>
                <div class="attempt-actions">
                    ${attempt.success ? "✅ Success" : "❌ Failed"}
                    <button class="edit-attempt-btn" data-attempt-id="${attempt.id}" title="Edit attempt">✏️</button>
                </div>
            `;
      container.appendChild(attemptElement);
    });
  }

  clearAttemptForm() {
    document
      .querySelectorAll(".route-selector-item")
      .forEach((item) => item.classList.remove("selected"));
    document
      .querySelectorAll(".success-btn, .failure-btn")
      .forEach((btn) => btn.classList.remove("selected"));
    document.getElementById("notes").value = "";
  }

  selectRoute(routeId) {
    document
      .querySelectorAll(".route-selector-item")
      .forEach((item) => item.classList.remove("selected"));
    document
      .querySelector(`[data-route-id="${routeId}"]`)
      .classList.add("selected");
  }

  selectResult(success) {
    document
      .querySelectorAll(".success-btn, .failure-btn")
      .forEach((btn) => btn.classList.remove("selected"));
    if (success) {
      document.getElementById("success-btn").classList.add("selected");
    } else {
      document.getElementById("failure-btn").classList.add("selected");
    }
  }

  renderSessions(sessions) {
    const container = document.getElementById("session-list");
    container.innerHTML = "";

    if (sessions.length === 0) {
      container.innerHTML =
        "<p>No sessions logged yet. Start by logging your first climbing session!</p>";
      return;
    }

    sessions
      .slice()
      .reverse()
      .forEach((session) => {
        const sessionElement = document.createElement("div");
        sessionElement.className = "session-item";

        const successCount = session.attempts.filter((a) => a.success).length;
        const totalCount = session.attempts.length;
        const successRate =
          totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : 0;

        const colorStats = this.getSessionColorStats(session.attempts);

        sessionElement.innerHTML = `
                <div class="session-header">
                    <div>
                        <h3>${session.gym}</h3>
                        <p>${session.date.toLocaleDateString()} ${session.date.toLocaleTimeString()}</p>
                    </div>
                    <div class="session-stats">
                        <span><strong>${successCount}/${totalCount}</strong> Success Rate: ${successRate}%</span>
                    </div>
                </div>
                <div class="session-stats">
                    ${colorStats}
                </div>
                <div style="margin-top: 10px;">
                    ${this.renderSessionTimeline(session)}
                </div>
            `;
        container.appendChild(sessionElement);
      });
  }

  renderStats(stats, colorStats) {
    const container = document.getElementById("stats-grid");
    container.innerHTML = "";

    if (stats.totalSessions === 0) {
      container.innerHTML =
        "<p>No data available yet. Log some climbing sessions to see statistics!</p>";
      return;
    }

    const statsHtml = `
            <div class="stat-card">
                <div class="stat-number">${stats.totalSessions}</div>
                <div>Total Sessions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.totalAttempts}</div>
                <div>Total Attempts</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.overallSuccessRate}%</div>
                <div>Overall Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.totalSuccess}</div>
                <div>Total Successes</div>
            </div>
        `;

    container.innerHTML = statsHtml;

    const colorStatsHtml = Object.entries(colorStats)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([color, stats]) => {
        const rate = ((stats.success / stats.total) * 100).toFixed(1);
        return `
                    <div class="stat-card" style="border-left: 5px solid ${this.getColorHex(
    color,
  )};">
                        <div style="font-weight: bold; color: ${this.getColorHex(
    color,
  )};">${color.toUpperCase()}</div>
                        <div class="stat-number">${rate}%</div>
                        <div>${stats.success}/${stats.total} attempts</div>
                    </div>
                `;
      })
      .join("");

    container.innerHTML += colorStatsHtml;
  }

  renderProgressChart(sessions) {
    const canvas = document.getElementById("progress-chart");
    if (!canvas) {
      console.error("Canvas not found");
      return;
    }

    const ctx = canvas.getContext("2d");

    canvas.width = 800;
    canvas.height = 300;
    canvas.style.width = "100%";
    canvas.style.height = "300px";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (sessions.length === 0) {
      ctx.fillStyle = "#666";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("No data to display", canvas.width / 2, canvas.height / 2);
      return;
    }

    const colors = [
      "green",
      "yellow",
      "orange",
      "red",
      "purple",
      "black",
      "white",
    ];
    const sessionData = sessions.map((session) => {
      const colorCounts = {};
      colors.forEach((color) => {
        colorCounts[color] = session.attempts.filter(
          (a) => (a.route ? a.route.color : a.color) === color,
        ).length;
      });
      return {
        date: session.date,
        colorCounts: colorCounts,
        totalAttempts: session.attempts.length,
      };
    });

    const maxAttempts = Math.max(...sessionData.map((d) => d.totalAttempts));
    if (maxAttempts === 0) return;

    const padding = 60;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding - 40;

    this.drawChartGrid(ctx, canvas, padding, chartHeight, maxAttempts);
    this.drawChartData(
      ctx,
      canvas,
      padding,
      chartWidth,
      chartHeight,
      sessionData,
      colors,
      maxAttempts,
    );
    this.drawChartLabels(ctx, canvas, padding, chartWidth, sessionData);
    this.drawChartLegend(ctx, canvas, padding, colors);
  }

  drawChartGrid(ctx, canvas, padding, chartHeight, maxAttempts) {
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    const gridSteps = Math.max(5, Math.ceil(maxAttempts / 5));

    for (let i = 0; i <= gridSteps; i++) {
      const y = padding + (chartHeight * i) / gridSteps;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      ctx.fillStyle = "#666";
      ctx.font = "12px Arial";
      ctx.textAlign = "right";
      const value = Math.round(maxAttempts - (maxAttempts * i) / gridSteps);
      ctx.fillText(value.toString(), padding - 10, y + 4);
    }
  }

  drawChartData(
    ctx,
    canvas,
    padding,
    chartWidth,
    chartHeight,
    sessionData,
    colors,
    maxAttempts,
  ) {
    if (sessionData.length >= 1) {
      colors.forEach((color, colorIndex) => {
        ctx.fillStyle = this.getColorHex(color);
        ctx.strokeStyle = this.getColorHex(color);
        ctx.lineWidth = 2;

        if (sessionData.length > 1) {
          ctx.beginPath();
        }

        const points = [];
        sessionData.forEach((data, sessionIndex) => {
          const x =
            sessionData.length === 1
              ? canvas.width / 2
              : padding +
                (chartWidth * sessionIndex) / (sessionData.length - 1);

          let cumulativeCount = 0;
          for (let i = 0; i <= colorIndex; i++) {
            cumulativeCount += data.colorCounts[colors[i]];
          }

          const y = padding + chartHeight * (1 - cumulativeCount / maxAttempts);
          points.push({ x, y, cumulativeCount });
        });

        this.drawColorLayer(
          ctx,
          sessionData,
          points,
          colors,
          colorIndex,
          padding,
          chartHeight,
          maxAttempts,
          color,
        );
      });
    }
  }

  drawColorLayer(
    ctx,
    sessionData,
    points,
    colors,
    colorIndex,
    padding,
    chartHeight,
    maxAttempts,
    color,
  ) {
    if (sessionData.length > 1 && points.some((p) => p.cumulativeCount > 0)) {
      ctx.beginPath();

      points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });

      for (let i = points.length - 1; i >= 0; i--) {
        const point = points[i];
        let prevCumulativeCount = 0;
        for (let j = 0; j < colorIndex; j++) {
          prevCumulativeCount += sessionData[i].colorCounts[colors[j]];
        }
        const bottomY =
          padding + chartHeight * (1 - prevCumulativeCount / maxAttempts);
        ctx.lineTo(point.x, bottomY);
      }

      ctx.closePath();
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    }

    if (sessionData.length === 1) {
      points.forEach((point) => {
        if (point.cumulativeCount > 0) {
          ctx.fillStyle = this.getColorHex(color);
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }
  }

  drawChartLabels(ctx, canvas, padding, chartWidth, sessionData) {
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    sessionData.forEach((data, index) => {
      const x =
        sessionData.length === 1
          ? canvas.width / 2
          : padding + (chartWidth * index) / (sessionData.length - 1);
      const dateStr = data.date.toLocaleDateString();
      ctx.fillText(dateStr, x, canvas.height - 25);
    });
  }

  drawChartLegend(ctx, canvas, padding, colors) {
    ctx.font = "12px Arial";
    const legendStartY = canvas.height - 15;
    const legendItemWidth = 80;
    colors.forEach((color, index) => {
      const x = padding + index * legendItemWidth;
      if (x + legendItemWidth <= canvas.width - padding) {
        ctx.fillStyle = this.getColorHex(color);
        ctx.fillRect(x, legendStartY, 12, 12);
        ctx.fillStyle = "#666";
        ctx.textAlign = "left";
        ctx.fillText(color.toUpperCase(), x + 16, legendStartY + 9);
      }
    });
  }

  getSessionColorStats(attempts) {
    const colorCounts = {};
    attempts.forEach((attempt) => {
      const color = attempt.route
        ? attempt.route.color
        : attempt.color || "unknown";
      if (!colorCounts[color]) {
        colorCounts[color] = { success: 0, total: 0 };
      }
      colorCounts[color].total++;
      if (attempt.success) {
        colorCounts[color].success++;
      }
    });

    return Object.entries(colorCounts)
      .map(([color, stats]) => {
        const rate = ((stats.success / stats.total) * 100).toFixed(0);
        return `<span style="color: ${this.getColorHex(color)};">
                    <strong>${color.toUpperCase()}</strong>: ${stats.success}/${
  stats.total
} (${rate}%)
                </span>`;
      })
      .join(" | ");
  }

  renderSessionTimeline(session) {
    const timeline = session.attempts
      .map((attempt, index) => {
        const attemptColor = attempt.route
          ? attempt.route.color
          : attempt.color || "unknown";
        const color = this.getColorHex(attemptColor);
        const symbol = attempt.success ? "✅" : "❌";
        const routeName = attempt.route
          ? attempt.route.name || "Unnamed"
          : "Unknown Route";
        return `<span class="timeline-attempt" data-session-id="${session.id}" data-attempt-id="${attempt.id}" 
                      title="${routeName} (${attemptColor}) - ${
  attempt.success ? "Success" : "Failed"
} - Click to edit" 
                      style="display: inline-block; margin: 2px; padding: 4px 6px; 
                             background: ${color}; color: ${
  attemptColor === "white" ? "black" : "white"
}; 
                             border-radius: 4px; font-size: 12px; cursor: pointer;
                             position: relative;">
                        ${symbol}
                    </span>`;
      })
      .join("");

    return `<div><strong>Timeline:</strong> ${timeline}</div>`;
  }

  getColorHex(color) {
    return this.colorMap[color] || "#999";
  }

  showAlert(message) {
    dialogUtils.showError(message);
  }

  getFormData() {
    const selectedRoute = document.querySelector(
      ".route-selector-item.selected",
    );
    return {
      sessionDate: document.getElementById("session-date").value,
      selectedGym: document.getElementById("gym-select").value,
      selectedRouteId: selectedRoute ? selectedRoute.dataset.routeId : null,
      notes: document.getElementById("notes").value,
    };
  }

  populateGymDropdown(routes) {
    const gymSelect = document.getElementById("gym-select");

    // Get unique gyms from routes
    const gyms = [
      ...new Set(routes.map((route) => route.gym).filter((gym) => gym)),
    ].sort();

    // Clear existing options except the "All gyms" option
    while (gymSelect.children.length > 1) {
      gymSelect.removeChild(gymSelect.lastChild);
    }

    // Add gym options
    gyms.forEach((gym) => {
      const option = document.createElement("option");
      option.value = gym;
      option.textContent = gym;
      gymSelect.appendChild(option);
    });
  }

  renderRouteSelector(routes, selectedGym = "") {
    const container = document.getElementById("route-selector");
    const addNewButton = container.querySelector(".add-route-option");

    // Clear existing route items but keep the "Add New Route" button
    const routeItems = container.querySelectorAll(
      ".route-selector-item:not(.add-route-option)",
    );
    routeItems.forEach((item) => item.remove());

    // Filter routes based on selected gym
    const filteredRoutes = selectedGym
      ? routes.filter((route) => route.gym === selectedGym)
      : routes;

    filteredRoutes.forEach((route) => {
      const routeItem = document.createElement("div");
      routeItem.className = "route-selector-item";
      routeItem.dataset.routeId = route.id;

      const imageUrl =
        route.imageUrl ||
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='124' height='80' viewBox='0 0 124 80'%3E%3Crect width='124' height='80' fill='%23f0f0f0'/%3E%3Ctext x='62' y='40' font-family='Arial' font-size='10' fill='%23999' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
      const colorHex = this.getColorHex(route.color);

      routeItem.innerHTML = `
        <div class="route-mini-card">
          <div class="route-mini-image">
            <img src="${imageUrl}" alt="Route image" />
          </div>
          <div class="route-mini-info">
            <div class="route-mini-name">${route.name || "Unnamed"}</div>
            <div class="route-mini-details">
              <span class="route-mini-color" style="background-color: ${colorHex};"></span>
              ${route.color.toUpperCase()}
              ${route.gym ? ` • ${route.gym}` : ""}
            </div>
          </div>
        </div>
      `;

      // Insert before the "Add New Route" button
      container.insertBefore(routeItem, addNewButton);
    });
  }

  switchTab(tabName) {
    document
      .querySelectorAll(".tab")
      .forEach((tab) => tab.classList.remove("active"));
    document
      .querySelectorAll(".tab-pane")
      .forEach((pane) => pane.classList.remove("active"));

    document
      .querySelector(`[onclick="switchTab('${tabName}')"]`)
      .classList.add("active");
    document.getElementById(tabName).classList.add("active");

    // Handle settings tab specific actions
    if (tabName === "settings") {
      setTimeout(() => {
        if (window.checkStorageStatus) {
          window.checkStorageStatus();
        }
      }, 100);
    }
  }

  /**
   * Show edit attempt modal
   */
  showEditAttemptModal(attempt, routes, onSave, onDelete) {
    // First, make sure any existing modal is removed
    this.hideEditAttemptModal();

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "edit-attempt-modal";

    const routeOptions = routes
      .map(route => {
        const colorHex = this.getColorHex(route.color);
        const selected = attempt.routeId === route.id ? "selected" : "";
        return `<option value="${route.id}" ${selected} data-color="${route.color}" data-name="${route.name || "Unnamed"}" data-gym="${route.gym || ""}">
          ${route.name || "Unnamed"} (${route.color.toUpperCase()}) ${route.gym ? `• ${route.gym}` : ""}
        </option>`;
      })
      .join("");

    // Track current selection state
    let selectedSuccess = attempt.success;

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edit Attempt</h3>
          <button class="modal-close" type="button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="edit-route-select">Route:</label>
            <select id="edit-route-select" required>
              ${routeOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Result:</label>
            <div class="result-buttons">
              <button type="button" class="success-btn ${attempt.success ? "selected" : ""}" data-result="true">✅ Success</button>
              <button type="button" class="failure-btn ${!attempt.success ? "selected" : ""}" data-result="false">❌ Failed</button>
            </div>
          </div>
          <div class="form-group">
            <label for="edit-notes">Notes (optional):</label>
            <textarea id="edit-notes" rows="3" placeholder="Any additional notes about this attempt...">${attempt.notes || ""}</textarea>
          </div>
          <div class="form-group">
            <small>Logged: ${attempt.timestamp.toLocaleString()}</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-danger" data-action="delete">Delete Attempt</button>
          <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button type="button" class="btn btn-primary" data-action="save">Save Changes</button>
        </div>
      </div>
    `;

    // Add single click event listener to the modal using event delegation
    modal.addEventListener("click", async (e) => {
      const target = e.target;
      
      // Handle close button (X)
      if (target.classList.contains("modal-close")) {
        e.preventDefault();
        e.stopPropagation();
        this.hideEditAttemptModal();
        return;
      }

      // Handle result selection buttons
      if (target.classList.contains("success-btn") || target.classList.contains("failure-btn")) {
        e.preventDefault();
        e.stopPropagation();
        
        // Remove selected class from both buttons
        modal.querySelectorAll(".success-btn, .failure-btn").forEach(btn => {
          btn.classList.remove("selected");
        });
        
        // Add selected class to clicked button
        target.classList.add("selected");
        
        // Update selected success value
        selectedSuccess = target.dataset.result === "true";
        console.log("Result selected:", selectedSuccess);
        return;
      }

      // Handle action buttons (save, delete, cancel)
      if (target.dataset.action) {
        e.preventDefault();
        e.stopPropagation();
        
        const action = target.dataset.action;
        console.log("Action clicked:", action);

        if (action === "cancel") {
          this.hideEditAttemptModal();
        } else if (action === "delete") {
          // Use custom dialog instead of browser confirm
          const confirmed = await dialogUtils.showConfirm(
            "Are you sure you want to delete this attempt? This action cannot be undone.",
            "Delete Attempt"
          );
          
          if (confirmed) {
            onDelete();
            this.hideEditAttemptModal();
          }
        } else if (action === "save") {
          const routeSelect = document.getElementById("edit-route-select");
          const selectedOption = routeSelect.options[routeSelect.selectedIndex];
          const notes = document.getElementById("edit-notes").value.trim();

          if (!routeSelect.value) {
            this.showAlert("Please select a route");
            return;
          }

          const updatedData = {
            routeId: parseInt(routeSelect.value),
            route: {
              id: parseInt(routeSelect.value),
              color: selectedOption.dataset.color,
              name: selectedOption.dataset.name,
              gym: selectedOption.dataset.gym
            },
            success: selectedSuccess,
            notes: notes || null
          };

          console.log("Saving updated data:", updatedData);
          onSave(updatedData);
          this.hideEditAttemptModal();
        }
        return;
      }

      // Handle clicking on overlay background (close modal)
      if (target === modal) {
        this.hideEditAttemptModal();
      }
    });

    document.body.appendChild(modal);

    // Focus on route select after a brief delay
    setTimeout(() => {
      const routeSelect = document.getElementById("edit-route-select");
      if (routeSelect) {
        routeSelect.focus();
      }
    }, 100);
  }

  /**
   * Hide edit attempt modal
   */
  hideEditAttemptModal() {
    const modal = document.getElementById("edit-attempt-modal");
    if (modal) {
      // Remove event listeners by removing the element completely
      modal.remove();
    }
    
    // Also clean up any stray modals with the same class
    document.querySelectorAll(".modal-overlay").forEach(m => {
      if (m.id === "edit-attempt-modal") {
        m.remove();
      }
    });
  }
}

export { ClimbView };
