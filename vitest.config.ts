import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        kvNamespaces: ["NICE_KV"],
      },
    }),
  ],
  test: {
    globals: true,
    include: ["test/{lib,e2e}/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
  },
});
