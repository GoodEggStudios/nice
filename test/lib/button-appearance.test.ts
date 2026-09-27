import { describe, expect, it } from "vitest";
import {
  BUTTON_SHAPES,
  COUNT_VISIBILITIES,
  COUNT_POSITIONS,
  COUNT_FORMATS,
  BUTTON_ANIMATIONS,
  DEFAULT_BUTTON_SHAPE,
  DEFAULT_COUNT_VISIBILITY,
  DEFAULT_COUNT_POSITION,
  DEFAULT_COUNT_FORMAT,
  DEFAULT_BUTTON_ANIMATION,
  validateButtonColors,
  normalizeStoredButtonColors,
  validateButtonShape,
  validateCountVisibility,
  validateCountPosition,
  validateCountFormat,
  validateButtonAnimation,
  serializeButtonColors,
  normalizeStoredButtonShape,
  normalizeStoredCountVisibility,
  normalizeStoredCountPosition,
  normalizeStoredCountFormat,
  normalizeStoredButtonAnimation,
  validateAppearance,
  applyAppearanceValues,
  getButtonAppearance,
} from "../../src/lib/button-appearance";

describe("button appearance", () => {
  it("exports the allowed values and defaults", () => {
    expect(BUTTON_SHAPES).toEqual(["rounded", "pill", "square"]);
    expect(COUNT_VISIBILITIES).toEqual(["nonzero", "always", "hidden"]);
    expect(COUNT_POSITIONS).toEqual(["inside", "beside", "below"]);
    expect(COUNT_FORMATS).toEqual(["compact", "full"]);
    expect(BUTTON_ANIMATIONS).toEqual([
      "pop",
      "bounce",
      "sparkle",
      "confetti",
      "none",
    ]);
    expect(DEFAULT_BUTTON_SHAPE).toBe("rounded");
    expect(DEFAULT_COUNT_VISIBILITY).toBe("nonzero");
    expect(DEFAULT_COUNT_POSITION).toBe("inside");
    expect(DEFAULT_COUNT_FORMAT).toBe("compact");
    expect(DEFAULT_BUTTON_ANIMATION).toBe("pop");
  });

  it("validateAppearance accepts a full payload and rejects invalid enum fields", async () => {
    const ok = validateAppearance({
      colors: {
        background: "#aabbcc",
        foreground: "#DDEEFF",
        border: "#112233",
        pressed_background: "#445566",
        pressed_foreground: "#778899",
        pressed_border: "#a1b2c3",
      },
      shape: "pill",
      count_visibility: "always",
      count_position: "beside",
      count_format: "full",
      animation: "bounce",
    });
    expect(ok).toEqual({
      ok: true,
      value: {
        colors: {
          background: "#AABBCC",
          foreground: "#DDEEFF",
          border: "#112233",
          pressedBackground: "#445566",
          pressedForeground: "#778899",
          pressedBorder: "#A1B2C3",
        },
        shape: "pill",
        countVisibility: "always",
        countPosition: "beside",
        countFormat: "full",
        animation: "bounce",
      },
    });

    const bad = validateAppearance({ shape: "hexagon" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.response.status).toBe(400);
      await expect(bad.response.json()).resolves.toEqual({
        error: "Invalid shape",
        code: "INVALID_SHAPE",
      });
    }
  });

  it("applyAppearanceValues mutates only provided fields and clears colors with null", () => {
    const button = {
      colors: {
        background: "#AABBCC",
        foreground: "#DDEEFF",
        border: "#112233",
        pressedBackground: "#445566",
        pressedForeground: "#778899",
        pressedBorder: "#A1B2C3",
      },
      shape: "rounded" as const,
      countVisibility: "nonzero" as const,
      countPosition: "inside" as const,
      countFormat: "compact" as const,
      animation: "pop" as const,
    };

    applyAppearanceValues(button, {
      colors: null,
      shape: "square",
      animation: "none",
    });

    expect(button.colors).toBeUndefined();
    expect(button.shape).toBe("square");
    expect(button.countVisibility).toBe("nonzero");
    expect(button.countPosition).toBe("inside");
    expect(button.countFormat).toBe("compact");
    expect(button.animation).toBe("none");
  });

  it("getButtonAppearance serializes stored fields with defaults for missing values", () => {
    expect(getButtonAppearance({})).toEqual({
      colors: null,
      shape: "rounded",
      count_visibility: "nonzero",
      count_position: "inside",
      count_format: "compact",
      animation: "pop",
    });

    expect(
      getButtonAppearance({
        colors: {
          background: "#AABBCC",
          foreground: "#DDEEFF",
          border: "#112233",
          pressedBackground: "#445566",
          pressedForeground: "#778899",
          pressedBorder: "#A1B2C3",
        },
        shape: "pill",
        countVisibility: "hidden",
        countPosition: "below",
        countFormat: "full",
        animation: "confetti",
      })
    ).toEqual({
      colors: {
        background: "#AABBCC",
        foreground: "#DDEEFF",
        border: "#112233",
        pressed_background: "#445566",
        pressed_foreground: "#778899",
        pressed_border: "#A1B2C3",
      },
      shape: "pill",
      count_visibility: "hidden",
      count_position: "below",
      count_format: "full",
      animation: "confetti",
    });
  });

  it("accepts a complete palette and normalizes hex values to uppercase", () => {
    const result = validateButtonColors({
      background: "#aabbcc",
      foreground: "#DDEEFF",
      border: "#112233",
      pressed_background: "#445566",
      pressed_foreground: "#778899",
      pressed_border: "#a1b2c3",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        background: "#AABBCC",
        foreground: "#DDEEFF",
        border: "#112233",
        pressedBackground: "#445566",
        pressedForeground: "#778899",
        pressedBorder: "#A1B2C3",
      },
    });
  });

  it("accepts null as theme colours", () => {
    expect(validateButtonColors(null)).toEqual({ ok: true, value: null });
  });

  it("serializes stored colours with the public snake_case keys", () => {
    expect(
      serializeButtonColors({
        background: "#aabbcc",
        foreground: "#DDEEFF",
        border: "#112233",
        pressedBackground: "#445566",
        pressedForeground: "#778899",
        pressedBorder: "#a1b2c3",
      })
    ).toEqual({
      background: "#AABBCC",
      foreground: "#DDEEFF",
      border: "#112233",
      pressed_background: "#445566",
      pressed_foreground: "#778899",
      pressed_border: "#A1B2C3",
    });
    expect(serializeButtonColors(undefined)).toBeNull();
  });

  it("rejects malformed palettes with INVALID_COLORS", async () => {
    const complete = {
      background: "#AABBCC",
      foreground: "#DDEEFF",
      border: "#112233",
      pressed_background: "#445566",
      pressed_foreground: "#778899",
      pressed_border: "#A1B2C3",
    };
    const malformed = [
      undefined,
      42,
      true,
      [],
      {},
      () => "#AABBCC",
      { ...complete, border: undefined },
      { ...complete, extra: "#000000" },
      { ...complete, background: "red" },
      { ...complete, background: "#abc" },
      { ...complete, background: "#AABBCCFF" },
      { ...complete, background: "rgb(1, 2, 3)" },
      { ...complete, background: " #AABBCC" },
      { ...complete, background: "#AABBCC " },
      { ...complete, background: 123 },
      { ...complete, background: () => "#AABBCC" },
    ];

    for (const value of malformed) {
      const result = validateButtonColors(value);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
        await expect(result.response.json()).resolves.toEqual({
          error: "Invalid colors",
          code: "INVALID_COLORS",
        });
      }
    }
  });

  it("normalizes only valid stored palettes", () => {
    expect(
      normalizeStoredButtonColors({
        background: "#aabbcc",
        foreground: "#DDEEFF",
        border: "#112233",
        pressedBackground: "#445566",
        pressedForeground: "#778899",
        pressedBorder: "#a1b2c3",
      })
    ).toEqual({
      background: "#AABBCC",
      foreground: "#DDEEFF",
      border: "#112233",
      pressedBackground: "#445566",
      pressedForeground: "#778899",
      pressedBorder: "#A1B2C3",
    });

    for (const value of [
      undefined,
      null,
      {},
      { background: "red" },
      {
        background: "#AABBCC",
        foreground: "#DDEEFF",
        border: "#112233",
        pressedBackground: "#445566",
        pressedForeground: "#778899",
        pressedBorder: "#A1B2C3",
        extra: "#000000",
      },
    ]) {
      expect(normalizeStoredButtonColors(value)).toBeNull();
    }
  });

  it("validates every enum value and normalizes malformed stored values", async () => {
    const validators = [
      {
        values: ["rounded", "pill", "square"],
        validate: validateButtonShape,
        normalize: normalizeStoredButtonShape,
        fallback: "rounded",
        code: "INVALID_SHAPE",
      },
      {
        values: ["nonzero", "always", "hidden"],
        validate: validateCountVisibility,
        normalize: normalizeStoredCountVisibility,
        fallback: "nonzero",
        code: "INVALID_COUNT_VISIBILITY",
      },
      {
        values: ["inside", "beside", "below"],
        validate: validateCountPosition,
        normalize: normalizeStoredCountPosition,
        fallback: "inside",
        code: "INVALID_COUNT_POSITION",
      },
      {
        values: ["compact", "full"],
        validate: validateCountFormat,
        normalize: normalizeStoredCountFormat,
        fallback: "compact",
        code: "INVALID_COUNT_FORMAT",
      },
      {
        values: ["pop", "bounce", "sparkle", "confetti", "none"],
        validate: validateButtonAnimation,
        normalize: normalizeStoredButtonAnimation,
        fallback: "pop",
        code: "INVALID_ANIMATION",
      },
    ] as const;

    for (const item of validators) {
      for (const value of item.values) {
        expect(item.validate(value)).toEqual({ ok: true, value });
        expect(item.normalize(value)).toBe(value);
      }

      for (const value of [undefined, null, "invalid", 42, {}, []]) {
        const result = item.validate(value);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.response.status).toBe(400);
          await expect(result.response.json()).resolves.toEqual({
            error: expect.any(String),
            code: item.code,
          });
        }
        expect(item.normalize(value)).toBe(item.fallback);
      }
    }
  });
});
