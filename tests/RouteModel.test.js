/**
 * Tests for RouteModel functionality
 */
import { RouteModel } from "../src/models/RouteModel.js";

describe("RouteModel", () => {
  let model;

  beforeEach(() => {
    model = new RouteModel();
  });

  describe("constructor", () => {
    test("should initialize RouteModel", () => {
      expect(model).toBeDefined();
    });
  });

  describe("fileToArrayBuffer", () => {
    test("should convert File to ArrayBuffer", async () => {
      const mockFile = new File(["test content"], "test.jpg", {
        type: "image/jpeg",
      });

      // Mock FileReader
      global.FileReader = jest.fn(() => ({
        readAsArrayBuffer: jest.fn(),
        onload: null,
        onerror: null,
        result: new ArrayBuffer(8),
      }));

      const readerInstance = new global.FileReader();
      readerInstance.readAsArrayBuffer = jest.fn(function () {
        this.onload({ target: { result: new ArrayBuffer(8) } });
      });

      global.FileReader = jest.fn(() => readerInstance);

      const result = await model.fileToArrayBuffer(mockFile);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe("arrayBufferToBlob", () => {
    test("should convert ArrayBuffer to Blob", () => {
      const buffer = new ArrayBuffer(8);
      const blob = model.arrayBufferToBlob(buffer);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/jpeg");
    });

    test("should use custom type", () => {
      const buffer = new ArrayBuffer(8);
      const blob = model.arrayBufferToBlob(buffer, "image/png");

      expect(blob.type).toBe("image/png");
    });
  });

  describe("createImageURL", () => {
    test("should return null for route without image", () => {
      const route = { name: "Test Route" };
      const url = model.createImageURL(route);

      expect(url).toBeNull();
    });

    test("should create URL for route with image", () => {
      const route = {
        name: "Test Route",
        image: new ArrayBuffer(8),
      };

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => "blob:test-url");

      const url = model.createImageURL(route);

      expect(url).toBe("blob:test-url");
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
