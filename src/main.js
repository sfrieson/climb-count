import { ClimbModel } from "./models/ClimbModel.js";
import { ClimbView } from "./views/ClimbView.js";
import { ClimbController } from "./controllers/ClimbController.js";
import { RouteModel } from "./models/RouteModel.js";
import { RouteView } from "./views/RouteView.js";
import { RouteController } from "./controllers/RouteController.js";
import { dialogUtils } from "./utils/DialogUtils.js";

let app;

// Global functions for HTML onclick handlers
window.switchTab = function (tabName) {
  if (app && app.controller) {
    app.controller.handleTabSwitch(tabName);
  }
};

window.logAttempt = function () {
  if (app && app.controller) {
    app.controller.logAttempt();
  }
};

window.finishSession = async function () {
  // Check if app is initialized
  if (!app || !app.controller) {
    dialogUtils.showError(
      "Application is still loading. Please wait a moment and try again.",
    );
    return;
  }

  const confirmed = await dialogUtils.showConfirm(
    "Are you sure you want to finish this session? This will save your current progress and start a new session.",
    "Finish Session",
  );

  if (confirmed) {
    app.controller.finishSession();
  }
};

window.clearSession = async function () {
  const confirmed = await dialogUtils.showConfirm(
    "Are you sure you want to clear this session? This will permanently delete all unsaved climb data.",
    "Clear Session",
  );

  if (confirmed && app && app.controller) {
    app.controller.clearSession();
  }
};

// Settings functions
window.exportBackup = async function () {
  try {
    const data = await app.model.exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `climb-count-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    dialogUtils.showSuccess("Backup exported successfully!");
  } catch (error) {
    console.error("Export failed:", error);
    dialogUtils.showError("Failed to export backup: " + error.message);
  }
};

window.importBackup = function () {
  document.getElementById("restore-file-input").click();
};

window.handleFileImport = async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    await app.model.importData(text);

    // Refresh all views
    await app.controller.refreshViews();

    dialogUtils.showSuccess("Backup imported successfully!");
    event.target.value = ""; // Clear file input
  } catch (error) {
    console.error("Import failed:", error);
    dialogUtils.showError("Failed to import backup: " + error.message);
    event.target.value = ""; // Clear file input
  }
};

window.checkStorageStatus = async function () {
  const statusElement = document.getElementById("storage-status");
  if (!statusElement) return;

  try {
    if ("storage" in navigator && "persist" in navigator.storage) {
      const persistent = await navigator.storage.persist();
      const estimate = await navigator.storage.estimate();

      statusElement.textContent = persistent ? "Persistent" : "Not Persistent";
      statusElement.className = persistent
        ? "storage-persistent"
        : "storage-not-persistent";

      if (estimate) {
        const usedMB = (estimate.usage / 1024 / 1024).toFixed(2);
        const quotaMB = estimate.quota
          ? (estimate.quota / 1024 / 1024).toFixed(2)
          : "Unknown";
        statusElement.textContent += ` (${usedMB}MB / ${quotaMB}MB)`;
      }
    } else {
      statusElement.textContent = "Storage API not supported";
      statusElement.className = "storage-not-persistent";
    }
  } catch (error) {
    console.error("Storage status check failed:", error);
    statusElement.textContent = "Error checking storage";
    statusElement.className = "storage-not-persistent";
  }
};

document.addEventListener("DOMContentLoaded", async function () {
  const model = new ClimbModel();
  const view = new ClimbView();
  const controller = new ClimbController(model, view);

  const routeModel = new RouteModel();
  const routeView = new RouteView();
  const routeController = new RouteController(routeModel, routeView);

  // Set up dependencies
  controller.routeController = routeController;
  routeController.climbController = controller;

  app = {
    model,
    view,
    controller,
    routeModel,
    routeView,
    routeController,
  };

  // Initialize app
  await controller.initializeApp();

  // Load routes if we're starting on the log tab (page refresh)
  const activeTab = document.querySelector(".tab.active");
  if (activeTab && activeTab.textContent.trim() === "Log Session") {
    await controller.loadRouteSelector();
  }

  // Setup settings event listeners
  setupSettingsListeners();

  // Register Service Worker for PWA functionality
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").then(
        function (registration) {
          console.log(
            "ServiceWorker registration successful with scope: ",
            registration.scope,
          );

          // Listen for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New content available, show update notification
                showUpdateNotification();
              }
            });
          });
        },
        function (err) {
          console.log("ServiceWorker registration failed: ", err);
        },
      );
    });
  }

  // Handle service worker updates
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    // Reload when new service worker takes control
    window.location.reload();
  });
});

// Show update notification to user
async function showUpdateNotification() {
  if (
    await dialogUtils.showConfirm(
      "A new version of Climb Count is available. Would you like to update now?",
      "Update Available",
    )
  ) {
    // Tell the service worker to skip waiting and take control
    navigator.serviceWorker.controller?.postMessage({ action: "skipWaiting" });
  }
}

// Setup settings event listeners
function setupSettingsListeners() {
  const backupBtn = document.getElementById("backup-btn");
  const restoreBtn = document.getElementById("restore-btn");
  const restoreFileInput = document.getElementById("restore-file-input");

  if (backupBtn) {
    backupBtn.addEventListener("click", window.exportBackup);
  }

  if (restoreBtn) {
    restoreBtn.addEventListener("click", window.importBackup);
  }

  if (restoreFileInput) {
    restoreFileInput.addEventListener("change", window.handleFileImport);
  }

  // Check storage status when settings tab is opened
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      const tabName = e.target.onclick.toString().match(/switchTab\('(.+?)'\)/);
      if (tabName && tabName[1] === "settings") {
        setTimeout(window.checkStorageStatus, 100);
      }
    });
  });
}
