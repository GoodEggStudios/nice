import { test, expect, type Page } from "@playwright/test";
import { installNiceApiMocks } from "./fixtures/routes";
import { startVisualServer, type VisualServer } from "./fixtures/server";

let server: VisualServer;

test.beforeAll(async () => {
  server = await startVisualServer();
});

test.afterAll(async () => {
  await server.close();
});

async function openCreatePage(page: Page) {
  await installNiceApiMocks(page);
  await page.goto(`${server.origin}/create`);
}

test("create defaults select the expected appearance values", async ({ page }) => {
  await openCreatePage(page);

  await expect(page.getByRole("heading", { name: "Button appearance" })).toBeVisible();
  await expect(page.locator("#customColors")).not.toBeChecked();
  await expect(page.locator("input[name='shape'][value='rounded']")).toBeChecked();
  await expect(page.locator("input[name='count_visibility'][value='nonzero']")).toBeChecked();
  await expect(page.locator("input[name='count_position'][value='inside']")).toBeChecked();
  await expect(page.locator("input[name='count_format'][value='compact']")).toBeChecked();
  await expect(page.locator("input[name='animation'][value='pop']")).toBeChecked();
  await expect(page.locator("#colorBackground")).toBeDisabled();
  await expect(page.locator("#previewButton")).toHaveClass(/shape-rounded/);
});

test("custom colours seed from minimal and stay stable across theme changes", async ({ page }) => {
  await openCreatePage(page);

  await page.getByText("Minimal", { exact: true }).click();
  await page.locator("#customColors").check();
  await expect(page.locator("#colorBackground")).toHaveValue("#ffffff");
  await expect(page.locator("#colorForeground")).toHaveValue("#374151");
  await expect(page.locator("#previewNote")).toContainText("replace minimal theme transparency");

  await page.locator("#colorBackground").fill("#abcdef");
  await page.getByText("Light", { exact: true }).click();
  await expect(page.locator("#colorBackground")).toHaveValue("#abcdef");
  await expect(page.locator("#previewButton")).toHaveCSS("background-color", "rgb(171, 205, 239)");

  await page.locator("#customColors").uncheck();
  await expect(page.locator("#colorBackground")).toBeDisabled();
  await expect(page.locator("#previewButton")).not.toHaveClass(/has-custom-colors/);
});

test("shape and count controls update the preview presentation", async ({ page }) => {
  await openCreatePage(page);

  await page.getByText("Pill", { exact: true }).click();
  await expect(page.locator("#previewButton")).toHaveClass(/shape-pill/);
  await page.getByText("Square", { exact: true }).click();
  await expect(page.locator("#previewButton")).toHaveClass(/shape-square/);

  await page.getByText("Beside", { exact: true }).click();
  await expect(page.locator("#previewDemo")).toHaveClass(/count-position-beside/);
  await page.getByText("Below", { exact: true }).click();
  await expect(page.locator("#previewDemo")).toHaveClass(/count-position-below/);

  await page.getByText("Hidden", { exact: true }).click();
  await expect(page.locator("#previewCount")).toBeHidden();

  await page.getByText("Always", { exact: true }).click();
  await page.locator("#previewZeroToggle").click();
  await expect(page.locator("#previewCount")).toBeVisible();
  await expect(page.locator("#previewCount")).toHaveText("0");

  await page.getByText("Non-zero", { exact: true }).click();
  await expect(page.locator("#previewCount")).toBeHidden();

  await page.getByText("Always", { exact: true }).click();
  await page.locator("#previewZeroToggle").click();
  await expect(page.locator("#previewCount")).toHaveText("42K");
  await page.getByText("Full", { exact: true }).click();
  await expect(page.locator("#previewCount")).toHaveText("42000");
});

test("every count visibility, position, and format combination updates the preview DOM", async ({ page }) => {
  await openCreatePage(page);

  for (const visibility of ["nonzero", "always", "hidden"]) {
    for (const position of ["inside", "beside", "below"]) {
      for (const format of ["compact", "full"]) {
        await page.locator(`input[name="count_visibility"][value="${visibility}"]`).check();
        await page.locator(`input[name="count_position"][value="${position}"]`).check();
        await page.locator(`input[name="count_format"][value="${format}"]`).check();

        const visible = visibility !== "hidden";
        const inside = position === "inside";
        expect(await page.locator("#previewCountInside").isVisible()).toBe(visible && inside);
        expect(await page.locator("#previewCount").isVisible()).toBe(visible && !inside);
        if (visible) {
          await expect(page.locator(inside ? "#previewCountInside" : "#previewCount"))
            .toHaveText(format === "full" ? "42" : "42");
        }
      }
    }
  }
});

test("animation choices run locally and reduced motion suppresses them", async ({ page }) => {
  await openCreatePage(page);

  for (const animation of ["Pop", "Sparkle", "None"]) {
    await page.getByText(animation, { exact: true }).click();
    await page.locator("#previewButton").click();
    if (animation === "None") {
      await expect(page.locator("#previewButton")).not.toHaveClass(/is-animating/);
    } else {
      await expect(page.locator("#previewButton")).toHaveClass(/is-animating/);
      await expect(page.locator("#previewButton")).not.toHaveClass(/is-animating/, { timeout: 1_000 });
    }
  }

  await page.getByText("Bounce", { exact: true }).click();
  await page.locator("#previewButton").click();
  await expect(page.locator("#previewButton")).toHaveClass(/is-animating/);
  await expect(page.locator("#previewButton")).not.toHaveClass(/is-animating/, { timeout: 1_000 });

  await page.getByText("Confetti", { exact: true }).click();
  await page.locator("#previewButton").click();
  await expect.poll(() => page.locator("#previewCanvas").evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBeGreaterThan(0);
  await expect(page.locator("#previewNote")).toContainText("inside the preview iframe area");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByText("Pop", { exact: true }).click();
  await page.locator("#previewButton").click();
  await expect(page.locator("#previewButton")).not.toHaveClass(/is-animating/);
});

test("create sends the exact appearance contract without leaking it into the embed URL", async ({ page }) => {
  await openCreatePage(page);
  await page.locator("#urlInput").fill("example.com/appearance");
  await page.locator("#customColors").check();
  await page.locator("#colorBackground").fill("#abcdef");
  await page.locator("#colorForeground").fill("#123456");
  await page.locator("#colorBorder").fill("#654321");
  await page.locator("#colorPressedBackground").fill("#fedcba");
  await page.locator("#colorPressedForeground").fill("#a1b2c3");
  await page.locator("#colorPressedBorder").fill("#c3b2a1");
  await page.getByText("Pill", { exact: true }).click();
  await page.getByText("Always", { exact: true }).click();
  await page.getByText("Beside", { exact: true }).click();
  await page.getByText("Full", { exact: true }).click();
  await page.getByText("Sparkle", { exact: true }).click();

  const requestPromise = page.waitForRequest("https://api.nice.sbs/api/v1/buttons");
  await page.locator("#submitBtn").click();
  const body = (await requestPromise).postDataJSON();

  expect(body).toMatchObject({
    colors: {
      background: "#ABCDEF",
      foreground: "#123456",
      border: "#654321",
      pressed_background: "#FEDCBA",
      pressed_foreground: "#A1B2C3",
      pressed_border: "#C3B2A1",
    },
    shape: "pill",
    count_visibility: "always",
    count_position: "beside",
    count_format: "full",
    animation: "sparkle",
  });
  await expect(page.locator("#result")).toHaveClass(/show/);
  await expect(page.locator("#snippet")).toContainText("<iframe");
  await expect(page.locator("#snippet")).not.toContainText("shape=");
});

test("create defaults submit the expected appearance values", async ({ page }) => {
  await openCreatePage(page);
  await page.locator("#urlInput").fill("example.com/default-appearance");

  const requestPromise = page.waitForRequest("https://api.nice.sbs/api/v1/buttons");
  await page.locator("#submitBtn").click();
  const body = (await requestPromise).postDataJSON();

  expect(body).toMatchObject({
    colors: null,
    shape: "rounded",
    count_visibility: "nonzero",
    count_position: "inside",
    count_format: "compact",
    animation: "pop",
  });
});

test("appearance API errors preserve values and focus the affected control", async ({ page }) => {
  await openCreatePage(page);
  await page.locator("#urlInput").fill("example.com/appearance-error");
  await page.locator("#customColors").check();
  await page.locator("#colorBackground").fill("#abcdef");
  await installNiceApiMocks(page, {
    createStatus: 400,
    createErrorCode: "INVALID_COLORS",
    createError: "Invalid colours",
  });

  await page.locator("#submitBtn").click();
  await expect(page.locator("#appearanceError")).toHaveText("Invalid colours");
  await expect(page.locator("#colorBackground")).toHaveValue("#abcdef");
  await expect(page.locator("#colorBackground")).toBeFocused();
  await expect(page.locator("#submitBtn")).toBeEnabled();
});

test("host confetti changes only the returned script snippet", async ({ page }) => {
  await openCreatePage(page);
  await page.locator("#urlInput").fill("example.com/host-confetti");
  await page.locator("#confetti").check();
  const requestPromise = page.waitForRequest("https://api.nice.sbs/api/v1/buttons");
  await page.locator("#submitBtn").click();
  const body = (await requestPromise).postDataJSON();

  expect(body.animation).toBe("pop");
  await expect(page.locator("#snippet")).toContainText('data-confetti="1"');
  await expect(page.locator("#resultPreview iframe")).toBeVisible();
  await expect(page.locator("#resultPreview iframe")).not.toHaveAttribute("src", /animation|confetti/);
});

test("successful creation reconciles controls from the normalized server response", async ({ page }) => {
  await installNiceApiMocks(page, {
    createResponse: {
      colors: {
        background: "#112233",
        foreground: "#445566",
        border: "#778899",
        pressed_background: "#AABBCC",
        pressed_foreground: "#DDEEFF",
        pressed_border: "#010203",
      },
      shape: "square",
      count_visibility: "hidden",
      count_position: "below",
      count_format: "full",
      animation: "none",
    },
  });
  await page.goto(`${server.origin}/create`);
  await page.locator("#urlInput").fill("example.com/normalized-appearance");
  await page.getByText("Pill", { exact: true }).click();
  await page.locator("#submitBtn").click();

  await expect(page.locator("#result")).toHaveClass(/show/);
  await expect(page.locator("#customColors")).toBeChecked();
  await expect(page.locator("#colorBackground")).toHaveValue("#112233");
  await expect(page.locator("input[name='shape'][value='square']")).toBeChecked();
  await expect(page.locator("input[name='count_visibility'][value='hidden']")).toBeChecked();
  await expect(page.locator("input[name='count_position'][value='below']")).toBeChecked();
  await expect(page.locator("input[name='count_format'][value='full']")).toBeChecked();
  await expect(page.locator("input[name='animation'][value='none']")).toBeChecked();
  await expect(page.locator("#resultPreview iframe")).toBeVisible();
});

test("appearance radios remain keyboard-operable", async ({ page }) => {
  await openCreatePage(page);
  const pill = page.locator("input[name='shape'][value='pill']");
  await pill.focus();
  await expect(pill).toBeFocused();
  await pill.press("Space");
  await expect(pill).toBeChecked();
  await expect(page.locator("#previewButton")).toHaveClass(/shape-pill/);
  await expect(pill.locator(".." )).toHaveCSS("outline-style", "solid");
});
