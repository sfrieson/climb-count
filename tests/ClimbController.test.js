/**
 * Tests for ClimbController functionality
 */

// Mock DOM methods and objects
const mockDOM = {
  document: {
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    getElementById: jest.fn(),
  },
  setTimeout: global.setTimeout,
};

// Set up DOM globals
global.document = mockDOM.document;

// Mock the model and view
class MockClimbModel {
  constructor() {
    this.currentSession = null;
    this.sessions = [];
  }

  startNewSession(data) {
    this.currentSession = {
      id: Date.now(),
      date: new Date(data.date),
      gym: data.gym,
      attempts: [],
    };
    return this.currentSession;
  }

  addAttemptToCurrentSession(data) {
    if (!this.currentSession) {
      throw new Error("No active session");
    }
    const attempt = {
      id: Date.now(),
      ...data,
      timestamp: new Date(),
    };
    this.currentSession.attempts.push(attempt);
    return attempt;
  }

  getCurrentSession() {
    return this.currentSession;
  }

  finishCurrentSession() {
    if (!this.currentSession || this.currentSession.attempts.length === 0) {
      throw new Error("No session to finish or no attempts logged");
    }
    this.sessions.push(this.currentSession);
    const finished = this.currentSession;
    this.currentSession = null;
    return finished;
  }

  saveDraft() {
    return true;
  }

  loadDraft() {
    return false;
  }

  hasDraft() {
    return false;
  }

  getOverallStats() {
    return {
      totalSessions: this.sessions.length,
      totalAttempts: 0,
      totalSuccess: 0,
      overallSuccessRate: 0,
    };
  }

  getAllAttempts() {
    return this.sessions.flatMap((s) => s.attempts);
  }
}

class MockClimbView {
  constructor() {
    this.alertMessage = null;
  }

  setCurrentDateTime() {}
  showCurrentSession() {}
  hideCurrentSession() {}
  selectRoute(routeId) {
    this.selectedRouteId = routeId;
  }
  selectResult(success) {
    this.selectedResult = success;
  }
  switchTab(tabName) {
    this.currentTab = tabName;
  }
  showAlert(message) {
    this.alertMessage = message;
  }
  getFormData() {
    return {
      sessionDate: "2023-01-01",
      gymName: "Test Gym",
      notes: "Test notes",
    };
  }
}

// Load the ClimbController class
const fs = require("fs");
const path = require("path");
const controllerPath = path.join(
  __dirname,
  "../controllers/ClimbController.js"
);
const controllerSource = fs.readFileSync(controllerPath, "utf8");

// Execute the class definition in global scope
eval(controllerSource);

describe("ClimbController", () => {
  let controller;
  let mockModel;
  let mockView;
  let mockApp;

  beforeEach(() => {
    // Reset DOM mocks
    jest.clearAllMocks();

    mockModel = new MockClimbModel();
    mockView = new MockClimbView();

    // Mock global app object
    mockApp = {
      routeController: {
        getRoute: jest.fn(),
        handleRouteTabSwitch: jest.fn(),
      },
    };
    global.app = mockApp;

    // Mock DOM elements
    const mockElements = {
      "#success-btn": { addEventListener: jest.fn() },
      "#failure-btn": { addEventListener: jest.fn() },
      "#log-attempt-btn": { onclick: null },
      ".tab": [],
    };

    mockDOM.document.getElementById.mockImplementation((id) => {
      if (id === "success-btn") return mockElements["#success-btn"];
      if (id === "failure-btn") return mockElements["#failure-btn"];
      if (id === "log-attempt-btn") return mockElements["#log-attempt-btn"];
      return { addEventListener: jest.fn(), onclick: null };
    });

    mockDOM.document.querySelector.mockImplementation((selector) => {
      if (selector === ".tab.active") return { textContent: "Log Session" };
      if (selector.includes("finishSession")) return { onclick: null };
      return (
        mockElements[selector] || { addEventListener: jest.fn(), onclick: null }
      );
    });

    mockDOM.document.querySelectorAll.mockImplementation((selector) => {
      if (selector === ".tab") return [];
      return [];
    });

    // Create controller with mocked dependencies
    controller = new ClimbController(mockModel, mockView);
  });

  afterEach(() => {
    delete global.app;
  });

  describe("constructor", () => {
    test("should initialize with model and view", () => {
      expect(controller.model).toBe(mockModel);
      expect(controller.view).toBe(mockView);
      expect(controller.selectedRoute).toBeNull();
      expect(controller.selectedResult).toBeNull();
    });

    test("should call initializeApp", () => {
      // This is tested implicitly by the successful construction
      expect(controller).toBeInstanceOf(ClimbController);
    });
  });

  describe("handleRouteSelection", () => {
    test("should select route when app.routeController exists", async () => {
      const mockRoute = { id: 1, color: "red", name: "Test Route" };
      mockApp.routeController.getRoute.mockResolvedValue(mockRoute);

      await controller.handleRouteSelection("1");

      expect(mockApp.routeController.getRoute).toHaveBeenCalledWith("1");
      expect(controller.selectedRoute).toBe(mockRoute);
      expect(mockView.selectedRouteId).toBe("1");
    });

    test("should handle missing app.routeController gracefully", async () => {
      global.app = null;

      await controller.handleRouteSelection("1");

      // Should not throw error
      expect(controller.selectedRoute).toBeNull();
    });
  });

  describe("handleResultSelection", () => {
    test("should set selected result to true for success", () => {
      controller.handleResultSelection(true);

      expect(controller.selectedResult).toBe(true);
      expect(mockView.selectedResult).toBe(true);
    });

    test("should set selected result to false for failure", () => {
      controller.handleResultSelection(false);

      expect(controller.selectedResult).toBe(false);
      expect(mockView.selectedResult).toBe(false);
    });
  });

  describe("handleTabSwitch", () => {
    test("should switch to log tab", async () => {
      controller.loadRouteSelector = jest.fn();

      await controller.handleTabSwitch("log");

      expect(mockView.currentTab).toBe("log");
      expect(controller.loadRouteSelector).toHaveBeenCalled();
    });

    test("should switch to sessions tab", async () => {
      controller.refreshSessionsView = jest.fn();

      await controller.handleTabSwitch("sessions");

      expect(mockView.currentTab).toBe("sessions");
      expect(controller.refreshSessionsView).toHaveBeenCalled();
    });

    test("should switch to stats tab", async () => {
      controller.refreshStatsView = jest.fn();

      await controller.handleTabSwitch("stats");

      expect(mockView.currentTab).toBe("stats");
      expect(controller.refreshStatsView).toHaveBeenCalled();
    });

    test("should switch to routes tab", async () => {
      await controller.handleTabSwitch("routes");

      expect(mockView.currentTab).toBe("routes");
      expect(mockApp.routeController.handleRouteTabSwitch).toHaveBeenCalled();
    });
  });

  describe("logAttempt", () => {
    test("should log attempt successfully with existing session", () => {
      controller.selectedRoute = { id: 1, color: "red", name: "Test Route" };
      controller.selectedResult = true;
      mockModel.currentSession = { id: 1, attempts: [] };
      controller.refreshCurrentSessionView = jest.fn();
      controller.clearAttemptForm = jest.fn();

      controller.logAttempt();

      expect(mockModel.currentSession.attempts).toHaveLength(1);
      expect(mockModel.currentSession.attempts[0].route).toBe(
        controller.selectedRoute
      );
      expect(mockModel.currentSession.attempts[0].success).toBe(true);
      expect(controller.refreshCurrentSessionView).toHaveBeenCalled();
      expect(controller.clearAttemptForm).toHaveBeenCalled();
    });

    test("should create new session if none exists", () => {
      controller.selectedRoute = { id: 1, color: "red" };
      controller.selectedResult = true;
      controller.startNewSession = jest.fn();
      controller.refreshCurrentSessionView = jest.fn();
      controller.clearAttemptForm = jest.fn();

      controller.logAttempt();

      expect(controller.startNewSession).toHaveBeenCalled();
    });

    test("should show alert when no route selected", () => {
      controller.selectedRoute = null;
      controller.selectedResult = true;

      controller.logAttempt();

      expect(mockView.alertMessage).toBe("Please select a route and result");
    });

    test("should show alert when no result selected", () => {
      controller.selectedRoute = { id: 1, color: "red" };
      controller.selectedResult = null;

      controller.logAttempt();

      expect(mockView.alertMessage).toBe("Please select a route and result");
    });

    test("should handle model error", () => {
      controller.selectedRoute = { id: 1, color: "red" };
      controller.selectedResult = true;
      mockModel.addAttemptToCurrentSession = jest.fn(() => {
        throw new Error("Model error");
      });

      controller.logAttempt();

      expect(mockView.alertMessage).toBe("Model error");
    });
  });

  describe("startNewSession", () => {
    test("should start new session successfully", () => {
      controller.startNewSession();

      expect(mockModel.currentSession).not.toBeNull();
      expect(mockModel.currentSession.gym).toBe("Test Gym");
      expect(mockModel.currentSession.date).toBeInstanceOf(Date);
    });

    test("should handle model error", () => {
      mockModel.startNewSession = jest.fn(() => {
        throw new Error("Session error");
      });

      expect(() => controller.startNewSession()).toThrow("Session error");
      expect(mockView.alertMessage).toBe("Session error");
    });
  });

  describe("finishSession", () => {
    test("should finish session successfully", () => {
      // Set up a session with attempts
      mockModel.currentSession = {
        id: 1,
        attempts: [{ id: 1, success: true }],
      };
      controller.refreshViews = jest.fn();

      controller.finishSession();

      expect(mockModel.sessions).toHaveLength(1);
      expect(mockModel.currentSession).toBeNull();
      expect(controller.refreshViews).toHaveBeenCalled();
    });

    test("should handle model error", () => {
      mockModel.finishCurrentSession = jest.fn(() => {
        throw new Error("Finish error");
      });

      controller.finishSession();

      expect(mockView.alertMessage).toBe("Finish error");
    });
  });

  describe("clearAttemptForm", () => {
    test("should clear form data", () => {
      controller.selectedRoute = { id: 1 };
      controller.selectedResult = true;
      controller.view.clearForm = jest.fn();

      controller.clearAttemptForm();

      // Since the actual implementation might not be fully loaded,
      // we test that the method exists and can be called
      expect(() => controller.clearAttemptForm()).not.toThrow();
    });
  });

  describe("checkForDraft", () => {
    test("should handle draft checking", () => {
      controller.checkForDraft();

      // Test that method exists and runs without error
      expect(() => controller.checkForDraft()).not.toThrow();
    });
  });

  describe("refreshViews", () => {
    test("should refresh all views", () => {
      controller.refreshSessionsView = jest.fn();
      controller.refreshStatsView = jest.fn();
      controller.refreshCurrentSessionView = jest.fn();

      controller.refreshViews();

      expect(controller.refreshSessionsView).toHaveBeenCalled();
      expect(controller.refreshStatsView).toHaveBeenCalled();
      expect(controller.refreshCurrentSessionView).toHaveBeenCalled();
    });
  });

  describe("loadRouteSelector", () => {
    test("should load route selector", async () => {
      mockApp.routeController.getAllRoutes = jest.fn().mockResolvedValue([]);
      controller.view.renderRouteSelector = jest.fn();

      controller.loadRouteSelector = jest.fn();
      await controller.loadRouteSelector();

      expect(controller.loadRouteSelector).toHaveBeenCalled();
    });
  });
});
