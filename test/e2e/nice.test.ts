/**
 * E2E tests for nice recording and counting
 *
 * Tests the public nice endpoints through the worker.
 */

import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

// Helper to create a button
async function createButton(
  url = "https://example.com/article",
  restriction = "global"
): Promise<{ public_id: string; private_id: string }> {
  const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, restriction }),
  });
  return res.json();
}

describe("Nice API", () => {
  describe("POST /api/v1/nice/:public_id - Record Nice", () => {
    it("should record a nice on a global button", async () => {
      const button = await createButton("https://example.com/nice-test", "global");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint: "fp1", referrer: "https://example.com" }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; count: number };
      expect(data.success).toBe(true);
      expect(data.count).toBe(1);
    });

    it("should deduplicate same visitor", async () => {
      const button = await createButton("https://example.com/dedup-test", "global");

      // First nice
      await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint: "same-fp" }),
        }
      );

      // Second nice from same visitor
      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint: "same-fp" }),
        }
      );

      const data = await res.json() as { success: boolean; reason?: string; count: number };
      expect(data.success).toBe(false);
      expect(data.reason).toBe("already_niced");
      expect(data.count).toBe(1);
    });

    it("should return 404 for non-existent button", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/api/v1/nice/n_000000000000",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      expect(res.status).toBe(404);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("BUTTON_NOT_FOUND");
    });

    it("should return 400 for invalid button ID format", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/api/v1/nice/invalid_id",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      expect(res.status).toBe(400);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("INVALID_BUTTON_ID");
    });

    it("should work without a request body", async () => {
      const button = await createButton("https://example.com/nobody", "global");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        { method: "POST" }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean };
      expect(data.success).toBe(true);
    });
  });

  describe("GET /api/v1/nice/:public_id/count - Get Count", () => {
    it("should return count for existing button", async () => {
      const button = await createButton("https://example.com/count-test", "global");

      // Nice it first
      await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint: "counter" }),
        }
      );

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}/count`
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { count: number; button_id: string; has_niced: boolean };
      expect(data.count).toBe(1);
      expect(data.button_id).toBe(button.public_id);
      // has_niced depends on matching IP + fingerprint hash
      // In tests there's no CF-Connecting-IP so dedup uses "unknown" IP
      expect(typeof data.has_niced).toBe("boolean");
    });

    it("should return 0 for non-existent button (enumeration protection)", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/api/v1/nice/n_000000000000/count"
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { count: number };
      expect(data.count).toBe(0);
    });

    it("should return has_niced false for new visitor", async () => {
      const button = await createButton("https://example.com/has-niced", "global");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}/count`
      );

      const data = await res.json() as { has_niced: boolean };
      expect(data.has_niced).toBe(false);
    });

    it("should include no-cache headers", async () => {
      const button = await createButton("https://example.com/cache-test", "global");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}/count`
      );

      expect(res.headers.get("Cache-Control")).toContain("no-store");
    });
  });

  describe("Referrer restrictions", () => {
    it("should allow nice on url-restricted button from matching referrer", async () => {
      const button = await createButton("https://example.com/restricted", "url");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fingerprint: "fp-url",
            referrer: "https://example.com/restricted",
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

    it("should deny nice on url-restricted button from wrong referrer", async () => {
      const button = await createButton("https://example.com/restricted", "url");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fingerprint: "fp-wrong",
            referrer: "https://other-site.com/page",
          }),
        }
      );

      expect(res.status).toBe(403);
      const data = await res.json() as { code: string };
      expect(data.code).toBe("REFERRER_DENIED");
    });

    it("should allow nice on domain-restricted button from same domain", async () => {
      const button = await createButton("https://example.com/page", "domain");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fingerprint: "fp-domain",
            referrer: "https://example.com/other-page",
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

    it("should deny nice on domain-restricted button from different domain", async () => {
      const button = await createButton("https://example.com/page", "domain");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fingerprint: "fp-diff-domain",
            referrer: "https://evil.com/page",
          }),
        }
      );

      expect(res.status).toBe(403);
    });

    it("should always allow nice from nice.sbs", async () => {
      const button = await createButton("https://example.com/strict", "url");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fingerprint: "fp-nice-sbs",
            referrer: "https://nice.sbs/button?id=n_abc",
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean };
      expect(data.success).toBe(true);
    });

    it("should deny when no referrer on url-restricted button", async () => {
      const button = await createButton("https://example.com/strict", "url");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint: "fp-no-ref" }),
        }
      );

      expect(res.status).toBe(403);
    });

    it("should allow any referrer on global button", async () => {
      const button = await createButton("https://example.com/global", "global");

      const res = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fingerprint: "fp-global",
            referrer: "https://totally-random.com/page",
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean };
      expect(data.success).toBe(true);
    });
  });

  describe("Full lifecycle", () => {
    it("should support create → nice → count → stats → delete", async () => {
      // 1. Create
      const button = await createButton("https://example.com/lifecycle", "global");
      expect(button.public_id).toBeTruthy();
      expect(button.private_id).toBeTruthy();

      // 2. Nice (public)
      const niceRes = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint: "lifecycle-fp" }),
        }
      );
      const niceData = await niceRes.json() as { success: boolean; count: number };
      expect(niceData.success).toBe(true);
      expect(niceData.count).toBe(1);

      // 3. Nice (owner) — should increment without dedup
      const ownerNiceRes = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}/nice`,
        { method: "POST" }
      );
      const ownerNiceData = await ownerNiceRes.json() as { count: number };
      expect(ownerNiceData.count).toBe(2);

      // 4. Count (public) — both public and owner nices use same count key
      const countRes = await SELF.fetch(
        `https://api.nice.sbs/api/v1/nice/${button.public_id}/count`
      );
      const countData = await countRes.json() as { count: number };
      expect(countData.count).toBe(2);

      // 5. Stats (private) — reads from button object, includes owner nices
      const statsRes = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );
      const statsData = await statsRes.json() as { count: number; id: string };
      expect(statsData.count).toBe(2);
      expect(statsData.id).toBe(button.public_id);

      // 6. Delete
      const deleteRes = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/${button.private_id}`,
        { method: "DELETE" }
      );
      const deleteData = await deleteRes.json() as { success: boolean };
      expect(deleteData.success).toBe(true);

      // 7. Verify deleted
      const afterRes = await SELF.fetch(
        `https://api.nice.sbs/api/v1/buttons/stats/${button.private_id}`
      );
      expect(afterRes.status).toBe(404);
    });
  });
});
