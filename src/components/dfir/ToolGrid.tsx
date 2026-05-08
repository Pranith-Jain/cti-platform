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
  type LucideIcon,
} from 'lucide-react';

interface Tool {
  path: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  external?: boolean;
}

const TOOLS: Tool[] = [
  { path: '/dfir/ioc-check', label: 'IOC Checker', desc: 'IPs · domains · URLs · hashes', icon: Hash },
  { path: '/dfir/phishing', label: 'Phishing Analyzer', desc: 'Email headers + content', icon: ShieldAlert },
  { path: '/dfir/domain', label: 'Domain Lookup', desc: 'WHOIS · DNS · email auth', icon: Globe },
  { path: '/dfir/exposure', label: 'Exposure Scanner', desc: 'Subdomains + open ports', icon: Radar },
  { path: '/dfir/file', label: 'File Analyzer', desc: 'Hash-based lookups', icon: FileSearch },
  { path: '/dfir/cve', label: 'CVE Lookup', desc: 'NVD · EPSS · KEV · Exploit-DB', icon: Search },
  { path: '/dfir/mitre', label: 'MITRE ATT&CK', desc: 'Matrix · technique deep-dive · actors', icon: Grid3x3 },
  { path: '/dfir/url-preview', label: 'URL Preview', desc: 'Server-side metadata · safe fetch', icon: Eye },
  { path: '/dfir/asn', label: 'ASN Lookup', desc: 'BGP · prefixes · abuse contacts', icon: Network },
  { path: '/dfir/breach', label: 'Breach Checker', desc: 'Pwned password · k-anonymity', icon: Shield },
  { path: '/dfir/exif', label: 'EXIF Parser', desc: 'GPS · camera · client-only', icon: ImageIcon },
  { path: '/dfir/decode', label: 'Decoder', desc: 'Base64 · URL · multi-pass', icon: Code2 },
  { path: '/dfir/wiki', label: 'Knowledge Base', desc: 'Concepts + playbooks', icon: BookOpen },
  { path: '/dfir/dashboard', label: 'Recent Lookups', desc: 'Your last 20 queries', icon: Clock },
  { path: '/dfir/actors', label: 'Threat Actors', desc: 'APT catalog · STIX-aware', icon: Users },
  { path: '/dfir/privacy', label: 'Privacy Check', desc: 'IP · WebRTC · fingerprint', icon: Lock },
  { path: '/dfir/briefings', label: 'Intel Briefings', desc: 'IOC feeds · daily summaries', icon: Newspaper },
  // External OSINT resources — open in a new tab
  {
    path: 'https://osinttools.io/tools',
    label: 'OSINT Tools',
    desc: 'Curated OSINT tool directory · external',
    icon: Compass,
    external: true,
  },
  {
    path: 'https://osintrack.com/',
    label: 'OSINTrack',
    desc: 'OSINT investigation tracker · external',
    icon: Compass,
    external: true,
  },
];

export function ToolGrid(): JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {TOOLS.map(({ path, label, desc, icon: Icon, external }) => {
        const className =
          'group block rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-brand-500/40 hover:bg-slate-50 dark:bg-slate-800 transition-colors';
        const inner = (
          <>
            <div className="flex items-center gap-3 mb-2">
              <Icon size={18} className="text-brand-600 dark:text-brand-400" aria-hidden="true" />
              <span className="font-display font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:text-brand-400 transition-colors flex items-center gap-1">
                {label}
                {external && <ExternalLink size={12} className="opacity-60" aria-hidden="true" />}
              </span>
            </div>
            <p className="text-sm font-mono text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
          </>
        );
        if (external) {
          return (
            <a key={path} href={path} target="_blank" rel="noopener noreferrer" className={className}>
              {inner}
            </a>
          );
        }
        return (
          <Link key={path} to={path} className={className}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
