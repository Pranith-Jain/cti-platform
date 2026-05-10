import type { Context } from 'hono';
import type { Env } from '../env';

/**
 * .onion fetcher (feature-flagged).
 *
 * Forwards GET ?url=<onion> to the operator-run proxy at ONION_PROXY_URL.
 * If either ONION_PROXY_URL or ONION_PROXY_SECRET is unset, returns 503 —
 * the toolkit ships safely without anyone having to deploy infra.
 *
 * SSRF guards run on BOTH ends (here + on the proxy) so that a future bug
 * in either layer fails closed. See docs/onion-proxy-design.md for the
 * full design + opsec model.
 */

const FETCH_TIMEOUT_MS = 35_000; // > proxy hard cap of 30s, with margin
const CACHE_TTL_SECONDS = 5 * 60; // 5 min — .onion is volatile but herd-protect

interface ProxyResp {
  status: number;
  content_type?: string;
  final_url: string;
  elapsed_ms: number;
  truncated: boolean;
  body_b64: string;
}

interface ProxyErr {
  error: string;
  detail?: string;
  elapsed_ms?: number;
}

function validateOnion(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: 'malformed url' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, reason: 'scheme must be http or https' };
  }
  if (u.username || u.password) {
    return { ok: false, reason: 'embedded credentials disallowed' };
  }
  if (!/\.onion$/i.test(u.hostname)) {
    return { ok: false, reason: 'host must end in .onion' };
  }
  return { ok: true, url: u };
}

async function hmacSign(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  // Base64 (standard, with padding) — matches Go's base64.StdEncoding.
  let bin = '';
  const bytes = new Uint8Array(sig);
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onionFetchHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  const proxyUrl = c.env.ONION_PROXY_URL;
  const secret = c.env.ONION_PROXY_SECRET;
  if (!proxyUrl || !secret) {
    return c.json(
      {
        error: 'service_unavailable',
        detail: 'onion fetcher not configured — set ONION_PROXY_URL + ONION_PROXY_SECRET',
      },
      503,
      { 'cache-control': 'no-store' }
    );
  }

  const targetRaw = c.req.query('url');
  if (!targetRaw) {
    return c.json({ error: 'missing_url', detail: 'pass ?url=' }, 400, { 'cache-control': 'no-store' });
  }
  const v = validateOnion(targetRaw);
  if (!v.ok) {
    return c.json({ error: 'bad_url', detail: v.reason }, 400, { 'cache-control': 'no-store' });
  }

  // Edge-cache by canonical URL string. Short TTL — .onion content is volatile.
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(`https://onion-fetch-cache.internal/v1?u=${encodeURIComponent(v.url.toString())}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // Build the signed proxy request.
  const reqBody = JSON.stringify({ url: v.url.toString(), max_bytes: 1_048_576, timeout_ms: 15_000 });
  const nonce = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); // RFC3339 without ms
  const bodyHash = await sha256Hex(reqBody);
  const sig = await hmacSign(secret, `${nonce}\n${bodyHash}`);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let proxyRes: Response;
  try {
    proxyRes = await fetch(new URL('/fetch', proxyUrl).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nonce': nonce,
        'X-Sig': sig,
      },
      body: reqBody,
      signal: ctrl.signal,
    });
  } catch (e) {
    return c.json({ error: 'proxy_unreachable', detail: (e as Error).message }, 502, { 'cache-control': 'no-store' });
  } finally {
    clearTimeout(timer);
  }

  if (!proxyRes.ok) {
    let detail: ProxyErr | undefined;
    try {
      detail = (await proxyRes.json()) as ProxyErr;
    } catch {
      /* not json */
    }
    return c.json(
      { error: detail?.error ?? 'proxy_error', detail: detail?.detail, upstream_status: proxyRes.status },
      proxyRes.status,
      { 'cache-control': 'no-store' }
    );
  }

  const proxyBody = (await proxyRes.json()) as ProxyResp;
  const out = {
    ok: true,
    status: proxyBody.status,
    final_url: proxyBody.final_url,
    content_type: proxyBody.content_type,
    truncated: proxyBody.truncated,
    elapsed_ms: proxyBody.elapsed_ms,
    body_b64: proxyBody.body_b64,
    fetched_at: new Date().toISOString(),
  };
  const response = c.json(out, 200, { 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` });
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
