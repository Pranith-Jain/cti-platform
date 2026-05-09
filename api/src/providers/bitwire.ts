import type { ProviderAdapter, ProviderResult } from './types';

const supports = new Set(['ipv4']);
const FEED = 'https://raw.githubusercontent.com/bitwire-it/ipblocklist/main/outbound.txt';
const CACHE_TTL_SECONDS = 3600;

/**
 * Bitwire outbound IP blocklist. Hosted on GitHub, refreshed every 2 hours.
 * Plain text, one IPv4 or CIDR per line.
 */
export const bitwire: ProviderAdapter = async (indicator, _env, signal) => {
  const now = new Date().toISOString();
  const base = (status: ProviderResult['status'], extra: Partial<ProviderResult> = {}): ProviderResult => ({
    source: 'bitwire',
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
    const res = await fetch(FEED, { signal, cf: { cacheTtl: CACHE_TTL_SECONDS, cacheEverything: true } });
    if (!res.ok) return base('error', { error: `${res.status} ${res.statusText}`.trim() });
    const text = await res.text();

    const set = new Set<string>();
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      // Bitwire uses bare IPs and CIDRs. For CIDRs, also store the network address for /32 hits.
      const slash = t.indexOf('/');
      set.add(slash === -1 ? t : t.substring(0, slash));
    }

    const hit = set.has(indicator.value);
    return base('ok', {
      score: hit ? 80 : 0,
      verdict: hit ? 'malicious' : 'clean',
      tags: hit ? ['bitwire-blocklist', 'outbound-c2'] : [],
      raw_summary: { listed: hit, list_size: set.size },
    });
  } catch (err) {
    return base('error', { error: err instanceof Error ? err.message : String(err) });
  }
};
