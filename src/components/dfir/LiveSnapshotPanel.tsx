import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Send, Globe2, ExternalLink, AlertTriangle, Newspaper, Sparkles } from 'lucide-react';
import { fetchAggregatedFeed, type AggregatedFeedResponse } from '../../services/rssService';

/**
 * Live "right now" snapshot of dark-web + Telegram + .onion + scam activity.
 *
 * Originally embedded in /dfir/briefings; extracted here so /dfir landing
 * and per-briefing detail pages can mount it too.
 *
 * Behaviour notes:
 * - Each of the four cards fetches independently. One source failing does
 *   not block the others.
 * - "What's new since last visit" highlights items whose timestamp is newer
 *   than the localStorage `dfir.briefings.last_visit` baseline. The baseline
 *   is captured at mount and overwritten with `now` on unmount, so this
 *   visit becomes the next baseline.
 * - The localStorage key is shared across every place we mount the panel —
 *   on purpose. Visiting /dfir landing should reset the baseline so the
 *   user doesn't see the same "12 new" pill on /dfir/briefings ten seconds
 *   later. If you mount this on multiple pages and want independent
 *   baselines, parameterise `lastVisitKey` per call.
 *
 * Props:
 * - `compact` — smaller paddings + 3 items per card (vs 4) + no per-item
 *   secondary line. For embedding above tool grids etc.
 * - `headerLabel` — section H2 text. Pass `null` to omit the section
 *   header entirely.
 * - `subtitle` — small grey text rendered next to the section header.
 * - `mbClass` — bottom-margin Tailwind class. Defaults to `mb-12`.
 */

interface Props {
  compact?: boolean;
  headerLabel?: string | null;
  subtitle?: string;
  mbClass?: string;
}

interface RansomwareVictim {
  victim: string;
  group: string;
  discovered: string;
  description?: string;
  source_url: string;
  screen_url?: string;
}

interface RansomwareResp {
  generated_at: string;
  count: number;
  victims: RansomwareVictim[];
}

interface TelegramItem {
  channel_name: string;
  channel_topic: string;
  permalink: string;
  datetime: string;
  text: string;
  views?: string;
}

interface TelegramResp {
  items: TelegramItem[];
  channels: { handle: string; ok: boolean; count: number }[];
}

interface OnionResp {
  reachable_count: number;
  total_count: number;
  groups: { group: string; any_reachable: boolean }[];
}

function shortRel(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const ageS = Math.max(0, (Date.now() - t) / 1000);
  if (ageS < 60) return 'now';
  if (ageS < 3600) return `${Math.round(ageS / 60)}m ago`;
  if (ageS < 86400) return `${Math.round(ageS / 3600)}h ago`;
  return `${Math.round(ageS / 86400)}d ago`;
}

function withinWindow(iso: string, hours: number): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= hours * 3600_000;
}

const SCAM_SNAPSHOT_FEED_IDS = ['ftc-consumer', 'ic3-psas'];

/**
 * General threat-intel firehose — the analyst's "daily reading" beat that
 * doesn't fit the ransomware / Telegram / .onion / scam carve-outs. Tight,
 * high-signal subset; the full version lived on /dfir landing as the
 * (now-removed) ThreatIntelFeed component.
 */
const THREAT_INTEL_SNAPSHOT_FEED_IDS = ['bleepingcomputer', 'krebsonsecurity', 'dfir-report', 'securityweek'];

/**
 * Tech + AI industry news — the cyber-vendor funding / AI-lab releases /
 * tech-press surface. Replaces the standalone TechNewsFeed.
 */
const TECH_AI_SNAPSHOT_FEED_IDS = ['techcrunch-ai', 'venturebeat-ai', 'techcrunch-security', 'gnews-cybersec-funding'];

const LAST_VISIT_KEY = 'dfir.briefings.last_visit';

/**
 * Watchlist key shared with /dfir/darkweb. An analyst types a term once on the
 * DarkWeb feed (company name, brand, actor alias) and items mentioning it are
 * highlighted across every snapshot card here too. Cross-tab storage events
 * keep the highlight in sync if the watchlist is edited elsewhere.
 */
const WATCHLIST_KEY = 'dfir.darkweb.watchlist';

function loadWatchlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((s): s is string => typeof s === 'string' && s.trim() !== '');
  } catch {
    return [];
  }
}

/** Returns the list of watchlist terms that appear (case-insensitive) in the haystack. */
function watchHits(haystack: string, watchlist: string[]): string[] {
  if (watchlist.length === 0) return [];
  const lc = haystack.toLowerCase();
  return watchlist.filter((term) => lc.includes(term.toLowerCase()));
}

function useLastVisit(): number {
  const prevRef = useRef<number | null>(null);
  if (prevRef.current === null) {
    if (typeof window === 'undefined') {
      prevRef.current = 0;
    } else {
      try {
        const raw = window.localStorage.getItem(LAST_VISIT_KEY);
        prevRef.current = raw ? Number(raw) || 0 : 0;
      } catch {
        prevRef.current = 0;
      }
    }
  }
  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
      } catch {
        /* private mode / quota */
      }
    };
  }, []);
  return prevRef.current;
}

function isNewSince(iso: string | undefined, since: number): boolean {
  if (!since) return false;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return t > since;
}

function NewBadge({ count, label = 'new' }: { count: number; label?: string }): JSX.Element | null {
  if (count <= 0) return null;
  return (
    <span
      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0"
      title={`${count} new since your last visit`}
    >
      {count} {label}
    </span>
  );
}

/** Visual marker for items matching the analyst's watchlist. */
function WatchPill({ count, terms }: { count: number; terms?: string[] }): JSX.Element | null {
  if (count <= 0) return null;
  const tooltip =
    terms && terms.length > 0
      ? `watchlist match: ${terms.join(', ')}`
      : `${count} watchlist match${count === 1 ? '' : 'es'}`;
  return (
    <span
      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-300 shrink-0"
      title={tooltip}
    >
      {count} watch
    </span>
  );
}

export function LiveSnapshotPanel(props: Props = {}): JSX.Element {
  const { compact = false, headerLabel = 'Right now', subtitle, mbClass = 'mb-12' } = props;

  const lastVisit = useLastVisit();
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist());

  // Re-read watchlist when other tabs / components mutate it. Same-tab writes
  // don't fire `storage` so we also re-poll once on mount with a short delay
  // (covers the case where /dfir/darkweb is loaded in another route in this
  // tab and a watchlist edit there should reflect here on next nav).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === WATCHLIST_KEY) setWatchlist(loadWatchlist());
    };
    window.addEventListener('storage', onStorage);
    const t = setTimeout(() => setWatchlist(loadWatchlist()), 1000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearTimeout(t);
    };
  }, []);

  const [ransomware, setRansomware] = useState<RansomwareResp | null>(null);
  const [telegram, setTelegram] = useState<TelegramResp | null>(null);
  const [onion, setOnion] = useState<OnionResp | null>(null);
  const [scam, setScam] = useState<AggregatedFeedResponse | null>(null);
  const [threatIntel, setThreatIntel] = useState<AggregatedFeedResponse | null>(null);
  const [techAi, setTechAi] = useState<AggregatedFeedResponse | null>(null);
  const [errors, setErrors] = useState<{
    ransomware?: string;
    telegram?: string;
    onion?: string;
    scam?: string;
    threatIntel?: string;
    techAi?: string;
  }>({});

  useEffect(() => {
    let cancelled = false;
    const safe = async <T,>(url: string, key: 'ransomware' | 'telegram' | 'onion'): Promise<T | null> => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as T;
      } catch (e) {
        if (!cancelled) setErrors((cur) => ({ ...cur, [key]: (e as Error).message }));
        return null;
      }
    };
    void (async () => {
      const [r, t, o, s, ti, ta] = await Promise.all([
        safe<RansomwareResp>('/api/v1/ransomware-recent', 'ransomware'),
        safe<TelegramResp>('/api/v1/telegram-feed', 'telegram'),
        safe<OnionResp>('/api/v1/onion-watch', 'onion'),
        fetchAggregatedFeed(SCAM_SNAPSHOT_FEED_IDS, { limit: 12, perSource: 6 }).catch((e: Error) => {
          if (!cancelled) setErrors((cur) => ({ ...cur, scam: e.message }));
          return null;
        }),
        fetchAggregatedFeed(THREAT_INTEL_SNAPSHOT_FEED_IDS, { limit: 16, perSource: 4 }).catch((e: Error) => {
          if (!cancelled) setErrors((cur) => ({ ...cur, threatIntel: e.message }));
          return null;
        }),
        fetchAggregatedFeed(TECH_AI_SNAPSHOT_FEED_IDS, { limit: 16, perSource: 4 }).catch((e: Error) => {
          if (!cancelled) setErrors((cur) => ({ ...cur, techAi: e.message }));
          return null;
        }),
      ]);
      if (cancelled) return;
      if (r) setRansomware(r);
      if (t) setTelegram(t);
      if (o) setOnion(o);
      if (s) setScam(s);
      if (ti) setThreatIntel(ti);
      if (ta) setTechAi(ta);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const itemLimit = compact ? 3 : 4;
  const cardPad = compact ? 'p-3' : 'p-4';

  const recentVictims = useMemo(() => {
    if (!ransomware) return [];
    return ransomware.victims.filter((v) => withinWindow(v.discovered, 24)).slice(0, itemLimit);
  }, [ransomware, itemLimit]);

  const recentMessages = useMemo(() => {
    if (!telegram) return [];
    return telegram.items.slice(0, itemLimit);
  }, [telegram, itemLimit]);

  const reachablePct = onion ? Math.round((onion.reachable_count / Math.max(1, onion.groups.length)) * 100) : null;

  const recentScam = useMemo(() => {
    if (!scam) return [];
    return scam.items.slice(0, itemLimit);
  }, [scam, itemLimit]);

  const recentThreatIntel = useMemo(() => {
    if (!threatIntel) return [];
    return threatIntel.items.slice(0, itemLimit);
  }, [threatIntel, itemLimit]);

  const recentTechAi = useMemo(() => {
    if (!techAi) return [];
    return techAi.items.slice(0, itemLimit);
  }, [techAi, itemLimit]);

  const newRansomwareCount = useMemo(
    () => (ransomware ? ransomware.victims.filter((v) => isNewSince(v.discovered, lastVisit)).length : 0),
    [ransomware, lastVisit]
  );
  const newTelegramCount = useMemo(
    () => (telegram ? telegram.items.filter((m) => isNewSince(m.datetime, lastVisit)).length : 0),
    [telegram, lastVisit]
  );
  const newScamCount = useMemo(
    () => (scam ? scam.items.filter((it) => isNewSince(it.pubDate, lastVisit)).length : 0),
    [scam, lastVisit]
  );
  const newThreatIntelCount = useMemo(
    () => (threatIntel ? threatIntel.items.filter((it) => isNewSince(it.pubDate, lastVisit)).length : 0),
    [threatIntel, lastVisit]
  );
  const newTechAiCount = useMemo(
    () => (techAi ? techAi.items.filter((it) => isNewSince(it.pubDate, lastVisit)).length : 0),
    [techAi, lastVisit]
  );
  const totalNew = newRansomwareCount + newTelegramCount + newScamCount + newThreatIntelCount + newTechAiCount;

  // Per-card watchlist match counts — across the FULL response so the badge
  // reflects real matches, not just visible top-N.
  const watchedRansomware = useMemo(
    () =>
      ransomware
        ? ransomware.victims.filter(
            (v) => watchHits(`${v.victim} ${v.group} ${v.description ?? ''}`, watchlist).length > 0
          ).length
        : 0,
    [ransomware, watchlist]
  );
  const watchedTelegram = useMemo(
    () =>
      telegram
        ? telegram.items.filter((m) => watchHits(`${m.channel_name} ${m.text}`, watchlist).length > 0).length
        : 0,
    [telegram, watchlist]
  );
  const watchedOnion = useMemo(
    () => (onion ? onion.groups.filter((g) => watchHits(g.group, watchlist).length > 0).length : 0),
    [onion, watchlist]
  );
  const watchedScam = useMemo(
    () => (scam ? scam.items.filter((it) => watchHits(`${it.title} ${it.source}`, watchlist).length > 0).length : 0),
    [scam, watchlist]
  );
  const watchedThreatIntel = useMemo(
    () =>
      threatIntel
        ? threatIntel.items.filter((it) => watchHits(`${it.title} ${it.source}`, watchlist).length > 0).length
        : 0,
    [threatIntel, watchlist]
  );
  const watchedTechAi = useMemo(
    () =>
      techAi ? techAi.items.filter((it) => watchHits(`${it.title} ${it.source}`, watchlist).length > 0).length : 0,
    [techAi, watchlist]
  );
  const totalWatched =
    watchedRansomware + watchedTelegram + watchedOnion + watchedScam + watchedThreatIntel + watchedTechAi;

  return (
    <section className={mbClass}>
      {headerLabel !== null && (
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-display font-bold text-xl inline-flex items-center gap-2 flex-wrap">
            {headerLabel}
            {lastVisit > 0 && totalNew > 0 && (
              <span
                className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                title={`${totalNew} new items since your last visit`}
              >
                {totalNew} new since last visit
              </span>
            )}
            {watchlist.length > 0 && totalWatched > 0 && (
              <span
                className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                title={`${totalWatched} items match your watchlist (${watchlist.join(', ')})`}
              >
                {totalWatched} watchlist hits
              </span>
            )}
          </h2>
          {subtitle && <span className="text-[11px] font-mono text-slate-500 dark:text-slate-500">{subtitle}</span>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Ransomware activity */}
        <div
          className={`rounded-2xl border border-rose-500/30 bg-white dark:bg-slate-900 ${cardPad} flex flex-col min-h-[200px]`}
        >
          <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
            <h3 className="font-display font-semibold text-sm inline-flex items-center gap-1.5 flex-wrap">
              <Bell size={14} className="text-rose-600 dark:text-rose-400" /> Ransomware
              {lastVisit > 0 && <NewBadge count={newRansomwareCount} />}
              <WatchPill count={watchedRansomware} />
            </h3>
            <Link
              to="/dfir/darkweb"
              className="text-[10px] font-mono text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
            >
              feed <ExternalLink size={9} />
            </Link>
          </div>
          {errors.ransomware && <p className="text-[11px] font-mono text-rose-500">load error: {errors.ransomware}</p>}
          {!ransomware && !errors.ransomware && <p className="text-[11px] font-mono text-slate-500">loading…</p>}
          {ransomware && (
            <>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500 mb-2">
                <span className="text-slate-900 dark:text-slate-100 font-bold text-base">{recentVictims.length}</span>{' '}
                claims in last 24h · {ransomware.count} total tracked
              </p>
              {recentVictims.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500">No claims in the last 24 h.</p>
              ) : (
                <ul className="space-y-1.5 mt-1">
                  {recentVictims.map((v, i) => {
                    const isNew = isNewSince(v.discovered, lastVisit);
                    const matched = watchHits(`${v.victim} ${v.group} ${v.description ?? ''}`, watchlist);
                    return (
                      <li
                        key={`${v.group}-${v.victim}-${i}`}
                        className="flex items-baseline gap-2 text-[11px] font-mono py-0.5"
                      >
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                            matched.length > 0 ? 'bg-violet-500' : isNew ? 'bg-amber-500' : 'bg-transparent'
                          }`}
                          aria-label={
                            matched.length > 0
                              ? `watchlist match: ${matched.join(', ')}`
                              : isNew
                                ? 'new since last visit'
                                : undefined
                          }
                          title={matched.length > 0 ? `watchlist match: ${matched.join(', ')}` : undefined}
                        />
                        <span className="text-[9px] uppercase tracking-wider px-1 rounded border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 shrink-0">
                          {v.group}
                        </span>
                        <a
                          href={v.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 flex-1 min-w-0"
                          title={v.victim}
                        >
                          {v.victim}
                        </a>
                        <span className="text-slate-500 shrink-0">{shortRel(v.discovered)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Cybersec Telegram firehose — links to the DarkWeb panel which has the
            full filterable view; the Telegram catalog (/dfir/telegram-watch) is
            the channel-discovery surface, not the message stream. */}
        <div
          className={`rounded-2xl border border-sky-500/30 bg-white dark:bg-slate-900 ${cardPad} flex flex-col min-h-[200px]`}
        >
          <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
            <h3 className="font-display font-semibold text-sm inline-flex items-center gap-1.5">
              <Send size={14} className="text-sky-600 dark:text-sky-400" /> Cybersec Telegram firehose
              {lastVisit > 0 && <NewBadge count={newTelegramCount} />}
              <WatchPill count={watchedTelegram} />
            </h3>
            <Link
              to="/dfir/darkweb"
              className="text-[10px] font-mono text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
            >
              full feed <ExternalLink size={9} />
            </Link>
          </div>
          {errors.telegram && <p className="text-[11px] font-mono text-rose-500">load error: {errors.telegram}</p>}
          {!telegram && !errors.telegram && <p className="text-[11px] font-mono text-slate-500">loading…</p>}
          {telegram && (
            <>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500 mb-2">
                <span className="text-slate-900 dark:text-slate-100 font-bold text-base">{telegram.items.length}</span>{' '}
                posts · {telegram.channels.filter((c) => c.ok).length} channels live
              </p>
              {recentMessages.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500">No recent messages.</p>
              ) : (
                <ul className="space-y-1.5 mt-1">
                  {recentMessages.map((m) => {
                    const isNew = isNewSince(m.datetime, lastVisit);
                    const matched = watchHits(`${m.channel_name} ${m.text}`, watchlist);
                    return (
                      <li key={m.permalink} className="text-[11px] font-mono py-0.5">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                              matched.length > 0 ? 'bg-violet-500' : isNew ? 'bg-amber-500' : 'bg-transparent'
                            }`}
                            aria-label={
                              matched.length > 0
                                ? `watchlist match: ${matched.join(', ')}`
                                : isNew
                                  ? 'new since last visit'
                                  : undefined
                            }
                            title={matched.length > 0 ? `watchlist match: ${matched.join(', ')}` : undefined}
                          />
                          <a
                            href={m.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-display font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 truncate flex-1 min-w-0"
                          >
                            {m.channel_name}
                          </a>
                          <span className="text-slate-500 shrink-0">{shortRel(m.datetime)}</span>
                        </div>
                        {!compact && (
                          <p className="text-slate-500 dark:text-slate-500 line-clamp-1 break-all pl-3.5">{m.text}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Onion watch */}
        <div
          className={`rounded-2xl border border-violet-500/30 bg-white dark:bg-slate-900 ${cardPad} flex flex-col min-h-[200px]`}
        >
          <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
            <h3 className="font-display font-semibold text-sm inline-flex items-center gap-1.5 flex-wrap">
              <Globe2 size={14} className="text-violet-600 dark:text-violet-400" /> .onion reachability
              <WatchPill count={watchedOnion} />
            </h3>
            <Link
              to="/dfir/onion-watch"
              className="text-[10px] font-mono text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
            >
              full inventory <ExternalLink size={9} />
            </Link>
          </div>
          {errors.onion && <p className="text-[11px] font-mono text-rose-500">load error: {errors.onion}</p>}
          {!onion && !errors.onion && <p className="text-[11px] font-mono text-slate-500">loading…</p>}
          {onion && (
            <>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500 mb-2">
                <span className="text-slate-900 dark:text-slate-100 font-bold text-base">{onion.reachable_count}</span>/
                {onion.groups.length} groups reachable{reachablePct !== null && ` (${reachablePct}%)`} ·{' '}
                {onion.total_count} mirrors
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {onion.groups
                  .filter((g) => g.any_reachable)
                  .slice(0, compact ? 6 : 8)
                  .map((g) => {
                    const isWatched = watchHits(g.group, watchlist).length > 0;
                    return (
                      <Link
                        key={g.group}
                        to="/dfir/onion-watch"
                        className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          isWatched
                            ? 'border-violet-500/60 bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-500/25'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                        title={isWatched ? 'watchlist match' : undefined}
                      >
                        {g.group}
                      </Link>
                    );
                  })}
                {onion.reachable_count > (compact ? 6 : 8) && (
                  <span className="text-[10px] font-mono text-slate-500">
                    +{onion.reachable_count - (compact ? 6 : 8)} more
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Scam intel — FTC + IC3 official alerts */}
        <div
          className={`rounded-2xl border border-amber-500/30 bg-white dark:bg-slate-900 ${cardPad} flex flex-col min-h-[200px]`}
        >
          <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
            <h3 className="font-display font-semibold text-sm inline-flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" /> Scam intel
              {lastVisit > 0 && <NewBadge count={newScamCount} />}
              <WatchPill count={watchedScam} />
            </h3>
            <Link
              to="/dfir/scam-watch"
              className="text-[10px] font-mono text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
            >
              full feed <ExternalLink size={9} />
            </Link>
          </div>
          {errors.scam && <p className="text-[11px] font-mono text-rose-500">load error: {errors.scam}</p>}
          {!scam && !errors.scam && <p className="text-[11px] font-mono text-slate-500">loading…</p>}
          {scam && (
            <>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500 mb-2">
                <span className="text-slate-900 dark:text-slate-100 font-bold text-base">{scam.total_items}</span>{' '}
                official alerts · FTC + IC3
              </p>
              {recentScam.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500">No recent alerts.</p>
              ) : (
                <ul className="space-y-1.5 mt-1">
                  {recentScam.map((it) => {
                    const isNew = isNewSince(it.pubDate, lastVisit);
                    const matched = watchHits(`${it.title} ${it.source}`, watchlist);
                    return (
                      <li key={it.guid ?? it.link} className="text-[11px] font-mono py-0.5">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                              matched.length > 0 ? 'bg-violet-500' : isNew ? 'bg-amber-500' : 'bg-transparent'
                            }`}
                            aria-label={
                              matched.length > 0
                                ? `watchlist match: ${matched.join(', ')}`
                                : isNew
                                  ? 'new since last visit'
                                  : undefined
                            }
                            title={matched.length > 0 ? `watchlist match: ${matched.join(', ')}` : undefined}
                          />
                          <a
                            href={it.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-display font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 truncate flex-1 min-w-0"
                            title={it.title}
                          >
                            {it.title}
                          </a>
                          <span className="text-slate-500 shrink-0">{shortRel(it.pubDate)}</span>
                        </div>
                        {!compact && <p className="text-slate-500 dark:text-slate-500 truncate pl-3.5">{it.source}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Threat-intel firehose — BleepingComputer + Krebs + DFIR Report + SecurityWeek */}
        <div
          className={`rounded-2xl border border-emerald-500/30 bg-white dark:bg-slate-900 ${cardPad} flex flex-col min-h-[200px]`}
        >
          <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
            <h3 className="font-display font-semibold text-sm inline-flex items-center gap-1.5">
              <Newspaper size={14} className="text-emerald-600 dark:text-emerald-400" /> Threat intel
              {lastVisit > 0 && <NewBadge count={newThreatIntelCount} />}
              <WatchPill count={watchedThreatIntel} />
            </h3>
            <Link
              to="/dfir/threat-feeds"
              className="text-[10px] font-mono text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
            >
              full feeds <ExternalLink size={9} />
            </Link>
          </div>
          {errors.threatIntel && (
            <p className="text-[11px] font-mono text-rose-500">load error: {errors.threatIntel}</p>
          )}
          {!threatIntel && !errors.threatIntel && <p className="text-[11px] font-mono text-slate-500">loading…</p>}
          {threatIntel && (
            <>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500 mb-2">
                <span className="text-slate-900 dark:text-slate-100 font-bold text-base">
                  {threatIntel.total_items}
                </span>{' '}
                posts · BleepingComputer · Krebs · DFIR Report · SecurityWeek
              </p>
              {recentThreatIntel.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500">No recent posts.</p>
              ) : (
                <ul className="space-y-1.5 mt-1">
                  {recentThreatIntel.map((it) => {
                    const isNew = isNewSince(it.pubDate, lastVisit);
                    const matched = watchHits(`${it.title} ${it.source}`, watchlist);
                    return (
                      <li key={it.guid ?? it.link} className="text-[11px] font-mono py-0.5">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                              matched.length > 0 ? 'bg-violet-500' : isNew ? 'bg-amber-500' : 'bg-transparent'
                            }`}
                            aria-label={
                              matched.length > 0
                                ? `watchlist match: ${matched.join(', ')}`
                                : isNew
                                  ? 'new since last visit'
                                  : undefined
                            }
                            title={matched.length > 0 ? `watchlist match: ${matched.join(', ')}` : undefined}
                          />
                          <a
                            href={it.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-display font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 truncate flex-1 min-w-0"
                            title={it.title}
                          >
                            {it.title}
                          </a>
                          <span className="text-slate-500 shrink-0">{shortRel(it.pubDate)}</span>
                        </div>
                        {!compact && <p className="text-slate-500 dark:text-slate-500 truncate pl-3.5">{it.source}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Tech & AI news — TechCrunch AI / VentureBeat AI / TechCrunch security / cybersec funding */}
        <div
          className={`rounded-2xl border border-fuchsia-500/30 bg-white dark:bg-slate-900 ${cardPad} flex flex-col min-h-[200px]`}
        >
          <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
            <h3 className="font-display font-semibold text-sm inline-flex items-center gap-1.5">
              <Sparkles size={14} className="text-fuchsia-600 dark:text-fuchsia-400" /> Tech &amp; AI
              {lastVisit > 0 && <NewBadge count={newTechAiCount} />}
              <WatchPill count={watchedTechAi} />
            </h3>
            <Link
              to="/dfir/tech-ai-news"
              className="text-[10px] font-mono text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
            >
              full feeds <ExternalLink size={9} />
            </Link>
          </div>
          {errors.techAi && <p className="text-[11px] font-mono text-rose-500">load error: {errors.techAi}</p>}
          {!techAi && !errors.techAi && <p className="text-[11px] font-mono text-slate-500">loading…</p>}
          {techAi && (
            <>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500 mb-2">
                <span className="text-slate-900 dark:text-slate-100 font-bold text-base">{techAi.total_items}</span>{' '}
                posts · AI labs · cyber funding · M&amp;A
              </p>
              {recentTechAi.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500">No recent posts.</p>
              ) : (
                <ul className="space-y-1.5 mt-1">
                  {recentTechAi.map((it) => {
                    const isNew = isNewSince(it.pubDate, lastVisit);
                    const matched = watchHits(`${it.title} ${it.source}`, watchlist);
                    return (
                      <li key={it.guid ?? it.link} className="text-[11px] font-mono py-0.5">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                              matched.length > 0 ? 'bg-violet-500' : isNew ? 'bg-amber-500' : 'bg-transparent'
                            }`}
                            aria-label={
                              matched.length > 0
                                ? `watchlist match: ${matched.join(', ')}`
                                : isNew
                                  ? 'new since last visit'
                                  : undefined
                            }
                            title={matched.length > 0 ? `watchlist match: ${matched.join(', ')}` : undefined}
                          />
                          <a
                            href={it.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-display font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 truncate flex-1 min-w-0"
                            title={it.title}
                          >
                            {it.title}
                          </a>
                          <span className="text-slate-500 shrink-0">{shortRel(it.pubDate)}</span>
                        </div>
                        {!compact && <p className="text-slate-500 dark:text-slate-500 truncate pl-3.5">{it.source}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
