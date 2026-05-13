import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, X, Sparkles } from 'lucide-react';
import { useLastVisit, isNewSince } from '../../hooks';
import { formatRelativeTime } from '../../services/rssService';

const STORAGE_KEY_WATCH = 'dfir.darkweb.watchlist';

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Breach Disclosures Panel ─────────────────────────────────────────────

interface BreachDisclosure {
  name: string;
  title: string;
  domain?: string;
  breach_date?: string;
  added_date?: string;
  modified_date?: string;
  pwn_count?: number;
  description?: string;
  data_classes?: string[];
  verified: boolean;
  sensitive: boolean;
  logo_path?: string;
}

interface BreachDisclosuresResponse {
  generated_at: string;
  sources: string[];
  count: number;
  breaches: BreachDisclosure[];
}

function formatPwnCount(n?: number): string {
  if (!n || n <= 0) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function BreachDisclosuresPanel(): JSX.Element {
  const [data, setData] = useState<BreachDisclosuresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v1/breach-disclosures');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as BreachDisclosuresResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = data?.breaches.slice(0, expanded ? data.breaches.length : 8) ?? [];

  return (
    <section className="mb-6 border border-rule bg-surface-page p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
        <h2 className="font-serif font-semibold text-lg inline-flex items-center gap-2">
          Recent breach disclosures
          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
            {data?.sources?.length ?? 0} sources
          </span>
        </h2>
        <span className="text-[11px] font-mono text-ink-2">
          {loading ? 'loading…' : data ? `${data.count} disclosures` : ''}
        </span>
      </div>

      {error && (
        <p className="text-sm font-mono text-rose-600 dark:text-rose-400">Could not load breach disclosures: {error}</p>
      )}

      {data && data.breaches.length === 0 && !error && (
        <p className="text-sm font-mono text-ink-2">
          No disclosures returned. Upstream breach APIs may be unavailable; the in-feed sources below still cover breach
          reporting.
        </p>
      )}

      {visible.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((b) => (
            <li key={b.name} className="rounded border border-rule bg-surface-raised p-2.5">
              <div className="flex flex-wrap items-baseline gap-2 mb-1">
                <a
                  href={b.domain ? `https://haveibeenpwned.com/PwnedWebsites#${b.name}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-serif font-semibold text-sm text-ink-1 hover:text-accent"
                >
                  {b.title}
                </a>
                {b.verified && (
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    verified
                  </span>
                )}
                {b.sensitive && (
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                    sensitive
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-baseline gap-3 text-[11px] font-mono text-ink-2 mb-1">
                {b.domain && <span>{b.domain}</span>}
                {b.breach_date && <span>breached {b.breach_date}</span>}
                {b.added_date && <span>disclosed {b.added_date.slice(0, 10)}</span>}
                {typeof b.pwn_count === 'number' && b.pwn_count > 0 && (
                  <span className="text-ink-1 font-bold">{formatPwnCount(b.pwn_count)} accounts</span>
                )}
              </div>
              {b.data_classes && b.data_classes.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {b.data_classes.slice(0, 5).map((c) => (
                    <span key={c} className="text-[9px] font-mono px-1 py-0.5 rounded border border-rule text-ink-2">
                      {c}
                    </span>
                  ))}
                  {b.data_classes.length > 5 && (
                    <span className="text-[9px] font-mono text-ink-2">+{b.data_classes.length - 5}</span>
                  )}
                </div>
              )}
              {b.description && (
                <p className="text-[11px] font-mono text-ink-2 leading-relaxed line-clamp-3">{b.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {data && data.breaches.length > 8 && (
        <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-ink-2">
          <button onClick={() => setExpanded((v) => !v)} className="text-accent hover:underline">
            {expanded ? 'Show fewer' : `Show all ${data.breaches.length}`}
          </button>
          <a
            href="https://haveibeenpwned.com/PwnedWebsites"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent inline-flex items-center gap-1"
          >
            full HIBP list <ExternalLink size={10} />
          </a>
        </div>
      )}
    </section>
  );
}

// ─── Ransomware Activity Panel ────────────────────────────────────────────

type RansomwareOrigin = 'ransomlook' | 'mti' | 'ransomfeed' | 'ransomwatch';

interface RansomwareVictim {
  victim: string;
  group: string;
  discovered: string;
  description?: string;
  source_url: string;
  screen_url?: string;
  origin?: RansomwareOrigin;
  country?: string;
}

interface RansomwareResponse {
  generated_at: string;
  source: string;
  count: number;
  groups: Array<{ group: string; count: number }>;
  victims: RansomwareVictim[];
}

const ORIGIN_PILL: Record<RansomwareOrigin, { label: string; cls: string; tooltip: string }> = {
  ransomlook: {
    label: 'RL',
    cls: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    tooltip: 'Ransomlook — primary tracker with .onion screenshots',
  },
  mti: {
    label: 'MTI',
    cls: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    tooltip: 'mythreatintel Telegram channel — real-time Spanish CTI firehose',
  },
  ransomfeed: {
    label: 'RFI',
    cls: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    tooltip: 'ransomfeed.it — RSS of victim claims',
  },
  ransomwatch: {
    label: 'RW',
    cls: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    tooltip: 'ransomwatch — joshhighet/ransomwatch GitHub posts.json',
  },
};

export function RansomwareActivityPanel(): JSX.Element {
  const [data, setData] = useState<RansomwareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | 'all'>('all');
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; victim: string; group: string } | null>(null);
  const [newOnly, setNewOnly] = useState(false);
  const { previous: lastVisit, markVisited } = useLastVisit('ransomware-activity');

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v1/ransomware-recent');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as RansomwareResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVictims = useMemo(() => {
    if (!data) return [];
    return data.victims.filter((v) => {
      if (groupFilter !== 'all' && v.group !== groupFilter) return false;
      if (newOnly && !isNewSince(v.discovered, lastVisit)) return false;
      return true;
    });
  }, [data, groupFilter, newOnly, lastVisit]);

  const newCount = useMemo(() => {
    if (!data || !lastVisit) return 0;
    return data.victims.filter((v) => isNewSince(v.discovered, lastVisit)).length;
  }, [data, lastVisit]);

  useEffect(() => {
    if (!data) return;
    const id = window.setTimeout(markVisited, 1500);
    return () => window.clearTimeout(id);
  }, [data, markVisited]);

  const visible = filteredVictims.slice(0, expanded ? filteredVictims.length : 12);

  return (
    <section className="mb-6 border border-rule bg-surface-page p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
        <h2 className="font-serif font-semibold text-lg inline-flex items-center gap-2">
          Recent ransomware activity
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
            title={data?.source ?? 'Multi-source ransomware tracker merge'}
          >
            4 trackers
          </span>
        </h2>
        <span className="text-[11px] font-mono text-ink-2" title={data?.source ?? ''}>
          {loading
            ? 'loading…'
            : data
              ? `${data.count} leak-site posts · ransomlook + mythreatintel + ransomfeed.it + ransomwatch`
              : ''}
        </span>
      </div>

      {error && (
        <p className="text-sm font-mono text-rose-600 dark:text-rose-400">Could not load ransomware feed: {error}</p>
      )}

      {data && data.groups.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setGroupFilter('all')}
            className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
              groupFilter === 'all'
                ? 'border-rule bg-accent-soft text-accent'
                : 'border-rule text-ink-2 hover:border-rule'
            }`}
          >
            All <span className="opacity-60">· {data.count}</span>
          </button>
          {newCount > 0 && (
            <button
              onClick={() => setNewOnly((v) => !v)}
              className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors inline-flex items-center gap-1 ${
                newOnly
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500/60'
              }`}
              title={`${newCount} claims since your last visit${lastVisit ? ` (${new Date(lastVisit).toLocaleString()})` : ''}`}
            >
              <Sparkles size={10} /> {newCount} new
            </button>
          )}
          {data.groups.map((g) => (
            <button
              key={g.group}
              onClick={() => setGroupFilter(g.group)}
              className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
                groupFilter === g.group
                  ? 'border-rose-500/60 bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  : 'border-rule text-ink-2 hover:border-rose-500/40'
              }`}
            >
              {g.group} <span className="opacity-60">· {g.count}</span>
            </button>
          ))}
        </div>
      )}

      {visible.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((v, i) => (
            <li key={`${v.group}-${v.victim}-${i}`} className="rounded border border-rule bg-surface-raised p-2.5">
              <div className="flex gap-2.5">
                {v.screen_url && (
                  <button
                    type="button"
                    onClick={() => setLightbox({ url: v.screen_url!, victim: v.victim, group: v.group })}
                    className="shrink-0 group relative w-14 h-10 sm:w-20 sm:h-14 rounded overflow-hidden border border-rule bg-surface-raised hover:border-rule"
                    title="Click to view full leak-site screenshot"
                    aria-label={`View leak-site screenshot for ${v.victim}`}
                  >
                    <img
                      src={v.screen_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-left-top opacity-90 group-hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono px-1 rounded bg-slate-900/70 text-slate-100 opacity-0 group-hover:opacity-100">
                      zoom
                    </span>
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2 mb-1">
                    <a
                      href={v.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-serif font-semibold text-sm text-ink-1 hover:text-accent break-words"
                    >
                      {v.victim}
                    </a>
                    <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                      {v.group}
                    </span>
                    {v.origin && ORIGIN_PILL[v.origin] && (
                      <span
                        className={`text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded border ${ORIGIN_PILL[v.origin].cls}`}
                        title={ORIGIN_PILL[v.origin].tooltip}
                      >
                        {ORIGIN_PILL[v.origin].label}
                      </span>
                    )}
                    {v.country && (
                      <span
                        className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded border border-rule text-ink-2"
                        title={`Country attributed by upstream: ${v.country}`}
                      >
                        {v.country}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-ink-2 mb-1">
                    claimed {formatRelativeTime(v.discovered)}
                  </div>
                  {v.description && (
                    <p className="text-[11px] font-mono text-ink-2 leading-relaxed line-clamp-2">{v.description}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {filteredVictims.length > 12 && (
        <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-ink-2">
          <button onClick={() => setExpanded((v) => !v)} className="text-accent hover:underline">
            {expanded ? 'Show fewer' : `Show all ${filteredVictims.length}`}
          </button>
          <a
            href="https://www.ransomlook.io/recent"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent inline-flex items-center gap-1"
          >
            full Ransomlook feed <ExternalLink size={10} />
          </a>
        </div>
      )}

      {data && data.victims.some((v) => v.screen_url) && (
        <p className="mt-3 text-[10px] font-mono text-ink-2 leading-relaxed">
          Thumbnails are PNG screenshots of the .onion leak post, captured by Ransomlook&apos;s Tor-equipped backend and
          rehosted on cleartext. Click to zoom — we never fetch the .onion site from your browser. Treat the content as
          untrusted (leak-site screenshots can include malicious links + actor branding).
        </p>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80"
          role="dialog"
          aria-modal="true"
          aria-label={`Leak-site screenshot for ${lightbox.victim}`}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute inset-0 cursor-zoom-out"
            aria-label="Close screenshot"
          />
          <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2 text-slate-100">
              <div className="font-serif font-semibold inline-flex items-center gap-2">
                {lightbox.victim}
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-rose-400/40 bg-rose-500/10 text-rose-300">
                  {lightbox.group}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="text-slate-300 hover:text-slate-100 inline-flex items-center gap-1 text-sm font-mono"
                aria-label="Close"
              >
                <X size={14} /> close (esc)
              </button>
            </div>
            <img
              src={lightbox.url}
              alt={`Leak-site screenshot of ${lightbox.victim}`}
              className="w-full max-h-[80vh] object-contain rounded border border-rule bg-surface-raised"
              referrerPolicy="no-referrer"
            />
            <p className="text-[10px] font-mono text-ink-3 text-center">
              Source: ransomlook.io · cleartext-rehosted PNG of the .onion leak page
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Telegram Feed Panel ───────────────────────────────────────────────────

interface TelegramFeedItem {
  channel_handle: string;
  channel_name: string;
  channel_topic: 'malware' | 'ransomware' | 'hacktivism' | 'osint' | 'news' | 'leaks';
  channel_blurb: string;
  permalink: string;
  datetime: string;
  text: string;
  views?: string;
}

interface ChannelQuality {
  score: number;
  signals: {
    recent_pct: number;
    dupe_pct: number;
    median_text_len: number;
    posts_per_day: number;
  };
}

interface TelegramFeedResponse {
  generated_at: string;
  channels: {
    handle: string;
    name: string;
    topic: string;
    ok: boolean;
    count: number;
    quality?: ChannelQuality;
  }[];
  items: TelegramFeedItem[];
  warnings: string[];
}

function qualityPill(score?: number): { label: string; cls: string } {
  if (score === undefined) return { label: '—', cls: 'border-rule text-ink-3' };
  if (score >= 75)
    return { label: `${score}`, cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' };
  if (score >= 50) return { label: `${score}`, cls: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300' };
  if (score >= 25)
    return { label: `${score}`, cls: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' };
  return { label: `${score}`, cls: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300' };
}

const TG_TOPIC_PILL: Record<TelegramFeedItem['channel_topic'], string> = {
  malware: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  ransomware: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  hacktivism: 'border-pink-500/40 bg-pink-500/10 text-pink-700 dark:text-pink-300',
  osint: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  news: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  leaks: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

function highlightTelegramText(text: string, watchTerms: string[]): JSX.Element {
  if (watchTerms.length === 0) return <>{text}</>;
  const escaped = watchTerms
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean);
  if (escaped.length === 0) return <>{text}</>;
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        re.test(p) ? (
          <mark key={i} className="bg-amber-300/40 dark:bg-amber-400/30 text-inherit rounded px-0.5">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export function TelegramFeedPanel(): JSX.Element {
  const [data, setData] = useState<TelegramFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<string | 'all'>('all');
  const [expanded, setExpanded] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(() => loadJson<string[]>(STORAGE_KEY_WATCH, []));
  const [newOnly, setNewOnly] = useState(false);
  const { previous: lastVisit, markVisited } = useLastVisit('telegram-feed');

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_WATCH) setWatchlist(loadJson<string[]>(STORAGE_KEY_WATCH, []));
    };
    window.addEventListener('storage', onStorage);
    const t = setTimeout(() => setWatchlist(loadJson<string[]>(STORAGE_KEY_WATCH, [])), 1000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v1/telegram-feed');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as TelegramFeedResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((it) => {
      if (activeChannel !== 'all' && it.channel_handle !== activeChannel) return false;
      if (newOnly && !isNewSince(it.datetime, lastVisit)) return false;
      return true;
    });
  }, [data, activeChannel, newOnly, lastVisit]);

  const newCount = useMemo(() => {
    if (!data || !lastVisit) return 0;
    return data.items.filter((it) => isNewSince(it.datetime, lastVisit)).length;
  }, [data, lastVisit]);

  useEffect(() => {
    if (!data) return;
    const id = window.setTimeout(markVisited, 1500);
    return () => window.clearTimeout(id);
  }, [data, markVisited]);

  const matchedItems = useMemo(() => {
    if (watchlist.length === 0) return filteredItems.map((it) => ({ it, matches: [] as string[] }));
    const lc = watchlist.map((w) => w.toLowerCase()).filter(Boolean);
    return filteredItems.map((it) => {
      const hay = it.text.toLowerCase();
      return { it, matches: lc.filter((w) => hay.includes(w)) };
    });
  }, [filteredItems, watchlist]);

  const visible = matchedItems.slice(0, expanded ? matchedItems.length : 10);
  const watchHits = matchedItems.filter((m) => m.matches.length > 0).length;

  return (
    <section className="mb-6 border border-rule bg-surface-page p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h2 className="font-serif font-semibold text-lg inline-flex items-center gap-2">
          Cybersec Telegram firehose
          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
            t.me/s preview
          </span>
        </h2>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] font-mono text-ink-2">
          {loading ? (
            <span>loading…</span>
          ) : data ? (
            <>
              <span>{data.items.length} posts</span>
              <span aria-hidden="true">·</span>
              <span>
                {data.channels.filter((c) => c.ok).length}/{data.channels.length} channels
              </span>
              <span aria-hidden="true">·</span>
              <span>cached 30 min</span>
            </>
          ) : null}
          {watchHits > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-600 dark:text-amber-400">
                {watchHits} watchlist hit{watchHits === 1 ? '' : 's'}
              </span>
            </>
          )}
        </div>
      </div>

      <p className="text-[12px] font-mono text-ink-2 mb-3 leading-relaxed">
        Latest messages from a curated set of public threat-intel and cybercrime-tracking Telegram channels — full
        catalogue. Server-side scrape of <code>t.me/s/&lt;handle&gt;</code>; no Telegram account required.
      </p>

      {error && (
        <p className="text-sm font-mono text-rose-600 dark:text-rose-400">Could not load Telegram feed: {error}</p>
      )}

      {data && data.channels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setActiveChannel('all')}
            className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
              activeChannel === 'all'
                ? 'border-rule bg-accent-soft text-accent'
                : 'border-rule text-ink-2 hover:border-rule'
            }`}
          >
            All <span className="opacity-60">· {data.items.length}</span>
          </button>
          {newCount > 0 && (
            <button
              onClick={() => setNewOnly((v) => !v)}
              className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors inline-flex items-center gap-1 ${
                newOnly
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500/60'
              }`}
              title={`${newCount} messages since your last visit${lastVisit ? ` (${new Date(lastVisit).toLocaleString()})` : ''}`}
            >
              <Sparkles size={10} /> {newCount} new
            </button>
          )}
          {[...data.channels]
            .sort((a, b) => {
              if (a.ok !== b.ok) return a.ok ? -1 : 1;
              return (b.quality?.score ?? 0) - (a.quality?.score ?? 0);
            })
            .map((ch) => {
              const qp = qualityPill(ch.quality?.score);
              const sig = ch.quality?.signals;
              const tip = ch.ok
                ? sig
                  ? `@${ch.handle} · quality ${ch.quality?.score}/100 · recent ${sig.recent_pct}% · dupes ${sig.dupe_pct}% · median ${sig.median_text_len} chars · ${sig.posts_per_day}/day`
                  : `@${ch.handle}`
                : `@${ch.handle} unreachable`;
              return (
                <button
                  key={ch.handle}
                  onClick={() => setActiveChannel(ch.handle)}
                  disabled={!ch.ok}
                  className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors inline-flex items-center gap-1.5 ${
                    activeChannel === ch.handle
                      ? 'border-sky-500/60 bg-sky-500/15 text-sky-700 dark:text-sky-300'
                      : ch.ok
                        ? 'border-rule text-ink-2 hover:border-sky-500/40'
                        : 'border-rule text-ink-3 cursor-not-allowed opacity-50'
                  }`}
                  title={tip}
                >
                  {ch.name} <span className="opacity-60">· {ch.count}</span>
                  {ch.ok && ch.quality && (
                    <span className={`text-[9px] px-1 rounded border ${qp.cls}`}>q{qp.label}</span>
                  )}
                </button>
              );
            })}
        </div>
      )}

      {visible.length > 0 && (
        <ul className="space-y-2">
          {visible.map(({ it, matches }) => {
            const hasMatch = matches.length > 0;
            return (
              <li
                key={it.permalink}
                className={`rounded border p-2.5 ${
                  hasMatch ? 'border-amber-500/40 bg-amber-500/5' : 'border-rule bg-surface-raised'
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <a
                    href={it.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-serif font-semibold text-sm text-ink-1 hover:text-accent inline-flex items-center gap-1"
                    title={it.channel_blurb}
                  >
                    {it.channel_name}
                    <ExternalLink size={10} className="opacity-50" />
                  </a>
                  <span
                    className={`text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded border ${TG_TOPIC_PILL[it.channel_topic]}`}
                  >
                    {it.channel_topic}
                  </span>
                  <span className="text-[10px] font-mono text-ink-2">{formatRelativeTime(it.datetime)}</span>
                  {it.views && <span className="text-[10px] font-mono text-ink-2">{it.views} views</span>}
                  {hasMatch && (
                    <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 sm:ml-auto">
                      watch: {matches.join(', ')}
                    </span>
                  )}
                </div>
                <p className="text-[12px] font-mono text-ink-1 leading-relaxed whitespace-pre-wrap break-words">
                  {highlightTelegramText(it.text, watchlist)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {data && filteredItems.length === 0 && !loading && !error && (
        <p className="text-sm font-mono text-ink-2">No messages from the selected channel.</p>
      )}

      {matchedItems.length > 10 && (
        <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-ink-2">
          <button onClick={() => setExpanded((v) => !v)} className="text-accent hover:underline">
            {expanded ? 'Show fewer' : `Show all ${matchedItems.length}`}
          </button>
        </div>
      )}
    </section>
  );
}
