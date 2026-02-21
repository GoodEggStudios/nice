/**
 * E2E tests for button API routes
 *
 * Tests the full request→response cycle through the worker.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SELF, env } from "cloudflare:test";

// Helper to create a button and return both IDs
async function createButton(
  url = "https://example.com/article",
  opts: Record<string, string> = {}
): Promise<{ public_id: string; private_id: string; [key: string]: unknown }> {
  const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, ...opts }),
  });
  expect(res.status).toBe(201);
  return res.json();
}

describe("Button API", () => {
  describe("POST /api/v1/buttons - Create", () => {
    it("should create a button with minimal params", async () => {
      const data = await createButton();

      expect(data.public_id).toMatch(/^n_[A-Za-z0-9]{12}$/);
      expect(data.private_id).toMatch(/^ns_[A-Za-z0-9]{20}$/);
      expect(data.url).toBe("https://example.com/article");
      expect(data.count).toBe(0);
      expect(data.theme).toBe("light");
      expect(data.size).toBe("md");
      expect(data.restriction).toBe("url");
      expect(data.embed).toBeDefined();
      expect(data.created_at).toBeTruthy();
    });

    it("should create a button with custom theme, size, and restriction", async () => {
      const data = await createButton("https://example.com/page", {
        theme: "dark",
        size: "lg",
        restriction: "global",
      });

      expect(data.theme).toBe("dark");
      expect(data.size).toBe("lg");
      expect(data.restriction).toBe("global");
    });

    it("should generate embed snippets", async () => {
      const data = await createButton();
      const embed = data.embed as { iframe: string; script: string };

      expect(embed.iframe).toContain(data.public_id as string);
      expect(embed.iframe).toContain("<iframe");
      expect(embed.script).toContain(data.public_id as string);
      expect(embed.script).toContain("<script");
    });

    it("should reject missing URL", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("MISSING_URL");
    });

    it("should reject invalid URL", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "not-a-url" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("INVALID_URL");
    });

    it("should reject invalid theme", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com", theme: "neon" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("INVALID_THEME");
    });

    it("should reject invalid size", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com", size: "xxl" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("INVALID_SIZE");
    });

    it("should reject invalid restriction", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com", restriction: "private" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("INVALID_RESTRICTION");
    });

    it("should reject invalid JSON", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });

      expect(res.status).toBe(400);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("INVALID_JSON");
    });

    it("should allow creating multiple buttons for the same URL", async () => {
      const data1 = await createButton("https://example.com/same");
      const data2 = await createButton("https://example.com/same");

      expect(data1.public_id).not.toBe(data2.public_id);
    });
  });

  describe("GET /api/v1/buttons/stats/:private_id - Stats", () => {
    it("should return button stats", async () => {
      const button = await createButton("https://example.com/stats-test");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { id: string; url: string; count: number };
      expect(data.id).toBe(button.public_id);
      expect(data.url).toBe("https://example.com/stats-test");
      expect(data.count).toBe(0);
    });

    it("should return 404 for unknown private ID", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/api/v1/buttons/stats/ns_00000000000000000000"
      );

      expect(res.status).toBe(404);
    });

    it("should return 404 for invalid private ID format", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/api/v1/buttons/stats/invalid"
      );

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/v1/buttons/:private_id - Update", () => {
    it("should update restriction mode", async () => {
      const button = await createButton();

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restriction: "global" }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { restriction: string };
      expect(data.restriction).toBe("global");
    });

    it("should update theme and size", async () => {
      const button = await createButton();

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: "mono-dark", size: "xl" }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { theme: string; size: string };
      expect(data.theme).toBe("mono-dark");
      expect(data.size).toBe("xl");
    });

    it("should reject invalid restriction", async () => {
      const button = await createButton();

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restriction: "invalid" }),
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 404 for unknown private ID", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/api/v1/buttons/ns_00000000000000000000",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: "dark" }),
        }
      );

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/buttons/:private_id/nice - Owner Nice", () => {
    it("should increment count", async () => {
      const button = await createButton();

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}/nice`,
        { method: "POST" }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; count: number; public_id: string };
      expect(data.success).toBe(true);
      expect(data.count).toBe(1);
      expect(data.public_id).toBe(button.public_id);
    });

    it("should increment multiple times (no dedup for owner)", async () => {
      const button = await createButton();

      await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}/nice`,
        { method: "POST" }
      );
      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}/nice`,
        { method: "POST" }
      );

      const data = await res.json() as { count: number };
      expect(data.count).toBe(2);
    });

    it("should return 404 for unknown private ID", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/api/v1/buttons/ns_00000000000000000000/nice",
        { method: "POST" }
      );

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/buttons/:private_id - Delete", () => {
    it("should delete a button", async () => {
      const button = await createButton();

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        { method: "DELETE" }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

    it("should return 404 after deletion", async () => {
      const button = await createButton();

      // Delete
      await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        { method: "DELETE" }
      );

      // Stats should now 404
      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );

      expect(res.status).toBe(404);
    });

    it("should return 404 for unknown private ID", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/api/v1/buttons/ns_00000000000000000000",
        { method: "DELETE" }
      );

      expect(res.status).toBe(404);
    });
  });
});
