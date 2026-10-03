import { describe, it, expect } from "vitest";
import {
  formatClapCountDelta,
  shouldShowClapCountDelta,
  nextClapCountDelta,
} from "../../src/lib/clap-count-delta";

describe("clap count delta", () => {
  describe("formatClapCountDelta", () => {
    it("formats a single click as +1", () => {
      expect(formatClapCountDelta(1)).toBe("+1");
    });

    it("formats a burst as +12", () => {
      expect(formatClapCountDelta(12)).toBe("+12");
    });
  });

  describe("shouldShowClapCountDelta", () => {
    it("shows when clap + compact shorthand stalls (1K→1K)", () => {
      expect(
        shouldShowClapCountDelta({
          isMulti: true,
          countFormat: "compact",
          previousDisplay: "1K",
          nextDisplay: "1K",
        }),
      ).toBe(true);
    });

    it("hides when shorthand changes (999→1K)", () => {
      expect(
        shouldShowClapCountDelta({
          isMulti: true,
          countFormat: "compact",
          previousDisplay: "999",
          nextDisplay: "1K",
        }),
      ).toBe(false);
    });

    it("hides when count_format is full", () => {
      expect(
        shouldShowClapCountDelta({
          isMulti: true,
          countFormat: "full",
          previousDisplay: "1000",
          nextDisplay: "1001",
        }),
      ).toBe(false);
    });

    it("hides when not clap mode", () => {
      expect(
        shouldShowClapCountDelta({
          isMulti: false,
          countFormat: "compact",
          previousDisplay: "1K",
          nextDisplay: "1K",
        }),
      ).toBe(false);
    });

    it("shows on 1M stall the same as 1K", () => {
      expect(
        shouldShowClapCountDelta({
          isMulti: true,
          countFormat: "compact",
          previousDisplay: "1M",
          nextDisplay: "1M",
        }),
      ).toBe(true);
    });
  });

  describe("nextClapCountDelta", () => {
    it("starts a burst at 1 from zero", () => {
      expect(nextClapCountDelta(0)).toBe(1);
    });

    it("accumulates another click onto an in-flight delta", () => {
      expect(nextClapCountDelta(3)).toBe(4);
    });
  });
});
