/**
 * E2E tests for worker-level concerns
 *
 * Tests routing, CORS, health check, embeds, badges.
 */

import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

describe("Worker", () => {
  describe("Health check", () => {
    it("GET / should return ok", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/");

      expect(res.status).toBe(200);
      const data = await res.json() as { status: string; service: string };
      expect(data.status).toBe("ok");
      expect(data.service).toBe("nice");
    });

    it("should include version and service name", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/");
      const data = await res.json() as { version: string; service: string };

      expect(data.version).toBeTruthy();
      expect(data.service).toBe("nice");
    });

    it("GET /health should return ok", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/health");

      expect(res.status).toBe(200);
      const data = await res.json() as { status: string };
      expect(data.status).toBe("ok");
    });
  });

  describe("CORS", () => {
    it("OPTIONS should return CORS headers", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
        method: "OPTIONS",
      });

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("DELETE");
    });

    it("should include max-age on preflight", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
        method: "OPTIONS",
      });

      expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
    });

    it("should add CORS headers to all responses", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/health");

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("should add CORS headers to 404 responses", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/nonexistent");

      expect(res.status).toBe(404);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("404 handling", () => {
    it("should return JSON 404 for unknown routes", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/api/v1/unknown");

      expect(res.status).toBe(404);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return 404 for wrong HTTP methods", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
        method: "GET",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("Favicon", () => {
    it("should serve SVG favicon", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/favicon.svg");

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/svg+xml");

      const body = await res.text();
      expect(body).toContain("<svg");
    });

    it("should serve favicon.ico as SVG", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/favicon.ico");

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    });
  });

  describe("Embed", () => {
    it("should serve embed.js", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");

      expect(res.status).toBe(200);
      const contentType = res.headers.get("Content-Type") || "";
      expect(contentType).toContain("javascript");

      const body = await res.text();
      expect(body).toContain("nice-embed");
    });

    it("should serve embed page for valid button ID", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789");

      expect(res.status).toBe(200);
      const contentType = res.headers.get("Content-Type") || "";
      expect(contentType).toContain("text/html");

      const body = await res.text();
      expect(body).toContain("n_abc123456789");
    });

    it("should serve embed page via short URL /e/:id", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/e/n_abc123456789");

      expect(res.status).toBe(200);
      const contentType = res.headers.get("Content-Type") || "";
      expect(contentType).toContain("text/html");
    });

    it("should return 400 for invalid button ID in embed", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/invalid");

      expect(res.status).toBe(400);
    });
  });

  describe("Badge", () => {
    it("should serve SVG badge for a button", async () => {
      // Create a button first
      const createRes = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/badge-test" }),
      });
      const button = await createRes.json() as { public_id: string };

      const res = await SELF.fetch(
        `https://api.nice.sbs/badge/${button.public_id}.svg`
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("image/svg+xml");

      const body = await res.text();
      expect(body).toContain("<svg");
    });

    it("should return badge with count 0 for unknown button", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/badge/n_000000000000.svg"
      );

      // Should still return a badge (enumeration protection)
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
    });
  });
});
