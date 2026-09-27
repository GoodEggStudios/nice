import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUTTON_LABEL,
  DEFAULT_PRESSED_BUTTON_LABEL,
  MAX_BUTTON_LABEL_CODE_POINTS,
  normalizeStoredButtonLabel,
  validateButtonLabel,
} from "../../src/lib/button-labels";

describe("button labels", () => {
  it("exports the feature defaults", () => {
    expect(DEFAULT_BUTTON_LABEL).toBe("Nice");
    expect(DEFAULT_PRESSED_BUTTON_LABEL).toBe("Nice'd");
    expect(MAX_BUTTON_LABEL_CODE_POINTS).toBe(32);
  });

  it("normalizes stored labels by trimming whitespace", () => {
    expect(normalizeStoredButtonLabel("  Recommend  ", DEFAULT_BUTTON_LABEL)).toBe(
      "Recommend"
    );
    expect(normalizeStoredButtonLabel("  two   words  ", DEFAULT_BUTTON_LABEL)).toBe(
      "two   words"
    );
  });

  it("falls back for missing or malformed stored labels", () => {
    const malformedValues = [
      undefined,
      null,
      123,
      "",
      "   ",
      "a".repeat(MAX_BUTTON_LABEL_CODE_POINTS + 1),
      "line\nbreak",
      "tab\tcharacter",
      "null\u0000character",
      "delete\u007fcharacter",
      "less<than",
      "greater>than",
    ];

    for (const value of malformedValues) {
      expect(normalizeStoredButtonLabel(value, DEFAULT_BUTTON_LABEL)).toBe(
        DEFAULT_BUTTON_LABEL
      );
    }
  });

  it("counts Unicode code points rather than UTF-16 code units", () => {
    const label = "😀".repeat(MAX_BUTTON_LABEL_CODE_POINTS);
    expect(Array.from(label)).toHaveLength(MAX_BUTTON_LABEL_CODE_POINTS);
    expect(normalizeStoredButtonLabel(label, DEFAULT_BUTTON_LABEL)).toBe(label);

    const result = validateButtonLabel(`${label}a`, "label");
    expect(result.ok).toBe(false);
  });

  it("accepts a label at the code-point boundary", () => {
    const result = validateButtonLabel(
      "a".repeat(MAX_BUTTON_LABEL_CODE_POINTS),
      "label"
    );

    expect(result).toEqual({
      ok: true,
      value: "a".repeat(MAX_BUTTON_LABEL_CODE_POINTS),
    });
  });

  it("rejects invalid label types and empty values", async () => {
    for (const value of [undefined, null, 42, true, {}, "", "   "]) {
      const result = validateButtonLabel(value, "label");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
        await expect(result.response.json()).resolves.toEqual({
          error: "Invalid button label",
          code: "INVALID_LABEL",
        });
      }
    }
  });

  it("rejects labels containing ASCII control characters", () => {
    for (const value of [
      "line\nbreak",
      "tab\tcharacter",
      "null\u0000character",
      "delete\u007fcharacter",
      "\nRecommend",
      "Recommend\t",
    ]) {
      const result = validateButtonLabel(value, "label");
      expect(result.ok).toBe(false);
    }
  });

  it("uses the pressed-label-specific error code", async () => {
    const result = validateButtonLabel("", "pressed_label");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({
        error: "Invalid pressed label",
        code: "INVALID_PRESSED_LABEL",
      });
    }
  });
});
