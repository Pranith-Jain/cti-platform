import type { ProviderAdapter, ProviderResult, Verdict } from './types';

const supports = new Set(['domain']);

export const doh: ProviderAdapter = async (indicator, _env, signal) => {
  const now = new Date().toISOString();
  const base = (status: ProviderResult['status'], extra: Partial<ProviderResult> = {}): ProviderResult => ({
    source: 'doh',
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
    const [a, mx, ns, txt, dmarc] = await Promise.all([
      query(indicator.value, 'A', signal),
      query(indicator.value, 'MX', signal),
      query(indicator.value, 'NS', signal),
      query(indicator.value, 'TXT', signal),
      query(`_dmarc.${indicator.value}`, 'TXT', signal),
    ]);

    if (!a) return base('error', { error: 'doh_unavailable' });

    const tags: string[] = [];
    let score = 0;
    let verdict: Verdict = 'clean';

    if (a.Status === 3) {
      tags.push('nxdomain');
      score = 60;
      verdict = 'suspicious';
    }
    if (a.Status === 0 && !a.Answer) {
      tags.push('no-a-record');
      score = Math.max(score, 25);
    }
    if (!mx?.Answer) tags.push('no-mx');
    if (!ns?.Answer) tags.push('no-ns');

    const spf = (txt?.Answer ?? []).some((r) => /v=spf1/i.test(r.data ?? ''));
    const hasDmarc = !!dmarc?.Answer?.length;
    if (!spf) tags.push('no-spf');
    if (!hasDmarc) tags.push('no-dmarc');

    return base('ok', {
      score,
      verdict,
      tags,
      raw_summary: {
        nxdomain: a.Status === 3,
        has_a: !!a.Answer,
        has_mx: !!mx?.Answer,
        has_ns: !!ns?.Answer,
        spf,
        dmarc: hasDmarc,
      },
    });
  } catch (err) {
    return base('error', { error: err instanceof Error ? err.message : String(err) });
  }
};

interface DohResponse {
  Status: number;
  Answer?: { data?: string }[];
}

async function query(name: string, type: string, signal: AbortSignal): Promise<DohResponse | null> {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: 'application/dns-json' },
      signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as DohResponse;
  } catch {
    return null;
  }
}
