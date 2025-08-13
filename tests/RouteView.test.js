/**
 * Tests for RouteView functionality
 */

// Mock DOM methods
const mockDOM = {
  document: {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({
      className: "",
      innerHTML: "",
      style: {},
      appendChild: jest.fn(),
      src: "",
      dataset: {},
    })),
  },
};

global.document = mockDOM.document;

// Load the RouteView class
const fs = require("fs");
const path = require("path");
const viewPath = path.join(__dirname, "../views/RouteView.js");
const viewSource = fs.readFileSync(viewPath, "utf8");

// Execute the class definition in global scope
eval(viewSource);

describe("RouteView", () => {
  let view;
  let mockElements;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DOM elements
    mockElements = {
      "image-preview": {
        style: { display: "none" },
      },
      "preview-img": {
        src: "",
      },
      "route-name": {
        value: "",
      },
      "route-gym": {
        value: "",
      },
      "route-notes": {
        value: "",
      },
      "route-image": {
        value: "",
        files: [],
      },
      "routes-container": {
        innerHTML: "",
        appendChild: jest.fn(),
      },
    };

    mockDOM.document.getElementById.mockImplementation((id) => {
      return (
        mockElements[id] || {
          value: "",
          style: {},
          innerHTML: "",
          appendChild: jest.fn(),
          classList: {
            add: jest.fn(),
            remove: jest.fn(),
          },
        }
      );
    });

    view = new RouteView();
  });

  describe("constructor", () => {
    test("should initialize with color map", () => {
      expect(view.colorMap).toBeDefined();
      expect(view.colorMap.green).toBe("#4CAF50");
      expect(view.colorMap.red).toBe("#F44336");
      expect(view.colorMap.yellow).toBe("#FFC107");
    });
  });

  describe("showImagePreview", () => {
    test("should show image preview when file is provided", () => {
      const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });

      // Mock FileReader
      const mockFileReader = {
        onload: null,
        readAsDataURL: jest.fn(function () {
          // Simulate successful file read
          this.onload({ target: { result: "data:image/jpeg;base64,test" } });
        }),
      };

      global.FileReader = jest.fn(() => mockFileReader);

      view.showImagePreview(mockFile);

      expect(mockElements["preview-img"].src).toBe(
        "data:image/jpeg;base64,test",
      );
      expect(mockElements["image-preview"].style.display).toBe("block");
    });

    test("should hide preview when no file provided", () => {
      view.showImagePreview(null);

      expect(mockElements["image-preview"].style.display).toBe("none");
    });

    test("should hide preview when undefined file provided", () => {
      view.showImagePreview(undefined);

      expect(mockElements["image-preview"].style.display).toBe("none");
    });
  });

  describe("selectRouteColor", () => {
    test("should select color and update UI", () => {
      const mockColorButtons = [
        { classList: { remove: jest.fn() } },
        { classList: { remove: jest.fn() } },
      ];

      const mockSelectedButton = {
        classList: { add: jest.fn() },
      };

      mockDOM.document.querySelectorAll.mockReturnValue(mockColorButtons);
      mockDOM.document.querySelector.mockReturnValue(mockSelectedButton);

      view.selectRouteColor("red");

      // Should remove selected class from all buttons
      expect(mockColorButtons[0].classList.remove).toHaveBeenCalledWith(
        "selected",
      );
      expect(mockColorButtons[1].classList.remove).toHaveBeenCalledWith(
        "selected",
      );

      // Should add selected class to specific button
      expect(mockSelectedButton.classList.add).toHaveBeenCalledWith("selected");
      expect(mockDOM.document.querySelector).toHaveBeenCalledWith(
        '#route-colors-add [data-color="red"]',
      );
    });
  });

  describe("getSelectedRouteColor", () => {
    test("should return selected color", () => {
      const mockSelectedButton = {
        dataset: { color: "blue" },
      };

      mockDOM.document.querySelector.mockReturnValue(mockSelectedButton);

      const color = view.getSelectedRouteColor();

      expect(color).toBe("blue");
      expect(mockDOM.document.querySelector).toHaveBeenCalledWith(
        "#route-colors-add .color-btn.selected",
      );
    });

    test("should return null when no color selected", () => {
      mockDOM.document.querySelector.mockReturnValue(null);

      const color = view.getSelectedRouteColor();

      expect(color).toBeNull();
    });
  });

  describe("getRouteFormData", () => {
    test("should return complete form data", () => {
      mockElements["route-name"].value = "Test Route";
      mockElements["route-gym"].value = "Test Gym";
      mockElements["route-notes"].value = "Test notes";
      mockElements["route-image"] = { files: [new File(["test"], "test.jpg")] };

      const formData = view.getRouteFormData();

      expect(formData).toEqual({
        image: expect.any(File),
        name: "Test Route",
        gym: "Test Gym",
        notes: "Test notes",
      });
    });

    test("should return empty values when elements not found", () => {
      mockDOM.document.getElementById.mockReturnValue({ value: "", files: [] });

      const formData = view.getRouteFormData();

      expect(formData.name).toBe("");
      expect(formData.gym).toBe("");
      expect(formData.notes).toBe("");
      expect(formData.image).toBeNull();
    });
  });

  describe("clearRouteForm", () => {
    test("should clear all form fields", () => {
      mockElements["route-name"].value = "Test Route";
      mockElements["route-gym"].value = "Test Gym";
      mockElements["route-notes"].value = "Test notes";
      mockElements["route-image"].value = "test.jpg";

      const mockColorButtons = [
        { classList: { remove: jest.fn() } },
        { classList: { remove: jest.fn() } },
      ];

      mockDOM.document.querySelectorAll.mockReturnValue(mockColorButtons);

      view.clearRouteForm();

      expect(mockElements["route-name"].value).toBe("");
      expect(mockElements["route-gym"].value).toBe("");
      expect(mockElements["route-notes"].value).toBe("");
      expect(mockElements["route-image"].value).toBe("");
      expect(mockElements["image-preview"].style.display).toBe("none");

      // Should remove selected class from color buttons
      expect(mockColorButtons[0].classList.remove).toHaveBeenCalledWith(
        "selected",
      );
      expect(mockColorButtons[1].classList.remove).toHaveBeenCalledWith(
        "selected",
      );
    });
  });

  describe("showAlert", () => {
    test("should show alert message", () => {
      global.alert = jest.fn();

      view.showAlert("Test alert");

      expect(global.alert).toHaveBeenCalledWith("Test alert");
    });
  });

  describe("renderRoutes", () => {
    test("should render routes in container", () => {
      const routes = [
        {
          id: 1,
          name: "Route 1",
          color: "red",
          gym: "Gym 1",
          createdAt: new Date("2023-01-01"),
        },
        {
          id: 2,
          name: "Route 2",
          color: "blue",
          gym: "Gym 2",
          createdAt: new Date("2023-01-02"),
        },
      ];

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      mockDOM.document.getElementById.mockImplementation((id) => {
        if (id === "routes-container") return mockContainer;
        return mockElements[id];
      });

      view.renderRoutes(routes);

      expect(mockContainer.innerHTML).toBe("");
      expect(mockContainer.appendChild).toHaveBeenCalledTimes(2);
    });

    test("should handle empty routes array", () => {
      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      mockDOM.document.getElementById.mockImplementation((id) => {
        if (id === "routes-container") return mockContainer;
        return mockElements[id];
      });

      view.renderRoutes([]);

      expect(mockContainer.innerHTML).toBe("");
      expect(mockContainer.appendChild).not.toHaveBeenCalled();
    });

    test("should handle routes without optional fields", () => {
      const routes = [
        {
          id: 1,
          color: "red",
          createdAt: new Date("2023-01-01"),
        },
      ];

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      mockDOM.document.getElementById.mockImplementation((id) => {
        if (id === "routes-container") return mockContainer;
        return mockElements[id];
      });

      view.renderRoutes(routes);

      expect(mockContainer.appendChild).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateRouteCardImage", () => {
    test("should update route card image", () => {
      const mockRouteCard = {
        querySelector: jest.fn(() => ({ src: "" })),
      };

      mockDOM.document.querySelector.mockReturnValue(mockRouteCard);

      view.updateRouteCardImage(1, "new-image-url");

      expect(mockDOM.document.querySelector).toHaveBeenCalledWith(
        '[data-route-id="1"]',
      );
    });
  });

  describe("getColorHex", () => {
    test("should return hex color for known colors", () => {
      expect(view.getColorHex("red")).toBe("#F44336");
      expect(view.getColorHex("green")).toBe("#4CAF50");
      expect(view.getColorHex("yellow")).toBe("#FFC107");
    });

    test("should return default color for unknown colors", () => {
      expect(view.getColorHex("unknown")).toBe("#999");
      expect(view.getColorHex(null)).toBe("#999");
      expect(view.getColorHex(undefined)).toBe("#999");
    });
  });

  describe("removeRouteCard", () => {
    test("should remove route card from DOM", () => {
      const mockRouteCard = {
        remove: jest.fn(),
      };

      mockDOM.document.querySelector.mockReturnValue(mockRouteCard);

      view.removeRouteCard(1);

      expect(mockDOM.document.querySelector).toHaveBeenCalledWith(
        '[data-route-id="1"]',
      );
      expect(mockRouteCard.remove).toHaveBeenCalled();
    });
  });

  describe("createRouteCard", () => {
    test("should create route element with all data", () => {
      const route = {
        id: 1,
        name: "Test Route",
        color: "red",
        gym: "Test Gym",
        notes: "Test notes",
        createdAt: new Date("2023-01-01"),
      };

      const element = view.createRouteCard(route);

      expect(element.className).toContain("route-card");
      expect(element.dataset.routeId).toBe("1");
      expect(element.innerHTML).toContain("Test Route");
      expect(element.innerHTML).toContain("Test Gym");
    });

    test("should handle route without optional fields", () => {
      const route = {
        id: 2,
        color: "blue",
        createdAt: new Date("2023-01-01"),
      };

      const element = view.createRouteCard(route);

      expect(element.className).toContain("route-card");
      expect(element.dataset.routeId).toBe("2");
    });
  });

  describe("setColorSelection", () => {
    test("should set color selection in view", () => {
      view.selectRouteColor = jest.fn();

      view.setColorSelection("green");

      expect(view.selectRouteColor).toHaveBeenCalledWith("green");
    });
  });
});
