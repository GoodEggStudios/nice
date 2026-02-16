import { describe, it, expect } from "vitest";
import {
  generateToken,
  isValidTokenFormat,
  generateButtonId,
  generateSiteId,
} from "../../src/lib/token";

describe("token utilities", () => {
  describe("generateToken", () => {
    it("should generate a token with nice_ prefix", () => {
      const token = generateToken();
      expect(token.startsWith("nice_")).toBe(true);
    });

    it("should generate a token of correct length", () => {
      const token = generateToken();
      // 5 (prefix) + 43 (base64url of 32 bytes) = 48
      expect(token.length).toBe(48);
    });

    it("should generate unique tokens", () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      expect(tokens.size).toBe(100);
    });

    it("should only contain valid base64url characters after prefix", () => {
      const token = generateToken();
      const payload = token.slice(5);
      expect(/^[A-Za-z0-9_-]+$/.test(payload)).toBe(true);
    });
  });

  describe("isValidTokenFormat", () => {
    it("should return true for valid tokens", () => {
      const token = generateToken();
      expect(isValidTokenFormat(token)).toBe(true);
    });

    it("should return false for tokens without prefix", () => {
      expect(isValidTokenFormat("abc123")).toBe(false);
    });

    it("should return false for tokens with wrong prefix", () => {
      expect(isValidTokenFormat("bad_abcdefghijklmnopqrstuvwxyz1234567890ABC")).toBe(false);
    });

    it("should return false for tokens that are too short", () => {
      expect(isValidTokenFormat("nice_tooshort")).toBe(false);
    });

    it("should return false for tokens that are too long", () => {
      expect(isValidTokenFormat("nice_" + "a".repeat(50))).toBe(false);
    });

    it("should return false for tokens with invalid characters", () => {
      expect(isValidTokenFormat("nice_abc!@#$%^&*()")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidTokenFormat("")).toBe(false);
    });
  });

  describe("generateButtonId", () => {
    it("should generate an ID with btn_ prefix", () => {
      const id = generateButtonId();
      expect(id.startsWith("btn_")).toBe(true);
    });

    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateButtonId());
      }
      expect(ids.size).toBe(100);
    });

    it("should only contain valid base64url characters after prefix", () => {
      const id = generateButtonId();
      const payload = id.slice(4);
      expect(/^[A-Za-z0-9_-]+$/.test(payload)).toBe(true);
    });
  });

  describe("generateSiteId", () => {
    it("should generate an ID with site_ prefix", () => {
      const id = generateSiteId();
      expect(id.startsWith("site_")).toBe(true);
    });

    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSiteId());
      }
      expect(ids.size).toBe(100);
    });

    it("should only contain valid base64url characters after prefix", () => {
      const id = generateSiteId();
      const payload = id.slice(5);
      expect(/^[A-Za-z0-9_-]+$/.test(payload)).toBe(true);
    });
  });
});
