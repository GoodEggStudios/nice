import { test, expect } from "@playwright/test";
import { VISUAL_BUTTON_ID } from "./fixtures/data";
import { startVisualServer, type VisualServer } from "./fixtures/server";
import { installNiceApiMocks } from "./fixtures/routes";
import { stabilizePage, stabilizeWebsitePage } from "./fixtures/screenshot";

let server: VisualServer;

test.beforeAll(async () => {
  server = await startVisualServer();
});

test.afterAll(async () => {
  await server.close();
});

test("visual harness serves static pages and intercepts API routes", async ({ page }) => {
  await installNiceApiMocks(page);
  await page.goto(`${server.origin}/create`);
  await stabilizePage(page);

  await expect(page.locator("h1")).toHaveText("CREATE BUTTON");
  await expect(page.locator("#previewButton")).toBeVisible();

  await page.locator("#urlInput").fill("example.com/articles/visual-button");
  await page.locator("#submitBtn").click();
  await expect(page.locator("#result")).toHaveClass(/show/);

  await page.goto(`${server.origin}/e/${VISUAL_BUTTON_ID}?theme=dark&size=md`);
  await stabilizePage(page);
  await expect(page.locator("#niceBtn")).toBeVisible();
  await expect(page.locator("#niceCountInside")).toHaveText("42");
  await page.locator("#niceBtn").click();
  await expect(page.locator("#niceCountInside")).toHaveText("43");
});

test("website stabilization pins Arial so macOS/Linux page heights share one snapshot bucket", async ({ page }) => {
  await installNiceApiMocks(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${server.origin}/create`);
  await stabilizeWebsitePage(page);

  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(fontFamily).toMatch(/Arial/i);

  const scrollHeight = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  );
  // Inter on macOS measured ~2603 (snaps to 2816); Arial stays ≤2560 with Linux CI.
  expect(scrollHeight).toBeLessThanOrEqual(2560);
});
