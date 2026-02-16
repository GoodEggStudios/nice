import { describe, it, expect } from "vitest";
import { sha256, computeVisitorHash, hashToken } from "../../src/lib/hash";

describe("hash utilities", () => {
  describe("sha256", () => {
    it("should produce consistent hashes for same input", async () => {
      const hash1 = await sha256("hello world");
      const hash2 = await sha256("hello world");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", async () => {
      const hash1 = await sha256("hello");
      const hash2 = await sha256("world");
      expect(hash1).not.toBe(hash2);
    });

    it("should produce a 64-character hex string", async () => {
      const hash = await sha256("test");
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it("should match known SHA-256 output", async () => {
      // Known hash for "hello world"
      const hash = await sha256("hello world");
      expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    });

    it("should handle empty string", async () => {
      const hash = await sha256("");
      // Known hash for empty string
      expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    it("should handle unicode characters", async () => {
      const hash = await sha256("你好世界");
      expect(hash.length).toBe(64);
    });
  });

  describe("computeVisitorHash", () => {
    it("should produce consistent hashes for same inputs", async () => {
      const hash1 = await computeVisitorHash("1.2.3.4", "fp123", "btn_abc", "salt123");
      const hash2 = await computeVisitorHash("1.2.3.4", "fp123", "btn_abc", "salt123");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different IPs", async () => {
      const hash1 = await computeVisitorHash("1.2.3.4", "fp123", "btn_abc", "salt123");
      const hash2 = await computeVisitorHash("5.6.7.8", "fp123", "btn_abc", "salt123");
      expect(hash1).not.toBe(hash2);
    });

    it("should produce different hashes for different fingerprints", async () => {
      const hash1 = await computeVisitorHash("1.2.3.4", "fp123", "btn_abc", "salt123");
      const hash2 = await computeVisitorHash("1.2.3.4", "fp456", "btn_abc", "salt123");
      expect(hash1).not.toBe(hash2);
    });

    it("should produce different hashes for different buttons", async () => {
      const hash1 = await computeVisitorHash("1.2.3.4", "fp123", "btn_abc", "salt123");
      const hash2 = await computeVisitorHash("1.2.3.4", "fp123", "btn_xyz", "salt123");
      expect(hash1).not.toBe(hash2);
    });

    it("should produce different hashes for different salts", async () => {
      const hash1 = await computeVisitorHash("1.2.3.4", "fp123", "btn_abc", "salt123");
      const hash2 = await computeVisitorHash("1.2.3.4", "fp123", "btn_abc", "salt456");
      expect(hash1).not.toBe(hash2);
    });

    it("should return a 64-character hex string", async () => {
      const hash = await computeVisitorHash("1.2.3.4", "fp123", "btn_abc", "salt123");
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe("hashToken", () => {
    it("should produce consistent hashes for same token", async () => {
      const hash1 = await hashToken("nice_abcdef123456");
      const hash2 = await hashToken("nice_abcdef123456");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different tokens", async () => {
      const hash1 = await hashToken("nice_token1");
      const hash2 = await hashToken("nice_token2");
      expect(hash1).not.toBe(hash2);
    });

    it("should return a 64-character hex string", async () => {
      const hash = await hashToken("nice_sometoken");
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });
});
