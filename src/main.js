import { ClimbModel } from "./models/ClimbModel.js";
import { ClimbView } from "./views/ClimbView.js";
import { ClimbController } from "./controllers/ClimbController.js";
import { RouteModel } from "./models/RouteModel.js";
import { RouteView } from "./views/RouteView.js";
import { RouteController } from "./controllers/RouteController.js";

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

window.finishSession = function () {
  if (app && app.controller) {
    app.controller.finishSession();
  }
};

window.clearSession = function () {
  if (app && app.controller) {
    app.controller.clearSession();
  }
};

document.addEventListener("DOMContentLoaded", function () {
  const model = new ClimbModel();
  const view = new ClimbView();
  const controller = new ClimbController(model, view);

  const routeModel = new RouteModel();
  const routeView = new RouteView();
  const routeController = new RouteController(routeModel, routeView);

  app = {
    model,
    view,
    controller,
    routeModel,
    routeView,
    routeController,
  };

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
function showUpdateNotification() {
  if (
    confirm(
      "A new version of Climb Count is available. Would you like to update now?",
    )
  ) {
    // Tell the service worker to skip waiting and take control
    navigator.serviceWorker.controller?.postMessage({ action: "skipWaiting" });
  }
}
