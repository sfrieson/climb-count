let app;

function switchTab(tabName) {
  if (app && app.controller) {
    app.controller.handleTabSwitch(tabName);
  }
}

function logAttempt() {
  if (app && app.controller) {
    app.controller.logAttempt();
  }
}

function finishSession() {
  if (app && app.controller) {
    app.controller.finishSession();
  }
}

function clearSession() {
  if (app && app.controller) {
    app.controller.clearSession();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const model = new ClimbModel();
  const view = new ClimbView();
  const controller = new ClimbController(model, view);

  app = {
    model,
    view,
    controller,
  };

  // Register Service Worker for PWA functionality
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").then(
        function (registration) {
          console.log(
            "ServiceWorker registration successful with scope: ",
            registration.scope
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
        }
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
      "A new version of Climb Count is available. Would you like to update now?"
    )
  ) {
    // Tell the service worker to skip waiting and take control
    navigator.serviceWorker.controller?.postMessage({ action: "skipWaiting" });
  }
}
