import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { fetchMultipleFeeds, formatRelativeTime, type FeedItem } from '../../services/rssService';
import { defaultTechFeeds } from '../../data/rssFeeds';

const MAX_ITEMS = 12;
const MAX_PER_SOURCE = 3;

export function TechNewsFeed(): JSX.Element {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceCount, setSourceCount] = useState(0);

  const fetchFeeds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resultsMap = await fetchMultipleFeeds(defaultTechFeeds);
      const all: FeedItem[] = [];
      let activeSources = 0;
      resultsMap.forEach((result) => {
        if (!result.error && result.items.length > 0) {
          activeSources++;
          all.push(...result.items.slice(0, MAX_PER_SOURCE));
        }
      });
      setSourceCount(activeSources);
      all.sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime() || 0;
        const dateB = new Date(b.pubDate).getTime() || 0;
        return dateB - dateA;
      });
      setItems(all.slice(0, MAX_ITEMS));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'feed unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFeeds();
  }, [fetchFeeds]);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <header className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sparkles size={18} className="text-brand-600 dark:text-brand-400" />
          Tech &amp; AI News
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{sourceCount} sources · HN · YC</span>
          <button
            type="button"
            onClick={() => void fetchFeeds()}
            disabled={loading}
            aria-label="refresh tech news feed"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <RefreshCw size={12} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
            refresh
          </button>
        </div>
      </header>

      {loading && <p className="font-mono text-sm text-slate-600 dark:text-slate-400">Fetching…</p>}
      {error && <p className="font-mono text-sm text-rose-600 dark:text-rose-400">error: {error}</p>}

      {!loading && !error && (
        <ul className="space-y-3">
          {items.map((it) => (
            <li
              key={it.guid ?? it.link}
              className="border-t border-slate-200 dark:border-slate-800 pt-3 first:border-t-0 first:pt-0"
            >
              <a href={it.link} target="_blank" rel="noopener noreferrer" className="group block">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:text-brand-400 transition-colors">
                    {it.title}
                  </h3>
                  <ExternalLink size={12} className="text-slate-500 shrink-0 mt-1" />
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs font-mono text-slate-500">
                  {it.source && <span className="text-brand-600 dark:text-brand-400">{it.source}</span>}
                  {it.pubDate && <span>{formatRelativeTime(it.pubDate)}</span>}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
