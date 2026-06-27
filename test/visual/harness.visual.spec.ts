import { test, expect } from "@playwright/test";
import { VISUAL_BUTTON_ID } from "./fixtures/data";
import { startVisualServer, type VisualServer } from "./fixtures/server";
import { installNiceApiMocks } from "./fixtures/routes";
import { stabilizePage } from "./fixtures/screenshot";

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
  await expect(page.locator("#previewFrame")).toBeVisible();

  await page.locator("#urlInput").fill("example.com/articles/visual-button");
  await page.locator("#submitBtn").click();
  await expect(page.locator("#result")).toHaveClass(/show/);

  await page.goto(`${server.origin}/e/${VISUAL_BUTTON_ID}?theme=dark&size=md`);
  await stabilizePage(page);
  await expect(page.locator("#niceBtn")).toBeVisible();
  await expect(page.locator("#niceCount")).toHaveText("42");
  await page.locator("#niceBtn").click();
  await expect(page.locator("#niceCount")).toHaveText("43");
});
