/**
 * Custom dialog and toast notification utilities
 */

class DialogUtils {
  constructor() {
    this.activeToasts = [];
    this.toastContainer = null;
    this.initializeToastContainer();
  }

  /**
   * Initialize the toast container
   */
  initializeToastContainer() {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement("div");
      this.toastContainer.id = "toast-container";
      this.toastContainer.className = "toast-container";
      document.body.appendChild(this.toastContainer);
    }
  }

  /**
   * Show a confirmation dialog
   * @param {string} message - The confirmation message
   * @param {string} title - Optional title for the dialog
   * @returns {Promise<boolean>} - Promise that resolves to true if confirmed, false if cancelled
   */
  async showConfirm(message, title = "Confirm") {
    return new Promise((resolve) => {
      // Create dialog elements
      const overlay = document.createElement("div");
      overlay.className = "dialog-overlay";

      const dialog = document.createElement("div");
      dialog.className = "dialog";

      dialog.innerHTML = `
        <div class="dialog-header">
          <h3>${title}</h3>
        </div>
        <div class="dialog-body">
          <p>${message}</p>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-secondary" data-action="cancel">Cancel</button>
          <button class="dialog-btn dialog-btn-primary" data-action="confirm">Confirm</button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Handle button clicks
      const handleClick = (e) => {
        if (e.target.dataset.action === "confirm") {
          resolve(true);
        } else if (e.target.dataset.action === "cancel") {
          resolve(false);
        }

        // Remove dialog
        overlay.removeEventListener("click", handleClick);
        document.removeEventListener("keydown", handleKeydown);
        overlay.remove();
      };

      // Handle ESC key
      const handleKeydown = (e) => {
        if (e.key === "Escape") {
          resolve(false);
          overlay.removeEventListener("click", handleClick);
          document.removeEventListener("keydown", handleKeydown);
          overlay.remove();
        }
      };

      // Add event listeners
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          resolve(false);
          overlay.removeEventListener("click", handleClick);
          document.removeEventListener("keydown", handleKeydown);
          overlay.remove();
        }
      });

      dialog.addEventListener("click", handleClick);
      document.addEventListener("keydown", handleKeydown);

      // Focus the confirm button
      setTimeout(() => {
        const confirmBtn = dialog.querySelector("[data-action=\"confirm\"]");
        confirmBtn.focus();
      }, 100);
    });
  }

  /**
   * Show a toast notification
   * @param {string} message - The toast message
   * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in milliseconds (default: 4000)
   */
  showToast(message, type = "info", duration = 4000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${this.getToastIcon(type)}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close">&times;</button>
      </div>
    `;

    // Add to container
    this.toastContainer.appendChild(toast);
    this.activeToasts.push(toast);

    // Handle close button
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
      this.removeToast(toast);
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast);
      }, duration);
    }

    // Animate in
    setTimeout(() => {
      toast.classList.add("toast-show");
    }, 10);
  }

  /**
   * Remove a toast
   * @param {HTMLElement} toast - Toast element to remove
   */
  removeToast(toast) {
    if (!toast.parentNode) return;

    toast.classList.add("toast-hide");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
      this.activeToasts = this.activeToasts.filter((t) => t !== toast);
    }, 300);
  }

  /**
   * Get icon for toast type
   * @param {string} type - Toast type
   * @returns {string} - Icon character
   */
  getToastIcon(type) {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
      default:
        return "ℹ";
    }
  }

  /**
   * Show success toast
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.showToast(message, "success");
  }

  /**
   * Show error toast
   * @param {string} message - Error message
   */
  showError(message) {
    this.showToast(message, "error");
  }

  /**
   * Show warning toast
   * @param {string} message - Warning message
   */
  showWarning(message) {
    this.showToast(message, "warning");
  }

  /**
   * Show info toast
   * @param {string} message - Info message
   */
  showInfo(message) {
    this.showToast(message, "info");
  }
}

// Create and export singleton instance
const dialogUtils = new DialogUtils();

export { dialogUtils };
