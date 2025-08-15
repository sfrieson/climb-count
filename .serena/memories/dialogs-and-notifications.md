# Dialogs and Notifications

This application has custom built dialogs and notifications implemented in `src/utils/DialogUtils.js`.

## Features

The `DialogUtils` class provides:

### Confirmation Dialogs

- **Method**: `dialogUtils.showConfirm(message, title)`
- **Returns**: Promise<boolean> - true if confirmed, false if cancelled
- **Example**:
  ```javascript
  const confirmed = await dialogUtils.showConfirm(
    "Delete this route?",
    "Confirm Deletion",
  );
  if (confirmed) {
    // User clicked Confirm
  }
  ```

### Toast Notifications

- **Methods**:
  - `dialogUtils.showSuccess(message)` - Green success toast
  - `dialogUtils.showError(message)` - Red error toast
  - `dialogUtils.showWarning(message)` - Yellow warning toast
  - `dialogUtils.showInfo(message)` - Blue info toast
  - `dialogUtils.showToast(message, type, duration)` - Generic toast
- **Example**:
  ```javascript
  dialogUtils.showSuccess("Route saved successfully!");
  dialogUtils.showError("Failed to save route");
  ```

## Usage

Import and use throughout the application:

```javascript
import { dialogUtils } from "../utils/DialogUtils.js";
```

Used extensively in controllers and views for user feedback and confirmations.
