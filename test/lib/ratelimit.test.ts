import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkCreateRateLimit,
  createRateLimitResponse,
} from "../../src/lib/ratelimit";

// Mock KV namespace
function createMockKV() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) || null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    _store: store,
  };
}

describe("Rate Limiting", () => {
  let mockKV: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKV = createMockKV();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00Z"));
  });

  describe("checkCreateRateLimit", () => {
    it("should allow first request", async () => {
      const result = await checkCreateRateLimit(mockKV as unknown as KVNamespace, "1.2.3.4");

      expect(result.allowed).toBe(true);
      expect(result.hourlyRemaining).toBe(9); // 10 - 1
      expect(result.dailyRemaining).toBe(49); // 50 - 1
    });

    it("should decrement remaining counts", async () => {
      // First request
      let result = await checkCreateRateLimit(mockKV as unknown as KVNamespace, "1.2.3.4");
      expect(result.hourlyRemaining).toBe(9);

      // Second request
      result = await checkCreateRateLimit(mockKV as unknown as KVNamespace, "1.2.3.4");
      expect(result.hourlyRemaining).toBe(8);
      expect(result.dailyRemaining).toBe(48);
    });

    it("should enforce hourly limit (10/hour)", async () => {
      // Make 10 requests (limit)
      for (let i = 0; i < 10; i++) {
        const result = await checkCreateRateLimit(mockKV as unknown as KVNamespace, "1.2.3.4");
        expect(result.allowed).toBe(true);
      }

      // 11th request should be denied
      const result = await checkCreateRateLimit(mockKV as unknown as KVNamespace, "1.2.3.4");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("hourly_limit");
      expect(result.hourlyRemaining).toBe(0);
    });

    it("should enforce daily limit (50/day)", async () => {
      // Make 50 requests across multiple "hours"
      for (let hour = 0; hour < 5; hour++) {
        vi.setSystemTime(new Date(`2026-02-18T${10 + hour}:00:00Z`));
        for (let i = 0; i < 10; i++) {
          await checkCreateRateLimit(mockKV as unknown as KVNamespace, "1.2.3.4");
        }
      }

      // 51st request should be denied (daily limit)
      vi.setSystemTime(new Date("2026-02-18T15:00:00Z"));
      const result = await checkCreateRateLimit(mockKV as unknown as KVNamespace, "1.2.3.4");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("daily_limit");
      expect(result.dailyRemaining).toBe(0);
    });

    it("should track different IPs separately", async () => {
      // IP 1 makes requests
      for (let i = 0; i < 10; i++) {
        await checkCreateRateLimit(mockKV as unknown as KVNamespace, "1.1.1.1");
      }

      // IP 2 should still be allowed
      const result = await checkCreateRateLimit(mockKV as unknown as KVNamespace, "2.2.2.2");
      expect(result.allowed).toBe(true);
      expect(result.hourlyRemaining).toBe(9);
    });

    it("should include retryAfter for hourly limit", async () => {
      // Hit hourly limit
      for (let i = 0; i < 11; i++) {
        await checkCreateRateLimit(mockKV as unknown as KVNamespace, "1.2.3.4");
      }

      const result = await checkCreateRateLimit(mockKV as unknown as KVNamespace, "1.2.3.4");
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(3600);
    });
  });

  describe("createRateLimitResponse", () => {
    it("should return 429 status", () => {
      const result = {
        allowed: false,
        reason: "hourly_limit" as const,
        retryAfter: 1800,
        hourlyRemaining: 0,
        dailyRemaining: 40,
      };

      const response = createRateLimitResponse(result);
      expect(response.status).toBe(429);
    });

    it("should include Retry-After header", () => {
      const result = {
        allowed: false,
        reason: "hourly_limit" as const,
        retryAfter: 1800,
        hourlyRemaining: 0,
        dailyRemaining: 40,
      };

      const response = createRateLimitResponse(result);
      expect(response.headers.get("Retry-After")).toBe("1800");
    });

    it("should include limits in body for hourly limit", async () => {
      const result = {
        allowed: false,
        reason: "hourly_limit" as const,
        retryAfter: 1800,
        hourlyRemaining: 0,
        dailyRemaining: 40,
      };

      const response = createRateLimitResponse(result);
      const body = await response.json();

      expect(body.code).toBe("HOURLY_LIMIT");
      expect(body.limits.hourly.limit).toBe(10);
      expect(body.limits.hourly.remaining).toBe(0);
      expect(body.limits.daily.limit).toBe(50);
      expect(body.limits.daily.remaining).toBe(40);
    });

    it("should include limits in body for daily limit", async () => {
      const result = {
        allowed: false,
        reason: "daily_limit" as const,
        retryAfter: 3600,
        hourlyRemaining: 5,
        dailyRemaining: 0,
      };

      const response = createRateLimitResponse(result);
      const body = await response.json();

      expect(body.code).toBe("DAILY_LIMIT");
      expect(body.limits.daily.remaining).toBe(0);
    });
  });
});
