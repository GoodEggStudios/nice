import { describe, it, expect } from "vitest";
import {
  canStartMultiNiceFlush,
  mergeMultiNiceCount,
  rollbackMultiNiceBatch,
  shouldFollowUpMultiNiceFlush,
} from "../../src/lib/multi-nice-batch";
import { renderEmbedHtml } from "../../src/routes/embed";

describe("multi-nice local batch reconcile", () => {
  describe("mergeMultiNiceCount", () => {
    it("keeps optimistic local count when a stale batch response arrives mid-burst", () => {
      // Server started at 10. First burst flushed +5 (response = 15).
      // During flight the visitor clicked 3 more times (local = 18).
      expect(mergeMultiNiceCount(18, 15)).toBe(18);
    });

    it("takes the server count when the server is ahead", () => {
      expect(mergeMultiNiceCount(15, 20)).toBe(20);
    });

    it("is a no-op when local and server agree", () => {
      expect(mergeMultiNiceCount(12, 12)).toBe(12);
    });
  });

  describe("flush coalescing", () => {
    it("blocks a second flush while one is in flight", () => {
      expect(canStartMultiNiceFlush(3, true)).toBe(false);
      expect(canStartMultiNiceFlush(3, false)).toBe(true);
      expect(canStartMultiNiceFlush(0, false)).toBe(false);
    });

    it("schedules a follow-up flush when clicks arrived during flight", () => {
      // In-flight request just settled (inFlight=false), pending clicks remain.
      expect(shouldFollowUpMultiNiceFlush(3, false)).toBe(true);
      expect(shouldFollowUpMultiNiceFlush(0, false)).toBe(false);
      expect(shouldFollowUpMultiNiceFlush(3, true)).toBe(false);
    });
  });

  describe("rollbackMultiNiceBatch", () => {
    it("subtracts only the failed batch from local optimistic count", () => {
      // Local 18 = server 10 + failed batch 5 + pending 3 still unsent.
      expect(rollbackMultiNiceBatch(18, 5)).toBe(13);
    });

    it("does not go negative", () => {
      expect(rollbackMultiNiceBatch(2, 5)).toBe(0);
    });
  });

  describe("burst sequence (fast-slow-fast)", () => {
    it("never lets an older batch response clobber a newer local total", () => {
      let count = 10;
      let pending = 0;
      let inFlight = false;
      let inFlightBatch = 0;

      const click = () => {
        count += 1;
        pending += 1;
      };

      const startFlush = () => {
        if (!canStartMultiNiceFlush(pending, inFlight)) return null;
        inFlightBatch = pending;
        pending = 0;
        inFlight = true;
        return inFlightBatch;
      };

      const completeFlush = (serverCount: number) => {
        count = mergeMultiNiceCount(count, serverCount);
        inFlight = false;
        inFlightBatch = 0;
        return shouldFollowUpMultiNiceFlush(pending, inFlight);
      };

      // Burst 1
      click();
      click();
      click();
      expect(count).toBe(13);
      const batch1 = startFlush();
      expect(batch1).toBe(3);

      // Slow gap with more clicks while first batch is in flight
      click();
      click();
      expect(count).toBe(15);
      expect(startFlush()).toBeNull(); // coalesced — still in flight

      // Stale-ish response for batch 1 must not wipe the newer local clicks
      const needsFollowUp = completeFlush(13);
      expect(count).toBe(15);
      expect(needsFollowUp).toBe(true);

      // Follow-up flush for the second burst
      const batch2 = startFlush();
      expect(batch2).toBe(2);
      completeFlush(15);
      expect(count).toBe(15);

      // Fast burst again while idle
      click();
      click();
      click();
      const batch3 = startFlush();
      expect(batch3).toBe(3);
      // Overlapping clicks during flight
      click();
      completeFlush(18);
      expect(count).toBe(19);
      expect(shouldFollowUpMultiNiceFlush(pending, false)).toBe(true);
    });
  });

  describe("embed multi-nice script", () => {
    it("merges batch responses with Math.max so local bursts are not clobbered", () => {
      const html = renderEmbedHtml({
        apiBase: "https://api.nice.sbs",
        buttonId: "n_abcdefgh",
        theme: "light",
        size: "md",
        multiNice: true,
      });

      expect(html).toContain("count=Math.max(count,data.count||0)");
      expect(html).toContain("multiInFlight");
      expect(html).toMatch(/multiInFlight=false;if\(pendingMultiCount>0\)/);
    });

    it("includes clap delta markup and stall feedback when compact shorthand is unchanged", () => {
      const html = renderEmbedHtml({
        apiBase: "https://api.nice.sbs",
        buttonId: "n_abcdefgh",
        theme: "light",
        size: "md",
        multiNice: true,
      });

      expect(html).toContain('id="niceClapDelta"');
      expect(html).toContain("function showClapDelta");
      expect(html).toContain("function clearClapDelta");
      // Single source of truth: clap-delta rules live only in the embed script.
      expect(html).toMatch(
        /if\(COUNT_FORMAT==='compact'&&prevText===nextText\)\{clapDelta=clapDelta\+1;showClapDelta\(\);\}/,
      );
      expect(html).toContain("deltaEl.textContent='+'+clapDelta");
      expect(html).toContain("clearClapDelta();updateDisplay()");
      expect(html).toContain("count=Math.max(count,data.count||0)");
    });
  });
});
