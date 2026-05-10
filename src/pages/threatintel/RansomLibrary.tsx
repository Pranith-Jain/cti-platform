import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, ImageOff, Loader2, Search, Image as ImageIcon } from 'lucide-react';

interface Group {
  id: string;
  displayName: string;
  hasNote: boolean;
  noteUrl?: string;
  noteBytes?: number;
  hasScreenshot: boolean;
  screenshotUrl?: string;
  screenshotBytes?: number;
  lastModified?: string;
}

interface CatalogResponse {
  generated_at: string;
  source: string;
  total_groups: number;
  with_note: number;
  with_screenshot: number;
  with_both: number;
  groups: Group[];
}

type Filter = 'all' | 'note' | 'screenshot' | 'both';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  note: 'Note only',
  screenshot: 'Screenshot only',
  both: 'Note + screenshot',
};

export default function RansomLibrary(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [filter, setFilter] = useState<Filter>((searchParams.get('f') as Filter) ?? 'all');
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('g'));
  const [noteText, setNoteText] = useState<string | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [screenshotErrored, setScreenshotErrored] = useState(false);

  // Fetch catalog once on mount.
  useEffect(() => {
    fetch('/api/v1/ransom-library')
      .then((r) => {
        if (!r.ok) throw new Error(`upstream ${r.status}`);
        return r.json() as Promise<CatalogResponse>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Sync filters → URL so a curated view is shareable.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (query.trim()) out.set('q', query.trim());
        else out.delete('q');
        if (filter !== 'all') out.set('f', filter);
        else out.delete('f');
        if (selectedId) out.set('g', selectedId);
        else out.delete('g');
        return out;
      },
      { replace: true }
    );
  }, [query, filter, selectedId, setSearchParams]);

  // When selection changes, fetch the note text directly from the upstream
  // (CORS-open). Reset image error so a previously-broken thumb retries.
  useEffect(() => {
    setScreenshotErrored(false);
    if (!selectedId || !data) {
      setNoteText(null);
      return;
    }
    const group = data.groups.find((g) => g.id === selectedId);
    if (!group?.hasNote) {
      setNoteText(null);
      return;
    }
    // Fetch via the worker proxy — same-origin keeps CSP `connect-src` tight
    // and gives us 6h edge-cache on the note bytes for free.
    setNoteLoading(true);
    setNoteError(null);
    fetch(`/api/v1/ransom-note?group=${encodeURIComponent(group.id)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`upstream ${r.status}`);
        return r.text();
      })
      .then(setNoteText)
      .catch((e: Error) => setNoteError(e.message))
      .finally(() => setNoteLoading(false));
  }, [selectedId, data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.groups.filter((g) => {
      if (filter === 'note' && !g.hasNote) return false;
      if (filter === 'screenshot' && !g.hasScreenshot) return false;
      if (filter === 'both' && (!g.hasNote || !g.hasScreenshot)) return false;
      if (!q) return true;
      return g.displayName.toLowerCase().includes(q) || g.id.includes(q);
    });
  }, [data, query, filter]);

  const selected = useMemo(
    () => (selectedId && data ? (data.groups.find((g) => g.id === selectedId) ?? null) : null),
    [selectedId, data]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 text-slate-900 dark:text-slate-100">
      <Link
        to="/threatintel"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 mb-8 font-mono"
      >
        <ArrowLeft size={14} /> /threatintel
      </Link>

      <div className="animate-fade-in-up">
        <h1 className="text-4xl font-display font-bold mb-2 inline-flex items-center gap-3">
          <FileText size={28} className="text-brand-600 dark:text-brand-400" /> Ransom Note Library
        </h1>
        <p className="text-slate-600 dark:text-slate-400 font-mono mb-2 max-w-3xl">
          Searchable catalogue of ransomware groups with transcripts of their ransom notes and leak-site landing-page
          screenshots. Click a row to open the note text + screenshot inline.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 font-mono mb-8">
          Source:{' '}
          <a
            href="https://www.mythreatintel.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            mythreatintel.com
          </a>{' '}
          — note text and screenshots load directly from the source. The portfolio worker only catalogues which files
          exist + cross-references the two listings (there is no rate limit-able RSS, hence this approach).
        </p>
      </div>

      {loading && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex items-center gap-3 font-mono text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> loading catalogue from /api/v1/ransom-library…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 p-4 font-mono text-sm text-rose-600 dark:text-rose-300">
          Error loading catalogue: {error}
        </div>
      )}

      {data && (
        <>
          {/* Search + filter */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-6">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by group name — e.g. 'lockbit', 'akira', 'cl0p'"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-sm focus:outline-none focus:border-brand-500 dark:focus:border-brand-400"
                aria-label="Search ransomware groups"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span className="text-[11px] font-mono text-slate-500 mr-1">show:</span>
              {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
                const active = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`text-[11px] font-mono px-2 py-1 rounded border ${
                      active
                        ? 'border-brand-500/40 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                        : 'border-slate-300 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {FILTER_LABELS[f]}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] font-mono text-slate-500 mt-3">
              {data.total_groups} groups indexed · {data.with_note} with notes · {data.with_screenshot} with screenshots
              · {data.with_both} with both · catalogue cached 6h · last refreshed{' '}
              {new Date(data.generated_at).toLocaleString()}
            </p>
          </section>

          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500 mb-4">
            Showing {filtered.length} of {data.total_groups}
          </p>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Group list */}
            <ul className="grid gap-2 content-start">
              {filtered.map((g) => {
                const active = selectedId === g.id;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(g.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        active
                          ? 'border-brand-500/60 bg-brand-500/5'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500/40'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {g.displayName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{g.id}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {g.hasNote && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                            <FileText size={9} /> note
                          </span>
                        )}
                        {g.hasScreenshot && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 inline-flex items-center gap-1">
                            <ImageIcon size={9} /> screenshot
                          </span>
                        )}
                        {g.lastModified && (
                          <span className="text-[10px] font-mono text-slate-400 ml-auto">{g.lastModified}</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Detail panel */}
            <aside className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto">
              {!selected && (
                <div className="text-center py-12 text-sm font-mono text-slate-500">
                  Select a group from the list to view its ransom note + leak-site screenshot.
                </div>
              )}
              {selected && (
                <>
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <h2 className="font-display font-bold text-xl">{selected.displayName}</h2>
                    <span className="text-[10px] font-mono text-slate-400">{selected.id}</span>
                  </div>

                  {selected.hasScreenshot && selected.screenshotUrl && !screenshotErrored && (
                    <a
                      href={selected.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mb-4 rounded border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-brand-500/40"
                      title="Open full screenshot in new tab"
                    >
                      <img
                        src={selected.screenshotUrl}
                        alt={`${selected.displayName} leak-site landing page screenshot`}
                        className="w-full h-auto"
                        loading="lazy"
                        onError={() => setScreenshotErrored(true)}
                      />
                    </a>
                  )}
                  {selected.hasScreenshot && screenshotErrored && (
                    <div className="mb-4 p-3 rounded border border-amber-500/30 bg-amber-500/5 text-[11px] font-mono text-amber-700 dark:text-amber-300 inline-flex items-center gap-2">
                      <ImageOff size={12} /> screenshot listed in source index but failed to load
                    </div>
                  )}

                  {selected.hasNote && (
                    <>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                        <span>Ransom note transcript</span>
                        {selected.noteUrl && (
                          <a
                            href={selected.noteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline normal-case tracking-normal"
                          >
                            raw <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                      {noteLoading && (
                        <div className="text-sm font-mono text-slate-500 inline-flex items-center gap-2">
                          <Loader2 size={12} className="animate-spin" /> loading note text…
                        </div>
                      )}
                      {noteError && (
                        <div className="text-sm font-mono text-rose-600 dark:text-rose-300">
                          Error loading note: {noteError}
                        </div>
                      )}
                      {noteText && (
                        <pre className="text-[12px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed border-l-2 border-slate-200 dark:border-slate-800 pl-3 max-h-[60vh] overflow-y-auto">
                          {noteText}
                        </pre>
                      )}
                    </>
                  )}
                  {!selected.hasNote && (
                    <p className="text-sm font-mono text-slate-500 italic">
                      No ransom-note transcript indexed for this group (screenshot only).
                    </p>
                  )}
                </>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
