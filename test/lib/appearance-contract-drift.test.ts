import { describe, expect, it } from "vitest";
import {
  BUTTON_ANIMATIONS,
  BUTTON_SHAPES,
  COUNT_FORMATS,
  COUNT_POSITIONS,
  COUNT_VISIBILITIES,
  DEFAULT_BUTTON_ANIMATION,
  DEFAULT_BUTTON_SHAPE,
  DEFAULT_COUNT_FORMAT,
  DEFAULT_COUNT_POSITION,
  DEFAULT_COUNT_VISIBILITY,
} from "../../src/lib/button-appearance";
// Static website files cannot import Worker TypeScript; these raw imports
// detect option-list drift against src/lib/button-appearance.ts.
// @ts-expect-error Vite raw HTML import
import createHtml from "../../website/create.html?raw";
// @ts-expect-error Vite raw HTML import
import statsHtml from "../../website/stats.html?raw";

function optionValues(html: string, name: string): string[] {
  return [...html.matchAll(new RegExp(`name="${name}"[^>]*value="([^"]+)"`, "g"))].map(
    (match) => match[1],
  );
}

function selectValues(html: string, id: string): string[] {
  const block = html.match(new RegExp(`id="${id}"[\\s\\S]*?</select>`))?.[0] ?? "";
  return [...block.matchAll(/<option value="([^"]+)">/g)].map((match) => match[1]);
}

describe("appearance contract drift guards", () => {
  it("keeps create.html radio values aligned with button-appearance enums", () => {
    expect(optionValues(createHtml, "shape")).toEqual([...BUTTON_SHAPES]);
    expect(optionValues(createHtml, "count_visibility")).toEqual([...COUNT_VISIBILITIES]);
    expect(optionValues(createHtml, "count_position")).toEqual([...COUNT_POSITIONS]);
    expect(optionValues(createHtml, "count_format")).toEqual([...COUNT_FORMATS]);
    expect(optionValues(createHtml, "animation")).toEqual([...BUTTON_ANIMATIONS]);
  });

  it("keeps stats.html select values and defaults aligned with button-appearance enums", () => {
    expect(selectValues(statsHtml, "appearanceShape")).toEqual([...BUTTON_SHAPES]);
    expect(selectValues(statsHtml, "appearanceCountVisibility")).toEqual([...COUNT_VISIBILITIES]);
    expect(selectValues(statsHtml, "appearanceCountPosition")).toEqual([...COUNT_POSITIONS]);
    expect(selectValues(statsHtml, "appearanceCountFormat")).toEqual([...COUNT_FORMATS]);
    expect(selectValues(statsHtml, "appearanceAnimation")).toEqual([...BUTTON_ANIMATIONS]);

    expect(statsHtml).toContain(`shape: '${DEFAULT_BUTTON_SHAPE}'`);
    expect(statsHtml).toContain(`count_visibility: '${DEFAULT_COUNT_VISIBILITY}'`);
    expect(statsHtml).toContain(`count_position: '${DEFAULT_COUNT_POSITION}'`);
    expect(statsHtml).toContain(`count_format: '${DEFAULT_COUNT_FORMAT}'`);
    expect(statsHtml).toContain(`animation: '${DEFAULT_BUTTON_ANIMATION}'`);
  });
});
