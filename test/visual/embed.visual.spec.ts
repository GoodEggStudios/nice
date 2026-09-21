import { test, expect, type Page } from "@playwright/test";
import { EMBED_DIMENSIONS, EMBED_SIZES, EMBED_THEMES, getEmbedInitialDimensions, type EmbedSize, type EmbedTheme } from "../../src/routes/embed";
import type { EmbedAppearance } from "../../src/routes/embed-constants";
import { normalizeVisualAppearance, VISUAL_BUTTON_ID, type VisualAppearanceOverrides } from "./fixtures/data";
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

async function screenshotEmbedWidget(
  page: Page,
  name: string,
  options: {
    size?: EmbedSize;
    label?: string;
    pressedLabel?: string;
    multiNice?: boolean;
    count?: number;
    appearance?: EmbedAppearance;
    padding?: number;
  } = {},
) {
  const size = options.size ?? "md";
  const dims = getEmbedInitialDimensions(
    size,
    options.label ?? "Nice",
    options.pressedLabel ?? "Nice'd",
    options.multiNice ?? false,
    options.count ?? 0,
    options.appearance,
  );
  await page.setViewportSize({ width: dims.w + 16, height: dims.h + 16 });
  const clip = stableComponentClip(dims, options.padding ?? 2);
  await screenshotPaddedLocator(page.locator(".nice-widget"), name, options.padding ?? 2, {
    minWidth: clip.width,
    minHeight: clip.height,
  });
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

test.describe("embed appearance behavior", () => {
  test("count presentation uses the configured outside full count", async ({ page }) => {
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

  test("custom palette controls hover and pressed button colors", async ({ page }) => {
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

  test("hides zero nonzero counts and all hidden counts", async ({ page }) => {
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
    test(`${animation} animation cleans up`, async ({ page }) => {
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

  test("animations and denied shake honor reduced motion", async ({ page }) => {
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

  test("none animation suppresses success animation but keeps denied shake", async ({ page }) => {
    await openEmbed(page, "dark", "md", {
      appearance: {
        colors: null,
        shape: "rounded",
        count_visibility: "always",
        count_position: "inside",
        count_format: "compact",
        animation: "none",
      },
    });

    await page.locator("#niceBtn").click();
    await expect(page.locator(".nice-particle")).toHaveCount(0);
    await expect(page.locator("#niceBtn")).not.toHaveClass(/animating|bouncing/);
    await page.locator("#niceBtn").click();
    await expect(page.locator("#niceBtn")).toHaveClass(/shake/);
  });
});

test.describe("embed appearance screenshots", () => {
  const customPalette: EmbedAppearance = normalizeVisualAppearance({
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
  });

  test("custom palette idle and pressed", async ({ page }) => {
    await openEmbed(page, "dark", "md", { count: 0, appearance: customPalette });
    await screenshotEmbedWidget(page, "embed/appearance/custom-palette-idle.png", {
      count: 0,
      appearance: customPalette,
    });

    await page.locator("#niceBtn").click();
    await expect(page.locator("#niceBtn")).toHaveClass(/niced/);
    await screenshotEmbedWidget(page, "embed/appearance/custom-palette-pressed.png", {
      count: 0,
      appearance: customPalette,
    });
  });

  for (const shape of ["rounded", "pill", "square"] as const) {
    test(`shape ${shape}`, async ({ page }) => {
      const appearance = normalizeVisualAppearance({ shape, animation: "none" });
      await openEmbed(page, "dark", "md", { count: 42, appearance });
      await expect(page.locator("body")).toHaveClass(new RegExp(`shape-${shape}`));
      await screenshotEmbedWidget(page, `embed/appearance/shape-${shape}.png`, {
        count: 42,
        appearance,
      });
    });
  }

  test("count inside nonzero compact", async ({ page }) => {
    const appearance = normalizeVisualAppearance({ animation: "none" });
    await openEmbed(page, "dark", "md", { count: 42, appearance });
    await expect(page.locator("#niceCountInside")).toHaveText("42");
    await screenshotEmbedWidget(page, "embed/appearance/count-inside-nonzero-compact.png", {
      count: 42,
      appearance,
    });
  });

  test("count beside always full at zero", async ({ page }) => {
    const appearance = normalizeVisualAppearance({ count_visibility: "always", count_position: "beside", count_format: "full", animation: "none" });
    await openEmbed(page, "dark", "md", { count: 0, appearance });
    await expect(page.locator("#niceCountOutside")).toHaveText("0");
    await screenshotEmbedWidget(page, "embed/appearance/count-beside-always-full-zero.png", {
      count: 0,
      appearance,
    });
  });

  test("count below nonzero compact with loaded count", async ({ page }) => {
    const appearance = normalizeVisualAppearance({ count_position: "below", animation: "none" });
    await openEmbed(page, "dark", "md", { count: 4200, appearance });
    await expect(page.locator("#niceCountOutside")).toHaveText("4.2K");
    await screenshotEmbedWidget(page, "embed/appearance/count-below-nonzero-compact.png", {
      count: 4200,
      appearance,
    });
  });

  test("hidden count", async ({ page }) => {
    const appearance = normalizeVisualAppearance({ count_visibility: "hidden", count_position: "beside", animation: "none" });
    await openEmbed(page, "dark", "md", { count: 42, appearance });
    await expect(page.locator("#niceCountInside")).toBeHidden();
    await expect(page.locator("#niceCountOutside")).toBeHidden();
    await screenshotEmbedWidget(page, "embed/appearance/count-hidden.png", {
      count: 42,
      appearance,
    });
  });

  test("long custom label with outside count fits without clipping", async ({ page }) => {
    const label = "W".repeat(24);
    const appearance = normalizeVisualAppearance({ count_visibility: "always", count_position: "beside", animation: "none" });
    await openEmbed(page, "dark", "md", {
      count: 42,
      label,
      pressedLabel: label,
      appearance,
    });
    await expectButtonFitsEmbed(page);
    await expect(page.locator("#niceCountOutside")).toHaveText("42");
    await screenshotEmbedWidget(page, "embed/appearance/long-label-outside-count.png", {
      count: 42,
      label,
      pressedLabel: label,
      appearance,
    });
  });

  test("stable post-animation resting state", async ({ page }) => {
    const appearance = normalizeVisualAppearance({ count_visibility: "always", animation: "pop" });
    await openEmbed(page, "dark", "md", { multiNice: true, count: 42, appearance });
    await page.locator("#niceBtn").click();
    await expect(page.locator("#niceBtn")).toHaveClass(/animating/);
    await page.waitForTimeout(350);
    await expect(page.locator("#niceBtn")).not.toHaveClass(/animating|bouncing/);
    await expect(page.locator(".nice-particle")).toHaveCount(0);
    await stabilizePage(page);
    await screenshotEmbedWidget(page, "embed/appearance/post-animation-rest.png", {
      multiNice: true,
      count: 43,
      appearance,
    });
  });
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
