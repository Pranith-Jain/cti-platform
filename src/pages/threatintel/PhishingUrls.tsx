import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, Fish, Loader2, RefreshCw, Search } from 'lucide-react';

interface PhishingUrl {
  url: string;
  source: 'openphish' | 'phishtank';
  first_seen?: string;
  target?: string;
  verified?: boolean;
}

interface Response {
  generated_at: string;
  sources: { id: string; ok: boolean; count: number }[];
  total: number;
  urls: PhishingUrl[];
}

function shortRel(iso?: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PhishingUrls(): JSX.Element {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'openphish' | 'phishtank'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/v1/phishing-urls')
      .then((r) => {
        if (!r.ok) throw new Error(`upstream ${r.status}`);
        return r.json() as Promise<Response>;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.urls.filter((u) => {
      if (sourceFilter !== 'all' && u.source !== sourceFilter) return false;
      if (!q) return true;
      return u.url.toLowerCase().includes(q) || (u.target ?? '').toLowerCase().includes(q);
    });
  }, [data, query, sourceFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 text-slate-900 dark:text-slate-100">
      <Link
        to="/threatintel"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 mb-8 font-mono"
      >
        <ArrowLeft size={14} /> /threatintel
      </Link>

      <div className="animate-fade-in-up">
        <h1 className="text-4xl font-display font-bold mb-2 inline-flex items-center gap-3">
          <Fish size={28} className="text-brand-600 dark:text-brand-400" /> Phishing URLs
        </h1>
        <p className="text-slate-600 dark:text-slate-400 font-mono mb-2 max-w-3xl">
          Recent phishing URLs aggregated from OpenPhish + PhishTank. PhishTank entries include the target brand and a
          verification flag (community-reviewed); OpenPhish gives URL-only coverage. Click any URL to pivot to{' '}
          <Link to="/dfir/ioc-check" className="text-brand-600 dark:text-brand-400 hover:underline">
            IOC Checker
          </Link>
          .
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 font-mono mb-6">
          Source: <span className="text-slate-700 dark:text-slate-300">/api/v1/phishing-urls</span> · cached 1h
          server-side.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by URL or target brand…"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-sm focus:outline-none focus:border-brand-500 dark:focus:border-brand-400"
              aria-label="Filter phishing URLs"
            />
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded border border-slate-200 dark:border-slate-800 hover:border-brand-500/40"
          >
            <RefreshCw size={12} /> refresh
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="text-[11px] font-mono text-slate-500 mr-1">source:</span>
          {(['all', 'phishtank', 'openphish'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSourceFilter(s)}
              className={`text-[11px] font-mono px-2 py-1 rounded border ${
                sourceFilter === s
                  ? 'border-brand-500/40 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                  : 'border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
            >
              {s}
              {data && s !== 'all' && (
                <span className="opacity-60 ml-1">· {data.sources.find((x) => x.id === s)?.count ?? 0}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {data && (
        <p className="text-[11px] font-mono text-slate-500 mb-4">
          {filtered.length} of {data.total} · upstream sources:{' '}
          {data.sources.map((s) => `${s.id} ${s.ok ? `(${s.count})` : 'OFFLINE'}`).join(' · ')} · snapshot{' '}
          <span className="text-slate-700 dark:text-slate-300">{shortRel(data.generated_at)}</span>
        </p>
      )}

      {loading && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex items-center gap-3 font-mono text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> loading from PhishTank + OpenPhish…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 p-4 font-mono text-sm text-rose-600 dark:text-rose-300">
          Failed to load: {error}
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((u, i) => (
          <li
            key={`${u.url}-${i}`}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
          >
            <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
              <Link
                to={`/dfir/ioc-check?indicator=${encodeURIComponent(u.url)}`}
                className="font-mono text-xs text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 break-all"
                title={`Pivot to IOC Checker: ${u.url}`}
              >
                {u.url}
              </Link>
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 flex-wrap">
              <span
                className={`px-1.5 py-0.5 rounded border ${
                  u.source === 'phishtank'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                }`}
              >
                {u.source}
              </span>
              {u.target && (
                <span>
                  · target <span className="text-slate-700 dark:text-slate-300">{u.target}</span>
                </span>
              )}
              {u.verified && (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 size={9} /> verified
                </span>
              )}
              {u.first_seen && <span className="ml-auto text-slate-400">{shortRel(u.first_seen)}</span>}
            </div>
          </li>
        ))}
      </ul>

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm font-mono text-slate-500">
          {query || sourceFilter !== 'all' ? 'No URLs match the current filter.' : 'No URLs in the upstream snapshot.'}
        </div>
      )}

      <footer className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500">
        Sources:{' '}
        <a
          href="https://openphish.com/phishing_feeds.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
        >
          OpenPhish <ExternalLink size={9} />
        </a>{' '}
        ·{' '}
        <a
          href="https://www.phishtank.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
        >
          PhishTank <ExternalLink size={9} />
        </a>
      </footer>
    </div>
  );
}
