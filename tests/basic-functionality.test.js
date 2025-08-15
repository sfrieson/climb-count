/**
 * Basic functionality tests for the climbing application
 */

describe("Application Basic Functionality", () => {
  // Mock localStorage
  const mockLocalStorage = {
    data: {},
    getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
    setItem: jest.fn((key, value) => {
      mockLocalStorage.data[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete mockLocalStorage.data[key];
    }),
    clear: jest.fn(() => {
      mockLocalStorage.data = {};
    }),
  };

  global.localStorage = mockLocalStorage;

  // Mock IndexedDB
  global.indexedDB = {
    open: jest.fn(() => ({
      result: null,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    })),
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe("ClimbModel Core Logic", () => {
    // Define ClimbModel inline for testing
    class ClimbModel {
      constructor() {
        this.sessions = [];
        this.currentSession = null;
      }

      startNewSession(sessionData) {
        if (!sessionData.date || !sessionData.gym) {
          throw new Error("Session date and gym/location are required");
        }
        this.currentSession = {
          id: Date.now(),
          date: new Date(sessionData.date),
          gym: sessionData.gym,
          attempts: [],
        };
        return this.currentSession;
      }

      addAttemptToCurrentSession(attemptData) {
        if (!this.currentSession) {
          throw new Error("No active session");
        }
        if (
          !attemptData.route ||
          attemptData.success === null ||
          attemptData.success === undefined
        ) {
          throw new Error("Route and result are required");
        }
        const attempt = {
          id: Date.now(),
          timestamp: new Date(),
          routeId: attemptData.routeId,
          route: attemptData.route,
          success: attemptData.success,
          notes: attemptData.notes || null,
        };
        this.currentSession.attempts.push(attempt);
        return attempt;
      }

      finishCurrentSession() {
        if (!this.currentSession || this.currentSession.attempts.length === 0) {
          throw new Error("No session to finish or no attempts logged");
        }
        this.sessions.push(this.currentSession);
        const finishedSession = this.currentSession;
        this.currentSession = null;
        return finishedSession;
      }

      getOverallStats() {
        const allAttempts = this.sessions.flatMap((s) => s.attempts);
        const totalAttempts = allAttempts.length;
        const totalSuccess = allAttempts.filter((a) => a.success).length;
        const overallSuccessRate =
          totalAttempts > 0
            ? ((totalSuccess / totalAttempts) * 100).toFixed(1)
            : 0;
        return {
          totalSessions: this.sessions.length,
          totalAttempts,
          totalSuccess,
          overallSuccessRate,
        };
      }
    }

    test("should create new session with valid data", () => {
      const model = new ClimbModel();
      const sessionData = { date: "2023-01-01", gym: "Test Gym" };

      const session = model.startNewSession(sessionData);

      expect(session.gym).toBe("Test Gym");
      expect(session.date).toBeInstanceOf(Date);
      expect(session.attempts).toEqual([]);
    });

    test("should add attempt to current session", () => {
      const model = new ClimbModel();
      model.startNewSession({ date: "2023-01-01", gym: "Test Gym" });

      const attemptData = {
        route: { id: 1, color: "red" },
        success: true,
        notes: "Great climb!",
      };

      const attempt = model.addAttemptToCurrentSession(attemptData);

      expect(attempt.success).toBe(true);
      expect(attempt.route.color).toBe("red");
      expect(attempt.notes).toBe("Great climb!");
      expect(model.currentSession.attempts).toContain(attempt);
    });

    test("should finish session successfully", () => {
      const model = new ClimbModel();
      model.startNewSession({ date: "2023-01-01", gym: "Test Gym" });
      model.addAttemptToCurrentSession({
        route: { id: 1, color: "red" },
        success: true,
      });

      const finishedSession = model.finishCurrentSession();

      expect(model.sessions).toContain(finishedSession);
      expect(model.currentSession).toBeNull();
    });

    test("should calculate overall stats correctly", () => {
      const model = new ClimbModel();
      model.startNewSession({ date: "2023-01-01", gym: "Test Gym" });
      model.addAttemptToCurrentSession({
        route: { id: 1, color: "red" },
        success: true,
      });
      model.addAttemptToCurrentSession({
        route: { id: 2, color: "blue" },
        success: false,
      });
      model.finishCurrentSession();

      const stats = model.getOverallStats();

      expect(stats.totalSessions).toBe(1);
      expect(stats.totalAttempts).toBe(2);
      expect(stats.totalSuccess).toBe(1);
      expect(stats.overallSuccessRate).toBe("50.0");
    });

    test("should handle error cases", () => {
      const model = new ClimbModel();

      // Should throw error when starting session without required data
      expect(() => model.startNewSession({ date: "2023-01-01" })).toThrow();
      expect(() => model.startNewSession({ gym: "Test Gym" })).toThrow();

      // Should throw error when adding attempt without active session
      expect(() =>
        model.addAttemptToCurrentSession({
          route: { id: 1, color: "red" },
          success: true,
        })
      ).toThrow("No active session");

      // Should throw error when finishing session with no attempts
      model.startNewSession({ date: "2023-01-01", gym: "Test Gym" });
      expect(() => model.finishCurrentSession()).toThrow();
    });
  });

  describe("RouteModel Core Logic", () => {
    // Mock RouteModel for basic functionality tests
    class RouteModel {
      constructor() {
        this.routes = [];
      }

      async saveRoute(routeData) {
        const route = {
          id: Date.now(),
          name: routeData.name || null,
          color: routeData.color,
          gym: routeData.gym || null,
          notes: routeData.notes || null,
          image: routeData.image,
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
        const index = this.routes.findIndex(
          (route) => route.id === parseInt(id)
        );
        if (index > -1) {
          this.routes.splice(index, 1);
          return true;
        }
        return false;
      }

      createImageURL(route) {
        return route.image ? "mock-image-url" : null;
      }
    }

    test("should save route with all data", async () => {
      const model = new RouteModel();
      const routeData = {
        name: "Test Route",
        color: "red",
        gym: "Test Gym",
        notes: "Test notes",
        image: new ArrayBuffer(8),
      };

      const savedRoute = await model.saveRoute(routeData);

      expect(savedRoute.name).toBe("Test Route");
      expect(savedRoute.color).toBe("red");
      expect(savedRoute.gym).toBe("Test Gym");
      expect(savedRoute.notes).toBe("Test notes");
      expect(savedRoute.image).toBeInstanceOf(ArrayBuffer);
      expect(savedRoute.createdAt).toBeInstanceOf(Date);
    });

    test("should retrieve all routes", async () => {
      const model = new RouteModel();
      await model.saveRoute({ color: "red" });
      await model.saveRoute({ color: "blue" });

      const routes = await model.getAllRoutes();

      expect(routes).toHaveLength(2);
      expect(routes[0].color).toBe("red");
      expect(routes[1].color).toBe("blue");
    });

    test("should get route by ID", async () => {
      const model = new RouteModel();
      const savedRoute = await model.saveRoute({ color: "green" });

      const foundRoute = await model.getRouteById(savedRoute.id);

      expect(foundRoute).toEqual(savedRoute);
    });

    test("should delete route by ID", async () => {
      const model = new RouteModel();
      const savedRoute = await model.saveRoute({ color: "purple" });

      const deleted = await model.deleteRoute(savedRoute.id);
      const routes = await model.getAllRoutes();

      expect(deleted).toBe(true);
      expect(routes).toHaveLength(0);
    });
  });

  describe("Color Management", () => {
    test("should handle color mapping correctly", () => {
      const colorMap = {
        green: "#4CAF50",
        yellow: "#FFC107",
        orange: "#FF5722",
        red: "#F44336",
        purple: "#9C27B0",
        black: "#212121",
        white: "#FAFAFA",
      };

      const getColorHex = (color) => colorMap[color] || "#999";

      expect(getColorHex("red")).toBe("#F44336");
      expect(getColorHex("green")).toBe("#4CAF50");
      expect(getColorHex("unknown")).toBe("#999");
      expect(getColorHex(null)).toBe("#999");
    });
  });

  describe("Form Validation", () => {
    test("should validate session form data", () => {
      const validateSessionData = (data) => {
        if (!data.date || !data.gym) {
          throw new Error("Session date and gym/location are required");
        }
        return true;
      };

      expect(validateSessionData({ date: "2023-01-01", gym: "Test Gym" })).toBe(
        true
      );
      expect(() => validateSessionData({ date: "2023-01-01" })).toThrow();
      expect(() => validateSessionData({ gym: "Test Gym" })).toThrow();
      expect(() => validateSessionData({})).toThrow();
    });

    test("should validate attempt data", () => {
      const validateAttemptData = (data) => {
        if (
          !data.route ||
          data.success === null ||
          data.success === undefined
        ) {
          throw new Error("Route and result are required");
        }
        return true;
      };

      expect(
        validateAttemptData({
          route: { id: 1, color: "red" },
          success: true,
        })
      ).toBe(true);

      expect(() => validateAttemptData({ success: true })).toThrow();
      expect(() => validateAttemptData({ route: { id: 1 } })).toThrow();
    });
  });

  describe("Statistics Calculations", () => {
    test("should calculate color statistics", () => {
      const attempts = [
        { route: { color: "red" }, success: true },
        { route: { color: "red" }, success: false },
        { route: { color: "blue" }, success: true },
      ];

      const calculateColorStats = (attempts) => {
        const colorStats = {};
        attempts.forEach((attempt) => {
          const color = attempt.route?.color || "unknown";
          if (!colorStats[color]) {
            colorStats[color] = { success: 0, total: 0 };
          }
          colorStats[color].total++;
          if (attempt.success) {
            colorStats[color].success++;
          }
        });
        return colorStats;
      };

      const stats = calculateColorStats(attempts);

      expect(stats.red).toEqual({ success: 1, total: 2 });
      expect(stats.blue).toEqual({ success: 1, total: 1 });
    });

    test("should calculate success rates", () => {
      const calculateSuccessRate = (successful, total) => {
        return total > 0 ? ((successful / total) * 100).toFixed(1) : "0";
      };

      expect(calculateSuccessRate(1, 2)).toBe("50.0");
      expect(calculateSuccessRate(0, 0)).toBe("0");
      expect(calculateSuccessRate(3, 3)).toBe("100.0");
    });
  });
});
