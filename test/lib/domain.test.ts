import { describe, it, expect } from "vitest";
import {
  isValidDomain,
  normalizeDomain,
  extractDomain,
  urlMatchesDomain,
  getVerificationRecordName,
} from "../../src/lib/domain";

describe("domain utilities", () => {
  describe("isValidDomain", () => {
    it("should accept valid domains", () => {
      expect(isValidDomain("example.com")).toBe(true);
      expect(isValidDomain("blog.example.com")).toBe(true);
      expect(isValidDomain("sub.blog.example.com")).toBe(true);
      expect(isValidDomain("my-site.example.co.uk")).toBe(true);
      expect(isValidDomain("123.example.com")).toBe(true);
      expect(isValidDomain("a.co")).toBe(true);
    });

    it("should reject domains without TLD", () => {
      expect(isValidDomain("example")).toBe(false);
      expect(isValidDomain("localhost")).toBe(false);
    });

    it("should reject domains with protocol", () => {
      expect(isValidDomain("http://example.com")).toBe(false);
      expect(isValidDomain("https://example.com")).toBe(false);
    });

    it("should reject domains with path", () => {
      expect(isValidDomain("example.com/path")).toBe(false);
    });

    it("should reject domains with port", () => {
      expect(isValidDomain("example.com:8080")).toBe(false);
    });

    it("should reject invalid characters", () => {
      expect(isValidDomain("example_site.com")).toBe(false);
      expect(isValidDomain("example site.com")).toBe(false);
      expect(isValidDomain("example!.com")).toBe(false);
    });

    it("should reject empty or null input", () => {
      expect(isValidDomain("")).toBe(false);
      expect(isValidDomain(null as any)).toBe(false);
      expect(isValidDomain(undefined as any)).toBe(false);
    });

    it("should reject domains that are too long", () => {
      const longDomain = "a".repeat(250) + ".com";
      expect(isValidDomain(longDomain)).toBe(false);
    });

    it("should reject labels that are too long", () => {
      const longLabel = "a".repeat(64) + ".com";
      expect(isValidDomain(longLabel)).toBe(false);
    });

    it("should reject domains starting or ending with hyphen", () => {
      expect(isValidDomain("-example.com")).toBe(false);
      expect(isValidDomain("example-.com")).toBe(false);
    });
  });

  describe("normalizeDomain", () => {
    it("should convert to lowercase", () => {
      expect(normalizeDomain("EXAMPLE.COM")).toBe("example.com");
      expect(normalizeDomain("Example.Com")).toBe("example.com");
    });

    it("should remove trailing dot", () => {
      expect(normalizeDomain("example.com.")).toBe("example.com");
    });

    it("should remove www prefix", () => {
      expect(normalizeDomain("www.example.com")).toBe("example.com");
      expect(normalizeDomain("WWW.example.com")).toBe("example.com");
    });

    it("should trim whitespace", () => {
      expect(normalizeDomain("  example.com  ")).toBe("example.com");
    });

    it("should handle all transformations together", () => {
      expect(normalizeDomain("  WWW.EXAMPLE.COM.  ")).toBe("example.com");
    });
  });

  describe("extractDomain", () => {
    it("should extract domain from valid URLs", () => {
      expect(extractDomain("https://example.com")).toBe("example.com");
      expect(extractDomain("https://example.com/path")).toBe("example.com");
      expect(extractDomain("https://blog.example.com/path?query=1")).toBe("blog.example.com");
      expect(extractDomain("http://example.com:8080/path")).toBe("example.com");
    });

    it("should return null for invalid URLs", () => {
      expect(extractDomain("not a url")).toBe(null);
      expect(extractDomain("example.com")).toBe(null);
      expect(extractDomain("")).toBe(null);
    });
  });

  describe("urlMatchesDomain", () => {
    it("should match exact domain", () => {
      expect(urlMatchesDomain("https://example.com/page", "example.com")).toBe(true);
    });

    it("should match with www", () => {
      expect(urlMatchesDomain("https://www.example.com/page", "example.com")).toBe(true);
    });

    it("should match subdomains", () => {
      expect(urlMatchesDomain("https://blog.example.com/page", "example.com")).toBe(true);
      expect(urlMatchesDomain("https://app.blog.example.com/page", "example.com")).toBe(true);
    });

    it("should not match different domains", () => {
      expect(urlMatchesDomain("https://evil.com/page", "example.com")).toBe(false);
      expect(urlMatchesDomain("https://notexample.com/page", "example.com")).toBe(false);
    });

    it("should not match partial domain names", () => {
      // myexample.com should NOT match example.com
      expect(urlMatchesDomain("https://myexample.com/page", "example.com")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(urlMatchesDomain("not a url", "example.com")).toBe(false);
    });

    it("should handle case insensitively", () => {
      expect(urlMatchesDomain("https://EXAMPLE.COM/page", "example.com")).toBe(true);
      expect(urlMatchesDomain("https://example.com/page", "EXAMPLE.COM")).toBe(true);
    });
  });

  describe("getVerificationRecordName", () => {
    it("should return correct TXT record name", () => {
      expect(getVerificationRecordName("example.com")).toBe("_nice-verify.example.com");
    });

    it("should normalize domain first", () => {
      expect(getVerificationRecordName("WWW.EXAMPLE.COM")).toBe("_nice-verify.example.com");
    });
  });
});
