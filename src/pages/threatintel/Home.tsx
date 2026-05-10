import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  Briefcase,
  Crosshair,
  FileText,
  Globe2,
  GraduationCap,
  Library,
  Newspaper,
  Network,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
  Globe,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { LiveSnapshotPanel } from '../../components/dfir/LiveSnapshotPanel';

/**
 * Threat-Intel landing page. Curated entry point for CTI work — mirrors the
 * structure of the /dfir landing but pre-filters to intel-flavoured tools
 * (live feeds, adversary tracking, leak-site monitoring, briefings, catalogs)
 * and adds the new ransom-note library.
 *
 * Tools live at their existing /dfir/<slug> URLs — this page is purely a
 * curated portal so that someone whose job is "track threats" doesn't have
 * to wade through forensics utilities they don't need today.
 */

interface Tool {
  to: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  /** Tag hint shown alongside title (e.g. "live", "new"). */
  badge?: string;
}

interface Section {
  id: string;
  label: string;
  blurb: string;
  tools: Tool[];
}

const SECTIONS: Section[] = [
  {
    id: 'live-feeds',
    label: 'Live Feeds',
    blurb: 'Streaming intel surfaces — fresh data each visit.',
    tools: [
      {
        to: '/dfir/darkweb',
        label: 'Dark-Web Firehose',
        desc: 'Recent ransomware activity · Telegram cybersec firehose · breach disclosures · watchlist matching',
        icon: Activity,
        badge: 'live',
      },
      {
        to: '/dfir/onion-watch',
        label: 'Onion Watch',
        desc: 'Live .onion mirror inventory for top ransomware leak sites · per-group reachability from Ransomlook',
        icon: Globe,
      },
      {
        to: '/dfir/telegram-watch',
        label: 'Telegram Watch',
        desc: 'Curated index of public threat-intel + cybercrime channels · category + language filters',
        icon: Send,
      },
      {
        to: '/dfir/threat-feeds',
        label: 'Threat Feeds',
        desc: 'Aggregated CTI / DFIR vendor feeds · BleepingComputer + Krebs + DFIR Report + SecurityWeek',
        icon: Radio,
      },
      {
        to: '/dfir/scam-watch',
        label: 'Scam Watch',
        desc: 'FTC + IC3 fraud alerts · deepfake-scam news · victim reports · search + filter',
        icon: ShieldAlert,
      },
      {
        to: '/dfir/tech-ai-news',
        label: 'Tech & AI News',
        desc: 'AI labs · cyber-vendor funding · M&A · 16 sources · threat-intel kept separate',
        icon: Newspaper,
      },
    ],
  },
  {
    id: 'adversary',
    label: 'Adversary Tracking',
    blurb: 'Who is attacking, with what, and how to model it.',
    tools: [
      {
        to: '/dfir/actors',
        label: 'Threat Actors',
        desc: 'Catalogue of named threat actors · TTPs · associated tooling · MITRE technique mapping',
        icon: Users,
      },
      {
        to: '/dfir/mitre',
        label: 'MITRE ATT&CK Matrix',
        desc: 'Interactive ATT&CK technique browser · technique-to-actor and actor-to-technique pivots',
        icon: Crosshair,
      },
      {
        to: '/dfir/stix',
        label: 'STIX 2.1 Viewer',
        desc: 'Drop a STIX bundle · interactive relationship graph · validate + browse SDOs/SROs',
        icon: Network,
      },
      {
        to: '/threatintel/ransom-library',
        label: 'Ransom Note Library',
        desc: '180+ ransomware groups · transcript of each ransom note + leak-site landing-page screenshot · sourced from mythreatintel.com',
        icon: FileText,
        badge: 'new',
      },
      {
        to: '/dfir/threat-map',
        label: 'Cyber Threat Map',
        desc: 'Live geolocation of malicious infrastructure · choropleth + leaderboard · IP / URL / domain / hash buckets',
        icon: Globe2,
      },
      {
        to: '/dfir/breach',
        label: 'Breach Lookup',
        desc: 'Search HIBP-style breach datasets by email / domain · timeline of disclosed breaches',
        icon: Search,
      },
    ],
  },
  {
    id: 'briefings',
    label: 'Briefings & Reports',
    blurb: 'Synthesised intel — daily and weekly write-ups.',
    tools: [
      {
        to: '/dfir/briefings',
        label: 'Daily / Weekly Briefings',
        desc: 'Auto-generated intel briefings · ransomware claims · breach disclosures · IOCs of the day',
        icon: Briefcase,
      },
      {
        to: '/dfir/cve',
        label: 'CVE Lookup',
        desc: 'NVD + CVSS + EPSS + KEV in one query · per-CVE timeline · vendor advisory cross-refs',
        icon: ShieldAlert,
      },
      {
        to: '/dfir/cve-resources',
        label: 'CVE Resources Catalog',
        desc: '24 CVE-adjacent sources across databases, exploit PoCs, vendor PSIRTs, scoring, alert feeds',
        icon: Library,
      },
    ],
  },
  {
    id: 'catalogs',
    label: 'Curated Catalogs',
    blurb: 'Reference indexes — start here when a question is broader than a single tool.',
    tools: [
      {
        to: '/dfir/secops-tools',
        label: 'SecOps Tools Catalog',
        desc: '~140 hand-picked tools across 14 categories — DFIR / Threat Intel / AI Sec / Malware / Vuln / Detection',
        icon: Library,
      },
      {
        to: '/dfir/awesome-lists',
        label: 'Awesome Lists',
        desc: 'Curated GitHub awesome-lists for OSINT, Threat Intel, IR, MCP / AI security · star + focus filter',
        icon: Sparkles,
      },
      {
        to: '/dfir/wiki',
        label: 'Wiki',
        desc: 'Long-form articles — Telegram OSINT tradecraft, dark-web monitoring, MITRE workflows, briefing methodology',
        icon: BookOpen,
      },
      {
        to: '/dfir/osint-framework',
        label: 'OSINT Framework',
        desc: '70+ curated OSINT tools across 15 categories · pricing-tier + category filter',
        icon: GraduationCap,
      },
    ],
  },
  {
    id: 'analysis',
    label: 'Intel Analysis',
    blurb: 'Frameworks for structured CTI work.',
    tools: [
      {
        to: '/dfir/kill-chain',
        label: 'Cyber Kill Chain',
        desc: 'Lockheed Martin model · phase walk-through · per-phase detection / mitigation patterns',
        icon: Crosshair,
      },
      {
        to: '/dfir/diamond',
        label: 'Diamond Model',
        desc: 'Adversary / Capability / Infrastructure / Victim — populate the diamond from an incident',
        icon: Brain,
      },
    ],
  },
];

export default function ThreatIntelHome(): JSX.Element {
  const totalTools = SECTIONS.reduce((sum, s) => sum + s.tools.length, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 text-slate-900 dark:text-slate-100">
      <header className="animate-fade-in-up mb-12">
        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 mb-3">
          Threat Intelligence
        </span>
        <h1 className="text-5xl sm:text-6xl font-display font-bold text-slate-900 dark:text-slate-100 mb-4 leading-tight">
          CTI surfaces, on the edge.
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mb-6 leading-relaxed">
          A curated entry point for threat-intel work — leak-site firehose, adversary catalogues, briefings, and a
          searchable library of {180}+ ransomware groups with transcripts of their notes and leak-site screenshots.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-slate-600 dark:text-slate-400">
          <span>
            <span className="text-slate-900 dark:text-slate-100 text-base">{totalTools}</span> intel surfaces
          </span>
          <span aria-hidden="true">·</span>
          <span>
            For triage / forensics utilities →{' '}
            <Link to="/dfir" className="text-brand-600 dark:text-brand-400 hover:underline">
              /dfir
            </Link>
          </span>
        </div>
      </header>

      <section className="animate-fade-in-up">
        <LiveSnapshotPanel compact subtitle="live intel pulse across the platform" mbClass="mb-12" />
      </section>

      {SECTIONS.map((section) => (
        <section key={section.id} className="animate-fade-in-up mb-12">
          <div className="mb-4">
            <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100">{section.label}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-mono mt-1">{section.blurb}</p>
          </div>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {section.tools.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.to}>
                  <Link
                    to={t.to}
                    className="block h-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-brand-500/40 dark:hover:border-brand-400/40 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Icon size={18} className="text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                      <ArrowRight
                        size={14}
                        className="text-slate-300 dark:text-slate-700 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors mt-0.5 shrink-0"
                      />
                    </div>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <h3 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {t.label}
                      </h3>
                      {t.badge && (
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                            t.badge === 'live'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-mono text-slate-600 dark:text-slate-400 leading-relaxed">{t.desc}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section className="mt-16 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
        <h3 className="font-display font-bold text-xl mb-2">Sourced from</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
          Live feeds compose data from abuse.ch (ThreatFox / URLhaus / MalwareBazaar / Feodo), Ransomlook,
          BleepingComputer, Krebs, DFIRReport, SecurityWeek, and a curated set of public Telegram channels. The ransom
          note library mirrors{' '}
          <a
            href="https://www.mythreatintel.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            mythreatintel.com
          </a>{' '}
          (open-directory transcripts + leak-site screenshots).
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 font-mono">
          For credentials, integration patterns, and the full list of upstream sources see{' '}
          <Link to="/dfir" className="text-brand-600 dark:text-brand-400 hover:underline">
            /dfir
          </Link>{' '}
          and{' '}
          <Link to="/dfir/awesome-lists" className="text-brand-600 dark:text-brand-400 hover:underline">
            /dfir/awesome-lists
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
