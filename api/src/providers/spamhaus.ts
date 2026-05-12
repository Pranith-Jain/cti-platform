import type { ProviderAdapter, ProviderResult } from './types';

const supports = new Set(['ipv4']);
const DROP = 'https://www.spamhaus.org/drop/drop.txt';
const EDROP = 'https://www.spamhaus.org/drop/edrop.txt';
const CACHE_TTL_SECONDS = 3600;

export const spamhaus: ProviderAdapter = async (indicator, _env, signal) => {
  const now = new Date().toISOString();
  const base = (status: ProviderResult['status'], extra: Partial<ProviderResult> = {}): ProviderResult => ({
    source: 'spamhaus',
    status,
    score: 0,
    verdict: 'unknown',
    raw_summary: {},
    tags: [],
    fetched_at: now,
    cached: false,
    ...extra,
  });

  if (!supports.has(indicator.type)) return base('unsupported');

  try {
    const [dropRes, edropRes] = await Promise.all([
      fetch(DROP, { signal, cf: { cacheTtl: CACHE_TTL_SECONDS, cacheEverything: true } }),
      fetch(EDROP, { signal, cf: { cacheTtl: CACHE_TTL_SECONDS, cacheEverything: true } }),
    ]);
    if (!dropRes.ok && !edropRes.ok) return base('error', { error: 'feed_unavailable' });

    const text = `${dropRes.ok ? await dropRes.text() : ''}\n${edropRes.ok ? await edropRes.text() : ''}`;
    const ranges = parseRanges(text);

    const ip = ipv4ToInt(indicator.value);
    if (ip === null) return base('error', { error: 'bad_ipv4' });

    const hit = ranges.some(([start, end]) => ip >= start && ip <= end);
    return base('ok', {
      score: hit ? 85 : 0,
      verdict: hit ? 'malicious' : 'clean',
      tags: hit ? ['spamhaus-drop'] : [],
      raw_summary: { listed: hit, ranges_checked: ranges.length },
    });
  } catch (err) {
    return base('error', { error: err instanceof Error ? err.message : String(err) });
  }
};

function parseRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith(';') || t.startsWith('#')) continue;
    const cidr = t.split(/[;\s]/)[0];
    if (!cidr) continue;
    const r = cidrRange(cidr);
    if (r) out.push(r);
  }
  return out;
}

function cidrRange(cidr: string): [number, number] | null {
  const [ip, bitsStr] = cidr.split('/');
  if (!ip || !bitsStr) return null;
  const bits = parseInt(bitsStr, 10);
  const start = ipv4ToInt(ip);
  if (start === null || isNaN(bits) || bits < 0 || bits > 32) return null;
  const size = 2 ** (32 - bits);
  return [start, start + size - 1];
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const x = parseInt(p, 10);
    if (isNaN(x) || x < 0 || x > 255) return null;
    n = n * 256 + x;
  }
  return n;
}
