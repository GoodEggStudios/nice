# Visual Screenshot Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright-powered visual screenshot generation for Nice embed buttons, badges, and website placements, with small committed PNG snapshots.

**Architecture:** Keep visual testing separate from existing Vitest/Cloudflare worker tests. Use Playwright for browser rendering, route interception for deterministic API responses, focused locator screenshots for compact surfaces, and committed PNGs under `test/visual/screenshots/`. Refactor reusable embed assets so production routes and visual tests use the same source.

**Tech Stack:** TypeScript, Playwright Test, Node HTTP server, existing Cloudflare Worker route modules, existing static files in `website/`.

## Global Constraints

- Generate small PNG screenshots for every supported way Nice buttons, badges, and website placements can appear.
- Commit generated screenshots to the repository so visual changes are visible in ordinary code review.
- Keep visual tests separate from the existing Vitest and Cloudflare worker API tests.
- Use deterministic fixtures and mocked API responses so screenshots do not depend on production data, timing, or external state.
- Do not upload screenshot artifacts in the initial workflow.
- Do not require Git LFS for baselines.
- Do not make visual comparison a blocking CI gate in the first phase.
- Use Playwright focused locator screenshots for button and badge surfaces, capturing a padded wrapper instead of the whole viewport.
- Use Playwright request interception for `https://api.nice.sbs` calls made by static website pages.
- Naming should follow Playwright snapshot conventions where practical so future `toHaveScreenshot()` verification can reuse the same files without a migration.
- Run `npm run typecheck`, `npm run test:unit -- --run`, `npm run test:e2e`, and `npm run test:visual:update` before the final implementation handoff.

---

## File Structure

- Modify `package.json`: add Playwright dependency and visual scripts.
- Modify `package-lock.json`: update dependency lock after `npm install`.
- Modify `tsconfig.json`: include Node types for the visual test harness.
- Create `playwright.config.ts`: Playwright project configuration and snapshot path template.
- Modify `.gitignore`: ignore Playwright transient output while keeping committed screenshots tracked.
- Modify `src/routes/embed.ts`: export shared embed constants and render helpers while preserving existing route responses.
- Create `test/visual/fixtures/data.ts`: deterministic IDs, counts, button records, and API response payloads.
- Create `test/visual/fixtures/server.ts`: local static server for website files and visual fixture pages.
- Create `test/visual/fixtures/routes.ts`: Playwright route interception helpers for `https://api.nice.sbs`.
- Create `test/visual/fixtures/screenshot.ts`: focused screenshot helpers and stable rendering helpers.
- Create `test/visual/embed.visual.spec.ts`: embed button screenshot scenarios.
- Create `test/visual/badge.visual.spec.ts`: badge screenshot scenarios.
- Create `test/visual/website.visual.spec.ts`: website placement screenshot scenarios.
- Create `test/visual/screenshots/.gitkeep`: keep screenshot directory visible before PNG generation.
- Modify `README.md`: document how to generate and review visual screenshots.

---

### Task 1: Add Playwright Configuration And Scripts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Create: `playwright.config.ts`
- Modify: `.gitignore`
- Create: `test/visual/screenshots/.gitkeep`
- Test: `npx playwright test --list`

**Interfaces:**
- Produces: `npm run test:visual:update`, which updates committed screenshot baselines.
- Produces: `npm run test:visual`, which compares against committed screenshot baselines.
- Produces: Playwright snapshot path convention rooted at `test/visual/screenshots/`.

- [ ] **Step 1: Install Playwright Test**

Run:

```bash
npm install --save-dev @playwright/test @types/node
```

Expected:

```text
added or updated development dependencies
```

Then install the Chromium browser used by visual tests:

```bash
npx playwright install chromium
```

Expected:

```text
Downloading Chromium
```

If Chromium is already installed, the command may finish without downloading.

- [ ] **Step 2: Add visual scripts**

Edit `package.json` so the `scripts` block includes these entries:

```json
{
  "test:visual": "playwright test",
  "test:visual:update": "playwright test --update-snapshots"
}
```

Keep the existing scripts unchanged.

- [ ] **Step 3: Add Node types to TypeScript config**

Edit `tsconfig.json` so `compilerOptions.types` includes `"node"` in addition to the existing Cloudflare and Vitest worker types:

```json
{
  "types": ["node", "@cloudflare/workers-types/2023-07-01", "@cloudflare/vitest-pool-workers"]
}
```

- [ ] **Step 4: Create Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/visual",
  outputDir: "test-results/visual",
  snapshotPathTemplate: "{testDir}/screenshots/{arg}{ext}",
  fullyParallel: false,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    browserName: "chromium",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    },
  },
});
```

- [ ] **Step 5: Ignore transient Playwright output**

Append these lines to `.gitignore`:

```gitignore

# Playwright output
playwright-report/
test-results/visual/
```

Do not ignore `test/visual/screenshots/`; PNG baselines in that directory must be committed.

- [ ] **Step 6: Create screenshot directory marker**

Create `test/visual/screenshots/.gitkeep` with no contents.

- [ ] **Step 7: Verify Playwright discovers no tests yet**

Run:

```bash
npx playwright test --list
```

Expected:

```text
Listing tests:
Total: 0 tests in 0 files
```

The exact wording can vary, but the command must exit successfully.

- [ ] **Step 8: Verify TypeScript still passes**

Run:

```bash
npm run typecheck
```

Expected:

```text
> nice@0.1.0 typecheck
> tsc --noEmit
```

Exit code must be 0.

- [ ] **Step 9: Commit**

Run:

```bash
git add package.json package-lock.json tsconfig.json playwright.config.ts .gitignore test/visual/screenshots/.gitkeep
git commit -m "test: add playwright visual test setup"
```

---

### Task 2: Export Shared Embed Rendering Helpers

**Files:**
- Modify: `src/routes/embed.ts`
- Modify: `test/e2e/embed.test.ts`
- Test: `test/e2e/embed.test.ts`

**Interfaces:**
- Produces: `EMBED_THEMES: readonly ["light", "dark", "minimal", "mono-dark", "mono-light"]`.
- Produces: `EMBED_SIZES: readonly ["xs", "sm", "md", "lg", "xl"]`.
- Produces: `EMBED_DIMENSIONS: Record<EmbedSize, { w: number; h: number }>` with current iframe dimensions.
- Produces: `renderEmbedHtml(options: RenderEmbedHtmlOptions): string`.
- Produces: `renderDemoEmbedHtml(options: RenderDemoEmbedHtmlOptions): string`.
- Produces: `renderEmbedScript(embedBase?: string): string`.
- Preserves: `serveEmbedScript(request: Request): Promise<Response>`.
- Preserves: `serveEmbedPage(request: Request, buttonId: string, env?: Env): Promise<Response>`.

- [ ] **Step 1: Add exports and types in `src/routes/embed.ts`**

Near the top of `src/routes/embed.ts`, replace the private script/template constants with exported constants and render helpers. Keep the existing HTML/CSS/JS content identical except for template-token replacement moving into functions.

Add these type and constant exports before route functions:

```ts
export const EMBED_THEMES = ["light", "dark", "minimal", "mono-dark", "mono-light"] as const;
export const EMBED_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type EmbedTheme = typeof EMBED_THEMES[number];
export type EmbedSize = typeof EMBED_SIZES[number];

export const EMBED_DIMENSIONS: Record<EmbedSize, { w: number; h: number }> = {
  xs: { w: 70, h: 28 },
  sm: { w: 85, h: 32 },
  md: { w: 100, h: 36 },
  lg: { w: 120, h: 44 },
  xl: { w: 140, h: 52 },
};

export interface RenderEmbedHtmlOptions {
  apiBase: string;
  buttonId: string;
  theme: EmbedTheme;
  size: EmbedSize;
  multiNice?: boolean;
}

export interface RenderDemoEmbedHtmlOptions {
  theme: EmbedTheme;
  size: EmbedSize;
}
```

Convert the current `EMBED_SCRIPT` constant into a function:

```ts
export function renderEmbedScript(embedBase = "https://nice.sbs"): string {
  return `(function(){'use strict';const EMBED_BASE=${JSON.stringify(embedBase)};const SIZES={xs:{w:70,h:28},sm:{w:85,h:32},md:{w:100,h:36},lg:{w:120,h:44},xl:{w:140,h:52}};function init(){document.querySelectorAll('script[data-button]').forEach(createEmbed)}function createEmbed(script){const buttonId=script.getAttribute('data-button');if(!buttonId)return;const theme=script.getAttribute('data-theme')||'light';const size=script.getAttribute('data-size')||'md';const dims=SIZES[size]||SIZES.md;const container=document.createElement('div');container.className='nice-embed';container.style.cssText='display:inline-block;vertical-align:middle;';const iframe=document.createElement('iframe');iframe.src=EMBED_BASE+'/embed/'+buttonId+'?theme='+encodeURIComponent(theme)+'&size='+encodeURIComponent(size);iframe.style.cssText='border:none;overflow:hidden;width:'+dims.w+'px;height:'+dims.h+'px;';iframe.setAttribute('scrolling','no');iframe.setAttribute('frameborder','0');iframe.setAttribute('allowtransparency','true');iframe.setAttribute('sandbox','allow-scripts allow-same-origin');iframe.setAttribute('title','Nice button');container.appendChild(iframe);script.parentNode.insertBefore(container,script.nextSibling);window.addEventListener('message',function(event){if(event.origin!==EMBED_BASE)return;try{const data=event.data;if(data.type==='nice-resize'&&data.buttonId===buttonId){iframe.style.width=data.width+'px';iframe.style.height=data.height+'px'}}catch(e){}})}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}else{init()}})();`;
}
```

Add helper functions to normalize route parameters:

```ts
function normalizeTheme(theme: string | null): EmbedTheme {
  return EMBED_THEMES.includes(theme as EmbedTheme) ? (theme as EmbedTheme) : "light";
}

function normalizeSize(size: string | null): EmbedSize {
  return EMBED_SIZES.includes(size as EmbedSize) ? (size as EmbedSize) : "md";
}
```

Add render wrappers around the existing template strings:

```ts
export function renderDemoEmbedHtml(options: RenderDemoEmbedHtmlOptions): string {
  return DEMO_HTML
    .replace(/\{\{THEME\}\}/g, options.theme)
    .replace(/\{\{SIZE\}\}/g, options.size);
}

export function renderEmbedHtml(options: RenderEmbedHtmlOptions): string {
  const safeButtonId = options.buttonId.replace(/[<>"'&]/g, "");
  return EMBED_HTML
    .replace(/\{\{API_BASE\}\}/g, options.apiBase)
    .replace(/\{\{BUTTON_ID\}\}/g, safeButtonId)
    .replace(/\{\{THEME\}\}/g, options.theme)
    .replace(/\{\{SIZE\}\}/g, options.size)
    .replace(/\{\{MULTI_NICE\}\}/g, options.multiNice ? "1" : "0");
}
```

- [ ] **Step 2: Update route functions to use the helpers**

Update `serveEmbedScript`:

```ts
export async function serveEmbedScript(request: Request): Promise<Response> {
  return new Response(renderEmbedScript(), {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
```

Update the start of `serveEmbedPage` to use helpers:

```ts
const theme = normalizeTheme(url.searchParams.get("theme"));
const size = normalizeSize(url.searchParams.get("size"));
```

Update the demo branch:

```ts
if (buttonId === "demo") {
  const html = renderDemoEmbedHtml({ theme, size });
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Frame-Options": "ALLOWALL",
      "Content-Security-Policy": "frame-ancestors *",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}
```

Update the final render:

```ts
const html = renderEmbedHtml({
  apiBase,
  buttonId,
  theme,
  size,
  multiNice: isMulti === "1",
});
```

- [ ] **Step 3: Add e2e assertions for exported route behavior**

Append this test to `test/e2e/embed.test.ts` inside the top-level `describe("Embed", () => {` block, before its closing `});`:

```ts
it("should keep supported themes and sizes rendering through shared helpers", async () => {
  const res = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?theme=mono-light&size=sm");

  expect(res.status).toBe(200);
  const body = await res.text();
  expect(body).toContain('class="theme-mono-light size-sm"');
});
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm run test:e2e -- test/e2e/embed.test.ts
```

Expected:

```text
Test Files  1 passed
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected exit code: 0.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/routes/embed.ts test/e2e/embed.test.ts
git commit -m "refactor: share embed rendering helpers"
```

---

### Task 3: Build The Visual Harness

**Files:**
- Create: `test/visual/fixtures/data.ts`
- Create: `test/visual/fixtures/server.ts`
- Create: `test/visual/fixtures/routes.ts`
- Create: `test/visual/fixtures/screenshot.ts`
- Test: `test/visual/harness.visual.spec.ts`

**Interfaces:**
- Produces: `VISUAL_BUTTON_ID = "n_visual0001"`.
- Produces: `VISUAL_PRIVATE_ID = "ns_visual000000000001"`.
- Produces: `mockButtonStats(overrides?: Partial<VisualButtonStats>): VisualButtonStats`.
- Produces: `startVisualServer(): Promise<VisualServer>`.
- Produces: `installNiceApiMocks(page: Page, options?: NiceApiMockOptions): Promise<void>`.
- Produces: `screenshotPaddedLocator(locator: Locator, name: string): Promise<void>`.
- Consumes: `renderEmbedHtml`, `renderDemoEmbedHtml`, `renderEmbedScript` from `src/routes/embed.ts`.
- Consumes: `generateBadge` from `src/lib/badge.ts`.

- [ ] **Step 1: Create deterministic data fixtures**

Create `test/visual/fixtures/data.ts`:

```ts
export const VISUAL_BUTTON_ID = "n_visual0001";
export const VISUAL_PRIVATE_ID = "ns_visual000000000001";
export const VISUAL_URL = "https://example.com/articles/visual-button";
export const VISUAL_CREATED_AT = "2026-06-27T12:00:00.000Z";

export interface VisualButtonStats {
  id: string;
  url: string;
  restriction: "url" | "domain" | "global";
  multi_nice: boolean;
  count: number;
  theme: "light" | "dark" | "minimal" | "mono-dark" | "mono-light";
  size: "xs" | "sm" | "md" | "lg" | "xl";
  created_at: string;
}

export function mockButtonStats(overrides: Partial<VisualButtonStats> = {}): VisualButtonStats {
  return {
    id: VISUAL_BUTTON_ID,
    url: VISUAL_URL,
    restriction: "url",
    multi_nice: false,
    count: 42,
    theme: "dark",
    size: "md",
    created_at: VISUAL_CREATED_AT,
    ...overrides,
  };
}

export function mockCreateButtonResponse(overrides: Partial<VisualButtonStats> = {}) {
  const stats = mockButtonStats(overrides);
  return {
    public_id: stats.id,
    private_id: VISUAL_PRIVATE_ID,
    url: stats.url,
    restriction: stats.restriction,
    multi_nice: stats.multi_nice,
    theme: stats.theme,
    size: stats.size,
    count: stats.count,
    created_at: stats.created_at,
    embed: {
      iframe: `<iframe src="https://api.nice.sbs/e/${stats.id}?theme=${stats.theme}&size=${stats.size}" style="border:none;width:100px;height:36px;" title="Nice button"></iframe>`,
      script: `<script src="https://api.nice.sbs/embed.js" data-button="${stats.id}" data-theme="${stats.theme}" data-size="${stats.size}" async></script>`,
    },
  };
}
```

- [ ] **Step 2: Create the local visual server**

Create `test/visual/fixtures/server.ts`:

```ts
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDemoEmbedHtml, renderEmbedHtml, renderEmbedScript, type EmbedSize, type EmbedTheme } from "../../../src/routes/embed";
import { generateBadge, normalizeTheme } from "../../../src/lib/badge";
import { VISUAL_BUTTON_ID } from "./data";

const rootDir = fileURLToPath(new URL("../../..", import.meta.url));
const websiteDir = join(rootDir, "website");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
};

export interface VisualServer {
  origin: string;
  close(): Promise<void>;
}

function normalizeWebsitePath(pathname: string): string {
  if (pathname === "/") return "/index.html";
  if (pathname === "/create") return "/create.html";
  if (pathname === "/stats") return "/stats.html";
  if (pathname === "/button") return "/button.html";
  return pathname;
}

export async function startVisualServer(): Promise<VisualServer> {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");

      if (url.pathname === "/visual/host-script.html") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!doctype html><html><body><main class="host" style="padding:24px;background:#161616"><script src="https://api.nice.sbs/embed.js" data-button="${VISUAL_BUTTON_ID}" data-theme="dark" data-size="md" async></script></main></body></html>`);
        return;
      }

      if (url.pathname === "/embed.js") {
        res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
        res.end(renderEmbedScript("https://api.nice.sbs"));
        return;
      }

      const embedMatch = url.pathname.match(/^\/(?:embed|e)\/([^/]+)$/);
      if (embedMatch) {
        const buttonId = embedMatch[1];
        const theme = (url.searchParams.get("theme") ?? "light") as EmbedTheme;
        const size = (url.searchParams.get("size") ?? "md") as EmbedSize;
        const html = buttonId === "demo"
          ? renderDemoEmbedHtml({ theme, size })
          : renderEmbedHtml({
              apiBase: "https://api.nice.sbs",
              buttonId,
              theme,
              size,
              multiNice: url.searchParams.get("multi") === "1",
            });
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      const badgeMatch = url.pathname.match(/^\/badge\/([^/]+)\.svg$/);
      if (badgeMatch) {
        const count = Number(url.searchParams.get("count") ?? "42");
        const theme = normalizeTheme(url.searchParams.get("theme") ?? undefined);
        res.writeHead(200, { "Content-Type": "image/svg+xml" });
        res.end(generateBadge(count, { theme }));
        return;
      }

      const safePath = normalize(normalizeWebsitePath(url.pathname)).replace(/^(\.\.[/\\])+/, "");
      const filePath = join(websiteDir, safePath);
      const body = await readFile(filePath);
      res.writeHead(200, { "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Visual server did not bind to a TCP port");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())),
  };
}
```

- [ ] **Step 3: Create API route interception helpers**

Create `test/visual/fixtures/routes.ts`:

```ts
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
```

- [ ] **Step 4: Create screenshot helpers**

Create `test/visual/fixtures/screenshot.ts`:

```ts
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
    `,
  });
  await page.evaluate(() => document.fonts?.ready);
}

export async function screenshotPaddedLocator(locator: Locator, name: string): Promise<void> {
  await expect(locator).toHaveScreenshot(name, {
    animations: "disabled",
    scale: "css",
  });
}
```

- [ ] **Step 5: Add a harness smoke test**

Create `test/visual/harness.visual.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { startVisualServer, type VisualServer } from "./fixtures/server";
import { installNiceApiMocks } from "./fixtures/routes";
import { stabilizePage } from "./fixtures/screenshot";

let server: VisualServer;

test.beforeAll(async () => {
  server = await startVisualServer();
});

test.afterAll(async () => {
  await server.close();
});

test("visual harness serves static pages and intercepts API routes", async ({ page }) => {
  await installNiceApiMocks(page);
  await page.goto(`${server.origin}/create`);
  await stabilizePage(page);

  await expect(page.locator("h1")).toHaveText("CREATE BUTTON");
  await expect(page.locator("#previewFrame")).toBeVisible();
});
```

- [ ] **Step 6: Run the smoke test**

Run:

```bash
npm run test:visual -- test/visual/harness.visual.spec.ts
```

Expected:

```text
1 passed
```

- [ ] **Step 7: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected exit code: 0.

- [ ] **Step 8: Commit**

Run:

```bash
git add test/visual/fixtures test/visual/harness.visual.spec.ts
git commit -m "test: add visual screenshot harness"
```

---

### Task 4: Generate Focused Embed Button Screenshots

**Files:**
- Create: `test/visual/embed.visual.spec.ts`
- Create: PNG files under `test/visual/screenshots/embed/`
- Test: `test/visual/embed.visual.spec.ts`

**Interfaces:**
- Consumes: `startVisualServer()`.
- Consumes: `installNiceApiMocks(page, options)`.
- Consumes: `screenshotPaddedLocator(locator, name)`.
- Produces: focused padded snapshots for all default theme x size combinations.
- Produces: representative state snapshots for count, niced, multi-nice, hover, focus, and unavailable state.

- [ ] **Step 1: Write embed visual tests**

Create `test/visual/embed.visual.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";
import { EMBED_DIMENSIONS, EMBED_SIZES, EMBED_THEMES, type EmbedSize, type EmbedTheme } from "../../src/routes/embed";
import { VISUAL_BUTTON_ID } from "./fixtures/data";
import { installNiceApiMocks } from "./fixtures/routes";
import { screenshotPaddedLocator, stabilizePage } from "./fixtures/screenshot";
import { startVisualServer, type VisualServer } from "./fixtures/server";

let server: VisualServer;

test.beforeAll(async () => {
  server = await startVisualServer();
});

test.afterAll(async () => {
  await server.close();
});

async function openEmbed(page: Page, theme: EmbedTheme, size: EmbedSize, options: { count?: number; countStatus?: number; hasNiced?: boolean; multiNice?: boolean } = {}) {
  await installNiceApiMocks(page, options);
  const multi = options.multiNice ? "&multi=1" : "";
  await page.goto(`${server.origin}/e/${VISUAL_BUTTON_ID}?theme=${theme}&size=${size}${multi}`);
  await page.evaluate((hasNiced) => {
    if (hasNiced) localStorage.setItem(`nice:${document.location.pathname.split("/").pop()}`, "1");
  }, options.hasNiced ?? false);
  if (options.hasNiced) {
    await page.reload();
  }
  await stabilizePage(page);
  await expect(page.locator("#niceBtn")).toBeVisible();
}

test.describe("embed default theme and size matrix", () => {
  for (const theme of EMBED_THEMES) {
    for (const size of EMBED_SIZES) {
      test(`${theme} ${size}`, async ({ page }) => {
        await openEmbed(page, theme, size, { count: 0 });
        const dims = EMBED_DIMENSIONS[size];
        await page.setViewportSize({ width: dims.w + 32, height: dims.h + 32 });
        await screenshotPaddedLocator(page.locator("body"), `embed/default/${theme}-${size}.png`);
      });
    }
  }
});

test("embed visible count", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-count.png");
});

test("embed niced state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42, hasNiced: true });
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-niced.png");
});

test("embed multi-nice state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42, multiNice: true });
  await page.locator("#niceBtn").click();
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-multi-clicked.png");
});

test("embed hover state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await page.locator("#niceBtn").hover();
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-hover.png");
});

test("embed focus state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { count: 42 });
  await page.locator("#niceBtn").focus();
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-focus.png");
});

test("embed unavailable state", async ({ page }) => {
  await openEmbed(page, "dark", "md", { countStatus: 404 });
  await expect(page.locator("#niceBtn")).toHaveClass(/disabled/);
  await screenshotPaddedLocator(page.locator("body"), "embed/states/dark-md-unavailable.png");
});
```

- [ ] **Step 2: Run embed snapshots in update mode**

Run:

```bash
npm run test:visual:update -- test/visual/embed.visual.spec.ts
```

Expected:

```text
passed
```

Expected generated files include:

```text
test/visual/screenshots/embed/default/light-xs.png
test/visual/screenshots/embed/default/dark-md.png
test/visual/screenshots/embed/default/mono-light-xl.png
test/visual/screenshots/embed/states/dark-md-count.png
test/visual/screenshots/embed/states/dark-md-niced.png
```

- [ ] **Step 3: Verify embed snapshots compare cleanly**

Run:

```bash
npm run test:visual -- test/visual/embed.visual.spec.ts
```

Expected:

```text
passed
```

- [ ] **Step 4: Inspect screenshot file sizes**

Run:

```bash
find test/visual/screenshots/embed -type f -name '*.png' -maxdepth 3 -print0 | xargs -0 ls -lh
```

Expected: focused button PNGs should be small. If a file is a full page screenshot, fix the locator before committing.

- [ ] **Step 5: Commit**

Run:

```bash
git add test/visual/embed.visual.spec.ts test/visual/screenshots/embed
git commit -m "test: add embed button visual snapshots"
```

---

### Task 5: Generate Focused Badge Screenshots

**Files:**
- Create: `test/visual/badge.visual.spec.ts`
- Create: PNG files under `test/visual/screenshots/badge/`
- Test: `test/visual/badge.visual.spec.ts`

**Interfaces:**
- Consumes: `generateBadge(count, { theme })`.
- Consumes: `screenshotPaddedLocator(locator, name)`.
- Produces: badge screenshots for every badge theme and representative counts.

- [ ] **Step 1: Write badge visual tests**

Create `test/visual/badge.visual.spec.ts`:

```ts
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
        await page.setContent(`<!doctype html><html><body style="margin:0;padding:12px;background:#202020"><div data-shot="badge" style="display:inline-block;padding:8px;background:#111">${svg}</div></body></html>`);
        await stabilizePage(page);
        await expect(page.locator("[data-shot='badge'] svg")).toBeVisible();
        await screenshotPaddedLocator(page.locator("[data-shot='badge']"), `badge/${theme}-${count.label}.png`);
      });
    }
  }
});
```

- [ ] **Step 2: Run badge snapshots in update mode**

Run:

```bash
npm run test:visual:update -- test/visual/badge.visual.spec.ts
```

Expected:

```text
passed
```

Expected generated files include:

```text
test/visual/screenshots/badge/default-0.png
test/visual/screenshots/badge/rich-1_2k.png
test/visual/screenshots/badge/rich-mono-inverted-long.png
```

- [ ] **Step 3: Verify badge snapshots compare cleanly**

Run:

```bash
npm run test:visual -- test/visual/badge.visual.spec.ts
```

Expected:

```text
passed
```

- [ ] **Step 4: Commit**

Run:

```bash
git add test/visual/badge.visual.spec.ts test/visual/screenshots/badge
git commit -m "test: add badge visual snapshots"
```

---

### Task 6: Generate Website Placement Screenshots

**Files:**
- Create: `test/visual/website.visual.spec.ts`
- Create: PNG files under `test/visual/screenshots/website/`
- Test: `test/visual/website.visual.spec.ts`

**Interfaces:**
- Consumes: `startVisualServer()`.
- Consumes: `installNiceApiMocks(page, options)`.
- Produces: desktop and mobile screenshots for homepage, create page, public button page, stats page, and script-tag insertion host page.

- [ ] **Step 1: Write website visual tests**

Create `test/visual/website.visual.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";
import { VISUAL_BUTTON_ID, VISUAL_PRIVATE_ID } from "./fixtures/data";
import { installNiceApiMocks } from "./fixtures/routes";
import { screenshotPaddedLocator, stabilizePage } from "./fixtures/screenshot";
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
  await stabilizePage(page);
}

for (const viewport of viewports) {
  test(`homepage ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/", viewport);
    await expect(page.locator("h1")).toHaveText("Nice");
    await screenshotPaddedLocator(page.locator("body"), `website/home-${viewport.name}.png`);
  });

  test(`create empty ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/create", viewport);
    await expect(page.locator("#createForm")).toBeVisible();
    await screenshotPaddedLocator(page.locator("body"), `website/create-empty-${viewport.name}.png`);
  });

  test(`create result ${viewport.name}`, async ({ page }) => {
    await openPage(page, "/create", viewport);
    await page.locator("#urlInput").fill("example.com/articles/visual-button");
    await page.locator("#submitBtn").click();
    await expect(page.locator("#result")).toHaveClass(/show/);
    await screenshotPaddedLocator(page.locator("body"), `website/create-result-${viewport.name}.png`);
  });

  test(`public button loaded ${viewport.name}`, async ({ page }) => {
    await openPage(page, `/button?id=${VISUAL_BUTTON_ID}`, viewport);
    await expect(page.locator(".count")).toHaveText("42");
    await screenshotPaddedLocator(page.locator("body"), `website/button-loaded-${viewport.name}.png`);
  });

  test(`public button missing ${viewport.name}`, async ({ page }) => {
    await installNiceApiMocks(page, { countStatus: 404 });
    await page.setViewportSize(viewport);
    await page.goto(`${server.origin}/button?id=n_missing0000`);
    await stabilizePage(page);
    await expect(page.locator(".error")).toHaveText("Button not found");
    await screenshotPaddedLocator(page.locator("body"), `website/button-missing-${viewport.name}.png`);
  });

  test(`stats loaded ${viewport.name}`, async ({ page }) => {
    await openPage(page, `/stats?id=${VISUAL_PRIVATE_ID}`, viewport);
    await expect(page.locator("#content")).toBeVisible();
    await screenshotPaddedLocator(page.locator("body"), `website/stats-loaded-${viewport.name}.png`);
  });

  test(`stats missing ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${server.origin}/stats?id=invalid`);
    await stabilizePage(page);
    await expect(page.locator("#error")).toBeVisible();
    await screenshotPaddedLocator(page.locator("body"), `website/stats-missing-${viewport.name}.png`);
  });
}

test("script tag insertion host page", async ({ page }) => {
  await installNiceApiMocks(page);
  await page.goto(`${server.origin}/visual/host-script.html`);
  await stabilizePage(page);
  await expect(page.frameLocator("iframe[title='Nice button']").locator("#niceBtn")).toBeVisible();
  await screenshotPaddedLocator(page.locator(".host"), "website/script-tag-host.png");
});
```

- [ ] **Step 2: Run website snapshots in update mode**

Run:

```bash
npm run test:visual:update -- test/visual/website.visual.spec.ts
```

Expected:

```text
passed
```

Expected generated files include:

```text
test/visual/screenshots/website/home-desktop.png
test/visual/screenshots/website/create-result-mobile.png
test/visual/screenshots/website/button-loaded-desktop.png
test/visual/screenshots/website/stats-loaded-mobile.png
test/visual/screenshots/website/script-tag-host.png
```

- [ ] **Step 3: Verify website snapshots compare cleanly**

Run:

```bash
npm run test:visual -- test/visual/website.visual.spec.ts
```

Expected:

```text
passed
```

- [ ] **Step 4: Commit**

Run:

```bash
git add test/visual/website.visual.spec.ts test/visual/screenshots/website
git commit -m "test: add website placement visual snapshots"
```

---

### Task 7: Document The Visual Review Workflow

**Files:**
- Modify: `README.md`
- Test: `README.md`

**Interfaces:**
- Consumes: `npm run test:visual:update`.
- Consumes: `npm run test:visual`.
- Produces: contributor-facing instructions for updating committed PNG screenshots.

- [ ] **Step 1: Add README section**

In `README.md`, after the Development command block, add:

````md
### Visual Screenshots

Nice keeps small Playwright screenshots in `test/visual/screenshots/` so button, badge, and website visual changes are reviewable in git.

Regenerate screenshots after an intentional visual change:

```bash
npm run test:visual:update
```

Check current rendering against the committed screenshots:

```bash
npm run test:visual
```

Commit code and changed PNGs together. Screenshots are intentionally small and committed directly; Git LFS is not required.
````

Ensure the nested fenced code blocks render correctly. Use four backticks for the outer patch block if editing manually.

- [ ] **Step 2: Verify README text**

Run:

```bash
rg -n "Visual Screenshots|test:visual:update|Git LFS" README.md
```

Expected:

```text
The output contains "### Visual Screenshots", "npm run test:visual:update", and "Git LFS is not required."
```

- [ ] **Step 3: Commit**

Run:

```bash
git add README.md
git commit -m "docs: document visual screenshot workflow"
```

---

### Task 8: Final Verification

**Files:**
- Verify: all files touched by Tasks 1-7

**Interfaces:**
- Consumes: all prior tasks.
- Produces: confidence that visual screenshot generation, existing API tests, and typechecking pass together.

- [ ] **Step 1: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected exit code: 0.

- [ ] **Step 2: Run unit tests**

Run:

```bash
npm run test:unit -- --run
```

Expected:

```text
All unit test files passed.
```

- [ ] **Step 3: Run worker e2e tests**

Run:

```bash
npm run test:e2e
```

Expected:

```text
All e2e test files passed.
```

- [ ] **Step 4: Regenerate all visual screenshots**

Run:

```bash
npm run test:visual:update
```

Expected:

```text
passed
```

- [ ] **Step 5: Compare all visual screenshots**

Run:

```bash
npm run test:visual
```

Expected:

```text
passed
```

- [ ] **Step 6: Review generated PNG footprint**

Run:

```bash
find test/visual/screenshots -type f -name '*.png' -print0 | xargs -0 du -ch | tail -1
```

Expected: total size is small enough for normal git review. If total size is unexpectedly large, inspect for accidental full-page captures in embed or badge screenshots.

- [ ] **Step 7: Review git status**

Run:

```bash
git status --short
```

Expected: only intentional implementation files and generated screenshots are modified or untracked.

- [ ] **Step 8: Commit any remaining final fixes**

If Task 8 produced final corrections, commit them:

```bash
git add .
git commit -m "test: finalize visual screenshot coverage"
```

If there are no remaining changes, skip this commit.
