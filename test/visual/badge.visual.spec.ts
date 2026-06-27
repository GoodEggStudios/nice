import { test, expect } from "@playwright/test";
import { generateBadge, type BadgeTheme } from "../../src/lib/badge";
import { screenshotPaddedLocator, stabilizePage } from "./fixtures/screenshot";

const themes: BadgeTheme[] = ["default", "dark", "rich", "rich-inverted", "rich-mono", "rich-mono-inverted"];
const counts = [
  { label: "0", value: 0 },
  { label: "1", value: 1 },
  { label: "999", value: 999 },
  { label: "1_2k", value: 1200 },
  { label: "1_2m", value: 1_200_000 },
  { label: "long", value: 987_654_321 },
];

test.describe("badge visual snapshots", () => {
  for (const theme of themes) {
    for (const count of counts) {
      test(`${theme} ${count.label}`, async ({ page }) => {
        const svg = generateBadge(count.value, { theme });
        await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
        await stabilizePage(page);
        await expect(page.locator("svg")).toBeVisible();
        await screenshotPaddedLocator(page.locator("svg"), `badge/${theme}-${count.label}.png`);
      });
    }
  }
});
