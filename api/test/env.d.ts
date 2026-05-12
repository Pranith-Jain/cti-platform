/**
 * Type declaration shim for @cloudflare/vitest-pool-workers.
 *
 * Tests that `import { env } from 'cloudflare:test'` need this module
 * augmentation to see the bindings declared in wrangler.toml — vitest
 * doesn't auto-derive them. Without it, `env.KV_CACHE` is a TS error.
 *
 * Keep in sync with api/wrangler.toml's [[kv_namespaces]] entries.
 */
declare module 'cloudflare:test' {
  interface ProvidedEnv {
    KV_CACHE: KVNamespace;
  }
}

export {};
