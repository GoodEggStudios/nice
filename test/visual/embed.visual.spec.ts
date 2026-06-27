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
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // Ignore pages where storage is unavailable.
    }
  });
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

async function screenshotEmbedState(page: Page, name: string, size: EmbedSize = "md", padding = 2) {
  const dims = EMBED_DIMENSIONS[size];
  await page.setViewportSize({ width: dims.w + 8, height: dims.h + 8 });
  await screenshotPaddedLocator(page.locator("#niceBtn"), name, padding);
}

test.describe("embed default theme and size matrix", () => {
  for (const theme of EMBED_THEMES) {
    for (const size of EMBED_SIZES) {
      test(`${theme} ${size}`, async ({ page }) => {
        await openEmbed(page, theme, size, { count: 0 });
        const dims = EMBED_DIMENSIONS[size];
        await page.setViewportSize({ width: dims.w + 8, height: dims.h + 8 });
        await screenshotPaddedLocator(page.locator("#niceBtn"), `embed/default/${theme}-${size}.png`);
      });
    }
  }
});

test("embed visible count", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await expect(page.locator("#niceCount")).toHaveText("42");
  await screenshotEmbedState(page, "embed/states/dark-md-count.png");
});

test("embed niced state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42, hasNiced: true });
  await expect(page.locator("#niceBtn")).toHaveClass(/niced/);
  await expect(page.locator("#niceText")).toHaveText("Nice'd");
  await expect(page.locator("#niceCount")).toHaveText("42");
  await screenshotEmbedState(page, "embed/states/dark-md-niced.png");
});

test("embed multi-nice state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 43, multiNice: true, hasNiced: true });
  await expect(page.locator("#niceCount")).toHaveText("43");
  await expect(page.locator("#niceBtn")).toHaveClass(/niced/);
  await expect(page.locator("#niceText")).toHaveText("Nice");
  await screenshotEmbedState(page, "embed/states/dark-md-multi-clicked.png");
});

test("embed hover state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await expect(page.locator("#niceCount")).toHaveText("42");
  // Apply hover colours without scale() so the clipped screenshot stays tight and stable.
  await page.addStyleTag({
    content: ".theme-dark .nice-button.force-hover { background: #4b5563; }",
  });
  await page.locator("#niceBtn").evaluate((btn) => btn.classList.add("force-hover"));
  await screenshotEmbedState(page, "embed/states/dark-md-hover.png");
});

test("embed focus state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await expect(page.locator("#niceCount")).toHaveText("42");
  await page.locator("#niceBtn").focus();
  await screenshotEmbedState(page, "embed/states/dark-md-focus.png", "md", 6);
});

test("embed unavailable state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { countStatus: 404 });
  await expect(page.locator("#niceBtn")).toHaveClass(/disabled/);
  await screenshotEmbedState(page, "embed/states/dark-md-unavailable.png");
});
