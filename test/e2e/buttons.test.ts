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
      expect(data.colors).toBeNull();
      expect(data.shape).toBe("rounded");
      expect(data.count_visibility).toBe("nonzero");
      expect(data.count_position).toBe("inside");
      expect(data.count_format).toBe("compact");
      expect(data.animation).toBe("pop");
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

    it("should create and return a fully customized appearance", async () => {
      const data = await createButton("https://example.com/appearance", {
        colors: {
          background: "#aabbcc",
          foreground: "#DDEEFF",
          border: "#112233",
          pressed_background: "#445566",
          pressed_foreground: "#778899",
          pressed_border: "#a1b2c3",
        },
        shape: "pill",
        count_visibility: "always",
        count_position: "beside",
        count_format: "full",
        animation: "confetti",
      });

      expect(data.colors).toEqual({
        background: "#AABBCC",
        foreground: "#DDEEFF",
        border: "#112233",
        pressed_background: "#445566",
        pressed_foreground: "#778899",
        pressed_border: "#A1B2C3",
      });
      expect(data.shape).toBe("pill");
      expect(data.count_visibility).toBe("always");
      expect(data.count_position).toBe("beside");
      expect(data.count_format).toBe("full");
      expect(data.animation).toBe("confetti");

      const stats = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${data.private_id}`
      );
      expect(stats.status).toBe(200);
      await expect(stats.json()).resolves.toMatchObject({
        colors: data.colors,
        shape: "pill",
        count_visibility: "always",
        count_position: "beside",
        count_format: "full",
        animation: "confetti",
      });

      const createdEmbed = data.embed as { iframe: string };
      expect(createdEmbed.iframe).toContain("width:115px;height:36px");

      const stored = JSON.parse(
        (await env.NICE_KV.get(`btn:${data.public_id}`)) as string
      ) as Record<string, unknown>;
      stored.count = 123456;
      await env.NICE_KV.put(`btn:${data.public_id}`, JSON.stringify(stored));
      const updatedStats = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${data.private_id}`
      );
      const updatedData = await updatedStats.json() as { embed: { iframe: string } };
      expect(updatedData.embed.iframe).toContain("width:160px;height:36px");
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

      expect(embed.iframe).toContain("width:364px;height:36px");
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
        colors: unknown;
        shape: string;
        count_visibility: string;
        count_position: string;
        count_format: string;
        animation: string;
      };
      expect(data.id).toBe(button.public_id);
      expect(data.url).toBe("https://example.com/stats-test");
      expect(data.count).toBe(0);
      expect(data.label).toBe("Nice");
      expect(data.pressed_label).toBe("Nice'd");
      expect(data.colors).toBeNull();
      expect(data.shape).toBe("rounded");
      expect(data.count_visibility).toBe("nonzero");
      expect(data.count_position).toBe("inside");
      expect(data.count_format).toBe("compact");
      expect(data.animation).toBe("pop");
    });

    it("should return defaults for a pre-feature record without labels", async () => {
      const button = await createButton("https://example.com/legacy-labels");
      const stored = await env.NICE_KV.get(`btn:${button.public_id}`);
      expect(stored).toBeTruthy();

      const legacyButton = JSON.parse(stored as string) as Record<string, unknown>;
      delete legacyButton.label;
      delete legacyButton.pressedLabel;
      delete legacyButton.colors;
      delete legacyButton.shape;
      delete legacyButton.countVisibility;
      delete legacyButton.countPosition;
      delete legacyButton.countFormat;
      delete legacyButton.animation;
      await env.NICE_KV.put(`btn:${button.public_id}`, JSON.stringify(legacyButton));

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );

      expect(res.status).toBe(200);
      const data = await res.json() as {
        label: string;
        pressed_label: string;
        colors: unknown;
        shape: string;
        count_visibility: string;
        count_position: string;
        count_format: string;
        animation: string;
      };
      expect(data.label).toBe("Nice");
      expect(data.pressed_label).toBe("Nice'd");
      expect(data.colors).toBeNull();
      expect(data.shape).toBe("rounded");
      expect(data.count_visibility).toBe("nonzero");
      expect(data.count_position).toBe("inside");
      expect(data.count_format).toBe("compact");
      expect(data.animation).toBe("pop");
    });

    it("should safely normalize malformed legacy appearance fields", async () => {
      const button = await createButton("https://example.com/malformed-appearance");
      const stored = await env.NICE_KV.get(`btn:${button.public_id}`);
      const legacyButton = JSON.parse(stored as string) as Record<string, unknown>;
      legacyButton.colors = {
        background: "red",
        foreground: "#DDEEFF",
        border: "#112233",
        pressedBackground: "#445566",
        pressedForeground: "#778899",
        pressedBorder: "#A1B2C3",
      };
      legacyButton.shape = "circle";
      legacyButton.countVisibility = [];
      legacyButton.countPosition = "outside";
      legacyButton.countFormat = 42;
      legacyButton.animation = { name: "confetti" };
      await env.NICE_KV.put(`btn:${button.public_id}`, JSON.stringify(legacyButton));

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toMatchObject({
        colors: null,
        shape: "rounded",
        count_visibility: "nonzero",
        count_position: "inside",
        count_format: "compact",
        animation: "pop",
      });
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

    it("should patch each appearance enum while preserving the others", async () => {
      const button = await createButton("https://example.com/appearance-patch", {
        shape: "pill",
        count_visibility: "always",
        count_position: "beside",
        count_format: "full",
        animation: "bounce",
      });
      const updates = [
        ["shape", "square"],
        ["count_visibility", "hidden"],
        ["count_position", "below"],
        ["count_format", "compact"],
        ["animation", "none"],
      ] as const;
      const expected = {
        shape: "pill",
        count_visibility: "always",
        count_position: "beside",
        count_format: "full",
        animation: "bounce",
      };

      for (const [field, value] of updates) {
        const res = await SELF.fetch(
          `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: value }),
          }
        );

        expect(res.status).toBe(200);
        const data = await res.json() as Record<string, unknown>;
        expected[field] = value;
        expect(data[field]).toBe(value);
        expect(data.shape).toBe(expected.shape);
        expect(data.count_visibility).toBe(expected.count_visibility);
        expect(data.count_position).toBe(expected.count_position);
        expect(data.count_format).toBe(expected.count_format);
        expect(data.animation).toBe(expected.animation);
      }
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

    it("should replace a palette atomically and reset it with null", async () => {
      const button = await createButton("https://example.com/palette-patch", {
        colors: {
          background: "#111111",
          foreground: "#222222",
          border: "#333333",
          pressed_background: "#444444",
          pressed_foreground: "#555555",
          pressed_border: "#666666",
        },
        shape: "pill",
      });
      const replacement = {
        background: "#aabbcc",
        foreground: "#DDEEFF",
        border: "#112233",
        pressed_background: "#445566",
        pressed_foreground: "#778899",
        pressed_border: "#a1b2c3",
      };

      const replace = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ colors: replacement }),
        }
      );
      expect(replace.status).toBe(200);
      await expect(replace.json()).resolves.toMatchObject({
        colors: {
          background: "#AABBCC",
          foreground: "#DDEEFF",
          border: "#112233",
          pressed_background: "#445566",
          pressed_foreground: "#778899",
          pressed_border: "#A1B2C3",
        },
        shape: "pill",
      });

      const reset = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ colors: null }),
        }
      );
      expect(reset.status).toBe(200);
      await expect(reset.json()).resolves.toMatchObject({
        colors: null,
        shape: "pill",
      });
    });

    it("should reject invalid appearance PATCH values without mutation", async () => {
      const button = await createButton("https://example.com/invalid-appearance", {
        colors: {
          background: "#111111",
          foreground: "#222222",
          border: "#333333",
          pressed_background: "#444444",
          pressed_foreground: "#555555",
          pressed_border: "#666666",
        },
        shape: "pill",
        count_visibility: "always",
        count_position: "beside",
        count_format: "full",
        animation: "bounce",
      });
      const cases = [
        { field: "colors", value: { background: "red" }, code: "INVALID_COLORS" },
        { field: "shape", value: "circle", code: "INVALID_SHAPE" },
        {
          field: "count_visibility",
          value: "sometimes",
          code: "INVALID_COUNT_VISIBILITY",
        },
        {
          field: "count_position",
          value: "outside",
          code: "INVALID_COUNT_POSITION",
        },
        { field: "count_format", value: "pretty", code: "INVALID_COUNT_FORMAT" },
        { field: "animation", value: "wiggle", code: "INVALID_ANIMATION" },
      ];

      for (const testCase of cases) {
        const res = await SELF.fetch(
          `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              [testCase.field]: testCase.value,
              theme: "dark",
            }),
          }
        );

        expect(res.status).toBe(400);
        const data = await res.json() as { code: string };
        expect(data.code).toBe(testCase.code);
      }

      const stats = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );
      await expect(stats.json()).resolves.toMatchObject({
        colors: {
          background: "#111111",
          foreground: "#222222",
          border: "#333333",
          pressed_background: "#444444",
          pressed_foreground: "#555555",
          pressed_border: "#666666",
        },
        theme: "light",
        shape: "pill",
        count_visibility: "always",
        count_position: "beside",
        count_format: "full",
        animation: "bounce",
      });
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
    }, 15_000);
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
