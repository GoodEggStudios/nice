/**
 * E2E tests for multi-nice (clap-style) feature
 */

import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

// Helper to create a button
async function createButton(
  url = "https://example.com/multi-test",
  opts: Record<string, unknown> = {}
): Promise<{ public_id: string; private_id: string; [key: string]: unknown }> {
  const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, restriction: "global", ...opts }),
  });
  expect(res.status).toBe(201);
  return res.json();
}

async function recordNice(publicId: string) {
  return SELF.fetch(`https://api.nice.sbs/api/v1/nice/${publicId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fingerprint: "fp1", referrer: "https://example.com" }),
  });
}

async function recordMultiNice(publicId: string, count: number) {
  return SELF.fetch(`https://api.nice.sbs/api/v1/nice/${publicId}/multi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count, fingerprint: "fp1", referrer: "https://example.com" }),
  });
}

async function getCount(publicId: string) {
  const res = await SELF.fetch(`https://api.nice.sbs/api/v1/nice/${publicId}/count`);
  return res.json() as Promise<{ count: number; has_niced: boolean; multi_nice: boolean }>;
}

describe("Multi-Nice", () => {
  describe("Button Creation", () => {
    it("should create a button with multi_nice enabled", async () => {
      const data = await createButton("https://example.com/multi", { multi_nice: true });
      expect(data.multi_nice).toBe(true);
    });

    it("should default multi_nice to false", async () => {
      const data = await createButton("https://example.com/single");
      expect(data.multi_nice).toBe(false);
    });
  });

  describe("Button Update", () => {
    it("should enable multi_nice via PATCH", async () => {
      const button = await createButton("https://example.com/toggle");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ multi_nice: true }),
        }
      );
      expect(res.status).toBe(200);
      const data = await res.json() as { multi_nice: boolean };
      expect(data.multi_nice).toBe(true);
    });

    it("should disable multi_nice via PATCH", async () => {
      const button = await createButton("https://example.com/toggle2", { multi_nice: true });

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ multi_nice: false }),
        }
      );
      expect(res.status).toBe(200);
      const data = await res.json() as { multi_nice: boolean };
      expect(data.multi_nice).toBe(false);
    });
  });

  describe("Button Stats", () => {
    it("should include multi_nice in stats response", async () => {
      const button = await createButton("https://example.com/stats", { multi_nice: true });

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );
      const data = await res.json() as { multi_nice: boolean };
      expect(data.multi_nice).toBe(true);
    });
  });

  describe("POST /api/v1/nice/:id - Single Nice on Multi Button", () => {
    it("should allow multiple nices from same visitor", async () => {
      const button = await createButton("https://example.com/multi-single", { multi_nice: true });

      // First nice
      const res1 = await recordNice(button.public_id);
      const data1 = await res1.json() as { success: boolean; count: number };
      expect(data1.success).toBe(true);
      expect(data1.count).toBe(1);

      // Second nice — same visitor, should NOT be deduped
      const res2 = await recordNice(button.public_id);
      const data2 = await res2.json() as { success: boolean; count: number };
      expect(data2.success).toBe(true);
      expect(data2.count).toBe(2);
    });
  });

  describe("POST /api/v1/nice/:id/multi - Batch Endpoint", () => {
    it("should record multiple nices in one request", async () => {
      const button = await createButton("https://example.com/batch", { multi_nice: true });

      const res = await recordMultiNice(button.public_id, 5);
      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; count: number; added: number };
      expect(data.success).toBe(true);
      expect(data.count).toBe(5);
      expect(data.added).toBe(5);
    });

    it("should accumulate batch nices", async () => {
      const button = await createButton("https://example.com/batch-accum", { multi_nice: true });

      await recordMultiNice(button.public_id, 3);
      const res = await recordMultiNice(button.public_id, 7);
      const data = await res.json() as { success: boolean; count: number; added: number };
      expect(data.count).toBe(10);
      expect(data.added).toBe(7);
    });

    it("should cap count at 50 per request", async () => {
      const button = await createButton("https://example.com/batch-cap", { multi_nice: true });

      const res = await recordMultiNice(button.public_id, 999);
      const data = await res.json() as { success: boolean; count: number; added: number };
      expect(data.added).toBe(50);
      expect(data.count).toBe(50);
    });

    it("should floor count to 1 for zero or negative", async () => {
      const button = await createButton("https://example.com/batch-floor", { multi_nice: true });

      const res = await recordMultiNice(button.public_id, -5);
      const data = await res.json() as { success: boolean; count: number; added: number };
      expect(data.added).toBe(1);
    });

    it("should reject batch on non-multi-nice button", async () => {
      const button = await createButton("https://example.com/batch-reject");

      const res = await recordMultiNice(button.public_id, 5);
      expect(res.status).toBe(403);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("MULTI_NICE_DISABLED");
    });

    it("should reject batch with invalid button ID", async () => {
      const res = await recordMultiNice("invalid_id", 5);
      expect(res.status).toBe(400);
    });

    it("should reject batch for non-existent button", async () => {
      const res = await recordMultiNice("n_AAAAAAAAAAAA", 5);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/nice/:id/count - Count for Multi-Nice", () => {
    it("should return multi_nice flag", async () => {
      const button = await createButton("https://example.com/count-multi", { multi_nice: true });
      const data = await getCount(button.public_id);
      expect(data.multi_nice).toBe(true);
    });

    it("should always return has_niced false for multi-nice", async () => {
      const button = await createButton("https://example.com/count-niced", { multi_nice: true });
      await recordNice(button.public_id);
      const data = await getCount(button.public_id);
      expect(data.has_niced).toBe(false);
    });

    it("should return correct count after batch", async () => {
      const button = await createButton("https://example.com/count-batch", { multi_nice: true });
      await recordMultiNice(button.public_id, 10);
      const data = await getCount(button.public_id);
      expect(data.count).toBe(10);
    });
  });
});
