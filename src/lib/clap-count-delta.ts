/**
 * Pure rules for ephemeral +N feedback when clap-mode compact shorthand stalls.
 */

export function formatClapCountDelta(delta: number): string {
  return `+${Math.max(0, Math.floor(delta))}`;
}

export function shouldShowClapCountDelta(opts: {
  isMulti: boolean;
  countFormat: "compact" | "full";
  previousDisplay: string;
  nextDisplay: string;
}): boolean {
  return (
    opts.isMulti &&
    opts.countFormat === "compact" &&
    opts.previousDisplay === opts.nextDisplay
  );
}

export function nextClapCountDelta(
  currentDelta: number,
  clickAmount = 1,
): number {
  return Math.max(0, currentDelta) + Math.max(1, clickAmount);
}
