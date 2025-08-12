class ClimbController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.selectedColor = null;
    this.selectedResult = null;

    this.initializeApp();
  }

  initializeApp() {
    this.view.setCurrentDateTime();
    this.setupEventListeners();
    this.refreshViews();
    this.checkForDraft();
  }

  setupEventListeners() {
    const colorButtons = document.querySelectorAll(".color-btn");
    colorButtons.forEach((btn) => {
      btn.addEventListener("click", () =>
        this.handleColorSelection(btn.dataset.color)
      );
    });

    document
      .getElementById("success-btn")
      .addEventListener("click", () => this.handleResultSelection(true));
    document
      .getElementById("failure-btn")
      .addEventListener("click", () => this.handleResultSelection(false));

    const logAttemptBtn = document.getElementById('log-attempt-btn');
    if (logAttemptBtn) {
      logAttemptBtn.onclick = () => this.logAttempt();
    }

    const finishSessionBtn = document.querySelector(
      '[onclick="finishSession()"]'
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

  handleColorSelection(color) {
    this.selectedColor = color;
    this.view.selectColor(color);
  }

  handleResultSelection(success) {
    this.selectedResult = success;
    this.view.selectResult(success);
  }

  handleTabSwitch(tabName) {
    this.view.switchTab(tabName);

    if (tabName === "sessions") {
      this.refreshSessionsView();
    } else if (tabName === "stats") {
      this.refreshStatsView();
    }
  }

  logAttempt() {
    if (!this.selectedColor || this.selectedResult === null) {
      this.view.showAlert("Please select a route color and result");
      return;
    }

    try {
      if (!this.model.getCurrentSession()) {
        this.startNewSession();
      }

      const formData = this.view.getFormData();
      const attemptData = {
        color: this.selectedColor,
        success: this.selectedResult,
        routeId: formData.routeId,
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
    this.selectedColor = null;
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

  refreshViews() {
    this.refreshSessionsView();
    this.refreshStatsView();
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
        "Are you sure you want to clear the current session? All unsaved attempts will be lost."
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
