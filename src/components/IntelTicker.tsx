import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Bloomberg-terminal-flavored live ticker that runs across the top of
 * every personal-portfolio page. Fetches a slim summary from the worker
 * endpoints I already operate — feed-status + cve-recent + ransomware-
 * recent — and surfaces the headline numbers as a continuous marquee.
 *
 * Falls back to static identity numbers (incidents, domains, inboxes,
 * response time) if the API isn't reachable, so the ticker is never
 * empty. Hover pauses the scroll. Reduced-motion users see a static
 * scrolling-stop row.
 *
 * This is the ONE memorable element on the personal portfolio. No other
 * portfolio runs live CTI signal across its chrome — it's distinctive
 * because it's true to the security-analyst identity, not because it's
 * styled to be loud.
 */

interface FeedStatusSummary {
  overall?: 'ok' | 'degraded' | 'down' | 'cold';
  rows?: Array<{ status: 'ok' | 'degraded' | 'down' | 'cold' }>;
}

interface CveItem {
  id?: string;
  cve_id?: string;
  severity?: string;
  score?: number;
  cvss?: number;
}

interface CveSummary {
  items?: CveItem[];
  count?: number;
}

interface RansomwareSummary {
  count?: number;
  groups?: Array<{ group: string; count: number }>;
}

interface TickerItem {
  /** Tailwind background-color class for the leading dot. */
  dot: string;
  /** Short label, e.g. "feeds". */
  label: string;
  /** Value, e.g. "17/17 healthy". */
  value: string;
  /** Optional in-app link. */
  href?: string;
}

const STATIC_ITEMS: TickerItem[] = [
  { dot: 'bg-brand-500', label: 'incidents', value: '250+ investigated' },
  { dot: 'bg-emerald-500', label: 'domains', value: '1,300+ secured · 98% auth' },
  { dot: 'bg-cyan-500', label: 'inboxes', value: '2,700+ monitored' },
  { dot: 'bg-amber-500', label: 'response', value: '<75 min mean' },
  { dot: 'bg-rose-500', label: 'focus', value: 'NHI · AI sec · MCP attack surface' },
];

const LIVE_LINKS = {
  feeds: '/threatintel/status',
  cve: '/threatintel/cve-list',
  ransomware: '/threatintel/ransomware-activity',
};

/** Best-effort fetch with a short timeout — never blocks the ticker. */
async function fetchWithTimeout<T>(url: string, timeoutMs = 3500): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function severityFromScore(score: number | undefined): string {
  if (typeof score !== 'number') return '';
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function buildLiveItems(
  feed: FeedStatusSummary | null,
  cve: CveSummary | null,
  rw: RansomwareSummary | null
): TickerItem[] {
  const out: TickerItem[] = [];

  if (feed && Array.isArray(feed.rows)) {
    const ok = feed.rows.filter((r) => r.status === 'ok').length;
    const total = feed.rows.length;
    if (total > 0) {
      const dot =
        feed.overall === 'ok'
          ? 'bg-emerald-500'
          : feed.overall === 'degraded'
            ? 'bg-amber-500'
            : feed.overall === 'cold'
              ? 'bg-slate-400'
              : 'bg-rose-500';
      out.push({ dot, label: 'feeds', value: `${ok}/${total} healthy`, href: LIVE_LINKS.feeds });
    }
  }

  if (cve && Array.isArray(cve.items) && cve.items.length > 0) {
    const top = cve.items[0]!;
    const id = (top.id || top.cve_id || '').toString();
    const score = typeof top.score === 'number' ? top.score : top.cvss;
    const sev = (top.severity || severityFromScore(score)).toString().toLowerCase();
    if (id) {
      const dot =
        sev === 'critical'
          ? 'bg-rose-500'
          : sev === 'high'
            ? 'bg-amber-500'
            : sev === 'medium'
              ? 'bg-cyan-500'
              : 'bg-slate-400';
      out.push({
        dot,
        label: 'latest CVE',
        value: `${id}${typeof score === 'number' ? ` · ${score.toFixed(1)} ${sev}` : sev ? ` · ${sev}` : ''}`,
        href: LIVE_LINKS.cve,
      });
    }
  }

  if (rw && typeof rw.count === 'number' && rw.count > 0) {
    out.push({
      dot: 'bg-rose-500',
      label: 'ransomware',
      value: `${rw.count} recent claims`,
      href: LIVE_LINKS.ransomware,
    });
  }

  return out;
}

function Item({ item }: { item: TickerItem }): JSX.Element {
  const content = (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${item.dot}`} aria-hidden="true" />
      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-500">
        {item.label}
      </span>
      <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">{item.value}</span>
    </span>
  );
  if (item.href) {
    return (
      <Link
        to={item.href}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-700 dark:hover:text-brand-300"
      >
        {content}
      </Link>
    );
  }
  return content;
}

export function IntelTicker(): JSX.Element {
  const [live, setLive] = useState<TickerItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [feed, cve, rw] = await Promise.all([
        fetchWithTimeout<FeedStatusSummary>('/api/v1/feed-status'),
        fetchWithTimeout<CveSummary>('/api/v1/cve-recent'),
        fetchWithTimeout<RansomwareSummary>('/api/v1/ransomware-recent'),
      ]);
      if (cancelled) return;
      setLive(buildLiveItems(feed, cve, rw));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live items first, static identity numbers second. If everything live
  // failed, the static row carries the section on its own.
  const items = [...live, ...STATIC_ITEMS];

  // Duplicate the items so the -50% translateX in `animate-scroll-horizontal`
  // produces a seamless loop. The keyframe scrolls one whole copy off-screen
  // exactly as the second copy reaches the original position.
  const row = (
    <div className="flex shrink-0 items-center gap-6 px-3 sm:gap-8 sm:px-4">
      {items.map((item, i) => (
        <span key={`${item.label}-${item.value}-${i}`} className="inline-flex items-center gap-2">
          <Item item={item} />
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            ·
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className="relative z-40 border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95"
      role="status"
      aria-label="Live intel ticker"
      aria-live="off"
    >
      <div className="group flex h-7 items-center overflow-hidden">
        {/* Left mono anchor — fixed, not scrolling */}
        <div className="hidden shrink-0 items-center gap-1.5 border-r border-slate-200 px-3 dark:border-slate-800 sm:flex">
          <span className="relative inline-flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
            live intel
          </span>
        </div>

        {/* Scrolling viewport */}
        <div
          className="flex min-w-0 flex-1 animate-scroll-horizontal items-center whitespace-nowrap will-change-transform group-hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:overflow-x-auto"
          aria-hidden="false"
        >
          {row}
          {row}
        </div>
      </div>
    </div>
  );
}
