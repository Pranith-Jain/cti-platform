import type { Context } from 'hono';
import type { Env } from '../env';

/**
 * GitHub OSINT proxy.
 *
 * Why proxy at all? Three reasons:
 *   1. Browser-direct calls to api.github.com get blocked by privacy
 *      extensions (uBlock list "Privacy Essentials" rejects cross-origin
 *      api.github.com from non-github.com origins) — manifests as
 *      "NetworkError when attempting to fetch resource."
 *   2. Pooling all requests through one Worker IP lets us add a GH_TOKEN
 *      secret to lift the 60/hr unauthenticated limit to 5,000/hr.
 *   3. Cache responses at the edge — user/repo/events JSON rarely changes
 *      hour-to-hour, so 5min cache cuts upstream load >90%.
 *
 * Endpoints multiplexed via ?kind=user|repos|events|commits and
 * ?username= / ?repo= / ?author= query params.
 */

const FETCH_TIMEOUT = 10_000;
const CACHE_TTL = 300; // 5 min
const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}$/;

type Kind = 'user' | 'repos' | 'events' | 'commits';

function buildUpstream(kind: Kind, args: { username?: string; repo?: string; author?: string }): string | null {
  switch (kind) {
    case 'user':
      if (!args.username) return null;
      return `https://api.github.com/users/${encodeURIComponent(args.username)}`;
    case 'repos':
      if (!args.username) return null;
      return `https://api.github.com/users/${encodeURIComponent(args.username)}/repos?per_page=100&sort=pushed&direction=desc`;
    case 'events':
      if (!args.username) return null;
      return `https://api.github.com/users/${encodeURIComponent(args.username)}/events/public?per_page=30`;
    case 'commits':
      if (!args.repo || !args.author) return null;
      return `https://api.github.com/repos/${args.repo}/commits?author=${encodeURIComponent(args.author)}&per_page=30`;
    default:
      return null;
  }
}

export async function githubReconHandler(c: Context<{ Bindings: Env & { GH_TOKEN?: string } }>): Promise<Response> {
  const kindRaw = (c.req.query('kind') ?? '').toLowerCase();
  if (kindRaw !== 'user' && kindRaw !== 'repos' && kindRaw !== 'events' && kindRaw !== 'commits') {
    return c.json({ error: 'kind must be user|repos|events|commits' }, 400);
  }
  const kind = kindRaw as Kind;
  const username = c.req.query('username')?.trim();
  const repo = c.req.query('repo')?.trim();
  const author = c.req.query('author')?.trim();

  if (username !== undefined && !USERNAME_RE.test(username)) {
    return c.json({ error: 'invalid username shape' }, 400);
  }
  if (repo !== undefined && !REPO_RE.test(repo)) {
    return c.json({ error: 'invalid repo shape (expected owner/name)' }, 400);
  }
  if (author !== undefined && !USERNAME_RE.test(author)) {
    return c.json({ error: 'invalid author shape' }, 400);
  }

  const upstream = buildUpstream(kind, { username, repo, author });
  if (!upstream) return c.json({ error: 'missing required query for this kind' }, 400);

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(
    `https://github-recon-cache.internal/v1?k=${kind}&u=${username ?? ''}&r=${encodeURIComponent(repo ?? '')}&a=${author ?? ''}`
  );
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'pranithjain-dfir/1.0',
    'x-github-api-version': '2022-11-28',
  };
  const ghToken = (c.env as { GH_TOKEN?: string }).GH_TOKEN;
  if (ghToken) headers.authorization = `Bearer ${ghToken}`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    const res = await fetch(upstream, { signal: ctrl.signal, headers });
    clearTimeout(timer);

    if (res.status === 404) return c.json({ error: 'not_found' }, 404);
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      return c.json(
        {
          error: 'github_rate_limited',
          ratelimit_remaining: remaining,
          authenticated: Boolean(ghToken),
        },
        429
      );
    }
    if (!res.ok) return c.json({ error: 'github_upstream_error', status: res.status }, 502);

    const body = await res.json();
    const response = c.json(body, 200, {
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
    });
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (e) {
    return c.json({ error: 'github_unreachable', detail: (e as Error).message }, 502);
  }
}
