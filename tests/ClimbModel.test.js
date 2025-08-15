/**
 * Tests for ClimbModel functionality
 */
import { ClimbModel } from "../src/models/ClimbModel.js";

describe("ClimbModel", () => {
  let model;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    model = new ClimbModel();
  });

  describe("constructor", () => {
    test("should initialize with empty sessions and no current session", () => {
      expect(model.getSessions()).toEqual([]);
      expect(model.getCurrentSession()).toBeNull();
    });
  });

  describe("startNewSession", () => {
    test("should create a new session with valid data", () => {
      const sessionData = {
        date: "2023-01-15T10:30",
        gym: "Test Gym",
      };

      const session = model.startNewSession(sessionData);

      expect(session).toBeDefined();
      expect(session.gym).toBe("Test Gym");
      expect(session.attempts).toEqual([]);
      expect(model.getCurrentSession()).toBe(session);
    });

    test("should throw error for missing date", () => {
      const sessionData = { gym: "Test Gym" };

      expect(() => model.startNewSession(sessionData)).toThrow(
        "Session date and gym/location are required"
      );
    });

    test("should throw error for missing gym", () => {
      const sessionData = { date: "2023-01-15T10:30" };

      expect(() => model.startNewSession(sessionData)).toThrow(
        "Session date and gym/location are required"
      );
    });
  });

  describe("addAttemptToCurrentSession", () => {
    beforeEach(() => {
      const sessionData = {
        date: "2023-01-15T10:30",
        gym: "Test Gym",
      };
      model.startNewSession(sessionData);
    });

    test("should add attempt with valid data", () => {
      const attemptData = {
        route: { name: "Test Route", color: "red" },
        success: true,
        notes: "Great climb",
      };

      const attempt = model.addAttemptToCurrentSession(attemptData);

      expect(attempt).toBeDefined();
      expect(attempt.route.name).toBe("Test Route");
      expect(attempt.success).toBe(true);
      expect(attempt.notes).toBe("Great climb");
      expect(model.getCurrentSession().attempts).toHaveLength(1);
    });

    test("should throw error for missing route", () => {
      const attemptData = { success: true };

      expect(() => model.addAttemptToCurrentSession(attemptData)).toThrow(
        "Route and result are required"
      );
    });

    test("should throw error for missing success", () => {
      const attemptData = {
        route: { name: "Test Route", color: "red" },
      };

      expect(() => model.addAttemptToCurrentSession(attemptData)).toThrow(
        "Route and result are required"
      );
    });

    test("should throw error when no active session", () => {
      model.currentSession = null;
      const attemptData = {
        route: { name: "Test Route", color: "red" },
        success: true,
      };

      expect(() => model.addAttemptToCurrentSession(attemptData)).toThrow(
        "No active session"
      );
    });
  });

  describe("finishCurrentSession", () => {
    test("should finish session with attempts", () => {
      const sessionData = {
        date: "2023-01-15T10:30",
        gym: "Test Gym",
      };
      model.startNewSession(sessionData);

      const attemptData = {
        route: { name: "Test Route", color: "red" },
        success: true,
      };
      model.addAttemptToCurrentSession(attemptData);

      const finishedSession = model.finishCurrentSession();

      expect(finishedSession).toBeDefined();
      expect(model.getCurrentSession()).toBeNull();
      expect(model.getSessions()).toHaveLength(1);
    });

    test("should throw error when no current session", () => {
      expect(() => model.finishCurrentSession()).toThrow(
        "No session to finish or no attempts logged"
      );
    });

    test("should throw error when no attempts", () => {
      const sessionData = {
        date: "2023-01-15T10:30",
        gym: "Test Gym",
      };
      model.startNewSession(sessionData);

      expect(() => model.finishCurrentSession()).toThrow(
        "No session to finish or no attempts logged"
      );
    });
  });

  describe("getOverallStats", () => {
    test("should return correct stats", () => {
      // Create and finish a session with attempts
      const sessionData = {
        date: "2023-01-15T10:30",
        gym: "Test Gym",
      };
      model.startNewSession(sessionData);

      model.addAttemptToCurrentSession({
        route: { name: "Route 1", color: "red" },
        success: true,
      });
      model.addAttemptToCurrentSession({
        route: { name: "Route 2", color: "blue" },
        success: false,
      });

      model.finishCurrentSession();

      const stats = model.getOverallStats();

      expect(stats.totalSessions).toBe(1);
      expect(stats.totalAttempts).toBe(2);
      expect(stats.totalSuccess).toBe(1);
      expect(stats.overallSuccessRate).toBe("50.0");
    });

    test("should handle empty stats", () => {
      const stats = model.getOverallStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalAttempts).toBe(0);
      expect(stats.totalSuccess).toBe(0);
      expect(stats.overallSuccessRate).toBe(0);
    });
  });

  describe("draft management", () => {
    test("should save and load draft", () => {
      const sessionData = {
        date: "2023-01-15T10:30",
        gym: "Test Gym",
      };
      model.startNewSession(sessionData);

      expect(model.saveDraft()).toBe(true);
      expect(model.hasDraft()).toBe(true);

      const newModel = new ClimbModel();
      expect(newModel.getCurrentSession()).toBeDefined();
      expect(newModel.getCurrentSession().gym).toBe("Test Gym");
    });

    test("should delete draft", () => {
      const sessionData = {
        date: "2023-01-15T10:30",
        gym: "Test Gym",
      };
      model.startNewSession(sessionData);
      model.saveDraft();

      expect(model.deleteDraft()).toBe(true);
      expect(model.hasDraft()).toBe(false);
    });
  });
});
