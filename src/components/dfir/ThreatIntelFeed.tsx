import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ExternalLink, RefreshCw, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAggregatedFeed, formatRelativeTime, type AggregatedFeedItem } from '../../services/rssService';
import {
  landingThreatGovernment,
  landingThreatVendor,
  landingThreatInvestigation,
  landingThreatReddit,
  landingThreatVulns,
  landingThreatNews,
  rssFeeds,
} from '../../data/rssFeeds';

type SectionId = 'gov' | 'vendor' | 'investigation' | 'reddit' | 'vulns' | 'news';

interface Section {
  id: SectionId;
  label: string;
  blurb: string;
  feedIds: string[];
  pillCls: string;
}

const SECTIONS: Section[] = [
  {
    id: 'gov',
    label: 'Government',
    blurb: 'CISA alerts, medical-device advisories, ICS-CERT.',
    feedIds: landingThreatGovernment,
    pillCls: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
  {
    id: 'vendor',
    label: 'Vendor research',
    blurb: 'Threat-research labs publishing IOCs, malware analysis, active campaigns.',
    feedIds: landingThreatVendor,
    pillCls: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  {
    id: 'investigation',
    label: 'Investigation & dark web',
    blurb: 'Long-form IR write-ups, leak-site posts, breach disclosures.',
    feedIds: landingThreatInvestigation,
    pillCls: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  {
    id: 'reddit',
    label: 'Reddit infosec',
    blurb: 'r/netsec, r/Malware, r/blueteamsec, r/threatintel.',
    feedIds: landingThreatReddit,
    pillCls: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  },
  {
    id: 'vulns',
    label: 'Vulns',
    blurb: 'CVE Details and Exploit-DB — fresh disclosures + PoCs.',
    feedIds: landingThreatVulns,
    pillCls: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
  {
    id: 'news',
    label: 'Security news',
    blurb: 'Independent press — Krebs, Bleeping, SecurityWeek, Schneier, Wired.',
    feedIds: landingThreatNews,
    pillCls: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
];

const ALL_LANDING_FEED_IDS = SECTIONS.flatMap((s) => s.feedIds);
const PER_SECTION_VISIBLE = 5;
const PER_SOURCE = 4;
const TOTAL_LIMIT = 250;

export function ThreatIntelFeed(): JSX.Element {
  const [items, setItems] = useState<AggregatedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<SectionId>('gov');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAggregatedFeed(ALL_LANDING_FEED_IDS, {
        limit: TOTAL_LIMIT,
        perSource: PER_SOURCE,
      });
      if (!data) {
        setError('feeds unavailable');
        setItems([]);
        return;
      }
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'feed unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const urlToSection = useMemo(() => {
    const map = new Map<string, SectionId>();
    for (const sec of SECTIONS) {
      for (const fid of sec.feedIds) {
        const url = rssFeeds.find((r) => r.id === fid)?.url;
        if (url) map.set(url, sec.id);
      }
    }
    return map;
  }, []);

  const bySection = useMemo(() => {
    const out: Record<SectionId, AggregatedFeedItem[]> = {
      gov: [],
      vendor: [],
      investigation: [],
      reddit: [],
      vulns: [],
      news: [],
    };
    for (const it of items) {
      const sec = urlToSection.get(it.source_url);
      if (sec) out[sec].push(it);
    }
    return out;
  }, [items, urlToSection]);

  const activeItems = bySection[active].slice(0, PER_SECTION_VISIBLE);
  const activeSection = SECTIONS.find((s) => s.id === active)!;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
          <Radio size={18} className="text-brand-600 dark:text-brand-400" />
          Threat Intel
        </h2>
        <div className="flex items-center gap-3">
          <Link
            to="/dfir/threat-feeds"
            className="text-xs font-mono text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
          >
            view all <ArrowRight size={12} />
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-label="refresh threat intel feed"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <RefreshCw size={12} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
            refresh
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setActive(sec.id)}
            className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
              active === sec.id
                ? sec.pillCls
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-500/40'
            }`}
          >
            {sec.label}
            <span className="opacity-60"> · {bySection[sec.id].length}</span>
          </button>
        ))}
      </div>

      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500 mb-3">{activeSection.blurb}</p>

      {loading && <p className="font-mono text-sm text-slate-600 dark:text-slate-400">Fetching…</p>}
      {error && <p className="font-mono text-sm text-rose-600 dark:text-rose-400">error: {error}</p>}

      {!loading && !error && activeItems.length === 0 && (
        <p className="font-mono text-sm text-slate-500 dark:text-slate-500">
          No items in this category right now. Try refresh.
        </p>
      )}

      {!loading && !error && activeItems.length > 0 && (
        <ul className="space-y-3">
          {activeItems.map((it) => (
            <li
              key={it.guid ?? it.link ?? `${it.title}-${it.pubDate}`}
              className="border-t border-slate-200 dark:border-slate-800 pt-3 first:border-t-0 first:pt-0"
            >
              <a href={it.link} target="_blank" rel="noopener noreferrer" className="group block">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {it.title || '(untitled)'}
                  </h3>
                  <ExternalLink size={12} className="text-slate-500 shrink-0 mt-1" />
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs font-mono text-slate-500">
                  {it.source && <span className="text-brand-600 dark:text-brand-400">{it.source}</span>}
                  {it.pubDate && <span>{formatRelativeTime(it.pubDate)}</span>}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
