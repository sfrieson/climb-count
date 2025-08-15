import { dialogUtils } from "../utils/DialogUtils.js";

export class ClimbController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.selectedRoute = null;
    this.selectedResult = null;
    this.routeController = null; // Will be set by main.js

    this.initializeApp();
  }

  async initializeApp() {
    this.view.setCurrentDateTime();
    this.setupEventListeners();
    await this.refreshViews();
    await this.checkForDraft();

    // Note: Route loading will be handled after route controller is set in main.js
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

      // Handle edit attempt button clicks
      if (e.target.classList.contains("edit-attempt-btn")) {
        const attemptId = parseInt(e.target.dataset.attemptId);
        this.handleEditAttempt(attemptId);
      }

      // Handle delete attempt button clicks
      if (e.target.classList.contains("delete-attempt-btn")) {
        const attemptId = parseInt(e.target.dataset.attemptId);
        this.handleDeleteAttempt(attemptId);
      }

      // Handle timeline attempt clicks (for completed sessions)
      if (e.target.classList.contains("timeline-attempt")) {
        const sessionId = parseInt(e.target.dataset.sessionId);
        const attemptId = parseInt(e.target.dataset.attemptId);
        this.handleEditAttemptFromSession(sessionId, attemptId);
      }
    });

    // Gym dropdown event listener
    const gymSelect = document.getElementById("gym-select");
    if (gymSelect) {
      gymSelect.addEventListener("change", () => this.handleGymChange());
    }

    document
      .getElementById("success-btn")
      .addEventListener("click", () => this.handleResultSelection(true));
    document
      .getElementById("failure-btn")
      .addEventListener("click", () => this.handleResultSelection(false));

    const logAttemptBtn = document.getElementById("log-attempt-btn");
    if (logAttemptBtn) {
      logAttemptBtn.onclick = async () => await this.logAttempt();
    }

    const finishSessionBtn = document.querySelector(
      "[onclick=\"finishSession()\"]"
    );
    if (finishSessionBtn) {
      finishSessionBtn.onclick = async () => await this.finishSession();
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
    if (this.routeController) {
      try {
        const route = await this.routeController.getRoute(routeId);
        if (route) {
          this.selectedRoute = route;
          this.view.selectRoute(routeId);
        } else {
          console.error("Route not found for ID:", routeId);
          this.view.showAlert(
            "Route not found. Please try again or add a new route."
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
      console.error("RouteController not available");
      this.view.showAlert("Unable to select route. Please refresh the page.");
      this.selectedRoute = null;
    }
  }

  handleResultSelection(success) {
    this.selectedResult = success;
    this.view.selectResult(success);
  }

  async handleGymChange() {
    await this.loadRouteSelector();
  }

  async handleTabSwitch(tabName) {
    this.view.switchTab(tabName);

    if (tabName === "log") {
      await this.loadRouteSelector();
    } else if (tabName === "sessions") {
      this.refreshSessionsView();
    } else if (tabName === "stats") {
      this.refreshStatsView();
    } else if (tabName === "routes" && this.routeController) {
      this.routeController.handleRouteTabSwitch();
    }
  }

  async logAttempt() {
    if (!this.selectedRoute || this.selectedResult === null) {
      this.view.showAlert("Please select a route and result");
      return;
    }

    try {
      if (!this.model.getCurrentSession()) {
        await this.startNewSession();
      }

      const formData = this.view.getFormData();
      const attemptData = {
        routeId: this.selectedRoute.id,
        route: this.selectedRoute, // Store the full route object
        success: this.selectedResult,
        notes: formData.notes,
      };

      await this.model.addAttemptToCurrentSession(attemptData);
      this.refreshCurrentSessionView();
      this.clearAttemptForm();
    } catch (error) {
      this.view.showAlert(error.message);
    }
  }

  async startNewSession() {
    const formData = this.view.getFormData();

    if (!this.selectedRoute) {
      throw new Error("Please select a route before starting a session");
    }

    try {
      this.model.startNewSession({
        date: formData.sessionDate,
        gym: this.selectedRoute.gym || "Unknown Gym",
      });
      await this.model.saveDraft(); // Auto-save draft when session starts
      this.view.showCurrentSession();
    } catch (error) {
      this.view.showAlert(error.message);
      throw error;
    }
  }

  async finishSession() {
    try {
      await this.model.finishCurrentSession();
      this.view.hideCurrentSession();
      await this.refreshViews();
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
    if (this.routeController) {
      try {
        const routes = await this.routeController.model.getAllRoutes();
        const routesWithUrls = routes.map((route) => ({
          ...route,
          imageUrl: this.routeController.model.createImageURL(route),
        }));

        // Populate gym dropdown
        this.view.populateGymDropdown(routesWithUrls);

        // Get selected gym from dropdown
        const selectedGym = document.getElementById("gym-select").value;

        // Render route selector with filtered routes
        this.view.renderRouteSelector(routesWithUrls, selectedGym);
      } catch (error) {
        console.error("Error loading route selector:", error);
      }
    }
  }

  // Draft management methods

  async checkForDraft() {
    if (await this.model.hasDraft()) {
      const currentSession = this.model.getCurrentSession();
      if (currentSession) {
        this.view.showCurrentSession();
        this.refreshCurrentSessionView();
      }
    }
  }

  async clearSession() {
    // Ask for confirmation before clearing
    if (
      !(await dialogUtils.showConfirm(
        "Are you sure you want to clear the current session? All unsaved attempts will be lost.",
        "Clear Session"
      ))
    ) {
      return;
    }

    try {
      await this.model.deleteDraft();
      this.model.currentSession = null;
      this.view.hideCurrentSession();
      this.clearAttemptForm();
    } catch (error) {
      this.view.showAlert("Error clearing session: " + error.message);
    }
  }

  /**
   * Handle editing an attempt from the current session
   */
  async handleEditAttempt(attemptId) {
    const currentSession = this.model.getCurrentSession();
    if (!currentSession) {
      this.view.showAlert("No active session found");
      return;
    }

    const attempt = currentSession.attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      this.view.showAlert("Attempt not found");
      return;
    }

    await this.showEditAttemptModal(attempt, currentSession.id);
  }

  /**
   * Handle editing an attempt from a completed session
   */
  async handleEditAttemptFromSession(sessionId, attemptId) {
    const session = this.model.getSessions().find((s) => s.id === sessionId);
    if (!session) {
      this.view.showAlert("Session not found");
      return;
    }

    const attempt = session.attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      this.view.showAlert("Attempt not found");
      return;
    }

    await this.showEditAttemptModal(attempt, sessionId);
  }

  /**
   * Handle deleting an attempt from the current session
   */
  async handleDeleteAttempt(attemptId) {
    const currentSession = this.model.getCurrentSession();
    if (!currentSession) {
      this.view.showAlert("No active session found");
      return;
    }

    if (
      confirm(
        "Are you sure you want to delete this attempt? This action cannot be undone."
      )
    ) {
      try {
        await this.model.deleteAttemptFromCurrentSession(attemptId);
        this.refreshCurrentSessionView();
      } catch (error) {
        this.view.showAlert("Error deleting attempt: " + error.message);
      }
    }
  }

  /**
   * Show the edit attempt modal
   */
  async showEditAttemptModal(attempt, sessionId) {
    if (!this.routeController) {
      this.view.showAlert("Route controller not available");
      return;
    }

    try {
      const routes = await this.routeController.model.getAllRoutes();

      this.view.showEditAttemptModal(
        attempt,
        routes,
        async (updatedData) => {
          try {
            await this.model.updateAttempt(sessionId, attempt.id, updatedData);
            this.refreshCurrentSessionView();
            this.refreshSessionsView();
            this.refreshStatsView();
          } catch (error) {
            this.view.showAlert("Error updating attempt: " + error.message);
          }
        },
        async () => {
          try {
            await this.model.deleteAttempt(sessionId, attempt.id);
            this.refreshCurrentSessionView();
            this.refreshSessionsView();
            this.refreshStatsView();
          } catch (error) {
            this.view.showAlert("Error deleting attempt: " + error.message);
          }
        }
      );
    } catch (error) {
      this.view.showAlert("Error loading routes: " + error.message);
    }
  }
}
