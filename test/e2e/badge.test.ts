/**
 * E2E tests for badge SVG endpoint
 */

import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

// Helper to create a button
async function createButton(url = "https://example.com/badge"): Promise<{ public_id: string; private_id: string }> {
  const res = await SELF.fetch("https://api.nice.sbs/api/v1/buttons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

describe("Badge", () => {
  it("should return SVG for existing button", async () => {
    const button = await createButton();

    const res = await SELF.fetch(`https://api.nice.sbs/badge/${button.public_id}.svg`);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
    const body = await res.text();
    expect(body).toContain("<svg");
    expect(body).toContain("0"); // count should be 0
  });

  it("should return badge with count after nices", async () => {
    const button = await createButton("https://example.com/badge-count");

    // Owner nice to increment
    await SELF.fetch(`https://api.nice.sbs/api/v1/buttons/${button.private_id}/nice`, {
      method: "POST",
    });

    const res = await SELF.fetch(`https://api.nice.sbs/badge/${button.public_id}.svg`);
    const body = await res.text();
    expect(body).toContain("1");
  });

  it("should return badge for non-existent button (enumeration protection)", async () => {
    const res = await SELF.fetch("https://api.nice.sbs/badge/n_000000000000.svg");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
  });

  it("should support dark theme", async () => {
    const button = await createButton("https://example.com/badge-dark");

    const resDefault = await SELF.fetch(`https://api.nice.sbs/badge/${button.public_id}.svg`);
    const resDark = await SELF.fetch(`https://api.nice.sbs/badge/${button.public_id}.svg?theme=dark`);

    const defaultBody = await resDefault.text();
    const darkBody = await resDark.text();

    // Both should be valid SVGs but different
    expect(defaultBody).toContain("<svg");
    expect(darkBody).toContain("<svg");
    expect(defaultBody).not.toBe(darkBody);
  });

  it("should include cache headers", async () => {
    const button = await createButton("https://example.com/badge-cache");

    const res = await SELF.fetch(`https://api.nice.sbs/badge/${button.public_id}.svg`);

    const cacheControl = res.headers.get("Cache-Control") || "";
    expect(cacheControl).toContain("max-age=60");
    expect(cacheControl).toContain("s-maxage=300");
  });

  it("should include nosniff header", async () => {
    const button = await createButton("https://example.com/badge-nosniff");

    const res = await SELF.fetch(`https://api.nice.sbs/badge/${button.public_id}.svg`);

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
