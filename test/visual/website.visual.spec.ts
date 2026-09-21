import { test, expect, type Page } from "@playwright/test";
import { getEmbedInitialDimensions } from "../../src/routes/embed";
import { VISUAL_BUTTON_ID, VISUAL_PRIVATE_ID } from "./fixtures/data";
import { installNiceApiMocks, type NiceApiMockOptions } from "./fixtures/routes";
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

async function openPage(page: Page, path: string, viewport: { width: number; height: number }, options: NiceApiMockOptions = {}) {
  await installNiceApiMocks(page, options);
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
    await expect(page.locator("#labelInput")).toHaveValue("Nice");
    await expect(page.locator("#pressedLabelInput")).toHaveValue("Nice'd");
    await expect(page.locator("#previewButton")).toBeVisible();
    await screenshotWebsiteFullPage(page, `website/create-empty-${viewport.name}.png`);
  });

  test(`create live preview combinations ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/create", viewport);

    await page.locator("#themeOptions .option").filter({ hasText: "Mono Lt" }).click();
    await page.locator("#sizeOptions .option").filter({ hasText: "XL" }).click();
    await expect(page.locator("#previewButton")).toHaveClass(/theme-mono-light/);
    await expect(page.locator("#previewButton")).toHaveClass(/size-xl/);
    await expect(page.locator("#previewCountInside")).toHaveText("42K");
    await expect(page.locator("#previewCount")).toBeHidden();
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
    await page.locator("#labelInput").fill("Recommend");
    await page.locator("#pressedLabelInput").fill("Recommended");
    await page.locator("#multiNice").check();
    await page.locator("#confetti").check();
    await page.locator("#submitBtn").click();
    await expect(page.locator("#result")).toHaveClass(/show/);
    await expectEmbedFrameReady(page, "#resultPreview iframe");
    await expect(page.locator("#snippet")).toContainText('data-confetti="1"');
    await expect(page.locator("#snippet")).toContainText('data-multi="1"');
    const expected = getEmbedInitialDimensions("md", "Recommend", "Recommended", true);
    await expect(page.locator("#resultPreview iframe")).toHaveAttribute(
      "style",
      new RegExp(`width:${expected.w}px;height:${expected.h}px`),
    );
    await expect(page.frameLocator("#resultPreview iframe").locator("#niceText")).toHaveText("Recommend");
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
    await expect(page.locator("#labelInput")).toHaveValue("Nice");
    await expect(page.locator("#pressedLabelInput")).toHaveValue("Nice'd");
    await expectEmbedFrameReady(page, "#preview iframe");
    await expect(page.locator("#badgePreview img")).toBeVisible();
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
  await screenshotWebsitePaddedLocator(page.locator("#previewContainer"), "website/create-labels-preview-pressed.png");

  await page.locator("#multiNice").check();
  await expect(page.locator("#pressedLabelField")).toBeHidden();
  await expect(page.locator("#pressedLabelInput")).toBeDisabled();
  await page.locator("#previewButton").click();
  await page.locator("#previewButton").click();
  await expect(page.locator("#previewText")).toHaveText("Recommend");
  await expect(page.locator("#pressedLabelInput")).toHaveValue("Recommended");
  await screenshotWebsitePaddedLocator(page.locator("#previewContainer"), "website/create-labels-clap.png");
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
  await expect(page.frameLocator("#preview iframe").locator("#niceText")).toHaveText("Recommend");

  await installNiceApiMocks(page, {
    buttonPatchStatus: 400,
    buttonPatchErrorCode: "INVALID_LABEL",
    buttonPatchError: "Invalid button label",
  });
  await page.locator("#labelInput").fill("Unsaved");
  await page.locator("#pressedLabelInput").fill("Unsaved pressed");
  await page.locator("#saveLabelsBtn").click();
  await expect(page.locator("#labelSaveStatus")).toContainText("Invalid button label");
  await expect(page.locator("#labelInput")).toHaveValue("Unsaved");
  await expect(page.locator("#pressedLabelInput")).toHaveValue("Unsaved pressed");
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

test("stats loads the default button appearance editor", async ({ page }) => {
  await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewports[0]);

  const appearance = page.locator("#appearanceSettings");
  await expect(appearance).toBeVisible();
  await expect(appearance.getByRole("heading", { name: "Button appearance" })).toBeVisible();
  await expect(page.locator("#appearanceCustomColors")).not.toBeChecked();
  await expect(page.locator("#appearanceShape")).toHaveValue("rounded");
  await expect(page.locator("#appearanceCountVisibility")).toHaveValue("nonzero");
  await expect(page.locator("#appearanceCountPosition")).toHaveValue("inside");
  await expect(page.locator("#appearanceCountFormat")).toHaveValue("compact");
  await expect(page.locator("#appearanceAnimation")).toHaveValue("pop");
  await expect(page.locator("#appearanceColors input[type=color]")).toHaveCount(6);
  await expect(page.locator("#appearanceColors input[type=color]").first()).toBeDisabled();
  await expect(page.locator("#appearanceColors .color-value").first()).toHaveText("#374151");
});

test("stats hydrates a customized button appearance", async ({ page }) => {
  await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewports[0], {
    appearance: {
      colors: {
        background: "#123456",
        foreground: "#abcdef",
        border: "#654321",
        pressed_background: "#fedcba",
        pressed_foreground: "#0f0f0f",
        pressed_border: "#f1e2d3",
      },
      shape: "pill",
      count_visibility: "always",
      count_position: "below",
      count_format: "full",
      animation: "sparkle",
    },
  });

  await expect(page.locator("#appearanceCustomColors")).toBeChecked();
  await expect(page.locator("#appearanceShape")).toHaveValue("pill");
  await expect(page.locator("#appearanceCountVisibility")).toHaveValue("always");
  await expect(page.locator("#appearanceCountPosition")).toHaveValue("below");
  await expect(page.locator("#appearanceCountFormat")).toHaveValue("full");
  await expect(page.locator("#appearanceAnimation")).toHaveValue("sparkle");
  await expect(page.locator("#appearanceBackground")).toHaveValue("#123456");
  await expect(page.locator("[data-color-value=pressed_foreground]")).toHaveText("#0F0F0F");
});

test("stats saves the complete appearance contract and refreshes the embed", async ({ page }) => {
  await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewports[0], {
    buttonPatchDelay: 250,
    buttonPatchResponse: { size: "xl" },
  });

  await expect(page.locator("#saveAppearanceBtn")).toBeDisabled();
  await page.locator("#appearanceShape").selectOption("pill");
  await expect(page.locator("#saveAppearanceBtn")).toBeEnabled();

  const requestPromise = page.waitForRequest("https://api.nice.sbs/api/v1/buttons/ns_visual00000000000001");
  await page.locator("#saveAppearanceBtn").click();
  await expect(page.locator("#saveAppearanceBtn")).toBeDisabled();
  await expect(page.locator("#appearanceShape")).toBeDisabled();
  await expect(page.locator("#appearanceAnimation")).toBeDisabled();
  await expect(page.locator("#multiNiceToggle")).toBeEnabled();

  const request = await requestPromise;
  expect(request.method()).toBe("PATCH");
  expect(request.postDataJSON()).toEqual({
    colors: null,
    shape: "pill",
    count_visibility: "nonzero",
    count_position: "inside",
    count_format: "compact",
    animation: "pop",
  });

  await expect(page.locator("#appearanceSaveStatus")).toHaveText("Saved");
  await expect(page.locator("#snippet")).toContainText("size=xl");
  await expect(page.locator("#preview iframe")).toHaveAttribute("src", /size=xl/);
});

test("stats reset confirms accessibly and only resets appearance", async ({ page }) => {
  await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewports[0], {
    multiNice: true,
    label: "Keep this label",
    appearance: {
      colors: {
        background: "#123456",
        foreground: "#abcdef",
        border: "#654321",
        pressed_background: "#fedcba",
        pressed_foreground: "#0f0f0f",
        pressed_border: "#f1e2d3",
      },
      shape: "pill",
      count_visibility: "always",
      count_position: "below",
      count_format: "full",
      animation: "sparkle",
    },
  });

  const resetButton = page.locator("#resetAppearanceBtn");
  page.once("dialog", (dialog) => dialog.dismiss());
  await resetButton.click();
  await expect(resetButton).toBeFocused();
  await expect(page.locator("#appearanceShape")).toHaveValue("pill");
  await expect(page.locator("#labelInput")).toHaveValue("Keep this label");
  await expect(page.locator("#multiNiceToggle")).toBeChecked();

  const requestPromise = page.waitForRequest("https://api.nice.sbs/api/v1/buttons/ns_visual00000000000001");
  page.once("dialog", (dialog) => dialog.accept());
  await resetButton.click();
  const request = await requestPromise;
  expect(request.postDataJSON()).toEqual({
    colors: null,
    shape: "rounded",
    count_visibility: "nonzero",
    count_position: "inside",
    count_format: "compact",
    animation: "pop",
  });
  await expect(page.locator("#appearanceSaveStatus")).toHaveText("Saved");
  await expect(page.locator("#appearanceCustomColors")).not.toBeChecked();
  await expect(page.locator("#labelInput")).toHaveValue("Keep this label");
  await expect(page.locator("#multiNiceToggle")).toBeChecked();
});

const appearanceErrorCases = [
  { code: "INVALID_COLORS", control: "#appearanceCustomColors", edit: async (page: Page) => {
    await page.locator("#appearanceCustomColors").check();
    await page.locator("#appearanceBackground").fill("#112233");
  } },
  { code: "INVALID_SHAPE", control: "#appearanceShape", edit: (page: Page) => page.locator("#appearanceShape").selectOption("pill") },
  { code: "INVALID_COUNT_VISIBILITY", control: "#appearanceCountVisibility", edit: (page: Page) => page.locator("#appearanceCountVisibility").selectOption("always") },
  { code: "INVALID_COUNT_POSITION", control: "#appearanceCountPosition", edit: (page: Page) => page.locator("#appearanceCountPosition").selectOption("below") },
  { code: "INVALID_COUNT_FORMAT", control: "#appearanceCountFormat", edit: (page: Page) => page.locator("#appearanceCountFormat").selectOption("full") },
  { code: "INVALID_ANIMATION", control: "#appearanceAnimation", edit: (page: Page) => page.locator("#appearanceAnimation").selectOption("sparkle") },
] as const;

for (const errorCase of appearanceErrorCases) {
  test(`stats preserves appearance edits for ${errorCase.code}`, async ({ page }) => {
    await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewports[0], {
      buttonPatchStatus: 400,
      buttonPatchErrorCode: errorCase.code,
      buttonPatchError: `Rejected ${errorCase.code}`,
    });
    await errorCase.edit(page);
    await page.locator("#saveAppearanceBtn").click();

    await expect(page.locator("#appearanceSaveStatus")).toContainText(`Rejected ${errorCase.code}`);
    await expect(page.locator("#appearanceError")).toContainText(`Rejected ${errorCase.code}`);
    await expect(page.locator(errorCase.control)).toBeFocused();
  });
}

test("stats preserves appearance edits after a network failure", async ({ page }) => {
  await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewports[0], {
    buttonPatchNetworkError: true,
  });
  await page.locator("#appearanceShape").selectOption("square");
  await page.locator("#saveAppearanceBtn").click();

  await expect(page.locator("#appearanceShape")).toHaveValue("square");
  await expect(page.locator("#appearanceSaveStatus")).toContainText("Failed to save button appearance");
  await expect(page.locator("#appearanceSettings")).toBeFocused();
  await expect(page.locator("#appearanceSaveStatus")).not.toHaveClass(/alert/);
});

test("stats keeps unsaved appearance edits across other settings updates", async ({ page }) => {
  await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewports[0]);
  await page.locator("#appearanceShape").selectOption("square");
  await page.locator("#appearanceCustomColors").check();
  await page.locator("#appearanceBackground").fill("#112233");
  await expect(page.locator("#saveAppearanceBtn")).toBeEnabled();

  await page.locator("#labelInput").fill("Recommend");
  await page.locator("#pressedLabelInput").fill("Recommended");
  await page.locator("#saveLabelsBtn").click();
  await expect(page.locator("#labelSaveStatus")).toHaveText("Saved");
  await expect(page.locator("#appearanceShape")).toHaveValue("square");
  await expect(page.locator("#appearanceBackground")).toHaveValue("#112233");

  await page.locator("#restrictionOptions [data-value=domain]").click();
  await expect(page.locator("#restrictionOptions [data-value=domain]")).toHaveClass(/active/);
  await expect(page.locator("#appearanceShape")).toHaveValue("square");

  await page.locator("#multiNiceToggle").check();
  await expect(page.locator("#multiNiceLabel")).toHaveText("On");
  await expect(page.locator("#appearanceShape")).toHaveValue("square");
  await expect(page.locator("#appearanceBackground")).toHaveValue("#112233");
  await expect(page.locator("#saveAppearanceBtn")).toBeEnabled();
});

test("stats appearance controls remain usable at 375px with keyboard input", async ({ page }) => {
  await installNiceApiMocks(page);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto(`${server.origin}/stats?id=${VISUAL_PRIVATE_ID}`);
  await stabilizeWebsitePage(page);

  await expect(page.locator("#appearanceSettings")).toBeVisible();
  await expect(page.locator("#appearanceColors")).toContainText("Background");
  await expect(page.locator("#appearanceColors legend")).toHaveText("Custom colours");

  await page.locator("#appearanceShape").focus();
  await expect(page.locator("#appearanceShape")).toBeFocused();
  await page.locator("#appearanceCustomColors").focus();
  await page.locator("#appearanceCustomColors").press("Space");
  await expect(page.locator("#appearanceBackground")).toBeEnabled();

  const appearanceBox = await page.locator("#appearanceSettings").boundingBox();
  expect(appearanceBox).not.toBeNull();
  expect(appearanceBox!.width).toBeLessThanOrEqual(343);
});
