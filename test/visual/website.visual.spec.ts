import { test, expect, type Page } from "@playwright/test";
import { VISUAL_BUTTON_ID, VISUAL_PRIVATE_ID } from "./fixtures/data";
import { installNiceApiMocks } from "./fixtures/routes";
import { screenshotPaddedLocator, stabilizePage } from "./fixtures/screenshot";
import { startVisualServer, type VisualServer } from "./fixtures/server";

let server: VisualServer;

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

test.beforeAll(async () => {
  server = await startVisualServer();
});

test.afterAll(async () => {
  await server.close();
});

async function openPage(page: Page, path: string, viewport: { width: number; height: number }) {
  await installNiceApiMocks(page);
  await page.setViewportSize(viewport);
  await page.goto(`${server.origin}${path}`);
  await stabilizePage(page);
}

for (const viewport of viewports) {
  test(`homepage ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/", viewport);
    await expect(page.locator("h1")).toHaveText("Nice");
    await screenshotPaddedLocator(page.locator("body"), `website/home-${viewport.name}.png`);
  });

  test(`create empty ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/create", viewport);
    await expect(page.locator("#createForm")).toBeVisible();
    await screenshotPaddedLocator(page.locator("body"), `website/create-empty-${viewport.name}.png`);
  });

  test(`create live preview combinations ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/create", viewport);

    await page.locator("#themeOptions .option").filter({ hasText: "Mono Lt" }).click();
    await page.locator("#sizeOptions .option").filter({ hasText: "XL" }).click();
    await expect(page.locator("#previewFrame")).toHaveAttribute("src", /theme=mono-light&size=xl/);
    await screenshotPaddedLocator(page.locator("#previewContainer"), `website/create-preview-mono-light-xl-${viewport.name}.png`);

    await page.locator("#themeOptions .option").filter({ hasText: "Light" }).click();
    await page.locator("#sizeOptions .option").filter({ hasText: "XS" }).click();
    await expect(page.locator("#previewFrame")).toHaveAttribute("src", /theme=light&size=xs/);
    await screenshotPaddedLocator(page.locator("#previewContainer"), `website/create-preview-light-xs-${viewport.name}.png`);
  });

  test(`create result ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/create", viewport);
    await page.locator("#urlInput").fill("example.com/articles/visual-button");
    await page.locator("#submitBtn").click();
    await expect(page.locator("#result")).toHaveClass(/show/);
    await screenshotPaddedLocator(page.locator("body"), `website/create-result-${viewport.name}.png`);
  });

  test(`public button loaded ${viewport.name}`, async ({ page }) => {
    await openPage(page, `/button?id=${VISUAL_BUTTON_ID}`, viewport);
    await expect(page.locator(".count")).toHaveText("42");
    await screenshotPaddedLocator(page.locator("body"), `website/button-loaded-${viewport.name}.png`);
  });

  test(`public button missing ${viewport.name}`, async ({ page }) => {
    await installNiceApiMocks(page, { countStatus: 404 });
    await page.setViewportSize(viewport);
    await page.goto(`${server.origin}/button?id=n_missing0000`);
    await stabilizePage(page);
    await expect(page.locator(".error")).toHaveText("Button not found");
    await screenshotPaddedLocator(page.locator("body"), `website/button-missing-${viewport.name}.png`);
  });

  test(`stats loaded ${viewport.name}`, async ({ page }) => {
    await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewport);
    await expect(page.locator("#content")).toBeVisible();
    await screenshotPaddedLocator(page.locator("body"), `website/stats-loaded-${viewport.name}.png`);
  });

  test(`stats missing ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${server.origin}/stats?id=invalid`);
    await stabilizePage(page);
    await expect(page.locator("#error")).toBeVisible();
    await screenshotPaddedLocator(page.locator("body"), `website/stats-missing-${viewport.name}.png`);
  });
}

test("script tag insertion host page", async ({ page }) => {
  await installNiceApiMocks(page);
  await page.goto(`${server.origin}/visual/host-script.html`);
  await stabilizePage(page);
  await expect(page.frameLocator("iframe[title='Nice button']").locator("#niceBtn")).toBeVisible();
  await screenshotPaddedLocator(page.locator(".host"), "website/script-tag-host.png");
});
