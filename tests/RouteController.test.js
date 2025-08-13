/**
 * Tests for RouteController functionality
 */

// Mock DOM and FileReader
const mockDOM = {
  document: {
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    getElementById: jest.fn(),
  },
};

global.document = mockDOM.document;

// Mock the model and view
class MockRouteModel {
  constructor() {
    this.routes = [];
  }

  async saveRoute(routeData) {
    const route = {
      id: Date.now(),
      ...routeData,
      createdAt: new Date(),
    };
    this.routes.push(route);
    return route;
  }

  async getAllRoutes() {
    return [...this.routes];
  }

  async getRouteById(id) {
    return this.routes.find((route) => route.id === parseInt(id));
  }

  async deleteRoute(id) {
    const index = this.routes.findIndex((route) => route.id === parseInt(id));
    if (index > -1) {
      this.routes.splice(index, 1);
      return true;
    }
    return false;
  }

  async getRoutesByColor(color) {
    return this.routes.filter((route) => route.color === color);
  }

  async fileToArrayBuffer(file) {
    return new ArrayBuffer(8);
  }

  createImageURL(route) {
    return route.image ? "mock-image-url" : null;
  }
}

class MockRouteView {
  constructor() {
    this.alertMessage = null;
    this.imagePreviewShown = false;
  }

  showAlert(message) {
    this.alertMessage = message;
  }

  showImagePreview(file) {
    this.imagePreviewShown = true;
    this.previewFile = file;
  }

  getFormData() {
    return {
      routeName: "Test Route",
      gym: "Test Gym",
      notes: "Test notes",
    };
  }

  clearForm() {
    // Mock form clearing
  }

  renderRoutes(routes) {
    this.renderedRoutes = routes;
  }

  setColorSelection(color) {
    this.selectedColor = color;
  }
}

// Load the RouteController class
const fs = require("fs");
const path = require("path");
const controllerPath = path.join(
  __dirname,
  "../controllers/RouteController.js",
);
const controllerSource = fs.readFileSync(controllerPath, "utf8");

// Execute the class definition in global scope
eval(controllerSource);

describe("RouteController", () => {
  let controller;
  let mockModel;
  let mockView;
  let mockApp;

  beforeEach(() => {
    jest.clearAllMocks();

    mockModel = new MockRouteModel();
    mockView = new MockRouteView();

    // Mock global app object
    mockApp = {
      climbController: {
        loadRouteSelector: jest.fn(),
      },
    };
    global.app = mockApp;

    // Mock DOM elements
    const mockImageInput = {
      addEventListener: jest.fn(),
      files: [],
    };

    const mockColorButtons = [
      { dataset: { color: "red" }, addEventListener: jest.fn() },
      { dataset: { color: "blue" }, addEventListener: jest.fn() },
    ];

    const mockSaveButton = {
      addEventListener: jest.fn(),
    };

    mockDOM.document.getElementById.mockImplementation((id) => {
      if (id === "route-image") return mockImageInput;
      if (id === "save-route-btn") return mockSaveButton;
      return { addEventListener: jest.fn() };
    });

    mockDOM.document.querySelectorAll.mockImplementation((selector) => {
      if (selector === "#route-colors-add .color-btn") return mockColorButtons;
      return [];
    });

    // Create controller
    controller = new RouteController(mockModel, mockView);
  });

  afterEach(() => {
    delete global.app;
  });

  describe("constructor", () => {
    test("should initialize with model and view", () => {
      expect(controller.model).toBe(mockModel);
      expect(controller.view).toBe(mockView);
      expect(controller.selectedColor).toBeNull();
    });

    test("should call initializeController", () => {
      expect(controller).toBeInstanceOf(RouteController);
    });
  });

  describe("handleRouteColorSelection", () => {
    test("should set selected color", () => {
      controller.handleRouteColorSelection("red");

      expect(controller.selectedColor).toBe("red");
      expect(mockView.selectedColor).toBe("red");
    });

    test("should handle multiple color selections", () => {
      controller.handleRouteColorSelection("blue");
      expect(controller.selectedColor).toBe("blue");

      controller.handleRouteColorSelection("green");
      expect(controller.selectedColor).toBe("green");
    });
  });

  describe("saveRoute", () => {
    beforeEach(() => {
      controller.selectedColor = "red";

      // Mock file input
      const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
      const mockImageInput = { files: [mockFile] };
      mockDOM.document.getElementById.mockImplementation((id) => {
        if (id === "route-image") return mockImageInput;
        return { addEventListener: jest.fn() };
      });
    });

    test("should save route successfully with all data", async () => {
      await controller.saveRoute();

      expect(mockModel.routes).toHaveLength(1);
      const savedRoute = mockModel.routes[0];
      expect(savedRoute.name).toBe("Test Route");
      expect(savedRoute.color).toBe("red");
      expect(savedRoute.gym).toBe("Test Gym");
      expect(savedRoute.notes).toBe("Test notes");
      expect(savedRoute.image).toBeInstanceOf(ArrayBuffer);
    });

    test("should show alert when color not selected", async () => {
      controller.selectedColor = null;

      await controller.saveRoute();

      expect(mockView.alertMessage).toBe("Please select a color");
      expect(mockModel.routes).toHaveLength(0);
    });

    test("should save route without image", async () => {
      const mockImageInput = { files: [] };
      mockDOM.document.getElementById.mockImplementation((id) => {
        if (id === "route-image") return mockImageInput;
        return { addEventListener: jest.fn() };
      });

      await controller.saveRoute();

      expect(mockModel.routes).toHaveLength(1);
      const savedRoute = mockModel.routes[0];
      expect(savedRoute.image).toBeNull();
    });

    test("should handle model save error", async () => {
      mockModel.saveRoute = jest
        .fn()
        .mockRejectedValue(new Error("Save failed"));

      await controller.saveRoute();

      expect(mockView.alertMessage).toBe("Save failed");
    });

    test("should reload routes after successful save", async () => {
      controller.loadRoutes = jest.fn();
      controller.clearForm = jest.fn();

      await controller.saveRoute();

      expect(controller.loadRoutes).toHaveBeenCalled();
      expect(controller.clearForm).toHaveBeenCalled();
    });
  });

  describe("loadRoutes", () => {
    test("should load and render routes", async () => {
      const testRoutes = [
        { id: 1, name: "Route 1", color: "red" },
        { id: 2, name: "Route 2", color: "blue" },
      ];
      mockModel.routes = testRoutes;

      await controller.loadRoutes();

      expect(mockView.renderedRoutes).toEqual(testRoutes);
    });

    test("should handle load error", async () => {
      mockModel.getAllRoutes = jest
        .fn()
        .mockRejectedValue(new Error("Load failed"));

      await controller.loadRoutes();

      expect(mockView.alertMessage).toBe("Failed to load routes: Load failed");
    });
  });

  describe("getRoute", () => {
    test("should return route by ID", async () => {
      const testRoute = { id: 1, name: "Test Route", color: "red" };
      mockModel.routes = [testRoute];

      const result = await controller.getRoute(1);

      expect(result).toEqual(testRoute);
    });

    test("should return undefined for non-existent route", async () => {
      const result = await controller.getRoute(999);

      expect(result).toBeUndefined();
    });
  });

  describe("getAllRoutes", () => {
    test("should return all routes", async () => {
      const testRoutes = [
        { id: 1, name: "Route 1" },
        { id: 2, name: "Route 2" },
      ];
      mockModel.routes = testRoutes;

      const result = await controller.getAllRoutes();

      expect(result).toEqual(testRoutes);
    });
  });

  describe("deleteRoute", () => {
    test("should delete route successfully", async () => {
      const testRoute = { id: 1, name: "Test Route", color: "red" };
      mockModel.routes = [testRoute];
      controller.loadRoutes = jest.fn();

      await controller.deleteRoute(1);

      expect(mockModel.routes).toHaveLength(0);
      expect(controller.loadRoutes).toHaveBeenCalled();
    });

    test("should handle delete error", async () => {
      mockModel.deleteRoute = jest
        .fn()
        .mockRejectedValue(new Error("Delete failed"));

      await controller.deleteRoute(1);

      expect(mockView.alertMessage).toBe(
        "Failed to delete route: Delete failed",
      );
    });
  });

  describe("handleRouteTabSwitch", () => {
    test("should load routes when switching to routes tab", () => {
      controller.loadRoutes = jest.fn();

      controller.handleRouteTabSwitch();

      expect(controller.loadRoutes).toHaveBeenCalled();
    });
  });

  describe("clearForm", () => {
    test("should clear form and reset selections", () => {
      controller.selectedColor = "red";

      controller.clearForm();

      expect(controller.selectedColor).toBeNull();
    });
  });

  describe("setupEventListeners", () => {
    test("should set up image input event listener", () => {
      const mockImageInput = {
        addEventListener: jest.fn(),
      };

      mockDOM.document.getElementById.mockReturnValue(mockImageInput);

      // Create new controller to test event listener setup
      new RouteController(mockModel, mockView);

      expect(mockImageInput.addEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
    });

    test("should handle image input change event", () => {
      const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
      const mockEvent = {
        target: { files: [mockFile] },
      };

      const mockImageInput = {
        addEventListener: jest.fn((event, handler) => {
          if (event === "change") {
            // Simulate the event being triggered
            handler(mockEvent);
          }
        }),
      };

      mockDOM.document.getElementById.mockImplementation((id) => {
        if (id === "route-image") return mockImageInput;
        return { addEventListener: jest.fn() };
      });

      new RouteController(mockModel, mockView);

      expect(mockView.imagePreviewShown).toBe(true);
      expect(mockView.previewFile).toBe(mockFile);
    });

    test("should set up color button event listeners", () => {
      const mockColorButtons = [
        { dataset: { color: "red" }, addEventListener: jest.fn() },
        { dataset: { color: "blue" }, addEventListener: jest.fn() },
      ];

      mockDOM.document.querySelectorAll.mockReturnValue(mockColorButtons);

      new RouteController(mockModel, mockView);

      mockColorButtons.forEach((btn) => {
        expect(btn.addEventListener).toHaveBeenCalledWith(
          "click",
          expect.any(Function),
        );
      });
    });
  });

  describe("getRoutesByColor", () => {
    test("should return routes filtered by color", async () => {
      const redRoute = { id: 1, color: "red", name: "Red Route" };
      const blueRoute = { id: 2, color: "blue", name: "Blue Route" };
      mockModel.routes = [redRoute, blueRoute];

      const result = await controller.getRoutesByColor("red");

      expect(result).toEqual([redRoute]);
    });
  });

  describe("initializeController", () => {
    test("should set up event listeners and load routes", () => {
      const controller = new RouteController(mockModel, mockView);
      controller.setupEventListeners = jest.fn();
      controller.loadRoutes = jest.fn();

      controller.initializeController();

      expect(controller.setupEventListeners).toHaveBeenCalled();
      expect(controller.loadRoutes).toHaveBeenCalled();
    });
  });
});
