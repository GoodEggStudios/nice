import { describe, it, expect } from "vitest";
import {
  normalizeUrl,
  extractUrlDomain,
  isValidHttpUrl,
  urlsMatch,
  domainsMatch,
} from "../../src/lib/url";

describe("URL utilities", () => {
  describe("normalizeUrl", () => {
    it("should lowercase hostname", () => {
      expect(normalizeUrl("https://EXAMPLE.COM/path")).toBe(
        "https://example.com/path"
      );
      expect(normalizeUrl("https://Example.Com/Path")).toBe(
        "https://example.com/Path"
      );
    });

    it("should strip query parameters", () => {
      expect(normalizeUrl("https://example.com/page?foo=bar")).toBe(
        "https://example.com/page"
      );
      expect(normalizeUrl("https://example.com/page?a=1&b=2")).toBe(
        "https://example.com/page"
      );
    });

    it("should strip fragments", () => {
      expect(normalizeUrl("https://example.com/page#section")).toBe(
        "https://example.com/page"
      );
    });

    it("should strip trailing slash except for root", () => {
      expect(normalizeUrl("https://example.com/page/")).toBe(
        "https://example.com/page"
      );
      expect(normalizeUrl("https://example.com/")).toBe(
        "https://example.com/"
      );
    });

    it("should preserve path case", () => {
      expect(normalizeUrl("https://example.com/MyPath/SubPath")).toBe(
        "https://example.com/MyPath/SubPath"
      );
    });

    it("should return null for invalid URLs", () => {
      expect(normalizeUrl("not-a-url")).toBeNull();
      expect(normalizeUrl("")).toBeNull();
      expect(normalizeUrl("ftp://example.com")).toBe("ftp://example.com/"); // valid URL, just not http
    });
  });

  describe("extractUrlDomain", () => {
    it("should extract domain from URL", () => {
      expect(extractUrlDomain("https://example.com/page")).toBe("example.com");
      expect(extractUrlDomain("https://sub.example.com/")).toBe(
        "sub.example.com"
      );
    });

    it("should lowercase domain", () => {
      expect(extractUrlDomain("https://EXAMPLE.COM/")).toBe("example.com");
      expect(extractUrlDomain("https://Example.Com/")).toBe("example.com");
    });

    it("should return null for invalid URLs", () => {
      expect(extractUrlDomain("not-a-url")).toBeNull();
      expect(extractUrlDomain("")).toBeNull();
    });
  });

  describe("isValidHttpUrl", () => {
    it("should accept http URLs", () => {
      expect(isValidHttpUrl("http://example.com")).toBe(true);
      expect(isValidHttpUrl("http://example.com/page")).toBe(true);
    });

    it("should accept https URLs", () => {
      expect(isValidHttpUrl("https://example.com")).toBe(true);
      expect(isValidHttpUrl("https://example.com/page?q=1")).toBe(true);
    });

    it("should reject non-http protocols", () => {
      expect(isValidHttpUrl("ftp://example.com")).toBe(false);
      expect(isValidHttpUrl("file:///path")).toBe(false);
      expect(isValidHttpUrl("mailto:test@example.com")).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(isValidHttpUrl("not-a-url")).toBe(false);
      expect(isValidHttpUrl("")).toBe(false);
      expect(isValidHttpUrl("example.com")).toBe(false); // no protocol
    });
  });

  describe("urlsMatch", () => {
    it("should match identical URLs", () => {
      expect(
        urlsMatch("https://example.com/page", "https://example.com/page")
      ).toBe(true);
    });

    it("should match URLs with different cases in hostname", () => {
      expect(
        urlsMatch("https://EXAMPLE.COM/page", "https://example.com/page")
      ).toBe(true);
    });

    it("should match URLs with and without trailing slash", () => {
      expect(
        urlsMatch("https://example.com/page/", "https://example.com/page")
      ).toBe(true);
    });

    it("should match URLs ignoring query params", () => {
      expect(
        urlsMatch("https://example.com/page?a=1", "https://example.com/page?b=2")
      ).toBe(true);
    });

    it("should match URLs ignoring fragments", () => {
      expect(
        urlsMatch("https://example.com/page#top", "https://example.com/page#bottom")
      ).toBe(true);
    });

    it("should not match different paths", () => {
      expect(
        urlsMatch("https://example.com/page1", "https://example.com/page2")
      ).toBe(false);
    });

    it("should not match different domains", () => {
      expect(
        urlsMatch("https://example.com/page", "https://other.com/page")
      ).toBe(false);
    });

    it("should preserve path case sensitivity", () => {
      expect(
        urlsMatch("https://example.com/Page", "https://example.com/page")
      ).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(urlsMatch("not-a-url", "https://example.com")).toBe(false);
      expect(urlsMatch("https://example.com", "not-a-url")).toBe(false);
    });
  });

  describe("domainsMatch", () => {
    it("should match same domain", () => {
      expect(
        domainsMatch("https://example.com/page1", "https://example.com/page2")
      ).toBe(true);
    });

    it("should match ignoring case", () => {
      expect(
        domainsMatch("https://EXAMPLE.COM/", "https://example.com/")
      ).toBe(true);
    });

    it("should not match subdomains", () => {
      expect(
        domainsMatch("https://sub.example.com/", "https://example.com/")
      ).toBe(false);
    });

    it("should not match different domains", () => {
      expect(
        domainsMatch("https://example.com/", "https://other.com/")
      ).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(domainsMatch("not-a-url", "https://example.com")).toBe(false);
    });
  });
});
