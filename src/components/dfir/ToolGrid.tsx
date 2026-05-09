import { Link } from 'react-router-dom';
import {
  Hash,
  ShieldAlert,
  Globe,
  Radar,
  FileSearch,
  BookOpen,
  Clock,
  Users,
  Lock,
  Newspaper,
  Search,
  Shield,
  Grid3x3,
  Eye,
  Network,
  Code2,
  Compass,
  ExternalLink,
  Image as ImageIcon,
  Filter,
  KeyRound,
  Type,
  Unplug,
  Share2,
  Github,
  Microscope,
  Bell,
  Globe2,
  type LucideIcon,
} from 'lucide-react';

interface Tool {
  path: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  external?: boolean;
}

/** Flagship tools — most visitors should start here. */
const FEATURED: Tool[] = [
  {
    path: '/dfir/ioc-check',
    label: 'IOC Checker',
    desc: '24 sources · streaming results · IPs · domains · URLs · hashes',
    icon: Hash,
  },
  { path: '/dfir/extract', label: 'IOC Extractor', desc: 'Pull IOCs from any text blob · refang-aware', icon: Filter },
  {
    path: '/dfir/takeover',
    label: 'Subdomain Takeover',
    desc: 'CNAME chain + 15 dangling-service fingerprints',
    icon: Unplug,
  },
  {
    path: '/dfir/phishing',
    label: 'Phishing Analyzer',
    desc: 'Email headers · auth · embedded URLs',
    icon: ShieldAlert,
  },
  { path: '/dfir/mitre', label: 'MITRE ATT&CK', desc: 'Matrix · technique deep-dive · actor mapping', icon: Grid3x3 },
  {
    path: '/dfir/stix',
    label: 'STIX Viewer',
    desc: 'Visualise STIX 2.1 bundles · interactive relationship graph',
    icon: Share2,
  },
  {
    path: '/dfir/darkweb',
    label: 'Dark Web Watch',
    desc: 'Aggregated leak-site, ransomware, breach activity · keyword watchlist',
    icon: Bell,
  },
  {
    path: '/dfir/threat-map',
    label: 'Cyber Threat Map',
    desc: 'Live geolocation of malicious infrastructure · choropleth + leaderboard',
    icon: Globe2,
  },
  {
    path: '/dfir/briefings',
    label: 'Intel Briefings',
    desc: 'Daily + weekly digest · auto-generated from feeds',
    icon: Newspaper,
  },
];

/** Everything else — utilities and lookups. */
const UTILITIES: Tool[] = [
  { path: '/dfir/domain', label: 'Domain Lookup', desc: 'WHOIS · DNS · email auth', icon: Globe },
  { path: '/dfir/exposure', label: 'Exposure Scanner', desc: 'Subdomains + open ports', icon: Radar },
  { path: '/dfir/file', label: 'File Analyzer', desc: 'Hash-based lookups', icon: FileSearch },
  { path: '/dfir/jwt', label: 'JWT Inspector', desc: 'Decode + flag alg=none, exp, weak claims', icon: KeyRound },
  { path: '/dfir/punycode', label: 'Homograph Detector', desc: 'IDN · mixed scripts · brand lookalikes', icon: Type },
  { path: '/dfir/cve', label: 'CVE Lookup', desc: 'NVD · EPSS · KEV · Exploit-DB', icon: Search },
  { path: '/dfir/url-preview', label: 'URL Preview', desc: 'Server-side metadata · safe fetch', icon: Eye },
  { path: '/dfir/asn', label: 'ASN Lookup', desc: 'BGP · prefixes · abuse contacts', icon: Network },
  { path: '/dfir/breach', label: 'Breach Checker', desc: 'Pwned password · k-anonymity', icon: Shield },
  { path: '/dfir/exif', label: 'EXIF Parser', desc: 'GPS · camera · client-only', icon: ImageIcon },
  { path: '/dfir/decode', label: 'Decoder', desc: 'Base64 · URL · multi-pass', icon: Code2 },
  { path: '/dfir/wiki', label: 'Knowledge Base', desc: 'Concepts + playbooks', icon: BookOpen },
  { path: '/dfir/dashboard', label: 'Recent Lookups', desc: 'Your last 20 queries', icon: Clock },
  { path: '/dfir/actors', label: 'Threat Actors', desc: 'APT catalog · STIX-aware', icon: Users },
  { path: '/dfir/privacy', label: 'Privacy Check', desc: 'IP · WebRTC · fingerprint', icon: Lock },
];

const EXTERNAL: Tool[] = [
  {
    path: 'https://threatlandscape.io/free-tools',
    label: 'Threat Landscape Free Tools',
    desc: 'Curated free DFIR and threat intel tools directory',
    icon: Compass,
    external: true,
  },
  {
    path: 'https://analyzer.vecert.io/index',
    label: 'Vecert Analyzer',
    desc: 'Free file and indicator analyzer for incident response',
    icon: Microscope,
    external: true,
  },
  {
    path: 'https://github.com/fastfire/deepdarkCTI',
    label: 'deepdarkCTI',
    desc: 'Continuously updated repository of dark web and CTI sources, by fastfire',
    icon: Github,
    external: true,
  },
  {
    path: 'https://github.com/nitefood/asn',
    label: 'asn (nitefood)',
    desc: 'Multi-protocol BGP, ASN, and IP-to-ASN command-line lookup tool',
    icon: Github,
    external: true,
  },
  {
    path: 'https://www.worldmonitor.app',
    label: 'World Monitor',
    desc: 'Real-time OSINT dashboard, news, markets, ADS-B and AIS tracking across 435+ sources',
    icon: Compass,
    external: true,
  },
  {
    path: 'https://github.com/rawfilejson/awesome-osint-arsenal',
    label: 'awesome-osint-arsenal',
    desc: 'Curated arsenal of OSINT tools, frameworks, and references by rawfilejson',
    icon: Github,
    external: true,
  },
  {
    path: 'https://osinttools.io/tools',
    label: 'OSINT Tools',
    desc: 'Curated OSINT directory',
    icon: Compass,
    external: true,
  },
  {
    path: 'https://osintrack.com/',
    label: 'OSINTrack',
    desc: 'OSINT investigation tracker',
    icon: Compass,
    external: true,
  },
];

function Card({ tool }: { tool: Tool }): JSX.Element {
  const { path, label, desc, icon: Icon, external } = tool;
  const className =
    'group block rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-brand-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors';
  const inner = (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Icon size={18} className="text-brand-600 dark:text-brand-400" aria-hidden="true" />
        <span className="font-display font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-1">
          {label}
          {external && <ExternalLink size={12} className="opacity-60" aria-hidden="true" />}
        </span>
      </div>
      <p className="text-sm font-mono text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
    </>
  );
  if (external) {
    return (
      <a href={path} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={path} className={className}>
      {inner}
    </Link>
  );
}

function SectionHeading({ label }: { label: string }): JSX.Element {
  return (
    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 font-mono mb-4 mt-2">
      {label}
    </h3>
  );
}

export function ToolGrid(): JSX.Element {
  return (
    <div className="space-y-10">
      <div>
        <SectionHeading label="Start here" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED.map((t) => (
            <Card key={t.path} tool={t} />
          ))}
        </div>
      </div>

      <div>
        <SectionHeading label="Utilities & lookups" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {UTILITIES.map((t) => (
            <Card key={t.path} tool={t} />
          ))}
        </div>
      </div>

      <div>
        <SectionHeading label="External resources" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXTERNAL.map((t) => (
            <Card key={t.path} tool={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
