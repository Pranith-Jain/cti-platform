import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw, TrendingUp, Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchAggregatedFeed, formatRelativeTime, type AggregatedFeedItem } from '../../services/rssService';

const FEED_IDS = [
  'techcrunch-security',
  'venturebeat-security',
  'gnews-cybersec-funding',
  'gnews-cybersec-acquisition',
  'gnews-infosec-startup',
];

/** Lowercase keyword groups for filter pills. */
const TOPIC_FILTERS: { id: string; label: string; match: RegExp }[] = [
  { id: 'all', label: 'All', match: /.*/ },
  { id: 'funding', label: 'Funding', match: /\b(series\s*[a-d]|seed|funding|raised|valuation|raises?)\b/i },
  { id: 'm-and-a', label: 'M & A', match: /\b(acqui[rs]|acquisition|merger|merge|buyout|takeover)\b/i },
  { id: 'ipo', label: 'IPO', match: /\b(ipo|public listing|spac|nasdaq|nyse|debut)\b/i },
  { id: 'launch', label: 'Launch', match: /\b(launch|unveils|introduces|releases?|debuts|announces?)\b/i },
];

export default function IndustryNews(): JSX.Element {
  const [items, setItems] = useState<AggregatedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [feedsReturned, setFeedsReturned] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const data = await fetchAggregatedFeed(FEED_IDS, { limit: 200, perSource: 25 });
      if (!data) throw new Error('Aggregator returned no data');
      setItems(data.items);
      setFeedsReturned(data.feeds_returned);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filter = TOPIC_FILTERS.find((t) => t.id === topic) ?? TOPIC_FILTERS[0];
    return items.filter((it) => {
      const hay = `${it.title ?? ''} ${it.description ?? ''}`;
      if (!filter.match.test(hay)) return false;
      if (!q) return true;
      const lower = hay.toLowerCase();
      return q
        .split(/\s+/)
        .filter(Boolean)
        .every((tok) => lower.includes(tok));
    });
  }, [items, topic, search]);

  const topicCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of TOPIC_FILTERS) {
      out[t.id] = items.filter((it) => t.match.test(`${it.title ?? ''} ${it.description ?? ''}`)).length;
    }
    return out;
  }, [items]);

  return (
    <div className="max-w-5xl mx-auto px-8 py-12 text-slate-900 dark:text-slate-100">
      <Link
        to="/dfir"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 mb-8 font-mono"
      >
        <ArrowLeft size={14} /> /dfir
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-4xl font-display font-bold mb-2 inline-flex items-center gap-3">
          <TrendingUp size={28} className="text-brand-600 dark:text-brand-400" /> Industry & Fundraising News
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-2 max-w-2xl">
          Live aggregator of cybersecurity vendor activity — Series A-D funding rounds, acquisitions, IPOs, product
          launches. {FEED_IDS.length} sources fetched server-side, deduped, filterable by topic.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 font-mono mb-8">
          Useful for <em>where the money is</em> reading — startup roadmap awareness, vendor consolidation tracking,
          spotting acquisitions before they hit your stack. Pairs with{' '}
          <Link to="/dfir/scam-watch" className="text-brand-600 dark:text-brand-400 hover:underline">
            Scam Watch
          </Link>{' '}
          and{' '}
          <Link to="/dfir/darkweb" className="text-brand-600 dark:text-brand-400 hover:underline">
            Dark Web Watch
          </Link>
          .
        </p>
      </motion.div>

      <section className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-brand-600 dark:text-brand-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description — e.g. snyk, wiz, palo alto, $100m"
            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-sm focus:outline-none focus:border-brand-500 dark:focus:border-brand-400"
            aria-label="Search Industry News"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs font-mono text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
            >
              clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {TOPIC_FILTERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTopic(t.id)}
              className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
                topic === t.id
                  ? 'border-brand-500/60 bg-brand-500/15 text-brand-700 dark:text-brand-300'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-500/40'
              }`}
            >
              {t.label} <span className="opacity-60">· {topicCounts[t.id] ?? 0}</span>
            </button>
          ))}
          <button
            onClick={() => void load()}
            disabled={loading}
            className="ml-auto text-xs font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 hover:border-brand-500/40 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {loading ? 'fetching' : 'refresh'}
          </button>
        </div>
      </section>

      {error && <p className="text-sm font-mono text-rose-600 dark:text-rose-400 mb-4">Could not load: {error}</p>}

      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500 mb-3">
        Showing {filtered.length} of {items.length} · {feedsReturned} of {FEED_IDS.length} feeds returned data
      </p>

      <ul className="space-y-2">
        {filtered.slice(0, 200).map((it) => (
          <li
            key={it.link ?? `${it.title}-${it.pubDate}`}
            className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <a
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 inline-flex items-center gap-1"
              >
                {it.title || '(untitled)'} <ExternalLink size={11} />
              </a>
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-500 mb-1">
              <span>{it.source || 'feed'}</span>
              {it.pubDate && <> · {formatRelativeTime(it.pubDate)}</>}
            </div>
            {it.description && (
              <p className="text-[12px] font-mono text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                {stripHtml(it.description)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
