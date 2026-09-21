import { test, expect, type Page } from "@playwright/test";
import { EMBED_DIMENSIONS, EMBED_SIZES, EMBED_THEMES, getEmbedInitialDimensions, type EmbedSize, type EmbedTheme } from "../../src/routes/embed";
import type { EmbedAppearance } from "../../src/routes/embed-constants";
import { VISUAL_BUTTON_ID } from "./fixtures/data";
import { installNiceApiMocks } from "./fixtures/routes";
import { screenshotPaddedLocator, stabilizePage, stableComponentClip } from "./fixtures/screenshot";
import { startVisualServer, type VisualServer } from "./fixtures/server";

let server: VisualServer;

test.beforeAll(async () => {
  server = await startVisualServer();
});

test.afterAll(async () => {
  await server.close();
});

async function openEmbed(page: Page, theme: EmbedTheme, size: EmbedSize, options: {
  count?: number;
  countStatus?: number;
  hasNiced?: boolean;
  multiNice?: boolean;
  label?: string;
  pressedLabel?: string;
  appearance?: EmbedAppearance;
} = {}) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // Ignore pages where storage is unavailable.
    }
  });
  await installNiceApiMocks(page, options);
  const multi = options.multiNice ? "&multi=1" : "";
  await page.goto(`https://api.nice.sbs/e/${VISUAL_BUTTON_ID}?theme=${theme}&size=${size}${multi}`);
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

async function expectButtonFitsEmbed(page: Page): Promise<void> {
  const metrics = await page.locator("#niceBtn").evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });

  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
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
  await expect(page.locator("#niceCountInside")).toHaveText("42");
  await screenshotEmbedState(page, "embed/states/dark-md-count.png");
});

test("embed niced state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42, hasNiced: true });
  await expect(page.locator("#niceBtn")).toHaveClass(/niced/);
  await expect(page.locator("#niceText")).toHaveText("Nice'd");
  await expect(page.locator("#niceCountInside")).toHaveText("42");
  await screenshotEmbedState(page, "embed/states/dark-md-niced.png");
});

test("embed multi-nice state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 43, multiNice: true, hasNiced: true });
  await expect(page.locator("#niceCountInside")).toHaveText("43");
  await expect(page.locator("#niceBtn")).toHaveClass(/niced/);
  await expect(page.locator("#niceText")).toHaveText("Nice");
  await screenshotEmbedState(page, "embed/states/dark-md-multi-clicked.png");
});

test("embed hover state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await expect(page.locator("#niceCountInside")).toHaveText("42");
  await page.locator("#niceBtn").hover();
  const minClip = stableComponentClip(EMBED_DIMENSIONS.md, 6, 1.05);
  await screenshotPaddedLocator(page.locator("#niceBtn"), "embed/states/dark-md-hover.png", 6, {
    minWidth: minClip.width,
    minHeight: minClip.height,
  });
});

test("embed focus state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await expect(page.locator("#niceCountInside")).toHaveText("42");
  await page.locator("#niceBtn").focus();
  await screenshotEmbedState(page, "embed/states/dark-md-focus.png", "md", 6);
});

test("embed unavailable state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { countStatus: 404 });
  await expect(page.locator("#niceBtn")).toHaveClass(/disabled/);
  await screenshotEmbedState(page, "embed/states/dark-md-unavailable.png");
});

test("embed custom labels render idle and pressed wording", async ({ page }) => {
  await openEmbed(page, "dark", "md", {
    label: "Recommend",
    pressedLabel: "Recommended",
  });

  await expect(page.locator("#niceText")).toHaveText("Recommend");
  await screenshotEmbedState(page, "embed/labels/single-nice-idle.png");

  await page.locator("#niceBtn").click();
  await expect(page.locator("#niceText")).toHaveText("Recommended");
  await screenshotEmbedState(page, "embed/labels/single-nice-pressed.png");
});

test("embed clap mode keeps the custom idle label after clicking", async ({ page }) => {
  await openEmbed(page, "dark", "md", {
    multiNice: true,
    label: "Applaud",
    pressedLabel: "Applauded",
  });

  await expect(page.locator("#niceText")).toHaveText("Applaud");
  await page.locator("#niceBtn").click();
  await expect(page.locator("#niceText")).toHaveText("Applaud");
  await screenshotEmbedState(page, "embed/labels/clap-clicked.png");
});

test("embed count presentation uses the configured outside full count", async ({ page }) => {
  await openEmbed(page, "dark", "md", {
    count: 123456,
    appearance: {
      colors: null,
      shape: "pill",
      count_visibility: "always",
      count_position: "beside",
      count_format: "full",
      animation: "none",
    },
  });

  await expect(page.locator("#niceCountOutside")).toHaveText("123456");
  await expect(page.locator("#niceCountInside")).toBeHidden();
  await expect(page.locator("body")).toHaveClass(/shape-pill/);
  await expect(page.locator("#niceCountOutside")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator("#niceCountInside")).toHaveAttribute("aria-live", "off");
});

test("embed custom palette controls hover and pressed button colors", async ({ page }) => {
  await openEmbed(page, "dark", "md", {
    count: 0,
    appearance: {
      colors: {
        background: "#112233",
        foreground: "#AABBCC",
        border: "#334455",
        pressed_background: "#445566",
        pressed_foreground: "#DDEEFF",
        pressed_border: "#556677",
      },
      shape: "rounded",
      count_visibility: "hidden",
      count_position: "inside",
      count_format: "compact",
      animation: "none",
    },
  });

  const button = page.locator("#niceBtn");
  await expect(button).toHaveCSS("background-color", "rgb(17, 34, 51)");
  await expect(button).toHaveCSS("border-top-color", "rgb(51, 68, 85)");
  await expect(button).toHaveCSS("border-top-style", "solid");

  await button.hover();
  await expect(button).toHaveCSS("background-color", "rgb(17, 34, 51)");

  await button.click();
  await expect(button).toHaveCSS("background-color", "rgb(68, 85, 102)");
  await expect(button).toHaveCSS("color", "rgb(221, 238, 255)");
  await expect(button).toHaveCSS("border-top-color", "rgb(85, 102, 119)");
});

test("embed hides zero nonzero counts and all hidden counts", async ({ page }) => {
  await openEmbed(page, "dark", "md", {
    count: 0,
    appearance: {
      colors: null,
      shape: "rounded",
      count_visibility: "nonzero",
      count_position: "below",
      count_format: "compact",
      animation: "none",
    },
  });
  await expect(page.locator("#niceCountInside")).toBeHidden();
  await expect(page.locator("#niceCountOutside")).toBeHidden();

  await openEmbed(page, "dark", "md", {
    count: 42,
    appearance: {
      colors: null,
      shape: "rounded",
      count_visibility: "hidden",
      count_position: "below",
      count_format: "compact",
      animation: "none",
    },
  });
  await expect(page.locator("#niceCountInside")).toBeHidden();
  await expect(page.locator("#niceCountOutside")).toBeHidden();
  await expect(page.locator("#niceCountInside")).toHaveAttribute("aria-live", "off");
  await expect(page.locator("#niceCountOutside")).toHaveAttribute("aria-live", "off");
});

for (const animation of ["pop", "bounce", "sparkle", "confetti"] as const) {
  test(`embed ${animation} animation cleans up`, async ({ page }) => {
    await openEmbed(page, "dark", "md", {
      multiNice: true,
      appearance: {
        colors: null,
        shape: "rounded",
        count_visibility: "always",
        count_position: "inside",
        count_format: "compact",
        animation,
      },
    });

    await page.locator("#niceBtn").click();
    if (animation === "pop") {
      await expect(page.locator("#niceBtn")).toHaveClass(/animating/);
    } else if (animation === "bounce") {
      await expect(page.locator("#niceBtn")).toHaveClass(/bouncing/);
    } else {
      await expect(page.locator(".nice-particle")).toHaveCount(animation === "sparkle" ? 8 : 16);
      await expect(page.locator(".nice-particle").first()).toBeVisible();
    }
    await page.waitForTimeout(animation === "pop" ? 350 : animation === "bounce" ? 450 : 750);
    await expect(page.locator("#niceBtn")).not.toHaveClass(/animating|bouncing/);
    await expect(page.locator(".nice-particle")).toHaveCount(0);
  });
}

test("embed animations and denied shake honor reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openEmbed(page, "dark", "md", {
    appearance: {
      colors: null,
      shape: "rounded",
      count_visibility: "always",
      count_position: "inside",
      count_format: "compact",
      animation: "confetti",
    },
  });

  await page.locator("#niceBtn").click();
  await expect(page.locator(".nice-particle")).toHaveCount(0);
  await page.locator("#niceBtn").click();
  await expect(page.locator("#niceBtn")).not.toHaveClass(/shake/);
});

for (const size of ["xs", "xl"] as const) {
  test(`embed maximum-length label fits at ${size}`, async ({ page }) => {
    // Use Bungee-rendered glyphs, not emoji: color-emoji metrics differ on
    // macOS vs Linux and break committed screenshot dimensions in CI.
    const label = "W".repeat(32);
    await openEmbed(page, "dark", size, { label, pressedLabel: label });

    const dimensions = getEmbedInitialDimensions(size, label, label, false);
    await page.setViewportSize({ width: dimensions.w + 8, height: dimensions.h + 8 });
    await expectButtonFitsEmbed(page);
    // Pin clip to the deterministic iframe budget so platform glyph advances
    // cannot change the committed screenshot dimensions.
    const clip = stableComponentClip(dimensions, 2);
    await screenshotPaddedLocator(page.locator("#niceBtn"), `embed/labels/max-length-${size}.png`, 2, {
      minWidth: clip.width,
      minHeight: clip.height,
    });
  });
}
