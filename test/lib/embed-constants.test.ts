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
      EMBED_DIMENSIONS.sm
    );
  });

  it("adds width for the longest single-nice label", () => {
    expect(getEmbedInitialDimensions("md", "Recommend", "Recommended", false)).toEqual({
      w: 244,
      h: EMBED_DIMENSIONS.md.h,
    });
  });

  it("reserves conservative space for wide glyphs", () => {
    expect(getEmbedInitialDimensions("md", "推荐推荐推荐", "已推荐已推荐", false)).toEqual({
      w: 124,
      h: EMBED_DIMENSIONS.md.h,
    });
  });
});
