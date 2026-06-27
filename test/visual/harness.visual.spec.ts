import { test, expect } from "@playwright/test";
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
});
