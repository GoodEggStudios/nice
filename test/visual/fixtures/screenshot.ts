import { expect, type Locator, type Page } from "@playwright/test";

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
  const width = Math.min(Math.ceil(box.width + padding * 2), viewport.width - x);
  const height = Math.min(Math.ceil(box.height + padding * 2), viewport.height - y);

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
  const width = Math.min(Math.ceil(box.width + padding * 2), viewport.width - x);
  const height = Math.min(Math.ceil(box.height + padding * 2), viewport.height - y);

  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    clip: { x, y, width, height },
    scale: "css",
    omitBackground: true,
  });
}
