/**
 * Cloudflare Worker environment bindings
 */
export interface Env {
  /** KV namespace for all Nice data storage */
  NICE_KV: KVNamespace;
}
