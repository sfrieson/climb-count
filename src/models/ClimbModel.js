export class ClimbModel {
  #dbName = "climbCountDB";
  #version = 2; // Increased for migration
  #sessionsStore = "sessions";
  #draftsStore = "drafts";
  #db = null;

  constructor() {
    this.sessions = [];
    this.currentSession = null;
    this.initializeDB();
  }

  /**
   * Initialize IndexedDB database with proper versioning
   */
  async initializeDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, this.#version);

      request.onerror = () => {
        console.error("ClimbModel Database error:", request.error);
        reject(request.error);
      };

      request.onsuccess = async () => {
        this.#db = request.result;

        // Request persistent storage
        if ("storage" in navigator && "persist" in navigator.storage) {
          try {
            const persistent = await navigator.storage.persist();
            console.log("Storage persistence granted:", persistent);
          } catch (error) {
            console.warn("Could not request storage persistence:", error);
          }
        }

        await this.loadSessions();
        await this.loadDraft();
        resolve(this.#db);
      };

      request.onupgradeneeded = async (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        console.log(
          `Upgrading database from version ${oldVersion} to ${this.#version}`,
        );

        // Create sessions store if it doesn't exist
        if (!db.objectStoreNames.contains(this.#sessionsStore)) {
          const sessionsStore = db.createObjectStore(this.#sessionsStore, {
            keyPath: "id",
            autoIncrement: true,
          });
          sessionsStore.createIndex("date", "date", { unique: false });
          sessionsStore.createIndex("gym", "gym", { unique: false });
        }

        // Create drafts store if it doesn't exist
        if (!db.objectStoreNames.contains(this.#draftsStore)) {
          db.createObjectStore(this.#draftsStore, {
            keyPath: "id",
          });
        }

        // Create routes store if it doesn't exist (shared with RouteModel)
        if (!db.objectStoreNames.contains("routes")) {
          const routesStore = db.createObjectStore("routes", {
            keyPath: "id",
            autoIncrement: true,
          });
          routesStore.createIndex("color", "color", { unique: false });
          routesStore.createIndex("name", "name", { unique: false });
          routesStore.createIndex("gym", "gym", { unique: false });
          routesStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Migration from localStorage (version 1 -> 2)
        if (oldVersion < 2) {
          await this.migrateFromLocalStorage(db);
        }
      };
    });
  }

  /**
   * Migrate data from localStorage to IndexedDB
   */
  async migrateFromLocalStorage(db) {
    try {
      // Migrate sessions
      const savedSessions = localStorage.getItem("climbingSessions");
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions, (key, value) => {
          if (key === "date" || key === "timestamp") {
            return new Date(value);
          }
          return value;
        });

        const transaction = db.transaction([this.#sessionsStore], "readwrite");
        const store = transaction.objectStore(this.#sessionsStore);

        for (const session of sessions) {
          await new Promise((resolve, reject) => {
            const request = store.add(session);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }

        console.log(`Migrated ${sessions.length} sessions from localStorage`);
        localStorage.removeItem("climbingSessions");
      }

      // Migrate draft
      const savedDraft = localStorage.getItem("climbingSessionDraft");
      if (savedDraft) {
        const draft = JSON.parse(savedDraft, (key, value) => {
          if (key === "date" || key === "timestamp") {
            return new Date(value);
          }
          return value;
        });

        const transaction = db.transaction([this.#draftsStore], "readwrite");
        const store = transaction.objectStore(this.#draftsStore);

        await new Promise((resolve, reject) => {
          const request = store.put({ id: "current", ...draft });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        console.log("Migrated draft session from localStorage");
        localStorage.removeItem("climbingSessionDraft");
      }
    } catch (error) {
      console.error("Migration from localStorage failed:", error);
    }
  }

  /**
   * Load sessions from IndexedDB
   */
  async loadSessions() {
    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(
        [this.#sessionsStore],
        "readonly",
      );
      const store = transaction.objectStore(this.#sessionsStore);
      const request = store.getAll();

      request.onsuccess = () => {
        this.sessions = request.result.map((session) => ({
          ...session,
          date: new Date(session.date),
          attempts: session.attempts.map((attempt) => ({
            ...attempt,
            timestamp: new Date(attempt.timestamp),
          })),
        }));
        resolve(this.sessions);
      };

      request.onerror = () => {
        console.error("Failed to load sessions:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save sessions to IndexedDB
   */
  async saveSessions() {
    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(
        [this.#sessionsStore],
        "readwrite",
      );
      const store = transaction.objectStore(this.#sessionsStore);

      // Clear existing sessions and add all current ones
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        let completed = 0;
        const total = this.sessions.length;

        if (total === 0) {
          resolve();
          return;
        }

        this.sessions.forEach((session) => {
          const addRequest = store.add(session);
          addRequest.onsuccess = () => {
            completed++;
            if (completed === total) resolve();
          };
          addRequest.onerror = () => reject(addRequest.error);
        });
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    });
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

  async addAttemptToCurrentSession(attemptData) {
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

    // Auto-save draft after each attempt
    await this.saveDraft();

    return attempt;
  }

  /**
   * Update an existing attempt in a session
   */
  async updateAttempt(sessionId, attemptId, updatedData) {
    // Find the session
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      // Check if it's in the current session
      if (this.currentSession && this.currentSession.id === sessionId) {
        return this.updateAttemptInCurrentSession(attemptId, updatedData);
      }
      throw new Error("Session not found");
    }

    // Find the attempt
    const attemptIndex = session.attempts.findIndex(a => a.id === attemptId);
    if (attemptIndex === -1) {
      throw new Error("Attempt not found");
    }

    // Validate updated data
    if (updatedData.route && (updatedData.success === null || updatedData.success === undefined)) {
      throw new Error("Route and result are required");
    }

    // Update the attempt
    const originalAttempt = session.attempts[attemptIndex];
    const updatedAttempt = {
      ...originalAttempt,
      ...updatedData,
      id: attemptId, // Keep original ID
      timestamp: originalAttempt.timestamp, // Keep original timestamp
    };

    session.attempts[attemptIndex] = updatedAttempt;
    
    // Save sessions to persistent storage
    await this.saveSessions();
    
    return updatedAttempt;
  }

  /**
   * Update an attempt in the current (active) session
   */
  async updateAttemptInCurrentSession(attemptId, updatedData) {
    if (!this.currentSession) {
      throw new Error("No active session");
    }

    const attemptIndex = this.currentSession.attempts.findIndex(a => a.id === attemptId);
    if (attemptIndex === -1) {
      throw new Error("Attempt not found in current session");
    }

    // Validate updated data
    if (updatedData.route && (updatedData.success === null || updatedData.success === undefined)) {
      throw new Error("Route and result are required");
    }

    // Update the attempt
    const originalAttempt = this.currentSession.attempts[attemptIndex];
    const updatedAttempt = {
      ...originalAttempt,
      ...updatedData,
      id: attemptId, // Keep original ID
      timestamp: originalAttempt.timestamp, // Keep original timestamp
    };

    this.currentSession.attempts[attemptIndex] = updatedAttempt;
    
    // Save draft since this is current session
    await this.saveDraft();
    
    return updatedAttempt;
  }

  /**
   * Delete an attempt from a session
   */
  async deleteAttempt(sessionId, attemptId) {
    // Find the session
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      // Check if it's in the current session
      if (this.currentSession && this.currentSession.id === sessionId) {
        return this.deleteAttemptFromCurrentSession(attemptId);
      }
      throw new Error("Session not found");
    }

    // Find and remove the attempt
    const attemptIndex = session.attempts.findIndex(a => a.id === attemptId);
    if (attemptIndex === -1) {
      throw new Error("Attempt not found");
    }

    const deletedAttempt = session.attempts.splice(attemptIndex, 1)[0];
    
    // Save sessions to persistent storage
    await this.saveSessions();
    
    return deletedAttempt;
  }

  /**
   * Delete an attempt from the current (active) session
   */
  async deleteAttemptFromCurrentSession(attemptId) {
    if (!this.currentSession) {
      throw new Error("No active session");
    }

    const attemptIndex = this.currentSession.attempts.findIndex(a => a.id === attemptId);
    if (attemptIndex === -1) {
      throw new Error("Attempt not found in current session");
    }

    const deletedAttempt = this.currentSession.attempts.splice(attemptIndex, 1)[0];
    
    // Save draft since this is current session
    await this.saveDraft();
    
    return deletedAttempt;
  }

  async finishCurrentSession() {
    if (!this.currentSession || this.currentSession.attempts.length === 0) {
      throw new Error("No session to finish or no attempts logged");
    }

    this.sessions.push(this.currentSession);
    const finishedSession = this.currentSession;
    this.currentSession = null;

    await this.deleteDraft(); // Remove draft when session is finished
    await this.saveSessions();
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

  /**
   * Draft management methods using IndexedDB
   */
  async saveDraft() {
    if (!this.currentSession) {
      return false;
    }

    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(
        [this.#draftsStore],
        "readwrite",
      );
      const store = transaction.objectStore(this.#draftsStore);
      const request = store.put({ id: "current", ...this.currentSession });

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error("Failed to save draft:", request.error);
        reject(request.error);
      };
    });
  }

  async loadDraft() {
    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#draftsStore], "readonly");
      const store = transaction.objectStore(this.#draftsStore);
      const request = store.get("current");

      request.onsuccess = () => {
        if (request.result) {
          const { id: app, ...sessionData } = request.result;
          this.currentSession = {
            ...sessionData,
            date: new Date(sessionData.date),
            attempts:
              sessionData.attempts?.map((attempt) => ({
                ...attempt,
                timestamp: new Date(attempt.timestamp),
              })) || [],
          };
          resolve(true);
        } else {
          resolve(false);
        }
      };

      request.onerror = () => {
        console.error("Failed to load draft:", request.error);
        reject(request.error);
      };
    });
  }

  async deleteDraft() {
    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(
        [this.#draftsStore],
        "readwrite",
      );
      const store = transaction.objectStore(this.#draftsStore);
      const request = store.delete("current");

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error("Failed to delete draft:", request.error);
        reject(request.error);
      };
    });
  }

  async hasDraft() {
    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#draftsStore], "readonly");
      const store = transaction.objectStore(this.#draftsStore);
      const request = store.get("current");

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => {
        console.error("Failed to check draft:", request.error);
        reject(request.error);
      };
    });
  }

  async isDraftSession() {
    return this.currentSession && (await this.hasDraft());
  }

  /**
   * Ensure database is ready before operations
   */
  async ensureDBReady() {
    if (!this.#db) {
      await this.initializeDB();
    }
  }

  /**
   * Export all data for backup
   */
  async exportData() {
    await this.ensureDBReady();

    const data = {
      version: this.#version,
      timestamp: new Date().toISOString(),
      sessions: this.sessions,
      currentSession: this.currentSession,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from backup
   */
  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);

      if (data.sessions) {
        this.sessions = data.sessions.map((session) => ({
          ...session,
          date: new Date(session.date),
          attempts: session.attempts.map((attempt) => ({
            ...attempt,
            timestamp: new Date(attempt.timestamp),
          })),
        }));
        await this.saveSessions();
      }

      if (data.currentSession) {
        this.currentSession = {
          ...data.currentSession,
          date: new Date(data.currentSession.date),
          attempts:
            data.currentSession.attempts?.map((attempt) => ({
              ...attempt,
              timestamp: new Date(attempt.timestamp),
            })) || [],
        };
        await this.saveDraft();
      }

      return true;
    } catch (error) {
      console.error("Failed to import data:", error);
      throw error;
    }
  }
}
