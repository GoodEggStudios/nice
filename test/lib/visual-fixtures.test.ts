import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUTTON_ANIMATION,
  DEFAULT_BUTTON_SHAPE,
  DEFAULT_COUNT_FORMAT,
  DEFAULT_COUNT_POSITION,
  DEFAULT_COUNT_VISIBILITY,
} from "../../src/lib/button-appearance";
import {
  mockButtonStats,
  mockCreateButtonResponse,
  normalizeVisualAppearance,
} from "../visual/fixtures/data";

describe("visual appearance fixtures", () => {
  it("emits the complete default appearance contract", () => {
    const stats = mockButtonStats();
    expect(stats).toMatchObject({
      colors: null,
      shape: DEFAULT_BUTTON_SHAPE,
      count_visibility: DEFAULT_COUNT_VISIBILITY,
      count_position: DEFAULT_COUNT_POSITION,
      count_format: DEFAULT_COUNT_FORMAT,
      animation: DEFAULT_BUTTON_ANIMATION,
    });

    const created = mockCreateButtonResponse();
    expect(created).toMatchObject({
      colors: null,
      shape: DEFAULT_BUTTON_SHAPE,
      count_visibility: DEFAULT_COUNT_VISIBILITY,
      count_position: DEFAULT_COUNT_POSITION,
      count_format: DEFAULT_COUNT_FORMAT,
      animation: DEFAULT_BUTTON_ANIMATION,
    });
  });

  it("accepts partial appearance overrides and fills the remaining defaults", () => {
    const stats = mockButtonStats({
      shape: "pill",
      colors: { background: "#112233" },
    });

    expect(stats.shape).toBe("pill");
    expect(stats.count_visibility).toBe(DEFAULT_COUNT_VISIBILITY);
    expect(stats.colors).toEqual({
      background: "#112233",
      foreground: "#374151",
      border: "#D1D5DB",
      pressed_background: "#FEF3C7",
      pressed_foreground: "#92400E",
      pressed_border: "#F59E0B",
    });
  });

  it("preserves stored appearance when merging unrelated field updates", () => {
    const base = normalizeVisualAppearance({
      colors: {
        background: "#AABBCC",
        foreground: "#112233",
        border: "#334455",
        pressed_background: "#556677",
        pressed_foreground: "#778899",
        pressed_border: "#99AABB",
      },
      shape: "square",
      count_visibility: "always",
      count_position: "below",
      count_format: "full",
      animation: "sparkle",
    });

    const afterLabelOnlyPatch = normalizeVisualAppearance({}, base);
    expect(afterLabelOnlyPatch).toEqual(base);

    const afterColorsClear = normalizeVisualAppearance({ colors: null }, base);
    expect(afterColorsClear).toEqual({ ...base, colors: null });
  });
});
