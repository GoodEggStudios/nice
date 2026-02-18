import { describe, it, expect } from "vitest";

// Regex copied from embed.ts for testing
const BUTTON_ID_V1_REGEX = /^btn_[A-Za-z0-9_-]{16}$/;
const BUTTON_ID_V2_REGEX = /^n_[A-Za-z0-9]{8,12}$/;

function isValidButtonIdFormat(id: string): boolean {
  return BUTTON_ID_V1_REGEX.test(id) || BUTTON_ID_V2_REGEX.test(id);
}

describe("Embed ID validation", () => {
  describe("isValidButtonIdFormat", () => {
    it("should accept v1 button IDs (btn_xxx 16 chars)", () => {
      expect(isValidButtonIdFormat("btn_mOZiijcdVF60M1l0")).toBe(true);
      expect(isValidButtonIdFormat("btn_ABCDEFGHIJKLMNOP")).toBe(true);
      expect(isValidButtonIdFormat("btn_I79oNtbz6FxKURsg")).toBe(true);
    });

    it("should accept v2 button IDs (n_xxx 8 chars - legacy)", () => {
      expect(isValidButtonIdFormat("n_x7Kf9mQ2")).toBe(true);
      expect(isValidButtonIdFormat("n_ABCD1234")).toBe(true);
      expect(isValidButtonIdFormat("n_00000000")).toBe(true);
    });

    it("should accept v2 button IDs (n_xxx 12 chars - new)", () => {
      expect(isValidButtonIdFormat("n_fjaDqwJ3ZFXM")).toBe(true);
      expect(isValidButtonIdFormat("n_ABCDEFGHIJKL")).toBe(true);
      expect(isValidButtonIdFormat("n_000000000000")).toBe(true);
    });

    it("should accept v2 button IDs between 8-12 chars", () => {
      expect(isValidButtonIdFormat("n_12345678")).toBe(true);     // 8
      expect(isValidButtonIdFormat("n_123456789")).toBe(true);    // 9
      expect(isValidButtonIdFormat("n_1234567890")).toBe(true);   // 10
      expect(isValidButtonIdFormat("n_12345678901")).toBe(true);  // 11
      expect(isValidButtonIdFormat("n_123456789012")).toBe(true); // 12
    });

    it("should reject v2 IDs with wrong length", () => {
      expect(isValidButtonIdFormat("n_short")).toBe(false);       // 5 chars
      expect(isValidButtonIdFormat("n_1234567")).toBe(false);     // 7 chars
      expect(isValidButtonIdFormat("n_1234567890123")).toBe(false); // 13 chars
    });

    it("should reject invalid prefixes", () => {
      expect(isValidButtonIdFormat("x_12345678")).toBe(false);
      expect(isValidButtonIdFormat("ns_12345678")).toBe(false);
      expect(isValidButtonIdFormat("button_1234")).toBe(false);
    });

    it("should reject invalid characters", () => {
      expect(isValidButtonIdFormat("n_x7Kf-mQ2")).toBe(false);  // dash
      expect(isValidButtonIdFormat("n_x7Kf_mQ2")).toBe(false);  // underscore
      expect(isValidButtonIdFormat("n_x7Kf mQ2")).toBe(false);  // space
      expect(isValidButtonIdFormat("n_x7Kf.mQ2")).toBe(false);  // dot
    });

    it("should reject empty or invalid input", () => {
      expect(isValidButtonIdFormat("")).toBe(false);
      expect(isValidButtonIdFormat("n_")).toBe(false);
      expect(isValidButtonIdFormat("btn_")).toBe(false);
    });
  });
});
