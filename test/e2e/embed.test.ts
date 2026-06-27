/**
 * E2E tests for embed routes
 *
 * Tests embed.js and embed page serving through the worker.
 */

import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";
import { renderEmbedScript } from "../../src/routes/embed";

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

    it("should point iframe embeds back to the API host", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");
      const body = await res.text();

      expect(body).toContain("const EMBED_BASE='https://api.nice.sbs'");
      expect(body).not.toContain("const EMBED_BASE='https://nice.sbs'");
    });

    it("should style generated iframes as transparent", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");
      const body = await res.text();

      expect(body).toContain("background:transparent;border:none;overflow:hidden");
      expect(body).toContain("display:block");
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

    it("should render the root document with a transparent background", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789");
      const body = await res.text();

      expect(body).toContain("html,body{background:transparent}");
    });

    it("should size the iframe to the padded transparent document", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789");
      const body = await res.text();

      expect(body).toContain("justify-content:center;padding:2px");
      expect(body).toContain("const root=document.documentElement;");
      expect(body).toContain("width:Math.ceil(root.scrollWidth),height:Math.ceil(root.scrollHeight)");
      expect(body).not.toContain("width:Math.ceil(rect.width)+8,height:Math.ceil(rect.height)+8");
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

  it("should serve the shared embed script byte-for-byte", async () => {
    const res = await SELF.fetch("https://api.nice.sbs/embed.js");

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(renderEmbedScript());
  });

  it("should keep supported themes and sizes rendering through shared helpers", async () => {
    const res = await SELF.fetch(
      "https://api.nice.sbs/embed/n_abc123456789?theme=mono-light&size=sm"
    );

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('class="theme-mono-light size-sm"');
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
