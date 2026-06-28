import { expect, type Locator, type Page } from "@playwright/test";

/** Round clip sizes up so macOS/Linux sub-pixel layout differences share one baseline. */
function stableClipSize(size: number, step = 16): number {
  return Math.ceil((size + 4) / step) * step;
}

function stablePageHeight(height: number): number {
  return Math.ceil(height / 256) * 256;
}

function paddedClipDimensions(box: { width: number; height: number }, padding: number) {
  const innerW = box.width + padding * 2;
  const innerH = box.height + padding * 2;
  const width = stableClipSize(innerW);
  const height = stableClipSize(innerH);
  return { width, height, slackW: width - innerW, slackH: height - innerH };
}

async function centerPageContent(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      html, body {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
      }
    `,
  });
}

export interface ComponentClipBounds {
  minWidth?: number;
  minHeight?: number;
}

export function stableComponentClip(
  element: { w: number; h: number },
  padding: number,
  scale = 1,
): { width: number; height: number } {
  return {
    width: stableClipSize(Math.ceil(element.w * scale) + padding * 2),
    height: stableClipSize(Math.ceil(element.h * scale) + padding * 2),
  };
}

async function prepareCenteredComponentClip(
  page: Page,
  locator: Locator,
  padding: number,
  bounds: ComponentClipBounds = {},
): Promise<{ x: number; y: number; width: number; height: number }> {
  const margin = 4;
  let box = await locator.boundingBox();
  if (!box) {
    throw new Error("Locator has no bounding box");
  }

  let { width, height } = paddedClipDimensions(box, padding);
  if (bounds.minWidth) width = Math.max(width, bounds.minWidth);
  if (bounds.minHeight) height = Math.max(height, bounds.minHeight);
  await centerPageContent(page);
  await page.setViewportSize({ width: width + margin * 2, height: height + margin * 2 });

  box = await locator.boundingBox();
  if (!box) {
    throw new Error("Locator has no bounding box after centering");
  }

  ({ width, height } = paddedClipDimensions(box, padding));
  if (bounds.minWidth) width = Math.max(width, bounds.minWidth);
  if (bounds.minHeight) height = Math.max(height, bounds.minHeight);
  await page.setViewportSize({ width: width + margin * 2, height: height + margin * 2 });

  return { x: margin, y: margin, width, height };
}

function centeredPaddedClip(
  box: { x: number; y: number; width: number; height: number },
  padding: number,
  viewport: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const { width, height, slackW, slackH } = paddedClipDimensions(box, padding);
  let x = Math.floor(box.x - padding - slackW / 2);
  let y = Math.floor(box.y - padding - slackH / 2);
  x = Math.max(0, Math.min(x, viewport.width - width));
  y = Math.max(0, Math.min(y, viewport.height - height));
  return { x, y, width, height };
}

async function measureStableScrollHeight(page: Page): Promise<number> {
  let previous = -1;
  let stableReads = 0;
  while (stableReads < 3) {
    const current = await page.evaluate(() =>
      Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    );
    if (current === previous) {
      stableReads++;
    } else {
      stableReads = 0;
    }
    previous = current;
    await page.waitForTimeout(100);
  }
  return previous;
}

export async function stabilizePage(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
      html, body {
        background: transparent !important;
      }
    `,
  });
  await page.evaluate(async () => {
    await document.fonts.load("12px 'Bungee'");
    await document.fonts.ready;
  });
}

export async function stabilizeWebsitePage(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.evaluate(async () => {
    await document.fonts.load("12px 'Bungee'");
    await document.fonts.ready;
  });
}

export async function screenshotWebsiteFullPage(page: Page, name: string): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const scrollHeight = await measureStableScrollHeight(page);
  const height = stablePageHeight(scrollHeight);
  await page.addStyleTag({
    content: `html { min-height: ${height}px !important; }`,
  });
  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    fullPage: true,
    scale: "css",
    omitBackground: false,
  });
}

export async function screenshotWebsitePaddedLocator(locator: Locator, name: string, padding = 8): Promise<void> {
  const page = locator.page();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Cannot screenshot ${name}: locator has no bounding box`);
  }

  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error(`Cannot screenshot ${name}: page has no viewport size`);
  }

  const clip = centeredPaddedClip(box, padding, viewport);

  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    clip,
    scale: "css",
    omitBackground: false,
  });
}

export async function screenshotPaddedLocator(
  locator: Locator,
  name: string,
  padding = 2,
  bounds: ComponentClipBounds = {},
): Promise<void> {
  const page = locator.page();
  const clip = await prepareCenteredComponentClip(page, locator, padding, bounds);

  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    clip,
    scale: "css",
    omitBackground: true,
  });
}
