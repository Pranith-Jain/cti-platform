import type { Context } from 'hono';
import type { Env } from '../env';

/**
 * Ransom-note library — catalogues mythreatintel.com's open directory of
 *   - `/rescate/<group>.txt`     (text transcripts of historical ransom notes)
 *   - `/screenshots/<group>.png` (leak-site landing-page captures)
 *
 * Both are served from a plain Apache index, CORS-open. The note text is
 * fetched directly from the browser (CORS confirmed); screenshots load via
 * <img src=...> (no CORS needed for display).
 *
 * What this endpoint does:
 *   1. Pulls both directory indexes once per cache window.
 *   2. Parses filenames into (group_id, filename, sizeBytes, lastModified).
 *   3. Cross-references the two lists by NORMALIZED id — mythreatintel's
 *      naming is inconsistent ('akira.txt' vs 'AKIRA_RANSOMWARE.png' vs
 *      'BLACKBYTE.png'), so we lowercase + strip non-alphanum + drop
 *      common suffixes ('_ransomware', '_group', '_data', '-_new', '_x.x')
 *      to get a stable join key.
 *   4. Returns one canonical catalog the page can render straight into a
 *      grid. The note URL + screenshot URL are absolute (mythreatintel.com)
 *      so the browser fetches/renders them directly — we do not proxy
 *      bytes through this worker.
 *
 * Attribution: this is mythreatintel.com's data; the response includes the
 * source URL on every entry so the page can credit it.
 */

const NOTES_INDEX = 'https://www.mythreatintel.com/rescate/';
const SCREENSHOTS_INDEX = 'https://www.mythreatintel.com/screenshots/';
const CACHE_KEY = 'https://ransom-library-cache.internal/v2';
const CACHE_TTL_SECONDS = 6 * 3600; // 6h
const FETCH_TIMEOUT_MS = 15_000;
const UA = 'Mozilla/5.0 (compatible; pranithjain-dfir/1.0; +https://pranithjain.qzz.io)';

interface DirEntry {
  filename: string;
  sizeBytes: number;
  lastModified: string;
}

export interface RansomLibraryGroup {
  /** Normalised join key — lowercase, alphanum-only. */
  id: string;
  /** Best display name we can recover from the source filenames. */
  displayName: string;
  hasNote: boolean;
  noteUrl?: string;
  noteBytes?: number;
  hasScreenshot: boolean;
  screenshotUrl?: string;
  screenshotBytes?: number;
  /** ISO timestamp of the more-recent of (note, screenshot). */
  lastModified?: string;
}

export interface RansomLibraryResponse {
  generated_at: string;
  source: string;
  total_groups: number;
  with_note: number;
  with_screenshot: number;
  with_both: number;
  groups: RansomLibraryGroup[];
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'user-agent': UA, accept: 'text/html' },
      cf: { cacheTtl: 1800, cacheEverything: true },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Parse an Apache 2.x autoindex page. Each row looks like:
 *   <tr><td>...</td><td><a href="akira.txt">akira.txt</a></td>
 *   <td align="right">2026-04-27 13:55  </td>
 *   <td align="right">2.6K</td>...
 *
 * We extract (filename, lastModified, size) per row. Parent-directory
 * link is filtered out by checking the href doesn't start with '/'.
 */
function parseApacheIndex(html: string, ext: string): DirEntry[] {
  const out: DirEntry[] = [];
  // Split by <tr> for line-level parsing — autoindex emits one row per file.
  const rows = html.split(/<tr>/i);
  for (const row of rows) {
    // Match the file href (must end with the requested extension and not start with /).
    const hrefMatch = new RegExp(`href="([^"/]+\\.${ext})"`, 'i').exec(row);
    if (!hrefMatch) continue;
    const filename = hrefMatch[1];
    const dateMatch = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/.exec(row);
    const sizeMatch = /align="right">\s*([\d.]+[KMGB]?)\s*</.exec(
      // Skip the first td which holds the date — find the *second* right-aligned td.
      row.replace(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/, 'DATE')
    );
    out.push({
      filename,
      lastModified: dateMatch ? dateMatch[1] : '',
      sizeBytes: parseSize(sizeMatch?.[1] ?? '0'),
    });
  }
  return out;
}

/** Apache autoindex emits sizes like "1.9K", "103K", "1.6M", "609K", "388 ". */
function parseSize(s: string): number {
  const m = /^([\d.]+)([KMGB]?)/.exec(s.trim());
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mult = m[2] === 'K' ? 1024 : m[2] === 'M' ? 1024 * 1024 : m[2] === 'G' ? 1024 ** 3 : 1;
  return Math.round(n * mult);
}

/**
 * Normalise a filename (without extension) into a stable join key. Strip
 * non-alphanum + lowercase + drop trailing version markers + drop common
 * mythreatintel suffixes the .txt/.png lists don't agree on.
 *
 *   "AKIRA_RANSOMWARE"   → "akira"
 *   "Kill_Security_3.0"  → "killsecurity"
 *   "INC_RANSOM_-_new"   → "incransom"
 *   "LAPSUS$_GROUP_(Data)" → "lapsus"
 *   "alphv"              → "alphv"
 */
function normaliseId(stem: string): string {
  let s = stem.toLowerCase();
  // Strip any parenthesised suffix — "(Data)", "(Old)", "(BASHEE)" etc.
  s = s.replace(/\([^)]*\)/g, '');
  // Drop trailing version markers — "_3.0", "_v2".
  s = s.replace(/[_-]?v?\d+(\.\d+)*$/g, '');
  // Drop common qualifier suffixes that disagree across the two listings.
  // 'locker' is the big one — abyss (screenshot) vs abysslocker (note),
  // avos vs avoslocker, blue vs bluelocker, etc. Avoid stripping 'cat'
  // / 'ware' / 'ransom' alone — they collide with real group names
  // (blackcat, scareware, etc).
  s = s.replace(/[_-]?(ransomware|locker|group|data|new|old|leaks?|team)$/g, '');
  // Strip everything non-alphanum (drops _ - $ space etc).
  s = s.replace(/[^a-z0-9]/g, '');
  return s;
}

/** Strip extension and pretty-format an underscore filename for display. */
function displayNameFrom(filename: string): string {
  const stem = filename.replace(/\.(txt|png)$/i, '');
  // Replace _ with space, collapse runs, strip parens content if it's noise.
  return stem.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickLater(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/** Pure-data fetcher (composable for snapshot endpoints later if useful). */
export async function fetchRansomLibrary(): Promise<RansomLibraryResponse> {
  const [notesHtml, screensHtml] = await Promise.all([fetchText(NOTES_INDEX), fetchText(SCREENSHOTS_INDEX)]);

  if (!notesHtml && !screensHtml) {
    throw new Error('mythreatintel.com indexes both unreachable');
  }

  const notes = notesHtml ? parseApacheIndex(notesHtml, 'txt') : [];
  const screens = screensHtml ? parseApacheIndex(screensHtml, 'png') : [];

  const groups = new Map<string, RansomLibraryGroup>();

  for (const n of notes) {
    const stem = n.filename.replace(/\.txt$/i, '');
    const id = normaliseId(stem);
    if (!id) continue;
    const display = displayNameFrom(n.filename);
    const existing = groups.get(id);
    groups.set(id, {
      id,
      displayName: existing?.displayName ?? display,
      hasNote: true,
      noteUrl: NOTES_INDEX + n.filename,
      noteBytes: n.sizeBytes,
      hasScreenshot: existing?.hasScreenshot ?? false,
      screenshotUrl: existing?.screenshotUrl,
      screenshotBytes: existing?.screenshotBytes,
      lastModified: pickLater(existing?.lastModified, n.lastModified),
    });
  }

  for (const s of screens) {
    const stem = s.filename.replace(/\.png$/i, '');
    const id = normaliseId(stem);
    if (!id) continue;
    const display = displayNameFrom(s.filename);
    const existing = groups.get(id);
    if (existing) {
      // Prefer the more-readable display name (longer one usually has the casing).
      const better = display.length > existing.displayName.length ? display : existing.displayName;
      groups.set(id, {
        ...existing,
        displayName: better,
        hasScreenshot: true,
        screenshotUrl: SCREENSHOTS_INDEX + s.filename,
        screenshotBytes: s.sizeBytes,
        lastModified: pickLater(existing.lastModified, s.lastModified),
      });
    } else {
      groups.set(id, {
        id,
        displayName: display,
        hasNote: false,
        hasScreenshot: true,
        screenshotUrl: SCREENSHOTS_INDEX + s.filename,
        screenshotBytes: s.sizeBytes,
        lastModified: s.lastModified,
      });
    }
  }

  const arr = Array.from(groups.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    generated_at: new Date().toISOString(),
    source: 'https://www.mythreatintel.com/',
    total_groups: arr.length,
    with_note: arr.filter((g) => g.hasNote).length,
    with_screenshot: arr.filter((g) => g.hasScreenshot).length,
    with_both: arr.filter((g) => g.hasNote && g.hasScreenshot).length,
    groups: arr,
  };
}

export async function ransomLibraryHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheReq = new Request(CACHE_KEY);
  const cached = await cache.match(cacheReq);
  if (cached) return cached;

  const body = await fetchRansomLibrary();
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': `public, max-age=${CACHE_TTL_SECONDS}`,
    },
  });
  c.executionCtx.waitUntil(cache.put(cacheReq, response.clone()));
  return response;
}

/**
 * Per-note proxy. The frontend cannot fetch mythreatintel.com directly
 * because the worker's CSP `connect-src` is locked to same-origin. We
 * proxy the .txt body through this endpoint so CSP stays tight, and we
 * get edge-caching of the note bytes as a side effect.
 *
 * `group` is the normalised id from /api/v1/ransom-library; we resolve it
 * back to the upstream filename via the catalog (also cached). Refusing
 * arbitrary upstream paths is intentional — without the catalog lookup
 * step a caller could point this proxy at any URL on mythreatintel.com.
 */
export async function ransomNoteHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  const id = (c.req.query('group') ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!id) return c.text('missing ?group=<id>', 400);

  const cache = (caches as unknown as { default: Cache }).default;
  const noteCacheKey = new Request(`https://ransom-note-cache.internal/v1/${id}`);
  const cached = await cache.match(noteCacheKey);
  if (cached) return cached;

  // Resolve id → filename via the catalog (which is itself cached 6h).
  const catalog = await fetchRansomLibrary();
  const group = catalog.groups.find((g) => g.id === id);
  if (!group?.noteUrl) return c.text('note not found for group', 404);

  const upstream = await fetch(group.noteUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'user-agent': UA, accept: 'text/plain' },
    cf: { cacheTtl: CACHE_TTL_SECONDS, cacheEverything: true },
  });
  if (!upstream.ok) return c.text(`upstream ${upstream.status}`, 502);
  const text = await upstream.text();

  const response = new Response(text, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': `public, max-age=${CACHE_TTL_SECONDS}`,
      'x-source': 'mythreatintel.com',
    },
  });
  c.executionCtx.waitUntil(cache.put(noteCacheKey, response.clone()));
  return response;
}
