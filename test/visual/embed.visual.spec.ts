import { test, expect, type Page } from "@playwright/test";
import { EMBED_DIMENSIONS, EMBED_SIZES, EMBED_THEMES, type EmbedSize, type EmbedTheme } from "../../src/routes/embed";
import { VISUAL_BUTTON_ID } from "./fixtures/data";
import { installNiceApiMocks } from "./fixtures/routes";
import { screenshotPaddedLocator, stabilizePage } from "./fixtures/screenshot";
import { startVisualServer, type VisualServer } from "./fixtures/server";

let server: VisualServer;

test.beforeAll(async () => {
  server = await startVisualServer();
});

test.afterAll(async () => {
  await server.close();
});

async function openEmbed(page: Page, theme: EmbedTheme, size: EmbedSize, options: { count?: number; countStatus?: number; hasNiced?: boolean; multiNice?: boolean } = {}) {
  await installNiceApiMocks(page, options);
  const multi = options.multiNice ? "&multi=1" : "";
  await page.goto(`${server.origin}/e/${VISUAL_BUTTON_ID}?theme=${theme}&size=${size}${multi}`);
  await page.evaluate((hasNiced) => {
    if (hasNiced) localStorage.setItem(`nice:${document.location.pathname.split("/").pop()}`, "1");
  }, options.hasNiced ?? false);
  if (options.hasNiced) {
    await page.reload();
  }
  await stabilizePage(page);
  await expect(page.locator("#niceBtn")).toBeVisible();
}

test.describe("embed default theme and size matrix", () => {
  for (const theme of EMBED_THEMES) {
    for (const size of EMBED_SIZES) {
      test(`${theme} ${size}`, async ({ page }) => {
        await openEmbed(page, theme, size, { count: 0 });
        const dims = EMBED_DIMENSIONS[size];
        await page.setViewportSize({ width: dims.w + 32, height: dims.h + 32 });
        await screenshotPaddedLocator(page.locator("body"), `embed/default/${theme}-${size}.png`);
      });
    }
  }
});

test("embed visible count", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-count.png");
});

test("embed niced state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42, hasNiced: true });
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-niced.png");
});

test("embed multi-nice state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42, multiNice: true });
  await page.locator("#niceBtn").click();
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-multi-clicked.png");
});

test("embed hover state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await page.locator("#niceBtn").hover();
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-hover.png");
});

test("embed focus state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await page.locator("#niceBtn").focus();
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-focus.png");
});

test("embed unavailable state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { countStatus: 404 });
  await expect(page.locator("#niceBtn")).toHaveClass(/disabled/);
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-unavailable.png");
});
