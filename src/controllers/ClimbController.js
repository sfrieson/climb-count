export class ClimbController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.selectedRoute = null;
    this.selectedResult = null;

    this.initializeApp();
  }

  initializeApp() {
    this.view.setCurrentDateTime();
    this.setupEventListeners();
    this.refreshViews();
    this.checkForDraft();

    // Load routes if we're starting on the log tab (page refresh)
    const activeTab = document.querySelector(".tab.active");
    if (activeTab && activeTab.textContent.trim() === "Log Session") {
      // Use setTimeout to ensure route controller is fully initialized
      setTimeout(() => {
        this.loadRouteSelector();
      }, 0);
    }
  }

  setupEventListeners() {
    // Route selector event listeners
    document.addEventListener("click", (e) => {
      const routeItem = e.target.closest(".route-selector-item");
      if (routeItem) {
        if (routeItem.dataset.routeId === "add-new") {
          // Switch to routes tab
          this.handleTabSwitch("routes");
        } else {
          this.handleRouteSelection(routeItem.dataset.routeId);
        }
      }
    });

    document
      .getElementById("success-btn")
      .addEventListener("click", () => this.handleResultSelection(true));
    document
      .getElementById("failure-btn")
      .addEventListener("click", () => this.handleResultSelection(false));

    const logAttemptBtn = document.getElementById("log-attempt-btn");
    if (logAttemptBtn) {
      logAttemptBtn.onclick = () => this.logAttempt();
    }

    const finishSessionBtn = document.querySelector(
      "[onclick=\"finishSession()\"]",
    );
    if (finishSessionBtn) {
      finishSessionBtn.onclick = () => this.finishSession();
    }

    const tabs = document.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      const tabName = tab.onclick.toString().match(/switchTab\('(.+?)'\)/);
      if (tabName) {
        tab.onclick = () => this.handleTabSwitch(tabName[1]);
      }
    });
  }

  async handleRouteSelection(routeId) {
    if (app && app.routeController) {
      try {
        const route = await app.routeController.getRoute(routeId);
        if (route) {
          this.selectedRoute = route;
          this.view.selectRoute(routeId);
        } else {
          console.error("Route not found for ID:", routeId);
          this.view.showAlert(
            "Route not found. Please try again or add a new route.",
          );
          // Clear the visual selection since the route wasn't found
          this.selectedRoute = null;
        }
      } catch (error) {
        console.error("Error selecting route:", error);
        this.view.showAlert("Error loading route. Please try again.");
        this.selectedRoute = null;
      }
    } else {
      console.error("App or routeController not available");
      this.view.showAlert("Unable to select route. Please refresh the page.");
      this.selectedRoute = null;
    }
  }

  handleResultSelection(success) {
    this.selectedResult = success;
    this.view.selectResult(success);
  }

  async handleTabSwitch(tabName) {
    this.view.switchTab(tabName);

    if (tabName === "log") {
      await this.loadRouteSelector();
    } else if (tabName === "sessions") {
      this.refreshSessionsView();
    } else if (tabName === "stats") {
      this.refreshStatsView();
    } else if (tabName === "routes" && app && app.routeController) {
      app.routeController.handleRouteTabSwitch();
    }
  }

  logAttempt() {
    if (!this.selectedRoute || this.selectedResult === null) {
      this.view.showAlert("Please select a route and result");
      return;
    }

    try {
      if (!this.model.getCurrentSession()) {
        this.startNewSession();
      }

      const formData = this.view.getFormData();
      const attemptData = {
        routeId: this.selectedRoute.id,
        route: this.selectedRoute, // Store the full route object
        success: this.selectedResult,
        notes: formData.notes,
      };

      this.model.addAttemptToCurrentSession(attemptData);
      this.model.saveDraft(); // Auto-save draft after adding attempt
      this.refreshCurrentSessionView();
      this.clearAttemptForm();
    } catch (error) {
      this.view.showAlert(error.message);
    }
  }

  startNewSession() {
    const formData = this.view.getFormData();

    try {
      this.model.startNewSession({
        date: formData.sessionDate,
        gym: formData.gymName,
      });
      this.model.saveDraft(); // Auto-save draft when session starts
      this.view.showCurrentSession();
    } catch (error) {
      this.view.showAlert(error.message);
      throw error;
    }
  }

  finishSession() {
    try {
      this.model.finishCurrentSession();
      this.view.hideCurrentSession();
      this.refreshViews();
    } catch (error) {
      this.view.showAlert(error.message);
    }
  }

  clearAttemptForm() {
    this.view.clearAttemptForm();
    this.selectedRoute = null;
    this.selectedResult = null;
  }

  refreshCurrentSessionView() {
    const currentSession = this.model.getCurrentSession();
    if (currentSession) {
      this.view.renderCurrentSessionAttempts(currentSession.attempts);
    }
  }

  refreshSessionsView() {
    const sessions = this.model.getSessions();
    this.view.renderSessions(sessions);
  }

  refreshStatsView() {
    const stats = this.model.getOverallStats();
    const colorStats = this.model.getColorStats();
    this.view.renderStats(stats, colorStats);

    const sessions = this.model.getSessions();
    this.view.renderProgressChart(sessions);
  }

  async refreshViews() {
    this.refreshSessionsView();
    this.refreshStatsView();
    await this.loadRouteSelector();
  }

  async loadRouteSelector() {
    if (app && app.routeController) {
      try {
        const routes = await app.routeModel.getAllRoutes();
        const routesWithUrls = routes.map((route) => ({
          ...route,
          imageUrl: app.routeModel.createImageURL(route),
        }));
        this.view.renderRouteSelector(routesWithUrls);
      } catch (error) {
        console.error("Error loading route selector:", error);
      }
    }
  }

  // Draft management methods

  checkForDraft() {
    if (this.model.hasDraft()) {
      const currentSession = this.model.getCurrentSession();
      if (currentSession) {
        this.view.showCurrentSession();
        this.refreshCurrentSessionView();
      }
    }
  }

  clearSession() {
    // Ask for confirmation before clearing
    if (
      !confirm(
        "Are you sure you want to clear the current session? All unsaved attempts will be lost.",
      )
    ) {
      return;
    }

    try {
      this.model.deleteDraft();
      this.model.currentSession = null;
      this.view.hideCurrentSession();
      this.clearAttemptForm();
    } catch (error) {
      this.view.showAlert("Error clearing session: " + error.message);
    }
  }
}
