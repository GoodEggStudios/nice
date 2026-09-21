import { describe, expect, it } from "vitest";
import {
  EMBED_DIMENSIONS,
  getEmbedInitialDimensions,
} from "../../src/routes/embed-constants";

describe("getEmbedInitialDimensions", () => {
  it("preserves the existing dimensions for default labels", () => {
    expect(getEmbedInitialDimensions("md", "Nice", "Nice'd", false)).toEqual(
      EMBED_DIMENSIONS.md
    );
  });

  it("uses only the idle label in clap mode", () => {
    expect(getEmbedInitialDimensions("sm", "Clap", "A very long pressed label", true)).toEqual(
      { w: 173, h: EMBED_DIMENSIONS.sm.h }
    );
  });

  it("sizes direct iframe snippets from the longest relevant label", () => {
    expect(getEmbedInitialDimensions("md", "Recommend", "Recommended", false)).toEqual({
      w: 364,
      h: EMBED_DIMENSIONS.md.h,
    });
  });

  it("reserves conservative space for short wide-glyph labels", () => {
    expect(getEmbedInitialDimensions("md", "推荐推荐推荐", "已推荐已推荐", false)).toEqual({
      w: 244,
      h: EMBED_DIMENSIONS.md.h,
    });
  });

  it("sizes multi-nice embeds from the idle label", () => {
    expect(getEmbedInitialDimensions("md", "Clap", "A very long pressed label", true)).toEqual({
      w: 196,
      h: EMBED_DIMENSIONS.md.h,
    });
  });

  it("budgets visible outside counts using the selected formatter", () => {
    const appearance = {
      colors: null,
      shape: "rounded",
      count_visibility: "always",
      count_position: "beside",
      count_format: "full",
      animation: "pop",
    } as const;

    expect(getEmbedInitialDimensions("md", "Nice", "Nice'd", false, 123456, appearance)).toEqual({
      w: 169,
      h: EMBED_DIMENSIONS.md.h,
    });
  });

  it("adds below-count height but reserves no space for hidden counts", () => {
    const below = {
      colors: null,
      shape: "rounded",
      count_visibility: "always",
      count_position: "below",
      count_format: "compact",
      animation: "pop",
    } as const;
    const hidden = { ...below, count_visibility: "hidden" } as const;
    const nonzero = { ...below, count_visibility: "nonzero" } as const;

    expect(getEmbedInitialDimensions("sm", "Nice", "Nice'd", false, 42, below)).toEqual({
      w: EMBED_DIMENSIONS.sm.w,
      h: 51,
    });
    expect(getEmbedInitialDimensions("sm", "Nice", "Nice'd", false, 42, hidden)).toEqual(
      EMBED_DIMENSIONS.sm
    );
    expect(getEmbedInitialDimensions("sm", "Nice", "Nice'd", false, 0, nonzero)).toEqual({
      w: EMBED_DIMENSIONS.sm.w,
      h: EMBED_DIMENSIONS.sm.h,
    });
  });

  it("does not reserve hidden nonzero counts before they appear", () => {
    const appearance = {
      colors: null,
      shape: "rounded",
      count_visibility: "nonzero",
      count_position: "beside",
      count_format: "compact",
      animation: "pop",
    } as const;

    expect(getEmbedInitialDimensions("md", "Nice", "Nice'd", false, 0, appearance)).toEqual({
      w: EMBED_DIMENSIONS.md.w,
      h: EMBED_DIMENSIONS.md.h,
    });
  });

  it("budgets inside full counts and one digit of growth", () => {
    const appearance = {
      colors: null,
      shape: "rounded",
      count_visibility: "always",
      count_position: "inside",
      count_format: "full",
      animation: "pop",
    } as const;

    expect(getEmbedInitialDimensions("md", "Nice", "Nice'd", false, 9, appearance)).toEqual({
      w: 124,
      h: EMBED_DIMENSIONS.md.h,
    });
  });

  it("reserves the final envelope for particle animations", () => {
    const appearance = {
      colors: null,
      shape: "rounded",
      count_visibility: "nonzero",
      count_position: "inside",
      count_format: "compact",
      animation: "confetti",
    } as const;

    expect(getEmbedInitialDimensions("md", "Nice", "Nice'd", false, 0, appearance)).toEqual({
      w: 212,
      h: 84,
    });
  });

  it("stacks beside-count headroom with the confetti particle envelope", () => {
    const appearance = {
      colors: null,
      shape: "pill",
      count_visibility: "always",
      count_position: "beside",
      count_format: "full",
      animation: "confetti",
    } as const;

    expect(getEmbedInitialDimensions("md", "Nice", "Nice'd", false, 0, appearance)).toEqual({
      w: 236,
      h: 84,
    });
    expect(getEmbedInitialDimensions("md", "Nice", "Nice'd", false, 123456, appearance)).toEqual({
      w: 281,
      h: 84,
    });
  });
});
