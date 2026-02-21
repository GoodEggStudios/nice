import { describe, it, expect } from "vitest";
import {
  generatePublicId,
  generatePrivateId,
  isValidPublicId,
  isValidPrivateId,
  isValidButtonId,
} from "../../src/lib/ids";

describe("ID utilities", () => {
  describe("generatePublicId", () => {
    it("should generate ID with n_ prefix", () => {
      const id = generatePublicId();
      expect(id.startsWith("n_")).toBe(true);
    });

    it("should generate 12 character payload", () => {
      const id = generatePublicId();
      const payload = id.slice(2);
      expect(payload.length).toBe(12);
    });

    it("should generate base62 characters only", () => {
      const id = generatePublicId();
      const payload = id.slice(2);
      expect(/^[0-9A-Za-z]+$/.test(payload)).toBe(true);
    });

    it("should generate unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generatePublicId()));
      expect(ids.size).toBe(100);
    });
  });

  describe("generatePrivateId", () => {
    it("should generate ID with ns_ prefix", () => {
      const id = generatePrivateId();
      expect(id.startsWith("ns_")).toBe(true);
    });

    it("should generate 20 character payload", () => {
      const id = generatePrivateId();
      const payload = id.slice(3);
      expect(payload.length).toBe(20);
    });

    it("should generate base62 characters only", () => {
      const id = generatePrivateId();
      const payload = id.slice(3);
      expect(/^[0-9A-Za-z]+$/.test(payload)).toBe(true);
    });

    it("should generate unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generatePrivateId()));
      expect(ids.size).toBe(100);
    });
  });

  describe("isValidPublicId", () => {
    it("should accept valid public ID (12 chars)", () => {
      expect(isValidPublicId("n_x7Kf9mQ2Ab3Z")).toBe(true);
      expect(isValidPublicId("n_ABCD12345678")).toBe(true);
      expect(isValidPublicId("n_000000000000")).toBe(true);
    });

    it("should accept valid public ID (8 chars - legacy)", () => {
      expect(isValidPublicId("n_x7Kf9mQ2")).toBe(true);
      expect(isValidPublicId("n_ABCD1234")).toBe(true);
    });

    it("should reject invalid prefix", () => {
      expect(isValidPublicId("ns_x7Kf9mQ2Ab3Z")).toBe(false);
      expect(isValidPublicId("btn_x7Kf9mQ2")).toBe(false);
    });

    it("should reject wrong length", () => {
      expect(isValidPublicId("n_short")).toBe(false);
      expect(isValidPublicId("n_toolongpayloadhere")).toBe(false);
      expect(isValidPublicId("n_")).toBe(false);
    });

    it("should reject invalid characters", () => {
      expect(isValidPublicId("n_x7Kf-mQ2Ab3Z")).toBe(false);
      expect(isValidPublicId("n_x7Kf_mQ2Ab3Z")).toBe(false);
    });
  });

  describe("isValidPrivateId", () => {
    it("should accept valid private ID", () => {
      expect(isValidPrivateId("ns_4vK9mPq8wL2nRt5xYz7b")).toBe(true);
      expect(isValidPrivateId("ns_ABCDEFGHIJ1234567890")).toBe(true);
    });

    it("should reject invalid prefix", () => {
      expect(isValidPrivateId("n_4vK9mPq8wL2nRt5xYz7b")).toBe(false);
    });

    it("should reject wrong length", () => {
      expect(isValidPrivateId("ns_short")).toBe(false);
      expect(isValidPrivateId("ns_")).toBe(false);
    });
  });

  describe("isValidButtonId", () => {
    it("should accept public IDs", () => {
      expect(isValidButtonId("n_x7Kf9mQ2Ab3Z")).toBe(true);
      expect(isValidButtonId("n_x7Kf9mQ2")).toBe(true);
    });

    it("should reject private IDs", () => {
      expect(isValidButtonId("ns_4vK9mPq8wL2nRt5xYz7b")).toBe(false);
    });

    it("should reject legacy btn_ IDs", () => {
      expect(isValidButtonId("btn_mOZiijcdVF60M1l0")).toBe(false);
    });

    it("should reject invalid IDs", () => {
      expect(isValidButtonId("invalid")).toBe(false);
      expect(isValidButtonId("")).toBe(false);
    });
  });
});
