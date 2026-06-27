import { expect, type Locator, type Page } from "@playwright/test";

/** Round clip sizes up so macOS/Linux sub-pixel layout differences share one baseline. */
function stableClipSize(size: number, step = 4): number {
  return Math.ceil((size + 4) / step) * step;
}

function stablePageHeight(height: number): number {
  return Math.ceil(height / 256) * 256;
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

  const x = Math.max(0, Math.floor(box.x - padding));
  const y = Math.max(0, Math.floor(box.y - padding));
  const width = Math.min(stableClipSize(box.width + padding * 2), viewport.width - x);
  const height = Math.min(stableClipSize(box.height + padding * 2), viewport.height - y);

  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    clip: { x, y, width, height },
    scale: "css",
    omitBackground: false,
  });
}

export async function screenshotPaddedLocator(locator: Locator, name: string, padding = 2): Promise<void> {
  const page = locator.page();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Cannot screenshot ${name}: locator has no bounding box`);
  }

  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error(`Cannot screenshot ${name}: page has no viewport size`);
  }

  const x = Math.max(0, Math.floor(box.x - padding));
  const y = Math.max(0, Math.floor(box.y - padding));
  const width = Math.min(stableClipSize(box.width + padding * 2), viewport.width - x);
  const height = Math.min(stableClipSize(box.height + padding * 2), viewport.height - y);

  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    clip: { x, y, width, height },
    scale: "css",
    omitBackground: true,
  });
}
