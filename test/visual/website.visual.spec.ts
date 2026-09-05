import { test, expect, type Page } from "@playwright/test";
import { VISUAL_BUTTON_ID, VISUAL_PRIVATE_ID } from "./fixtures/data";
import { installNiceApiMocks } from "./fixtures/routes";
import {
  screenshotWebsiteFullPage,
  screenshotWebsitePaddedLocator,
  stabilizeWebsitePage,
} from "./fixtures/screenshot";
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
  await stabilizeWebsitePage(page);
}

async function expectEmbedFrameReady(page: Page, frameSelector: string) {
  await expect(page.locator(frameSelector)).toBeVisible();
  await expect(page.frameLocator(frameSelector).locator("#niceBtn")).toBeVisible();
}

for (const viewport of viewports) {
  test(`homepage ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/", viewport);
    await expect(page.locator("h1")).toHaveText("Nice");
    await screenshotWebsiteFullPage(page, `website/home-${viewport.name}.png`);
  });

  test(`create empty ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/create", viewport);
    await expect(page.locator("#createForm")).toBeVisible();
    await expect(page.locator("#previewButton")).toBeVisible();
    await screenshotWebsiteFullPage(page, `website/create-empty-${viewport.name}.png`);
  });

  test(`create live preview combinations ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/create", viewport);

    await page.locator("#themeOptions .option").filter({ hasText: "Mono Lt" }).click();
    await page.locator("#sizeOptions .option").filter({ hasText: "XL" }).click();
    await expect(page.locator("#previewButton")).toHaveClass(/theme-mono-light/);
    await expect(page.locator("#previewButton")).toHaveClass(/size-xl/);
    await expect(page.locator("#previewCount")).toHaveText("42");
    await screenshotWebsitePaddedLocator(page.locator("#previewContainer"), `website/create-preview-mono-light-xl-${viewport.name}.png`);

    await page.locator("#themeOptions .option").filter({ hasText: "Light" }).click();
    await page.locator("#sizeOptions .option").filter({ hasText: "XS" }).click();
    await page.locator("#multiNice").check();
    await page.locator("#confetti").check();
    await expect(page.locator("#previewButton")).toHaveClass(/theme-light/);
    await expect(page.locator("#previewButton")).toHaveClass(/size-xs/);
    await expect(page.locator("#previewNote")).toContainText("script embeds");
    await screenshotWebsitePaddedLocator(page.locator("#previewContainer"), `website/create-preview-light-xs-${viewport.name}.png`);
  });

  test(`create result ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/create", viewport);
    await page.locator("#urlInput").fill("example.com/articles/visual-button");
    await page.locator("#multiNice").check();
    await page.locator("#confetti").check();
    await page.locator("#submitBtn").click();
    await expect(page.locator("#result")).toHaveClass(/show/);
    await expectEmbedFrameReady(page, "#resultPreview iframe");
    await expect(page.locator("#snippet")).toContainText('data-confetti="1"');
    await expect(page.locator("#snippet")).toContainText('data-multi="1"');
    await expect(page.locator("#badgePreview img")).toBeVisible();
    await screenshotWebsiteFullPage(page, `website/create-result-${viewport.name}.png`);
  });

  test(`public button loaded ${viewport.name}`, async ({ page }) => {
    await openPage(page, `/button?id=${VISUAL_BUTTON_ID}`, viewport);
    await expect(page.locator(".count")).toHaveText("42");
    await expectEmbedFrameReady(page, ".button-frame iframe");
    await screenshotWebsiteFullPage(page, `website/button-loaded-${viewport.name}.png`);
  });

  test(`public button missing ${viewport.name}`, async ({ page }) => {
    await installNiceApiMocks(page, { countStatus: 404 });
    await page.setViewportSize(viewport);
    await page.goto(`${server.origin}/button?id=n_missing0000`);
    await stabilizeWebsitePage(page);
    await expect(page.locator(".error")).toHaveText("Button not found");
    await screenshotWebsiteFullPage(page, `website/button-missing-${viewport.name}.png`);
  });

  test(`stats loaded ${viewport.name}`, async ({ page }) => {
    await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewport);
    await expect(page.locator("#content")).toBeVisible();
    await expectEmbedFrameReady(page, "#preview iframe");
    await expect(page.locator("#badgePreview img")).toBeVisible();
    await screenshotWebsiteFullPage(page, `website/stats-loaded-${viewport.name}.png`);
  });

  test(`stats missing ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${server.origin}/stats?id=invalid`);
    await stabilizeWebsitePage(page);
    await expect(page.locator("#error")).toBeVisible();
    await screenshotWebsiteFullPage(page, `website/stats-missing-${viewport.name}.png`);
  });
}

test("script tag insertion host page", async ({ page }) => {
  await installNiceApiMocks(page);
  await page.goto(`${server.origin}/visual/host-script.html`);
  await stabilizeWebsitePage(page);
  const iframe = page.locator("iframe[title='Nice button']");
  await expect(page.frameLocator("iframe[title='Nice button']").locator("#niceBtn")).toBeVisible();
  await expect(iframe).toHaveCSS("color-scheme", "normal");
  await screenshotWebsitePaddedLocator(page.locator(".host"), "website/script-tag-host.png");
});

test("create labels drive the preview and clap mode", async ({ page }) => {
  await openPage(page, "/create", viewports[0]);

  await expect(page.locator("#labelInput")).toHaveValue("Nice");
  await expect(page.locator("#pressedLabelInput")).toHaveValue("Nice'd");
  await expect(page.locator("#previewText")).toHaveText("Nice");

  await page.locator("#labelInput").fill("Recommend");
  await page.locator("#pressedLabelInput").fill("Recommended");
  await expect(page.locator("#previewText")).toHaveText("Recommend");
  await page.locator("#previewButton").click();
  await expect(page.locator("#previewText")).toHaveText("Recommended");
  await expect(page.locator("#previewButton")).toHaveAttribute("aria-label", "Recommended");

  await page.locator("#multiNice").check();
  await expect(page.locator("#pressedLabelField")).toBeHidden();
  await expect(page.locator("#pressedLabelInput")).toBeDisabled();
  await page.locator("#previewButton").click();
  await page.locator("#previewButton").click();
  await expect(page.locator("#previewText")).toHaveText("Recommend");
  await expect(page.locator("#pressedLabelInput")).toHaveValue("Recommended");
});

test("create sends normalized labels and keeps field errors local", async ({ page }) => {
  await openPage(page, "/create", viewports[0]);
  await page.locator("#urlInput").fill("example.com/labels");
  await page.locator("#labelInput").fill("  Cheer  ");
  await page.locator("#pressedLabelInput").fill("  Cheered  ");

  const requestPromise = page.waitForRequest("https://api.nice.sbs/api/v1/buttons");
  await page.locator("#submitBtn").click();
  const request = await requestPromise;
  expect(request.postDataJSON()).toMatchObject({ label: "Cheer", pressed_label: "Cheered" });

  await expect(page.locator("#result")).toHaveClass(/show/);
  await expect(page.locator("#snippet")).toContainText("<iframe");

  await installNiceApiMocks(page, {
    createStatus: 400,
    createErrorCode: "INVALID_PRESSED_LABEL",
    createError: "Invalid pressed label",
  });
  await page.reload();
  await page.locator("#urlInput").fill("example.com/labels");
  await page.locator("#pressedLabelInput").fill("Broken");
  await page.locator("#submitBtn").click();
  await expect(page.locator("#pressedLabelError")).toContainText("Invalid pressed label");
  await expect(page.locator("#errorBox")).not.toHaveClass(/show/);
});

test("stats saves labels, refreshes the server embed, and rolls back failures", async ({ page }) => {
  await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewports[0]);
  await expect(page.locator("#labelInput")).toHaveValue("Nice");
  await expect(page.locator("#pressedLabelInput")).toHaveValue("Nice'd");

  await page.locator("#labelInput").fill("Recommend");
  await page.locator("#pressedLabelInput").fill("Recommended");
  await page.locator("#saveLabelsBtn").click();
  await expect(page.locator("#labelSaveStatus")).toHaveText("Saved");
  await expect(page.locator("#snippet")).toContainText("<iframe");
  await expect(page.frameLocator("#preview iframe").locator("#niceText")).toHaveText("Nice");

  await installNiceApiMocks(page, {
    buttonPatchStatus: 400,
    buttonPatchErrorCode: "INVALID_LABEL",
    buttonPatchError: "Invalid button label",
  });
  await page.locator("#labelInput").fill("Unsaved");
  await page.locator("#pressedLabelInput").fill("Unsaved pressed");
  await page.locator("#saveLabelsBtn").click();
  await expect(page.locator("#labelSaveStatus")).toContainText("Invalid button label");
  await expect(page.locator("#labelInput")).toHaveValue("Recommend");
  await expect(page.locator("#pressedLabelInput")).toHaveValue("Recommended");
  await expect(page.locator("#labelInput")).toBeFocused();
});

test("stats clap toggle hides and restores the pressed label", async ({ page }) => {
  await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewports[0]);
  await page.locator("#pressedLabelInput").fill("Still here");
  await page.locator("#multiNiceToggle").check();
  await expect(page.locator("#pressedLabelField")).toBeHidden();
  await page.locator("#multiNiceToggle").uncheck();
  await expect(page.locator("#pressedLabelField")).toBeVisible();
  await expect(page.locator("#pressedLabelInput")).toHaveValue("Still here");
});
