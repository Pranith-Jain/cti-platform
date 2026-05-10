import type { Context } from 'hono';
import type { Env } from '../env';

/**
 * Unified live-snapshot endpoint. Replaces six client-side fetches that the
 * LiveSnapshotPanel was making in parallel from /dfir, /dfir/briefings, and
 * /dfir/briefings/<slug>.
 *
 * The browser pays one HTTP round-trip + one setState cycle instead of six,
 * which materially cuts client TBT (Total Blocking Time) on Lighthouse.
 *
 * Server cost is unchanged — we still fetch the six upstreams. We do it via
 * worker-internal `fetch(new URL('/api/v1/...', request.url))` calls so the
 * existing handlers + their per-route edge caches stay in play untouched.
 *
 * Per-source failures don't fail the whole snapshot. Each key in the response
 * is independently `null` (with the failure reason in `errors`) or populated.
 *
 * Cache: 5 min at the edge. The underlying handlers cache longer (1 h for
 * ransomware, 30 min for Telegram, 6 h for onion) so even on a snapshot
 * cache miss we typically only pay the merge cost, not the upstream cost.
 */

const CACHE_TTL = 5 * 60;

/**
 * Curated feed groups for the three "feed-aggregator" cards. Kept in sync
 * with the constants in src/components/dfir/LiveSnapshotPanel.tsx — change
 * one, change the other.
 */
const SCAM_FEED_URLS = ['https://consumer.ftc.gov/blog/rss', 'https://www.ic3.gov/CSA/RSS'];
const THREAT_INTEL_FEED_URLS = [
  'https://www.bleepingcomputer.com/feed/',
  'https://krebsonsecurity.com/feed/',
  'https://thedfirreport.com/feed/',
  'https://www.securityweek.com/feed/',
];
/**
 * Tech & AI: TechCrunch AI + VentureBeat AI + TechCrunch security +
 * cybersec funding + the YC surfaces (HN AI search + YC blog). YC content
 * is high-signal for "what just got funded / shipped in AI + cyber".
 */
const TECH_AI_FEED_URLS = [
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://venturebeat.com/category/ai/feed/',
  'https://techcrunch.com/category/security/feed/',
  'https://news.google.com/rss/search?q=cybersecurity+funding&hl=en-US&gl=US&ceid=US:en',
  'https://hnrss.org/newest?q=AI',
  'https://www.ycombinator.com/blog/rss',
];

interface SourcePayload<T = unknown> {
  ok: boolean;
  data: T | null;
  error?: string;
}

export interface SnapshotResponse {
  generated_at: string;
  ransomware: SourcePayload;
  telegram: SourcePayload;
  onion: SourcePayload;
  scam: SourcePayload;
  threat_intel: SourcePayload;
  tech_ai: SourcePayload;
}

async function safeJson(url: string): Promise<SourcePayload> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    const r = await fetch(url, { signal: ctrl.signal, cf: { cacheTtl: CACHE_TTL } as RequestInitCfProperties });
    clearTimeout(timer);
    if (!r.ok) return { ok: false, data: null, error: `HTTP ${r.status}` };
    const data = (await r.json()) as unknown;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, data: null, error: (e as Error).message };
  }
}

export async function snapshotHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request('https://snapshot-cache.internal/v1');
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const reqUrl = new URL(c.req.url);
  const origin = `${reqUrl.protocol}//${reqUrl.host}`;
  const aggUrl = (urls: string[], limit: number, perSource: number) =>
    `${origin}/api/v1/feeds/aggregate?urls=${encodeURIComponent(urls.join(','))}&limit=${limit}&perSource=${perSource}`;

  const [ransomware, telegram, onion, scam, threatIntel, techAi] = await Promise.all([
    safeJson(`${origin}/api/v1/ransomware-recent`),
    safeJson(`${origin}/api/v1/telegram-feed`),
    safeJson(`${origin}/api/v1/onion-watch`),
    safeJson(aggUrl(SCAM_FEED_URLS, 12, 6)),
    safeJson(aggUrl(THREAT_INTEL_FEED_URLS, 16, 4)),
    safeJson(aggUrl(TECH_AI_FEED_URLS, 18, 3)),
  ]);

  const body: SnapshotResponse = {
    generated_at: new Date().toISOString(),
    ransomware,
    telegram,
    onion,
    scam,
    threat_intel: threatIntel,
    tech_ai: techAi,
  };

  const response = c.json(body, 200, { 'Cache-Control': `public, max-age=${CACHE_TTL}` });
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
