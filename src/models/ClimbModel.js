export class ClimbModel {
  #storageKey = "climbingSessions";
  #draftKey = "climbingSessionDraft";

  constructor() {
    this.sessions = this.loadSessions();
    this.currentSession = null;
    this.loadDraft();
  }

  loadSessions() {
    const saved = localStorage.getItem(this.#storageKey);
    return saved
      ? JSON.parse(saved, (key, value) => {
        if (key === "date" || key === "timestamp") {
          return new Date(value);
        }
        return value;
      })
      : [];
  }

  saveSessions() {
    localStorage.setItem(this.#storageKey, JSON.stringify(this.sessions));
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
      route: attemptData.route, // Store full route object
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
    this.deleteDraft(); // Remove draft when session is finished
    this.saveSessions();
    return finishedSession;
  }

  getCurrentSession() {
    return this.currentSession;
  }

  getSessions() {
    return this.sessions;
  }

  getAllAttempts() {
    return this.sessions.flatMap((session) => session.attempts);
  }

  getOverallStats() {
    const allAttempts = this.getAllAttempts();
    const totalAttempts = allAttempts.length;
    const totalSuccess = allAttempts.filter(
      (attempt) => attempt.success,
    ).length;
    const overallSuccessRate =
      totalAttempts > 0 ? ((totalSuccess / totalAttempts) * 100).toFixed(1) : 0;

    return {
      totalSessions: this.sessions.length,
      totalAttempts,
      totalSuccess,
      overallSuccessRate,
    };
  }

  getColorStats(attempts = null) {
    const attemptsToAnalyze = attempts || this.getAllAttempts();
    const colorStats = {};

    attemptsToAnalyze.forEach((attempt) => {
      const color = attempt.route
        ? attempt.route.color
        : attempt.color || "unknown";
      if (!colorStats[color]) {
        colorStats[color] = { success: 0, total: 0 };
      }
      colorStats[color].total++;
      if (attempt.success) {
        colorStats[color].success++;
      }
    });

    return colorStats;
  }

  // Draft management methods
  saveDraft() {
    if (!this.currentSession) {
      return false;
    }
    localStorage.setItem(this.#draftKey, JSON.stringify(this.currentSession));
    return true;
  }

  loadDraft() {
    const saved = localStorage.getItem(this.#draftKey);
    if (saved) {
      this.currentSession = JSON.parse(saved, (key, value) => {
        if (key === "date" || key === "timestamp") {
          return new Date(value);
        }
        return value;
      });
      return true;
    }
    return false;
  }

  deleteDraft() {
    localStorage.removeItem(this.#draftKey);
    return true;
  }

  hasDraft() {
    return localStorage.getItem(this.#draftKey) !== null;
  }

  isDraftSession() {
    return this.currentSession && this.hasDraft();
  }
}
