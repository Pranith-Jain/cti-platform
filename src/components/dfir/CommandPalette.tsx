import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Command, ArrowRight, Loader2 } from 'lucide-react';
import { SECTIONS, type Tool } from './ToolGrid';
import {
  loadCatalogIndex,
  KIND_LABEL,
  KIND_PILL,
  KIND_PRIORITY,
  type SearchEntry,
  type SearchKind,
} from '../../data/dfir/searchable-content';

/**
 * Cmd+K command palette. Mounted globally in App.tsx so it's reachable
 * from every route. Opens on Cmd+K (Ctrl+K on Linux/Windows), closes on
 * Esc / outside-click / selection.
 *
 * Search index has two layers:
 *   - Tools (61, synchronous) — the SECTIONS tile grid. Available the
 *     instant the palette opens.
 *   - Catalog content (~340 lazy, async) — wiki articles, Telegram
 *     channels, Discord servers, SecOps catalog, CVE resources, threat
 *     actors. Loaded once on first palette open and cached.
 *
 * Substring search, AND-tokenised on whitespace. Results sort by KIND_PRIORITY
 * (tools → wiki → actors → telegram → discord → cve → secops) so the most
 * action-oriented hits surface first. A kind-filter chip row narrows the
 * result space when the index gets large.
 *
 * Recently-visited paths are stored in localStorage and shown when the
 * palette opens with no query.
 */

const RECENT_KEY = 'dfir.cmdk.recent';
const RECENT_MAX = 5;
const SHOW_LIMIT = 40;

interface FlatTool extends Tool {
  sectionLabel: string;
}

const TOOLS_FLAT: FlatTool[] = SECTIONS.flatMap((s) => s.tools.map((t) => ({ ...t, sectionLabel: s.label })));

/** Tools converted into the unified SearchEntry shape so the index is uniform. */
const TOOL_ENTRIES: SearchEntry[] = TOOLS_FLAT.map((t) => ({
  kind: 'tool',
  label: t.label,
  desc: t.desc,
  path: t.path,
  sectionLabel: t.sectionLabel,
}));

/** Path → icon component, populated from ToolGrid for the tool-kind rows. */
const TOOL_ICONS = new Map(TOOLS_FLAT.map((t) => [t.path, t.icon]));

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

interface MatchedEntry extends SearchEntry {
  matchedBy: 'recent' | 'search';
}

function searchEntries(
  query: string,
  recent: string[],
  index: SearchEntry[],
  kindFilter: SearchKind | null
): MatchedEntry[] {
  const q = query.trim().toLowerCase();
  const filtered = kindFilter ? index.filter((e) => e.kind === kindFilter) : index;

  if (!q) {
    // No query: show recent paths first (only if they're in the current
    // filter), then fillers from the filtered set.
    const recentSet = new Set(recent);
    const recentEntries = recent
      .map((p) => filtered.find((e) => e.path === p))
      .filter((e): e is SearchEntry => Boolean(e))
      .map<MatchedEntry>((e) => ({ ...e, matchedBy: 'recent' }));
    const fillers = filtered
      .filter((e) => !recentSet.has(e.path))
      .sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind])
      .slice(0, SHOW_LIMIT - recentEntries.length)
      .map<MatchedEntry>((e) => ({ ...e, matchedBy: 'search' }));
    return [...recentEntries, ...fillers];
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  return filtered
    .filter((e) => {
      const hay = `${e.label} ${e.desc} ${e.sectionLabel}`.toLowerCase();
      return tokens.every((tok) => hay.includes(tok));
    })
    .sort((a, b) => {
      // Primary sort: kind priority. Within same kind, prefer earlier label
      // matches (so a query "ioc" surfaces "IOC Checker" before "IOC Extractor").
      const dk = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
      if (dk !== 0) return dk;
      const aIdx = a.label.toLowerCase().indexOf(tokens[0]);
      const bIdx = b.label.toLowerCase().indexOf(tokens[0]);
      const ax = aIdx < 0 ? 999 : aIdx;
      const bx = bIdx < 0 ? 999 : bIdx;
      return ax - bx;
    })
    .slice(0, SHOW_LIMIT)
    .map<MatchedEntry>((e) => ({ ...e, matchedBy: 'search' }));
}

const KIND_FILTER_ORDER: SearchKind[] = ['tool', 'wiki', 'actor', 'telegram', 'discord', 'cve', 'secops'];

export function CommandPalette(): JSX.Element | null {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<SearchEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<SearchKind | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const catalogLoadedRef = useRef(false);

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

  // When opening, hydrate recent + reset state + focus input + kick off
  // catalog lazy-load (only once per session).
  useEffect(() => {
    if (!open) return;
    setRecent(loadRecent());
    setQuery('');
    setActiveIdx(0);
    setKindFilter(null);
    setTimeout(() => inputRef.current?.focus(), 0);

    if (!catalogLoadedRef.current) {
      catalogLoadedRef.current = true;
      setCatalogLoading(true);
      void loadCatalogIndex()
        .then((entries) => setCatalog(entries))
        .finally(() => setCatalogLoading(false));
    }
  }, [open]);

  const fullIndex = useMemo<SearchEntry[]>(() => [...TOOL_ENTRIES, ...catalog], [catalog]);
  const matches = useMemo(
    () => searchEntries(query, recent, fullIndex, kindFilter),
    [query, recent, fullIndex, kindFilter]
  );

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

  // Reset active index when matches change (query / filter shift).
  useEffect(() => {
    setActiveIdx(0);
  }, [query, kindFilter]);

  // Scroll active item into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  if (!open) return null;

  // Counts per kind for the filter chip row, computed against the *full*
  // un-filtered index so the chip labels show the total per kind, not what
  // would survive the current chip's own filter.
  const kindCounts = new Map<SearchKind, number>();
  for (const e of fullIndex) kindCounts.set(e.kind, (kindCounts.get(e.kind) ?? 0) + 1);

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
            placeholder={`Search ${fullIndex.length} items — tools, wiki, channels, actors…`}
            className="flex-1 bg-transparent border-0 outline-none font-mono text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
            aria-label="Search"
          />
          {catalogLoading && (
            <Loader2 size={14} className="text-slate-400 animate-spin shrink-0" aria-label="Loading catalog index" />
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Kind filter chip row */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setKindFilter(null)}
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
              kindFilter === null
                ? 'border-brand-500/60 bg-brand-500/15 text-brand-700 dark:text-brand-300'
                : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:border-brand-500/40'
            }`}
          >
            all <span className="opacity-60">· {fullIndex.length}</span>
          </button>
          {KIND_FILTER_ORDER.map((k) => {
            const count = kindCounts.get(k) ?? 0;
            if (count === 0) return null;
            const active = kindFilter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(active ? null : k)}
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                  active
                    ? KIND_PILL[k]
                    : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:border-brand-500/40'
                }`}
              >
                {KIND_LABEL[k]} <span className="opacity-60">· {count}</span>
              </button>
            );
          })}
        </div>

        <ul ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
          {matches.length === 0 && (
            <li className="px-4 py-3 text-sm font-mono text-slate-500 dark:text-slate-500">
              No matches for "{query}".
            </li>
          )}
          {matches.map((m, idx) => {
            const Icon = m.kind === 'tool' ? TOOL_ICONS.get(m.path) : null;
            const active = idx === activeIdx;
            return (
              <li key={`${m.kind}:${m.path}`} data-idx={idx}>
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
                  {Icon ? (
                    <Icon size={16} className={active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'} />
                  ) : (
                    <span
                      className={`w-4 text-center text-[9px] font-mono uppercase tracking-wider ${
                        active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
                      }`}
                      aria-hidden="true"
                    >
                      {m.kind === 'wiki'
                        ? 'W'
                        : m.kind === 'telegram'
                          ? 'T'
                          : m.kind === 'discord'
                            ? 'D'
                            : m.kind === 'secops'
                              ? 'S'
                              : m.kind === 'cve'
                                ? 'C'
                                : m.kind === 'actor'
                                  ? 'A'
                                  : '·'}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-semibold text-sm truncate">{m.label}</span>
                      <span
                        className={`text-[9px] font-mono uppercase tracking-wider px-1 rounded border ${KIND_PILL[m.kind]} shrink-0`}
                      >
                        {KIND_LABEL[m.kind]}
                      </span>
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
