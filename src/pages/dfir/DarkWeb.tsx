import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw, Plus, X, Eye, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchFeedsProgressive, formatRelativeTime, type FeedItem } from '../../services/rssService';

/**
 * Curated dark-web monitoring sources. These are the highest-signal feeds we
 * already proxy that publish leak-site, ransomware, and breach activity.
 * The set is intentionally narrower than the general ThreatIntelFeed.
 */
const DARKWEB_FEED_IDS = [
  'darkwebinformer',
  'ransomware-live',
  'databreaches',
  'dfir-report',
  'the-record',
  'curated-intel',
];

const STORAGE_KEY = 'dfir.darkweb.watchlist';
const MAX_PER_SOURCE = 20;
const MAX_ITEMS = 100;

function loadWatchlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function saveWatchlist(list: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* localStorage may be disabled in private mode */
  }
}

interface MatchedItem {
  item: FeedItem;
  matches: string[];
}

function findMatches(item: FeedItem, watchlist: string[]): string[] {
  if (watchlist.length === 0) return [];
  const haystack = `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase();
  return watchlist.filter((term) => term && haystack.includes(term.toLowerCase()));
}

export default function DarkWeb(): JSX.Element {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceCount, setSourceCount] = useState(0);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState('');

  // Hydrate watchlist on mount.
  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  const fetchFeeds = useCallback(async () => {
    setLoading(true);
    setItems([]);
    setSourceCount(0);
    let active = 0;
    let firstSeen = false;

    await fetchFeedsProgressive(DARKWEB_FEED_IDS, (_id, result) => {
      if (result.error || result.items.length === 0) return;
      active++;
      setSourceCount(active);
      setItems((prev) => {
        const merged = [...prev, ...result.items.slice(0, MAX_PER_SOURCE)];
        merged.sort((a, b) => {
          const da = new Date(a.pubDate).getTime() || 0;
          const db = new Date(b.pubDate).getTime() || 0;
          return db - da;
        });
        return merged.slice(0, MAX_ITEMS);
      });
      if (!firstSeen) {
        firstSeen = true;
        setLoading(false);
      }
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchFeeds();
  }, [fetchFeeds]);

  const addTerm = (raw: string) => {
    const term = raw.trim();
    if (!term) return;
    if (watchlist.some((w) => w.toLowerCase() === term.toLowerCase())) return;
    const next = [...watchlist, term];
    setWatchlist(next);
    saveWatchlist(next);
    setNewTerm('');
  };

  const removeTerm = (term: string) => {
    const next = watchlist.filter((w) => w !== term);
    setWatchlist(next);
    saveWatchlist(next);
  };

  const matched = useMemo<MatchedItem[]>(
    () => items.map((it) => ({ item: it, matches: findMatches(it, watchlist) })),
    [items, watchlist]
  );
  const matchCount = useMemo(() => matched.filter((m) => m.matches.length > 0).length, [matched]);
  const perTermCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const term of watchlist) map[term] = 0;
    for (const m of matched) for (const t of m.matches) map[t]++;
    return map;
  }, [matched, watchlist]);

  return (
    <div className="max-w-5xl mx-auto px-8 py-12 text-slate-900 dark:text-slate-100">
      <Link
        to="/dfir"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 mb-8 font-mono"
      >
        <ArrowLeft size={14} /> /dfir
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-4xl font-display font-bold mb-2">Dark Web Watch</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl">
          Aggregated dark web, ransomware leak-site, and breach activity from {DARKWEB_FEED_IDS.length} curated sources.
          Add company names, domains, or keywords to your watchlist and any matching post is highlighted. The watchlist
          is stored locally in your browser. Nothing is uploaded.
        </p>
      </motion.div>

      {/* Watchlist control */}
      <section className="mb-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={14} className="text-brand-600 dark:text-brand-400" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">Watchlist</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTerm(newTerm);
          }}
          className="flex gap-2 mb-3"
        >
          <input
            type="text"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="company name, domain, sector, threat actor…"
            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 dark:focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={!newTerm.trim()}
            className="inline-flex items-center gap-1 px-3 py-2 bg-brand-600 dark:bg-brand-500 text-white text-sm font-mono font-semibold rounded-lg disabled:opacity-30 hover:bg-brand-700 dark:hover:bg-brand-400"
          >
            <Plus size={14} /> Track
          </button>
        </form>
        {watchlist.length === 0 ? (
          <p className="text-xs font-mono text-slate-500">
            Empty. Add a keyword above to highlight matching posts in the feed below.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {watchlist.map((term) => (
              <li
                key={term}
                className="inline-flex items-center gap-2 text-xs font-mono px-2 py-1 rounded-full border border-brand-500/40 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300"
              >
                <span>{term}</span>
                <span className="text-slate-500">{perTermCount[term] ?? 0}</span>
                <button
                  type="button"
                  onClick={() => removeTerm(term)}
                  aria-label={`stop tracking ${term}`}
                  className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Stats */}
      <header className="flex items-baseline justify-between mb-4">
        <h2 className="font-display font-bold text-xl">Recent activity</h2>
        <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
          <span>
            {sourceCount} of {DARKWEB_FEED_IDS.length} sources
          </span>
          <span aria-hidden="true">·</span>
          <span>{items.length} items</span>
          {watchlist.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-brand-600 dark:text-brand-400">
                {matchCount} match{matchCount === 1 ? '' : 'es'}
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => void fetchFeeds()}
            disabled={loading}
            aria-label="refresh dark web feeds"
            className="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> refresh
          </button>
        </div>
      </header>

      {loading && items.length === 0 && (
        <p className="font-mono text-sm text-slate-600 dark:text-slate-400">Fetching…</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-3">
          {matched.map(({ item: it, matches }) => {
            const hit = matches.length > 0;
            return (
              <li
                key={it.guid ?? it.link}
                className={`rounded-lg border p-4 transition-colors ${
                  hit
                    ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/15 dark:border-amber-700'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <a href={it.link} target="_blank" rel="noopener noreferrer" className="group block">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {it.title}
                    </h3>
                    <ExternalLink size={12} className="text-slate-500 shrink-0 mt-1" />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs font-mono text-slate-500">
                    {it.source && <span className="text-brand-600 dark:text-brand-400">{it.source}</span>}
                    {it.pubDate && <span>{formatRelativeTime(it.pubDate)}</span>}
                  </div>
                </a>
                {hit && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Eye size={12} className="text-amber-700 dark:text-amber-400" />
                    {matches.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-700/30 text-amber-900 dark:text-amber-200"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-12 text-xs font-mono text-slate-500 leading-relaxed">
        Sources: Dark Web Informer · Ransomware.live · DataBreaches.net · The DFIR Report · The Record · Curated
        Intelligence. Truly closed darknet content (private Telegram channels, invite-only forums, paid leak sites) is
        not in scope here. For an actively-curated index of those sources, see the{' '}
        <a
          href="https://github.com/fastfire/deepdarkCTI"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 dark:text-brand-400 hover:underline"
        >
          deepdarkCTI repo
        </a>
        .
      </footer>
    </div>
  );
}
