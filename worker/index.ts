import apiApp from '../api/src/index';
import {
  BRIEFING_MAX_AGE_DAYS,
  buildBriefing,
  writeBriefing,
  sweepOldBriefings,
} from '../api/src/lib/briefing-builder';

export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  KV_CACHE?: KVNamespace;
  BRIEFINGS?: KVNamespace;
  R2_FILES?: R2Bucket;
}

const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.cloudflare.com",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; '),
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

interface OgOverride {
  title: string;
  description: string;
}

const OG_OVERRIDES: Record<string, OgOverride> = {
  '/threatintel': {
    title: 'Threat Intel Platform · cti-platform',
    description:
      'A working CTI surface on the edge. Live ransomware leak claims, CVE merged with CISA KEV, cross-source IOC correlation across 18 feeds, an actor-activity Gantt joined with MITRE Group profiles, victim re-leak detection, ten-panel metrics, STIX 2.1 export, and a writeups aggregator across 18 analyst blogs.',
  },
  '/threatintel/correlation': {
    title: 'Cross-source IOC correlation · cti-platform',
    description:
      'Indicators that appear in 2+ independent IOC feeds, ranked by source consensus. Single-feed flags can be false positives; cross-source overlap is the signal analysts trust. 18 feeds aggregated.',
  },
  '/threatintel/live-iocs': {
    title: 'Live IOC stream · cti-platform',
    description:
      'Chronological firehose of individual indicators. Each entry carries a reporter handle, source feed, and first-observed timestamp. 10 sources including TweetFeed, SANS ISC, C2IntelFeeds, URLhaus, ThreatFox.',
  },
  '/threatintel/actor-timeline': {
    title: 'Ransomware actor activity timeline · cti-platform',
    description:
      'Per-actor leak-site cadence across the last 30 days, joined with curated MITRE ATT&CK Group references. Pivot from "who is posting" to "what TTPs to hunt for."',
  },
  '/threatintel/re-leaks': {
    title: 'Victim re-leak detection · cti-platform',
    description:
      'Victims claimed by 2+ ransomware groups in the last 12 months. Usually a failed double-extortion or an affiliate moving programs.',
  },
  '/threatintel/metrics': {
    title: 'Threat Intel Metrics · cti-platform',
    description:
      'Ten panels answering the questions a CTI team actually asks. Most-active ransomware groups, CVE severity, KEV cadence, top-impersonated brands, IOC volume by source, sector targeting, malware families, re-leak hotspots.',
  },
  '/threatintel/writeups': {
    title: 'CTI writeups feed · cti-platform',
    description:
      'Live aggregation of long-form CTI writeups from 18 analyst blogs and vendor research labs: The DFIR Report, BushidoToken, DoublePulsar, Krebs, SentinelLabs, Unit 42, Check Point Research, Huntress, and more.',
  },
  '/threatintel/cve-list': {
    title: 'Live CVE updates · cti-platform',
    description:
      'NVD published-CVE feed merged with the CISA KEV catalogue. Severity, KEV flag, ransomware-use flag, and a curated actor pill where attribution exists.',
  },
  '/threatintel/pulse': {
    title: 'Threat Pulse · cti-platform',
    description:
      'Cross-source threat correlation across Reddit, Bluesky, CTI writeups, and cybercrime news. Entities mentioned in 2+ independent surfaces ranked by source consensus.',
  },
  '/threatintel/status': {
    title: 'Feed status · cti-platform',
    description: 'Health of every upstream-backed feed on the threat-intel platform.',
  },
};

function findOgOverride(pathname: string): OgOverride | null {
  if (OG_OVERRIDES[pathname]) return OG_OVERRIDES[pathname];
  let best: OgOverride | null = null;
  let bestLen = 0;
  for (const [k, v] of Object.entries(OG_OVERRIDES)) {
    if (pathname.startsWith(`${k}/`) && k.length > bestLen) {
      best = v;
      bestLen = k.length;
    }
  }
  return best;
}

const HTML_ATTR_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ATTR_ESCAPE[c] ?? c);
}

function rewriteOgMeta(html: string, override: OgOverride, fullUrl: string): string {
  const t = escapeAttr(override.title);
  const d = escapeAttr(override.description);
  return html
    .replace(/<title>[^<]*<\/title>/i, `<title>${t}</title>`)
    .replace(/<link rel="canonical" href="[^"]*"/i, `<link rel="canonical" href="${escapeAttr(fullUrl)}"`)
    .replace(/<meta name="description" content="[^"]*"/i, `<meta name="description" content="${d}"`)
    .replace(/<meta property="og:url" content="[^"]*"/i, `<meta property="og:url" content="${escapeAttr(fullUrl)}"`)
    .replace(/<meta property="og:title" content="[^"]*"/i, `<meta property="og:title" content="${t}"`)
    .replace(/<meta property="og:description" content="[^"]*"/i, `<meta property="og:description" content="${d}"`)
    .replace(/<meta name="twitter:title" content="[^"]*"/i, `<meta name="twitter:title" content="${t}"`)
    .replace(/<meta name="twitter:description" content="[^"]*"/i, `<meta name="twitter:description" content="${d}"`)
    .replace(/<meta name="twitter:url" content="[^"]*"/i, `<meta name="twitter:url" content="${escapeAttr(fullUrl)}"`);
}

async function injectOgMeta(response: Response, url: URL): Promise<Response> {
  const ct = response.headers.get('content-type') ?? '';
  if (!ct.toLowerCase().includes('text/html')) return response;
  const override = findOgOverride(url.pathname);
  if (!override) return response;
  const fullUrl = `${url.origin}${url.pathname}`;
  const html = await response.text();
  const rewritten = rewriteOgMeta(html, override, fullUrl);
  const headers = new Headers(response.headers);
  return new Response(rewritten, { status: response.status, statusText: response.statusText, headers });
}

const OG_CACHE_TTL_SECONDS = 86_400;

async function getOrInjectOg(request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  const override = findOgOverride(url.pathname);
  if (!override) return env.ASSETS.fetch(request);

  const assetRes = await env.ASSETS.fetch(request);
  const ct = assetRes.headers.get('content-type') ?? '';
  if (!ct.toLowerCase().includes('text/html')) return assetRes;

  const etag = assetRes.headers.get('etag') ?? assetRes.headers.get('last-modified') ?? 'unversioned';
  const cache = caches.default;
  const cacheKey = new Request(`https://og-html.internal${url.pathname}@${encodeURIComponent(etag)}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const withOg = await injectOgMeta(assetRes, url);
  const toCache = new Response(withOg.clone().body, {
    status: withOg.status,
    statusText: withOg.statusText,
    headers: (() => {
      const h = new Headers(withOg.headers);
      h.set('cache-control', `public, max-age=${OG_CACHE_TTL_SECONDS}`);
      return h;
    })(),
  });
  ctx.waitUntil(cache.put(cacheKey, toCache));
  return withOg;
}

const PRERENDERED_ROUTES = new Map<string, string>([
  ['/threatintel', '/__prerendered/threatintel'],
  ['/threatintel/threat-feeds', '/__prerendered/threatintel__threat-feeds'],
  ['/threatintel/writeups', '/__prerendered/threatintel__writeups'],
  ['/threatintel/cyber-crime', '/__prerendered/threatintel__cyber-crime'],
  ['/threatintel/ransomware-activity', '/__prerendered/threatintel__ransomware-activity'],
  ['/threatintel/live-iocs', '/__prerendered/threatintel__live-iocs'],
  ['/threatintel/pulse', '/__prerendered/threatintel__pulse'],
]);

async function fetchPrerenderedOrShell(request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  const prerenderedPath = PRERENDERED_ROUTES.get(url.pathname);
  if (!prerenderedPath) {
    const r = await getOrInjectOg(request, env, ctx, url);
    const h = new Headers(r.headers);
    h.set('x-ssr-source', 'spa-shell');
    return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
  }
  const internal = new URL(request.url);
  internal.pathname = prerenderedPath;
  const prerenderRes = await env.ASSETS.fetch(new Request(internal.toString(), request));
  if (prerenderRes.status === 404) {
    const r = await getOrInjectOg(request, env, ctx, url);
    const h = new Headers(r.headers);
    h.set('x-ssr-source', 'shell-fallback-404');
    return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
  }
  const headers = new Headers(prerenderRes.headers);
  headers.set('cache-control', `public, max-age=${OG_CACHE_TTL_SECONDS}`);
  headers.set('x-ssr-source', 'prerendered');
  return new Response(prerenderRes.body, {
    status: prerenderRes.status,
    statusText: prerenderRes.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const apiRes = await apiApp.fetch(request, env as never, ctx);
      return withSecurityHeaders(apiRes);
    }
    const html = await fetchPrerenderedOrShell(request, env, ctx, url);
    return withSecurityHeaders(html);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const cron = event.cron;

    if (cron === '0 * * * *') {
      ctx.waitUntil(
        (async () => {
          const start = Date.now();
          const baseUrl = 'https://cti-platform.qzz.io';
          const perSourceTargets = [
            '/api/v1/threat-map',
            '/api/v1/rules',
            '/api/v1/ransomware-recent',
            '/api/v1/telegram-feed',
            '/api/v1/onion-watch',
            '/api/v1/cve-recent',
            '/api/v1/phishing-urls',
            '/api/v1/malware-samples',
            '/api/v1/reddit-feed',
            '/api/v1/x-feed',
          ];
          const composerTargets = ['/api/v1/snapshot', '/api/v1/ioc-snapshot'];
          async function warm(path: string) {
            const req = new Request(baseUrl + path, { method: 'GET' });
            const res = await apiApp.fetch(req, env as never, ctx);
            await res.arrayBuffer();
            return { path, status: res.status };
          }
          const perSource = await Promise.allSettled(perSourceTargets.map(warm));
          const composers = await Promise.allSettled(composerTargets.map(warm));
          const summary = [...perSource, ...composers]
            .map((r, i) => {
              const path = [...perSourceTargets, ...composerTargets][i];
              return r.status === 'fulfilled'
                ? `${r.value.path}=${r.value.status}`
                : `${path}=err(${(r.reason as Error).message})`;
            })
            .join(' ');
          console.log(`scheduled: warmed in ${Date.now() - start}ms — ${summary}`);
        })()
      );
      return;
    }

    if (!env.BRIEFINGS) {
      console.warn('scheduled: BRIEFINGS KV not bound, skipping');
      return;
    }
    const isWeekly = cron === '15 0 * * 1';
    const type = isWeekly ? 'weekly' : 'daily';

    ctx.waitUntil(
      (async () => {
        const kv = env.BRIEFINGS as KVNamespace;
        try {
          const briefing = await buildBriefing(type);
          await writeBriefing(kv, briefing);
          console.log(
            `scheduled: wrote ${briefing.slug} (findings=${briefing.stats.findings}, iocs=${briefing.stats.iocs})`
          );
        } catch (err) {
          console.error('scheduled: briefing build failed', err);
        }
        try {
          const result = await sweepOldBriefings(kv, BRIEFING_MAX_AGE_DAYS);
          if (result.deleted.length > 0) {
            console.log(
              `scheduled: swept ${result.deleted.length} old briefings (${result.deleted.join(', ')}); kept ${result.kept}`
            );
          }
        } catch (err) {
          console.error('scheduled: sweep failed', err);
        }
      })()
    );
  },
};
