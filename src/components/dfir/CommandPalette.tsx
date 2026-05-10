import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Command, ArrowRight } from 'lucide-react';
import { SECTIONS, type Tool } from './ToolGrid';

/**
 * Cmd+K command palette. Mounted globally in App.tsx so it's reachable
 * from every route. Opens on Cmd+K (Ctrl+K on Linux/Windows), closes on
 * Esc / outside-click / selection.
 *
 * Search is plain substring across (label + desc + section label),
 * AND-tokenised on whitespace. No fuzzy matching — substring is more
 * predictable for a list this small (~56 tools).
 *
 * Recently-visited tools are stored in localStorage and shown when the
 * palette opens with no query, so the second-time visitor lands on
 * their last 5 tools instantly.
 */

const RECENT_KEY = 'dfir.cmdk.recent';
const RECENT_MAX = 5;
const SHOW_LIMIT = 30;

interface FlatTool extends Tool {
  sectionLabel: string;
}

const ALL_TOOLS: FlatTool[] = SECTIONS.flatMap((s) => s.tools.map((t) => ({ ...t, sectionLabel: s.label })));

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((s) => typeof s === 'string').slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function pushRecent(path: string): void {
  try {
    const cur = loadRecent().filter((p) => p !== path);
    cur.unshift(path);
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, RECENT_MAX)));
  } catch {
    /* private mode / quota — silent */
  }
}

interface MatchedTool extends FlatTool {
  matchedBy: 'recent' | 'search';
}

function searchTools(query: string, recent: string[]): MatchedTool[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Show recent first, then a few popular defaults.
    const recentSet = new Set(recent);
    const recentTools = recent
      .map((p) => ALL_TOOLS.find((t) => t.path === p))
      .filter((t): t is FlatTool => Boolean(t))
      .map<MatchedTool>((t) => ({ ...t, matchedBy: 'recent' }));
    const fillers = ALL_TOOLS.filter((t) => !recentSet.has(t.path))
      .slice(0, SHOW_LIMIT - recentTools.length)
      .map<MatchedTool>((t) => ({ ...t, matchedBy: 'search' }));
    return [...recentTools, ...fillers];
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  return ALL_TOOLS.filter((t) => {
    const hay = `${t.label} ${t.desc} ${t.sectionLabel}`.toLowerCase();
    return tokens.every((tok) => hay.includes(tok));
  })
    .slice(0, SHOW_LIMIT)
    .map((t) => ({ ...t, matchedBy: 'search' }));
}

export function CommandPalette(): JSX.Element | null {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Open on Cmd+K / Ctrl+K. Close on Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (open && e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // When opening, hydrate recent + reset state + focus input.
  useEffect(() => {
    if (!open) return;
    setRecent(loadRecent());
    setQuery('');
    setActiveIdx(0);
    // Defer focus until after the input mounts in this render cycle.
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const matches = useMemo(() => searchTools(query, recent), [query, recent]);

  const select = useCallback(
    (path: string) => {
      pushRecent(path);
      setOpen(false);
      navigate(path);
    },
    [navigate]
  );

  // Arrow-key navigation.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const m = matches[activeIdx];
        if (m) select(m.path);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, matches, activeIdx, select]);

  // Reset active index when matches change.
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Scroll active item into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        aria-label="Close command palette"
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search size={18} className="text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${ALL_TOOLS.length} tools…`}
            className="flex-1 bg-transparent border-0 outline-none font-mono text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
            aria-label="Search tools"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <ul ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {matches.length === 0 && (
            <li className="px-4 py-3 text-sm font-mono text-slate-500 dark:text-slate-500">
              No tools match "{query}".
            </li>
          )}
          {matches.map((m, idx) => {
            const Icon = m.icon;
            const active = idx === activeIdx;
            return (
              <li key={m.path} data-idx={idx}>
                <button
                  type="button"
                  onClick={() => select(m.path)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                    active
                      ? 'bg-brand-500/10 text-slate-900 dark:text-slate-100'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-semibold text-sm truncate">{m.label}</span>
                      {m.matchedBy === 'recent' && (
                        <span className="text-[9px] uppercase tracking-wider px-1 rounded border border-cyan-500/30 bg-cyan-500/5 text-cyan-700 dark:text-cyan-300">
                          recent
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-500 truncate">
                      {m.sectionLabel} · {m.desc}
                    </div>
                  </div>
                  {active && <ArrowRight size={14} className="text-brand-600 dark:text-brand-400 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2 text-[10px] font-mono text-slate-500 dark:text-slate-500 flex items-center gap-3">
          <Command size={10} aria-hidden="true" />
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span className="ml-auto">⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
