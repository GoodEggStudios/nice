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
      body, button, input, textarea, select, pre, code {
        font-family: Arial, sans-serif !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts?.ready);
}

export async function screenshotPaddedLocator(locator: Locator, name: string, padding = 8): Promise<void> {
  const page = locator.page();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Cannot screenshot ${name}: locator has no bounding box`);
  }

  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    clip: {
      x: Math.max(0, Math.floor(box.x - padding)),
      y: Math.max(0, Math.floor(box.y - padding)),
      width: Math.ceil(box.width + padding * 2),
      height: Math.ceil(box.height + padding * 2),
    },
    scale: "css",
  });
}
