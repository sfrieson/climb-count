/**
 * Model for managing climbing routes with IndexedDB storage
 */
export class RouteModel {
  #dbName = "climbCountDB";
  #version = 1;
  #storeName = "routes";
  #db = null;

  constructor() {
    this.initializeDB();
  }

  /**
   * Initialize IndexedDB database
   */
  async initializeDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, this.#version);

      request.onerror = () => {
        console.error("Database error:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.#db = request.result;
        resolve(this.#db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(this.#storeName)) {
          const store = db.createObjectStore(this.#storeName, {
            keyPath: "id",
            autoIncrement: true,
          });

          store.createIndex("color", "color", { unique: false });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("gym", "gym", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  /**
   * Save a new route with image to IndexedDB
   */
  async saveRoute(routeData) {
    await this.ensureDBReady();

    const route = {
      name: routeData.name || null,
      color: routeData.color,
      gym: routeData.gym || null,
      notes: routeData.notes || null,
      image: routeData.image, // ArrayBuffer or File
      createdAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#storeName], "readwrite");
      const store = transaction.objectStore(this.#storeName);
      const request = store.add(route);

      request.onsuccess = () => {
        route.id = request.result;
        resolve(route);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all routes from IndexedDB
   */
  async getAllRoutes() {
    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#storeName], "readonly");
      const store = transaction.objectStore(this.#storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get route by ID
   */
  async getRouteById(id) {
    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#storeName], "readonly");
      const store = transaction.objectStore(this.#storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Delete route by ID
   */
  async deleteRoute(id) {
    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#storeName], "readwrite");
      const store = transaction.objectStore(this.#storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Convert File to ArrayBuffer for storage
   */
  async fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert ArrayBuffer back to File/Blob for display
   */
  arrayBufferToBlob(arrayBuffer, type = "image/jpeg") {
    return new Blob([arrayBuffer], { type });
  }

  /**
   * Create object URL from stored image for display
   */
  createImageURL(route) {
    if (!route.image) return null;

    try {
      const blob = this.arrayBufferToBlob(route.image);
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Error creating image URL:", error);
      return null;
    }
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
   * Get routes filtered by color
   */
  async getRoutesByColor(color) {
    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#storeName], "readonly");
      const store = transaction.objectStore(this.#storeName);
      const index = store.index("color");
      const request = index.getAll(color);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get routes filtered by gym
   */
  async getRoutesByGym(gym) {
    await this.ensureDBReady();

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#storeName], "readonly");
      const store = transaction.objectStore(this.#storeName);
      const index = store.index("gym");
      const request = index.getAll(gym);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}
