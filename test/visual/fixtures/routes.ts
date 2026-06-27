import type { Page, Route } from "@playwright/test";
import { generateBadge, normalizeTheme } from "../../../src/lib/badge";
import { renderEmbedHtml, renderDemoEmbedHtml, renderEmbedScript, type EmbedSize, type EmbedTheme } from "../../../src/routes/embed";
import { mockButtonStats, mockCreateButtonResponse, VISUAL_BUTTON_ID } from "./data";

export interface NiceApiMockOptions {
  count?: number;
  countStatus?: number;
  hasNiced?: boolean;
  multiNice?: boolean;
}

async function fulfillJson(route: Route, value: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(value),
  });
}

export async function installNiceApiMocks(page: Page, options: NiceApiMockOptions = {}): Promise<void> {
  const count = options.count ?? 42;
  const multiNice = options.multiNice ?? false;

  await page.route(/https:\/\/fonts\.googleapis\.com\/.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/css; charset=utf-8",
      body: "/* visual tests use harness-controlled deterministic fonts */",
    });
  });

  await page.route(/https:\/\/fonts\.gstatic\.com\/.*/, async (route) => {
    await route.abort();
  });

  await page.route("https://api.nice.sbs/embed.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: renderEmbedScript("https://api.nice.sbs"),
    });
  });

  await page.route(/https:\/\/api\.nice\.sbs\/(?:embed|e)\/[^?]+.*/, async (route) => {
    const url = new URL(route.request().url());
    const buttonId = url.pathname.split("/").pop() || VISUAL_BUTTON_ID;
    const theme = (url.searchParams.get("theme") ?? "light") as EmbedTheme;
    const size = (url.searchParams.get("size") ?? "md") as EmbedSize;
    const body = buttonId === "demo"
      ? renderDemoEmbedHtml({ theme, size })
      : renderEmbedHtml({
          apiBase: "https://api.nice.sbs",
          buttonId,
          theme,
          size,
          multiNice: url.searchParams.get("multi") === "1" || multiNice,
        });
    await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body });
  });

  await page.route(/https:\/\/api\.nice\.sbs\/badge\/[^?]+\.svg.*/, async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: generateBadge(count, { theme: normalizeTheme(url.searchParams.get("theme") ?? undefined) }),
    });
  });

  await page.route(/https:\/\/api\.nice\.sbs\/api\/v1\/nice\/[^/]+\/count.*/, async (route) => {
    if (options.countStatus && options.countStatus !== 200) {
      await fulfillJson(route, { error: "Not found", code: "NOT_FOUND" }, options.countStatus);
      return;
    }
    await fulfillJson(route, {
      count,
      has_niced: options.hasNiced ?? false,
      multi_nice: multiNice,
      url: "https://example.com/articles/visual-button",
    });
  });

  await page.route(/https:\/\/api\.nice\.sbs\/api\/v1\/nice\/[^/]+$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await fulfillJson(route, { success: true, count: count + 1 });
  });

  await page.route(/https:\/\/api\.nice\.sbs\/api\/v1\/nice\/[^/]+\/multi$/, async (route) => {
    await fulfillJson(route, { success: true, count: count + 1 });
  });

  await page.route("https://api.nice.sbs/api/v1/buttons", async (route) => {
    await fulfillJson(route, mockCreateButtonResponse({ count, multi_nice: multiNice }));
  });

  await page.route(/https:\/\/api\.nice\.sbs\/api\/v1\/buttons\/stats\/ns_.*/, async (route) => {
    await fulfillJson(route, mockButtonStats({ count, multi_nice: multiNice }));
  });

  await page.route(/https:\/\/api\.nice\.sbs\/api\/v1\/buttons\/ns_.*/, async (route) => {
    await fulfillJson(route, { success: true });
  });
}
