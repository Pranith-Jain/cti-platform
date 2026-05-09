import type { ProviderAdapter, ProviderResult } from './types';

const supports = new Set(['ipv4', 'ipv6']);
const FEED = 'https://feodotracker.abuse.ch/downloads/ipblocklist.txt';
const CACHE_TTL_SECONDS = 3600;

export const feodo: ProviderAdapter = async (indicator, _env, signal) => {
  const now = new Date().toISOString();
  const base = (status: ProviderResult['status'], extra: Partial<ProviderResult> = {}): ProviderResult => ({
    source: 'feodo',
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

    const list = new Set<string>();
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      list.add(t.split(/\s+/)[0]);
    }

    const hit = list.has(indicator.value);
    return base('ok', {
      score: hit ? 90 : 0,
      verdict: hit ? 'malicious' : 'clean',
      tags: hit ? ['feodo-c2', 'botnet'] : [],
      raw_summary: { listed: hit, list_size: list.size },
    });
  } catch (err) {
    return base('error', { error: err instanceof Error ? err.message : String(err) });
  }
};
