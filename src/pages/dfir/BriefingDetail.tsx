import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, AlertTriangle, ShieldAlert } from 'lucide-react';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

interface BriefingFinding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  cvss?: number;
  source: string;
  source_url?: string;
  mitre_techniques: string[];
  added?: string;
  vendor?: string;
  product?: string;
}

interface BriefingSection {
  id: string;
  title: string;
  blurb: string;
  count: number;
  findings: BriefingFinding[];
}

interface IocEntry {
  type: string;
  value: string;
  context?: string;
  timestamp?: string;
}

interface BriefingStats {
  findings: number;
  sections: number;
  cves: number;
  kevs: number;
  iocs: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface Briefing {
  slug: string;
  type: 'daily' | 'weekly';
  title: string;
  date: string;
  date_range: string;
  range_start: string;
  range_end: string;
  generated_at: string;
  executive_summary: string;
  stats: BriefingStats;
  sections: BriefingSection[];
  iocs: { urls: IocEntry[]; domains: IocEntry[]; ipv4s: IocEntry[]; hashes: IocEntry[] };
  mitre_techniques: string[];
  sources: string[];
}

const SEVERITY_STYLES: Record<Severity, { chip: string; ring: string; label: string }> = {
  critical: {
    chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40',
    ring: 'ring-rose-500/40',
    label: 'CRIT',
  },
  high: {
    chip: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/40',
    ring: 'ring-orange-500/40',
    label: 'HIGH',
  },
  medium: {
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40',
    ring: 'ring-amber-500/40',
    label: 'MED',
  },
  low: {
    chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40',
    ring: 'ring-emerald-500/40',
    label: 'LOW',
  },
  unknown: {
    chip: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/40',
    ring: 'ring-slate-500/40',
    label: 'N/A',
  },
};

function StatPill({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-2xl font-display font-bold ${accent ?? 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  );
}

function MitreChip({ technique }: { technique: string }) {
  const href = `https://attack.mitre.org/techniques/${technique.replace('.', '/')}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-800 hover:border-brand-500/40 transition-colors"
    >
      {technique}
    </a>
  );
}

function FindingCard({ finding }: { finding: BriefingFinding }) {
  const sev = SEVERITY_STYLES[finding.severity];
  return (
    <article
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 ring-1 ${sev.ring}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-display font-bold text-base text-slate-900 dark:text-slate-100 leading-snug">
          {finding.title}
        </h4>
        <span
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${sev.chip} shrink-0`}
        >
          {sev.label}
          {finding.cvss !== undefined && ` · ${finding.cvss.toFixed(1)}`}
        </span>
      </div>
      {finding.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3 line-clamp-6">
          {finding.description}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
          {finding.source}
        </span>
        {finding.added && <span>added {finding.added}</span>}
        {finding.mitre_techniques.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {finding.mitre_techniques.map((t) => (
              <MitreChip key={t} technique={t} />
            ))}
          </span>
        )}
        {finding.source_url && (
          <a
            href={finding.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline ml-auto"
          >
            details <ExternalLink size={11} />
          </a>
        )}
      </div>
    </article>
  );
}

function IocTable({ title, entries }: { title: string; entries: IocEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
        {title} <span className="text-slate-400 font-normal">({entries.length})</span>
      </h3>
      <div className="space-y-1.5 font-mono text-xs">
        {entries.map((e, i) => (
          <Link
            key={`${e.value}-${i}`}
            to={`/dfir/ioc-check?indicator=${encodeURIComponent(e.value)}`}
            className="block px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 truncate"
            title={e.context}
          >
            {e.value}
            {e.context && <span className="text-slate-400 ml-2">— {e.context}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function BriefingDetail(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/v1/briefings/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `${r.status}`);
        }
        return (await r.json()) as Briefing;
      })
      .then(setBriefing)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-8 py-16 font-mono text-sm text-slate-500">Loading briefing…</div>;
  }
  if (error || !briefing) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-16">
        <Link to="/dfir/briefings" className="inline-flex items-center gap-2 text-sm text-slate-500 mb-6 font-mono">
          <ArrowLeft size={14} /> back
        </Link>
        <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 mb-2">Briefing not found</h1>
        <p className="text-sm text-slate-500">
          {error ??
            'This briefing has not been generated yet. Daily briefings publish at 00:05 UTC; weekly at 00:15 UTC Monday.'}
        </p>
      </div>
    );
  }

  const stats = briefing.stats;
  return (
    <div className="max-w-5xl mx-auto px-8 py-12 text-slate-900 dark:text-slate-100">
      <Link
        to="/dfir/briefings"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:text-brand-400 mb-8 font-mono transition-colors"
      >
        <ArrowLeft size={14} /> all briefings
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 mb-3">
          Intel Briefing · {briefing.type}
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight mb-2">{briefing.title}</h1>
        <p className="text-sm font-mono text-slate-500">
          {briefing.date_range} · generated {new Date(briefing.generated_at).toUTCString()}
        </p>
      </motion.header>

      {/* Stats bar */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 mb-8">
        <div className="flex flex-wrap items-center justify-around gap-6">
          <StatPill label="findings" value={stats.findings} />
          <StatPill label="sections" value={stats.sections} />
          <StatPill label="CVEs" value={stats.cves} />
          <StatPill label="KEVs" value={stats.kevs} />
          <StatPill label="IOCs" value={stats.iocs} />
          <StatPill label="critical" value={stats.critical} accent="text-rose-600 dark:text-rose-400" />
          <StatPill label="high" value={stats.high} accent="text-orange-600 dark:text-orange-400" />
          <StatPill label="medium" value={stats.medium} accent="text-amber-600 dark:text-amber-400" />
          <StatPill label="low" value={stats.low} accent="text-emerald-600 dark:text-emerald-400" />
        </div>
      </section>

      {/* Executive Summary */}
      <section className="mb-10">
        <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
          <ShieldAlert size={18} className="text-brand-600 dark:text-brand-400" /> Executive Summary
        </h2>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{briefing.executive_summary}</p>
      </section>

      {/* Sections */}
      {briefing.sections.length > 0 && (
        <section className="mb-12 space-y-8">
          {briefing.sections.map((s) => (
            <div key={s.id}>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="font-display font-bold text-xl flex items-center gap-2">
                  <AlertTriangle size={18} className="text-brand-600 dark:text-brand-400" />
                  {s.title}
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  {s.count} {s.count === 1 ? 'finding' : 'findings'}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{s.blurb}</p>
              <div className="space-y-3">
                {s.findings.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* MITRE techniques observed */}
      {briefing.mitre_techniques.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display font-bold text-lg mb-3">MITRE ATT&amp;CK Techniques Observed</h2>
          <div className="flex flex-wrap gap-2">
            {briefing.mitre_techniques.map((t) => (
              <MitreChip key={t} technique={t} />
            ))}
          </div>
        </section>
      )}

      {/* IOCs */}
      {(briefing.iocs.urls.length > 0 ||
        briefing.iocs.domains.length > 0 ||
        briefing.iocs.ipv4s.length > 0 ||
        briefing.iocs.hashes.length > 0) && (
        <section className="mb-10">
          <h2 className="font-display font-bold text-lg mb-4">Active Threat Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IocTable title="URLs" entries={briefing.iocs.urls} />
            <IocTable title="Domains" entries={briefing.iocs.domains} />
            <IocTable title="IPv4" entries={briefing.iocs.ipv4s} />
            <IocTable title="Hashes" entries={briefing.iocs.hashes} />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500">
        <p>
          Sources: {briefing.sources.join(', ') || 'none'}. Reference only — verify all indicators in your own
          environment. Generated {new Date(briefing.generated_at).toUTCString()}.
        </p>
      </footer>
    </div>
  );
}
