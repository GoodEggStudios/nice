/**
 * Client-side multi-nice batch helpers.
 *
 * The embed debounces clicks into /multi requests. While a batch is in flight
 * the visitor can keep clicking, so the optimistic local count may be ahead of
 * any single response. These helpers keep that state coherent under bursts.
 */

/** Merge a batch API count into the optimistic local count. */
export function mergeMultiNiceCount(localCount: number, serverCount: number): number {
  return Math.max(localCount, serverCount);
}

/** Whether a flush may start (pending work, nothing already in flight). */
export function canStartMultiNiceFlush(pendingCount: number, inFlight: boolean): boolean {
  return pendingCount > 0 && !inFlight;
}

/** Whether another flush is needed after a request settles. */
export function shouldFollowUpMultiNiceFlush(
  pendingCount: number,
  inFlight: boolean
): boolean {
  return pendingCount > 0 && !inFlight;
}

/** Roll back a failed batch without going negative. */
export function rollbackMultiNiceBatch(localCount: number, batchSize: number): number {
  return Math.max(0, localCount - batchSize);
}
