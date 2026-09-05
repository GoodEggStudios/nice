/**
 * E2E tests for button API routes
 *
 * Tests the full request→response cycle through the worker.
 */

import { describe, it, expect } from "vitest";
import { SELF, env } from "cloudflare:test";

// Helper to create a button and return both IDs
async function createButton(
  url = "https://example.com/article",
  opts: Record<string, unknown> = {}
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
      expect(data.label).toBe("Nice");
      expect(data.pressed_label).toBe("Nice'd");
      expect(data.embed).toBeDefined();
      expect(data.created_at).toBeTruthy();
    });

    it("should create and return custom labels", async () => {
      const data = await createButton("https://example.com/custom-labels", {
        label: "  Recommend  ",
        pressed_label: "  Recommended  ",
      });

      expect(data.label).toBe("Recommend");
      expect(data.pressed_label).toBe("Recommended");

      const stats = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${data.private_id}`
      );
      expect(stats.status).toBe(200);
      const statsData = await stats.json() as {
        label: string;
        pressed_label: string;
      };
      expect(statsData.label).toBe("Recommend");
      expect(statsData.pressed_label).toBe("Recommended");
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
      expect(embed.iframe).toContain("color-scheme:normal");
      expect(embed.script).toContain(data.public_id as string);
      expect(embed.script).toContain("<script");
    });

    it("should include data-multi in script snippets for multi nice buttons", async () => {
      const data = await createButton("https://example.com/claps", {
        multi_nice: "true",
      });
      const embed = data.embed as { script: string };

      expect(embed.script).toContain('data-multi="1"');
    });

    it("should size iframe snippets using shared embed dimensions", async () => {
      const data = await createButton("https://example.com/small-button", {
        size: "sm",
      });
      const embed = data.embed as { iframe: string };

      expect(embed.iframe).toContain("width:85px;height:32px");
    });

    it("should widen iframe snippets for custom labels without adding labels to the URL", async () => {
      const data = await createButton("https://example.com/long-label", {
        size: "md",
        label: "Recommend",
        pressed_label: "Recommended",
      });
      const embed = data.embed as { iframe: string; script: string };

      expect(embed.iframe).toContain("width:165px;height:36px");
      expect(embed.iframe).not.toContain("Recommend");
      expect(embed.iframe).not.toContain("Recommended");
      expect(embed.script).not.toContain("Recommend");
      expect(embed.script).not.toContain("Recommended");
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
      const data = await res.json() as {
        id: string;
        url: string;
        count: number;
        label: string;
        pressed_label: string;
      };
      expect(data.id).toBe(button.public_id);
      expect(data.url).toBe("https://example.com/stats-test");
      expect(data.count).toBe(0);
      expect(data.label).toBe("Nice");
      expect(data.pressed_label).toBe("Nice'd");
    });

    it("should return defaults for a pre-feature record without labels", async () => {
      const button = await createButton("https://example.com/legacy-labels");
      const stored = await env.NICE_KV.get(`btn:${button.public_id}`);
      expect(stored).toBeTruthy();

      const legacyButton = JSON.parse(stored as string) as Record<string, unknown>;
      delete legacyButton.label;
      delete legacyButton.pressedLabel;
      await env.NICE_KV.put(`btn:${button.public_id}`, JSON.stringify(legacyButton));

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { label: string; pressed_label: string };
      expect(data.label).toBe("Nice");
      expect(data.pressed_label).toBe("Nice'd");
    });

    it("should return 404 for unknown private ID", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/api/v1/buttons/stats/ns_00000000000000000000"
      );

      expect(res.status).toBe(404);
    });

    it("should reflect count after public nices", async () => {
      const button = await createButton("https://example.com/stats-count", {
        restriction: "global",
      });

      // Nice it via public endpoint
      await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint: "stats-fp" }),
        }
      );

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );

      const data = await res.json() as { count: number };
      expect(data.count).toBe(1);
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

    it("should preserve other fields when partially updating", async () => {
      const button = await createButton("https://example.com/partial", {
        theme: "dark",
        size: "lg",
        restriction: "domain",
      });

      // Update only theme
      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: "minimal" }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { theme: string; size: string; restriction: string };
      expect(data.theme).toBe("minimal");
      expect(data.size).toBe("lg"); // preserved
      expect(data.restriction).toBe("domain"); // preserved
    });

    it("should update one label while preserving the other settings", async () => {
      const button = await createButton("https://example.com/partial-label", {
        label: "Recommend",
        pressed_label: "Recommended",
        theme: "dark",
        size: "lg",
        restriction: "domain",
      });

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: "  Endorse  " }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as {
        label: string;
        pressed_label: string;
        theme: string;
        size: string;
        restriction: string;
      };
      expect(data.label).toBe("Endorse");
      expect(data.pressed_label).toBe("Recommended");
      expect(data.theme).toBe("dark");
      expect(data.size).toBe("lg");
      expect(data.restriction).toBe("domain");
    });

    it("should reject invalid labels without mutating the record", async () => {
      const button = await createButton("https://example.com/invalid-labels", {
        label: "Recommend",
        pressed_label: "Recommended",
      });
      const cases = [
        { field: "label", value: 42, code: "INVALID_LABEL" },
        { field: "pressed_label", value: true, code: "INVALID_PRESSED_LABEL" },
        { field: "label", value: "   ", code: "INVALID_LABEL" },
        { field: "pressed_label", value: "\n\t", code: "INVALID_PRESSED_LABEL" },
        {
          field: "label",
          value: "a".repeat(33),
          code: "INVALID_LABEL",
        },
      ];

      for (const testCase of cases) {
        const res = await SELF.fetch(
          `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [testCase.field]: testCase.value }),
          }
        );

        expect(res.status).toBe(400);
        const data = await res.json() as { code: string };
        expect(data.code).toBe(testCase.code);
      }

      const stats = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );
      const data = await stats.json() as { label: string; pressed_label: string };
      expect(data.label).toBe("Recommend");
      expect(data.pressed_label).toBe("Recommended");
    });

    it("should preserve pressed_label when enabling clap mode", async () => {
      const button = await createButton("https://example.com/clap-label", {
        label: "Recommend",
        pressed_label: "Recommended",
      });

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ multi_nice: true }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as {
        multi_nice: boolean;
        pressed_label: string;
      };
      expect(data.multi_nice).toBe(true);
      expect(data.pressed_label).toBe("Recommended");
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

    // Timeout must cover a near-minute wait (up to ~10s) plus 21 sequential requests.
    it("should rate limit after 20 requests per IP", async () => {
      // Rate keys use calendar minutes. Wait out a near rollover so all 21
      // requests stay in one bucket (CI failed at :59 with expected 429 → 200).
      const msIntoMinute = Date.now() % 60_000;
      if (msIntoMinute > 50_000) {
        await new Promise((r) => setTimeout(r, 60_000 - msIntoMinute + 100));
      }

      const button = await createButton("https://example.com/rate-test", {
        restriction: "global",
      });
      const headers = { "CF-Connecting-IP": "203.0.113.50" };

      // Fire 20 requests (IP limit)
      for (let i = 0; i < 20; i++) {
        const res = await SELF.fetch(
          `https://api.nice.sbs/api/v1/buttons/${button.private_id}/nice`,
          { method: "POST", headers }
        );
        expect(res.status).toBe(200);
      }

      // 21st should be rate limited
      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}/nice`,
        { method: "POST", headers }
      );
      expect(res.status).toBe(429);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("IP_LIMIT");
    }, 20_000);
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
