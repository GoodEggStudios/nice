/**
 * E2E tests for embed routes
 *
 * Tests embed.js and embed page serving through the worker.
 */

import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

describe("Embed", () => {
  describe("GET /embed.js", () => {
    it("should serve JavaScript with correct content type", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");

      expect(res.status).toBe(200);
      const ct = res.headers.get("Content-Type") || "";
      expect(ct).toContain("javascript");
    });

    it("should include CORS headers for cross-site embedding", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("should contain embed initialization code", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");
      const body = await res.text();

      expect(body).toContain("nice-embed");
      expect(body).toContain("data-button");
    });
  });

  describe("GET /embed/:button_id", () => {
    it("should serve HTML with the button ID embedded", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789");

      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain("n_abc123456789");
      expect(body).toContain("<!DOCTYPE html");
    });

    it("should apply theme parameter", async () => {
      const resLight = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?theme=light");
      const resDark = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?theme=dark");

      const lightBody = await resLight.text();
      const darkBody = await resDark.text();

      // Different themes should produce different HTML
      expect(lightBody).not.toBe(darkBody);
    });

    it("should apply size parameter", async () => {
      const resMd = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?size=md");
      const resXl = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?size=xl");

      const mdBody = await resMd.text();
      const xlBody = await resXl.text();

      expect(mdBody).not.toBe(xlBody);
    });

    it("should include frame-friendly headers", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789");

      // Embeds must be frameable from any site
      const xfo = res.headers.get("X-Frame-Options");
      const csp = res.headers.get("Content-Security-Policy");

      // Should either not have X-Frame-Options or have ALLOWALL
      if (xfo) {
        expect(xfo.toUpperCase()).toContain("ALLOW");
      }
      // CSP frame-ancestors should allow all
      if (csp) {
        expect(csp).toContain("frame-ancestors");
      }
    });

    it("should return 400 for invalid button ID", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/not_valid");

      expect(res.status).toBe(400);
    });

    it("should fall back to defaults for invalid theme/size", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/embed/n_abc123456789?theme=neon&size=xxxl"
      );

      // Should still serve successfully with defaults
      expect(res.status).toBe(200);
    });
  });

  describe("GET /e/:button_id (short URL)", () => {
    it("should serve same content as /embed/:id", async () => {
      const resLong = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?theme=dark");
      const resShort = await SELF.fetch("https://api.nice.sbs/e/n_abc123456789?theme=dark");

      expect(resShort.status).toBe(200);
      const longBody = await resLong.text();
      const shortBody = await resShort.text();
      expect(longBody).toBe(shortBody);
    });
  });
});
