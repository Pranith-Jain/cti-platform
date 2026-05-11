import type { Context } from 'hono';
import type { Env } from '../env';

/**
 * Cybersec X (Twitter) firehose.
 *
 * X killed its free read API in 2023. The only practical way to pull
 * tweets without a paid plan is third-party mirrors. We use Nitter
 * instances with FAILOVER — Nitter mirrors rotate/die frequently, so
 * a single primary is too fragile. As of 2026-05-11 verification:
 *   nitter.net          → 200, ~17 KB per RSS  ✓
 *   nitter.cz           → 200, ~5 KB per RSS   ✓
 *   nitter.tiekoetter.com→200, ~5 KB per RSS   ✓
 *   nitter.privacydev.net→ dead
 *   nitter.poast.org    → 403 (Cloudflare-walled)
 *   nitter.unixfox.eu   → dead
 *
 * Curated handle set is small (12 accounts) so total fan-out cost is
 * 12 × ~10 KB = ~120 KB. Cached 1 h server-side because Nitter mirrors
 * rate-limit aggressively when hammered.
 */

const FETCH_TIMEOUT_MS = 9_000;
const CACHE_TTL = 60 * 60; // 1 h — Nitter rate-limits past this anyway
const CONCURRENCY = 3; // Lower than Reddit/Telegram to be polite to mirrors
const MAX_POSTS_PER_HANDLE = 6;
const MAX_TEXT_LEN = 280;

/** Mirror failover chain — top to bottom. Probed live 2026-05-11. */
const NITTER_MIRRORS = ['https://nitter.net', 'https://nitter.cz', 'https://nitter.tiekoetter.com'];

interface HandleSpec {
  handle: string;
  /** Display name. */
  name: string;
  blurb: string;
  topic: 'research' | 'news' | 'vendor' | 'gov' | 'malware';
}

/**
 * Curated cybersec X handles. Mix of researchers, vendor accounts,
 * and government / official feeds. Last verified 2026-05-11.
 */
const HANDLES: HandleSpec[] = [
  { handle: 'vxunderground', name: 'vx-underground', blurb: 'Malware archive + commentary', topic: 'research' },
  { handle: 'malwrhunterteam', name: 'MalwareHunterTeam', blurb: 'Daily malware spotting', topic: 'malware' },
  { handle: 'BushidoToken', name: 'BushidoToken', blurb: 'CTI write-ups + actor tracking', topic: 'research' },
  { handle: 'TalosSecurity', name: 'Cisco Talos', blurb: 'Cisco Talos research', topic: 'vendor' },
  { handle: 'ESETresearch', name: 'ESET Research', blurb: 'ESET threat-research lab', topic: 'vendor' },
  { handle: 'BleepinComputer', name: 'BleepingComputer', blurb: 'Security-news headlines', topic: 'news' },
  { handle: 'TheHackersNews', name: 'The Hacker News', blurb: 'Security-news headlines', topic: 'news' },
  { handle: 'CISAgov', name: 'CISA', blurb: 'Official US CISA advisories', topic: 'gov' },
  { handle: 'Mandiant', name: 'Mandiant', blurb: 'Mandiant / Google Cloud threat research', topic: 'vendor' },
  { handle: 'abuse_ch', name: 'abuse.ch', blurb: 'Roman Hüssy — URLhaus / Bazaar / ThreatFox', topic: 'research' },
  { handle: 'malware_traffic', name: 'Brad Duncan (MTA)', blurb: 'Daily PCAPs + IOCs', topic: 'malware' },
  { handle: 'decalage2', name: 'Philippe Lagadec', blurb: 'olevba / oletools / Office-doc malware', topic: 'research' },
];

export interface XFeedItem {
  handle: string;
  handle_name: string;
  handle_topic: HandleSpec['topic'];
  handle_blurb: string;
  text: string;
  link: string;
  /** RFC-822 from Nitter's <pubDate>; we leave as-is and let the UI parse. */
  pub_date: string;
  /** Mirror that served this item — surfaces upstream failover for debugging. */
  via_mirror: string;
}

export interface XFeedResponse {
  generated_at: string;
  handles: { handle: string; name: string; topic: HandleSpec['topic']; ok: boolean; count: number; via?: string }[];
  items: XFeedItem[];
  warnings: string[];
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(s: string): string {
  const withBreaks = s.replace(/<br\s*\/?>/gi, '\n').replace(/<p[^>]*>/gi, '\n');
  return decodeEntities(withBreaks.replace(/<[^>]+>/g, '')).trim();
}

/** Parse Nitter's RSS 2.0 — <item> blocks with title/description/link/pubDate. */
function parseRssItems(
  xml: string,
  via: string,
  handleHost: string
): Array<{
  title: string;
  link: string;
  pub_date: string;
  via: string;
}> {
  const out: Array<{ title: string; link: string; pub_date: string; via: string }> = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const titleRaw = /<title[^>]*>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? '';
    let link = /<link[^>]*>([\s\S]*?)<\/link>/.exec(block)?.[1] ?? '';
    const pub = /<pubDate[^>]*>([^<]+)<\/pubDate>/.exec(block)?.[1] ?? '';
    // Nitter emits its own host in the link; rewrite to x.com so the user
    // hits the real tweet (handleHost is "x.com" or "twitter.com").
    if (link) {
      link = link.replace(/^https?:\/\/[^/]+/, `https://${handleHost}`).replace(/#m$/, '');
    }
    const title = decodeEntities(stripCdata(titleRaw)).trim();
    if (title && link) out.push({ title, link, pub_date: pub, via });
  }
  return out;
}

async function fetchHandle(spec: HandleSpec): Promise<{ ok: boolean; items: XFeedItem[]; via?: string }> {
  for (const mirror of NITTER_MIRRORS) {
    const url = `${mirror}/${encodeURIComponent(spec.handle)}/rss`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; pranithjain-dfir/1.0; +https://pranithjain.qzz.io)',
          accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.5',
        },
        redirect: 'follow',
        cf: { cacheTtl: 1800, cacheEverything: true },
      });
      clearTimeout(timer);
      // 200 may still be a bot-challenge HTML — sniff for an RSS root.
      if (!r.ok) continue;
      const body = await r.text();
      if (!body.includes('<rss') && !body.includes('<channel>')) continue;
      const parsed = parseRssItems(body, mirror, 'x.com').slice(0, MAX_POSTS_PER_HANDLE);
      if (parsed.length === 0) continue;
      const items: XFeedItem[] = parsed.map((p) => ({
        handle: spec.handle,
        handle_name: spec.name,
        handle_topic: spec.topic,
        handle_blurb: spec.blurb,
        text: stripHtml(p.title).slice(0, MAX_TEXT_LEN),
        link: p.link,
        pub_date: p.pub_date,
        via_mirror: new URL(p.via).hostname,
      }));
      return { ok: true, items, via: new URL(mirror).hostname };
    } catch {
      clearTimeout(timer);
      /* try next mirror */
    }
  }
  return { ok: false, items: [] };
}

export async function fetchXFeed(): Promise<XFeedResponse> {
  const warnings: string[] = [];
  const handleStatus: XFeedResponse['handles'] = [];
  const allItems: XFeedItem[] = [];

  const queue = [...HANDLES];
  async function worker() {
    while (queue.length > 0) {
      const spec = queue.shift();
      if (!spec) return;
      const r = await fetchHandle(spec);
      if (!r.ok) warnings.push(`no mirror returned data for @${spec.handle}`);
      handleStatus.push({
        handle: spec.handle,
        name: spec.name,
        topic: spec.topic,
        ok: r.ok,
        count: r.items.length,
        via: r.via,
      });
      allItems.push(...r.items);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Newest-first across all handles. Nitter pubDate is RFC-822 string;
  // Date.parse handles it.
  allItems.sort((a, b) => Date.parse(b.pub_date) - Date.parse(a.pub_date));

  return {
    generated_at: new Date().toISOString(),
    handles: handleStatus.sort((a, b) => a.name.localeCompare(b.name)),
    items: allItems,
    warnings,
  };
}

export const X_FEED_CACHE_KEY = 'https://x-feed-cache.internal/v1';

export async function xFeedHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(X_FEED_CACHE_KEY);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const body = await fetchXFeed();
  const response = c.json(body, 200, { 'Cache-Control': `public, max-age=${CACHE_TTL}` });
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
