import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface NavItem {
  label: string;
  to: string;
  exact?: boolean;
}

const TI_NAV: NavItem[] = [
  { label: 'Overview', to: '/threatintel', exact: true },
  { label: 'Live', to: '/threatintel/live-iocs' },
  { label: 'Pulse', to: '/threatintel/pulse' },
  { label: 'Correlation', to: '/threatintel/correlation' },
  { label: 'Actors', to: '/threatintel/actor-timeline' },
  { label: 'Writeups', to: '/threatintel/writeups' },
  { label: 'Metrics', to: '/threatintel/metrics' },
  { label: 'Status', to: '/threatintel/status' },
];

interface AppShellProps {
  isDark: boolean;
  onToggleTheme: () => void;
  children: React.ReactNode;
}

export function AppShell({ isDark, onToggleTheme, children }: AppShellProps): JSX.Element {
  const location = useLocation();
  const nav = TI_NAV;

  const isActive = (item: NavItem) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader nav={nav} isActive={isActive} isDark={isDark} onToggleTheme={onToggleTheme} />
      <main className="flex-1">{children}</main>
      <AppStatusBar />
    </div>
  );
}

function AppHeader({
  nav,
  isActive,
  isDark,
  onToggleTheme,
}: {
  nav: NavItem[];
  isActive: (item: NavItem) => boolean;
  isDark: boolean;
  onToggleTheme: () => void;
}): JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-surface-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-5">
        <Link
          to={nav[0]?.to ?? '/'}
          className="shrink-0 font-mono text-[11px] uppercase tracking-[0.22em] text-accent transition-colors duration-enter hover:text-brand-700"
        >
          THREAT INTEL
        </Link>

        <nav className="flex-1 hidden md:flex items-center gap-5 overflow-x-auto" aria-label="Tool navigation">
          {nav.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`text-[13px] font-medium tracking-tight whitespace-nowrap transition-colors duration-enter ${
                  active
                    ? 'text-ink-1 underline decoration-accent decoration-2 underline-offset-8'
                    : 'text-ink-2 hover:text-ink-1 hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-8'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 md:hidden font-mono text-[12px] text-ink-2 truncate">
          {nav.find((n) => isActive(n))?.label ?? '…'}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ThemeTogglePair isDark={isDark} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}

function ThemeTogglePair({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-baseline gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em]"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className={isDark ? 'text-ink-3' : 'text-accent'}>Light</span>
      <span aria-hidden="true" className="text-ink-3">
        /
      </span>
      <span className={isDark ? 'text-accent' : 'text-ink-3'}>Dark</span>
    </button>
  );
}

interface FeedStatusBrief {
  generated_at: string;
  overall: 'ok' | 'degraded' | 'down' | 'cold';
  rows: Array<{ id: string; status: 'ok' | 'degraded' | 'down' | 'cold' }>;
}

function AppStatusBar(): JSX.Element {
  const [status, setStatus] = useState<FeedStatusBrief | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch('/api/v1/feed-status');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as FeedStatusBrief;
        if (!cancelled) {
          setStatus(j);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    void load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <footer className="border-t border-rule bg-surface-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
        <div className="flex items-center gap-3">
          <StatusPip status={status} error={error} />
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/Pranith-Jain/Pranith-Jain.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-enter hover:text-accent"
          >
            github
          </a>
        </div>
      </div>
    </footer>
  );
}

function StatusPip({ status, error }: { status: FeedStatusBrief | null; error: string | null }): JSX.Element {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
        feed-status unreachable
      </span>
    );
  }
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-ink-3 animate-pulse" aria-hidden="true" />
        checking feeds…
      </span>
    );
  }
  const okCount = status.rows.filter((r) => r.status === 'ok').length;
  const total = status.rows.length;
  const pipCls =
    status.overall === 'ok'
      ? 'bg-emerald-500'
      : status.overall === 'degraded'
        ? 'bg-amber-500'
        : status.overall === 'cold'
          ? 'bg-ink-3'
          : 'bg-rose-500';
  const label =
    status.overall === 'ok'
      ? 'all feeds healthy'
      : status.overall === 'degraded'
        ? 'partial degradation'
        : status.overall === 'cold'
          ? 'cold caches at this edge'
          : 'feeds offline';
  return (
    <Link
      to="/threatintel/status"
      className="inline-flex items-center gap-1.5 transition-colors duration-enter hover:text-accent"
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${pipCls}`} aria-hidden="true" />
      {okCount}/{total} feeds · {label}
    </Link>
  );
}
