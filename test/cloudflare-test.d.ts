import type { Env as AppEnv } from "../src/types/env";

declare global {
  namespace Cloudflare {
    interface Env extends AppEnv {}
  }
}

declare module "cloudflare:test" {
  interface ProvidedEnv extends AppEnv {}
}

export {};
