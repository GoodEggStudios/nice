import { afterEach } from "vitest";
import { reset } from "cloudflare:test";

// Vitest 4 + vitest-pool-workers isolates storage per file, not per test.
// Reset bindings after each test to preserve the previous per-test isolation.
afterEach(async () => {
  await reset();
});
