import { describe, expect, it } from "vitest";
// Static homepage cannot import shared modules; raw import keeps the
// published rotating-word list pinned to the intended expanded set.
// @ts-expect-error Vite raw HTML import
import indexHtml from "../../website/index.html?raw";

/** Keep the original reactions and the intended expanded playful set aligned. */
const EXPECTED_ROTATING_WORDS = [
  "Nice",
  "Awesome",
  "Cool",
  "Spicey",
  "Sucks",
  "Rocks",
  "Slaps",
  "Rules",
  "Hits",
  "Fire",
  "Gross",
  "Flops",
  "Stinks",
  "Mid",
  "Lame",
] as const;

function rotatingWordsFromHomepage(html: string): string[] {
  const match = html.match(/const ROTATING_WORDS = (\[[\s\S]*?\]);/);
  if (!match) {
    throw new Error("ROTATING_WORDS array not found in website/index.html");
  }
  return JSON.parse(match[1].replace(/'/g, '"')) as string[];
}

describe("homepage rotating words", () => {
  it("publishes the expanded positive and negative flip-through list", () => {
    expect(rotatingWordsFromHomepage(indexHtml)).toEqual([...EXPECTED_ROTATING_WORDS]);
  });
});
