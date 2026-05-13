import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Rss, ChevronRight } from 'lucide-react';

type Filter = 'all' | 'daily' | 'weekly';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
];

interface BriefingMeta {
  type: 'daily' | 'weekly';
  title: string;
  date: string;
  range_end?: string;
  date_range: string;
  stats: {
    findings: number;
    sections: number;
    cves: number;
    kevs: number;
    iocs: number;
    critical: number;
    high: number;
  };
  sources: string[];
}

interface ListItem {
  slug: string;
  metadata: BriefingMeta;
}

export default function Briefings(): JSX.Element {
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/v1/briefings/list?limit=60')
      .then(async (r) => {
        if (!r.ok) {
          const body = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `${r.status}`);
        }
        return (await r.json()) as { items: ListItem[] };
      })
      .then((d) => setItems(d.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return items
      .filter((b) => filter === 'all' || b.metadata.type === filter)
      .slice()
      .sort((a, b) => {
        // Sort by end-of-period so weeklies and dailies interleave correctly.
        const ak = a.metadata.range_end ?? a.metadata.date ?? '';
        const bk = b.metadata.range_end ?? b.metadata.date ?? '';
        return bk.localeCompare(ak);
      });
  }, [items, filter]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-16 text-ink-1">
      <Link
        to="/threatintel"
        className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-accent mb-10 font-mono transition-colors"
      >
        <ArrowLeft size={14} /> /threatintel
      </Link>

      <header className="mb-12">
        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
          Intel Briefings
        </span>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-4 leading-tight">Threat Intel Briefings</h1>
        <p className="text-base text-ink-2 max-w-2xl leading-relaxed">
          Auto-generated daily and weekly summaries of threat-intelligence activity, drawn from CISA KEV, NVD, and
          abuse.ch / OpenPhish feeds. Daily briefings publish at 00:05 UTC; weekly at 00:15 UTC Monday. Reference only —
          verify all indicators in your own environment. For real-time activity, see the live snapshot on{' '}
          <Link to="/threatintel" className="text-accent hover:underline">
            /threatintel
          </Link>
          .
        </p>
      </header>

      {/* Briefings list */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-serif font-bold text-xl">Briefings</h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {FILTERS.map(({ id, label }) => {
            const isActive = id === filter;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`px-3 py-1 rounded text-xs font-mono uppercase tracking-wider border transition-colors ${
                  isActive
                    ? 'bg-accent-soft text-accent border-rule'
                    : 'bg-surface-page text-ink-2 border-rule hover:border-rule'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {loading && <p className="text-sm font-mono text-ink-3 py-10 text-center">Loading briefings…</p>}
        {error && (
          <p className="text-sm font-mono text-rose-600 dark:text-rose-400 py-10 text-center">error: {error}</p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm font-mono text-ink-3 py-10 text-center">
            No briefings yet. The first daily briefing publishes at 00:05 UTC tomorrow.
          </p>
        )}

        <div className="space-y-4">
          {filtered.map((item) => (
            <Link
              key={item.slug}
              to={`/threatintel/briefings/${item.slug}`}
              className="block border border-rule bg-surface-page p-6 hover:border-rule transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <h3 className="font-serif font-bold text-lg leading-snug">{item.metadata.title}</h3>
                  <p className="text-xs font-mono text-ink-2 mt-0.5">{item.metadata.date_range}</p>
                </div>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded border shrink-0 ${
                    item.metadata.type === 'daily'
                      ? 'bg-accent-soft text-accent border-rule'
                      : 'bg-surface-raised text-ink-1 border-rule'
                  }`}
                >
                  {item.metadata.type}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-ink-2 min-w-0 flex-1">
                  <span>
                    <span className="text-ink-1 font-semibold">{item.metadata.stats.findings}</span> findings
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <span className="text-ink-1 font-semibold">{item.metadata.stats.cves}</span> CVEs
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <span className="text-accent font-semibold">{item.metadata.stats.iocs ?? 0}</span> IOCs
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      {item.metadata.stats.critical}
                    </span>{' '}
                    critical
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">
                      {item.metadata.stats.high}
                    </span>{' '}
                    high
                  </span>
                  <span aria-hidden="true" className="hidden sm:inline">
                    ·
                  </span>
                  <span className="hidden sm:inline text-ink-3 truncate max-w-md">
                    {(item.metadata.sources ?? []).join(', ')}
                  </span>
                </div>
                <ChevronRight size={14} className="text-ink-3 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-16 flex items-center gap-3 p-4 border border-rule bg-surface-raised">
        <Rss size={16} className="text-ink-3 shrink-0" />
        <p className="text-sm font-mono text-ink-2 flex-1">
          Subscribe in your reader.{' '}
          <a
            href="/api/v1/briefings/rss"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            RSS 2.0 feed
          </a>{' '}
          — last 10 briefings.
        </p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(`${window.location.origin}/api/v1/briefings/rss`);
          }}
          className="text-[11px] font-mono text-accent hover:underline shrink-0"
          title="Copy feed URL"
        >
          copy URL
        </button>
      </div>
    </div>
  );
}
