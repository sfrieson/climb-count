/**
 * Test setup for Jest
 */

// Add TextEncoder/TextDecoder polyfills if not already defined
if (typeof TextEncoder === "undefined") {
  global.TextEncoder = require("util").TextEncoder;
}
if (typeof TextDecoder === "undefined") {
  global.TextDecoder = require("util").TextDecoder;
}

// Mock IndexedDB
global.indexedDB = {
  open: jest.fn(),
};

// Mock URL.createObjectURL
global.URL = {
  createObjectURL: jest.fn(() => "mock-object-url"),
  revokeObjectURL: jest.fn(),
};

// Mock FileReader
global.FileReader = class {
  readAsArrayBuffer() {
    setTimeout(() => {
      this.onload({ target: { result: new ArrayBuffer(8) } });
    }, 0);
  }
  readAsDataURL() {
    setTimeout(() => {
      this.onload({ target: { result: "data:image/png;base64,mock" } });
    }, 0);
  }
};
