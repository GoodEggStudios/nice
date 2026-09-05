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
      { w: 789, h: EMBED_DIMENSIONS.sm.h }
    );
  });

  it("reserves the full label range for direct iframe snippets", () => {
    expect(getEmbedInitialDimensions("md", "Recommend", "Recommended", false)).toEqual({
      w: 868,
      h: EMBED_DIMENSIONS.md.h,
    });
  });

  it("reserves conservative space for short wide-glyph labels", () => {
    expect(getEmbedInitialDimensions("md", "推荐推荐推荐", "已推荐已推荐", false)).toEqual({
      w: 868,
      h: EMBED_DIMENSIONS.md.h,
    });
  });

  it("keeps multi-nice sizing based on the update-independent maximum", () => {
    expect(getEmbedInitialDimensions("md", "Clap", "A very long pressed label", true)).toEqual({
      w: 868,
      h: EMBED_DIMENSIONS.md.h,
    });
  });
});
