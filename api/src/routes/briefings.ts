import type { Context } from 'hono';
import type { Env } from '../env';
import {
  buildBriefing,
  listBriefings,
  readBriefing,
  sweepOldBriefings,
  writeBriefing,
  type BriefingType,
} from '../lib/briefing-builder';

function kvOrError(c: Context<{ Bindings: Env }>): KVNamespace | null {
  const kv = c.env.BRIEFINGS;
  if (!kv) return null;
  return kv;
}

export async function listBriefingsHandler(c: Context<{ Bindings: Env }>) {
  const kv = kvOrError(c);
  if (!kv) return c.json({ error: 'briefings KV not bound' }, 503);
  const typeRaw = c.req.query('type');
  const type = typeRaw === 'daily' || typeRaw === 'weekly' ? (typeRaw as BriefingType) : undefined;
  const limitRaw = c.req.query('limit');
  const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 20, 1), 100) : 20;
  const items = await listBriefings(kv, { type, limit });
  return c.json({ items }, 200, { 'cache-control': 'public, max-age=300, s-maxage=600' });
}

export async function getBriefingHandler(c: Context<{ Bindings: Env }>) {
  const kv = kvOrError(c);
  if (!kv) return c.json({ error: 'briefings KV not bound' }, 503);
  const slug = c.req.param('slug');
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return c.json({ error: 'invalid slug' }, 400);
  }
  const briefing = await readBriefing(kv, slug);
  if (!briefing) return c.json({ error: 'not found' }, 404);
  return c.json(briefing, 200, { 'cache-control': 'public, max-age=600, s-maxage=1800' });
}

export async function todayBriefingHandler(c: Context<{ Bindings: Env }>) {
  const kv = kvOrError(c);
  if (!kv) return c.json({ error: 'briefings KV not bound' }, 503);
  // "today's" briefing covers the previous calendar day (latest fully-closed window)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400_000);
  const slug = `daily-${yesterday.toISOString().slice(0, 10)}`;
  const briefing = await readBriefing(kv, slug);
  if (!briefing) return c.json({ error: 'not yet generated', slug }, 404);
  return c.json(briefing, 200, { 'cache-control': 'public, max-age=300' });
}

/**
 * Trigger an on-demand briefing build. Authenticated via a static admin token
 * passed as ?token=... so the cron isn't the only path to populate KV.
 *
 * Set BRIEFINGS_ADMIN_TOKEN as a Worker secret. If unset, this handler is disabled.
 */
export async function buildBriefingHandler(c: Context<{ Bindings: Env & { BRIEFINGS_ADMIN_TOKEN?: string } }>) {
  const kv = kvOrError(c);
  if (!kv) return c.json({ error: 'briefings KV not bound' }, 503);
  const required = (c.env as { BRIEFINGS_ADMIN_TOKEN?: string }).BRIEFINGS_ADMIN_TOKEN;
  if (!required) return c.json({ error: 'admin endpoint disabled' }, 403);
  const token = c.req.query('token');
  if (token !== required) return c.json({ error: 'unauthorized' }, 401);

  const typeRaw = c.req.query('type');
  if (typeRaw !== 'daily' && typeRaw !== 'weekly') {
    return c.json({ error: 'type must be daily or weekly' }, 400);
  }
  const briefing = await buildBriefing(typeRaw as BriefingType);
  await writeBriefing(kv, briefing);
  return c.json({ ok: true, slug: briefing.slug, stats: briefing.stats }, 200);
}

/**
 * Admin backfill — generate the past N daily briefings + last M weekly briefings.
 * Useful on first deploy to populate the list page.
 *
 * POST /api/v1/briefings/backfill?days=14&weeks=3&token=...
 */
export async function backfillBriefingsHandler(c: Context<{ Bindings: Env & { BRIEFINGS_ADMIN_TOKEN?: string } }>) {
  const kv = kvOrError(c);
  if (!kv) return c.json({ error: 'briefings KV not bound' }, 503);
  const required = (c.env as { BRIEFINGS_ADMIN_TOKEN?: string }).BRIEFINGS_ADMIN_TOKEN;
  if (!required) return c.json({ error: 'admin endpoint disabled' }, 403);
  const token = c.req.query('token');
  if (token !== required) return c.json({ error: 'unauthorized' }, 401);

  const days = Math.min(Math.max(parseInt(c.req.query('days') ?? '14', 10) || 14, 0), 21);
  const weeks = Math.min(Math.max(parseInt(c.req.query('weeks') ?? '3', 10) || 3, 0), 4);

  const writtenDaily: string[] = [];
  const writtenWeekly: string[] = [];

  // Walk back day-by-day from today (anchor = today; builder produces previous-day briefing)
  for (let i = 0; i < days; i += 1) {
    const anchor = new Date(Date.now() - i * 86400_000);
    try {
      const briefing = await buildBriefing('daily', anchor);
      await writeBriefing(kv, briefing);
      writtenDaily.push(briefing.slug);
    } catch {
      /* skip and continue */
    }
  }

  // Walk back week-by-week (anchor = today; builder produces prior ISO week)
  for (let i = 0; i < weeks; i += 1) {
    const anchor = new Date(Date.now() - i * 7 * 86400_000);
    try {
      const briefing = await buildBriefing('weekly', anchor);
      await writeBriefing(kv, briefing);
      writtenWeekly.push(briefing.slug);
    } catch {
      /* skip */
    }
  }

  return c.json({ ok: true, daily: writtenDaily, weekly: writtenWeekly }, 200);
}

/** Admin sweep — delete briefings older than maxAgeDays (default 21). */
export async function sweepBriefingsHandler(c: Context<{ Bindings: Env & { BRIEFINGS_ADMIN_TOKEN?: string } }>) {
  const kv = kvOrError(c);
  if (!kv) return c.json({ error: 'briefings KV not bound' }, 503);
  const required = (c.env as { BRIEFINGS_ADMIN_TOKEN?: string }).BRIEFINGS_ADMIN_TOKEN;
  if (!required) return c.json({ error: 'admin endpoint disabled' }, 403);
  const token = c.req.query('token');
  if (token !== required) return c.json({ error: 'unauthorized' }, 401);

  const maxAgeRaw = c.req.query('max_age_days');
  const maxAge = maxAgeRaw ? Math.max(parseInt(maxAgeRaw, 10) || 21, 1) : 21;
  const result = await sweepOldBriefings(kv, maxAge);
  return c.json({ ok: true, max_age_days: maxAge, ...result }, 200);
}
