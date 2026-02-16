import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { env } from "cloudflare:test";
import {
  getDailySalt,
  getCurrentDateUTC,
  getDeterministicSalt,
} from "../../src/lib/salt";

describe("salt utilities", () => {
  describe("getCurrentDateUTC", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return date in YYYY-MM-DD format", () => {
      vi.setSystemTime(new Date("2025-02-15T10:30:00Z"));
      expect(getCurrentDateUTC()).toBe("2025-02-15");
    });

    it("should use UTC timezone", () => {
      // 11pm UTC = next day in many timezones
      vi.setSystemTime(new Date("2025-02-15T23:30:00Z"));
      expect(getCurrentDateUTC()).toBe("2025-02-15");
    });

    it("should handle month boundaries", () => {
      vi.setSystemTime(new Date("2025-01-31T12:00:00Z"));
      expect(getCurrentDateUTC()).toBe("2025-01-31");
    });
  });

  describe("getDailySalt", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-02-15T10:30:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should generate a salt on first call", async () => {
      const salt = await getDailySalt(env.NICE_KV);
      expect(salt).toBeTruthy();
      expect(salt.length).toBe(64); // 32 bytes as hex
    });

    it("should return same salt for same day", async () => {
      const salt1 = await getDailySalt(env.NICE_KV);
      const salt2 = await getDailySalt(env.NICE_KV);
      expect(salt1).toBe(salt2);
    });

    it("should generate new salt for new day", async () => {
      const salt1 = await getDailySalt(env.NICE_KV);

      // Move to next day
      vi.setSystemTime(new Date("2025-02-16T10:30:00Z"));

      const salt2 = await getDailySalt(env.NICE_KV);
      expect(salt1).not.toBe(salt2);
    });

    it("should store salt in KV", async () => {
      const salt = await getDailySalt(env.NICE_KV);
      const stored = await env.NICE_KV.get("config:daily_salt", "json") as { salt: string; date: string };

      expect(stored).toBeTruthy();
      expect(stored.salt).toBe(salt);
      expect(stored.date).toBe("2025-02-15");
    });
  });

  describe("getDeterministicSalt", () => {
    it("should produce consistent salts for same inputs", async () => {
      const salt1 = await getDeterministicSalt("secret", "2025-02-15");
      const salt2 = await getDeterministicSalt("secret", "2025-02-15");
      expect(salt1).toBe(salt2);
    });

    it("should produce different salts for different dates", async () => {
      const salt1 = await getDeterministicSalt("secret", "2025-02-15");
      const salt2 = await getDeterministicSalt("secret", "2025-02-16");
      expect(salt1).not.toBe(salt2);
    });

    it("should produce different salts for different secrets", async () => {
      const salt1 = await getDeterministicSalt("secret1", "2025-02-15");
      const salt2 = await getDeterministicSalt("secret2", "2025-02-15");
      expect(salt1).not.toBe(salt2);
    });

    it("should return a 64-character hex string", async () => {
      const salt = await getDeterministicSalt("secret", "2025-02-15");
      expect(salt.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(salt)).toBe(true);
    });
  });
});
