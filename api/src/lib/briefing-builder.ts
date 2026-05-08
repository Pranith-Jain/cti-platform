/**
 * Threat briefing builder.
 *
 * Aggregates CISA KEV + NVD + abuse.ch + OpenPhish over a time window, categorises
 * findings, and produces a structured briefing object. Stored in KV under
 *   briefing:daily:YYYY-MM-DD
 *   briefing:weekly:YYYY-Www
 *
 * Narrative is templated — no LLM. Source data already contains the descriptions;
 * we format and group, we don't invent.
 */

import { FEED_SOURCES, buildSummary, type IocEntry, type SourceId } from './ioc-feed-parsers';

const NVD_UA = 'Mozilla/5.0 (compatible; pranithjain-dfir/1.0; +https://pranithjain.qzz.io)';
const NVD_API = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const KEV_FEED = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

// ---- types --------------------------------------------------------------

export type BriefingType = 'daily' | 'weekly';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export interface BriefingFinding {
  id: string; // CVE-XXXX-NNNN or feed-derived id
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

export interface BriefingSection {
  id: string;
  title: string;
  count: number;
  blurb: string;
  findings: BriefingFinding[];
}

export interface BriefingIocBuckets {
  urls: IocEntry[];
  domains: IocEntry[];
  ipv4s: IocEntry[];
  hashes: IocEntry[];
}

export interface BriefingStats {
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

export interface Briefing {
  slug: string;
  type: BriefingType;
  title: string;
  date: string; // ISO YYYY-MM-DD (the briefing date — anchor)
  date_range: string; // human display
  range_start: string; // ISO YYYY-MM-DD
  range_end: string; // ISO YYYY-MM-DD (exclusive)
  generated_at: string;
  executive_summary: string;
  stats: BriefingStats;
  sections: BriefingSection[];
  iocs: BriefingIocBuckets;
  mitre_techniques: string[];
  sources: string[];
}

interface KevEntry {
  cveID: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  dateAdded: string;
  shortDescription?: string;
  requiredAction?: string;
  dueDate?: string;
  knownRansomwareCampaignUse?: string;
  notes?: string;
}

interface KevDoc {
  vulnerabilities: KevEntry[];
}

interface NvdCvssMetric {
  cvssData: { baseScore: number; baseSeverity?: string };
}

interface NvdCve {
  id: string;
  descriptions?: Array<{ lang: string; value: string }>;
  metrics?: {
    cvssMetricV31?: NvdCvssMetric[];
    cvssMetricV30?: NvdCvssMetric[];
    cvssMetricV2?: NvdCvssMetric[];
  };
}

interface NvdResponse {
  vulnerabilities?: Array<{ cve: NvdCve }>;
}

// ---- categorisation -----------------------------------------------------

const CATEGORY_RULES: Array<{ id: string; title: string; blurb: string; match: RegExp }> = [
  {
    id: 'rce',
    title: 'Critical Remote Code Execution Vulnerabilities',
    blurb: 'Vulnerabilities allowing arbitrary code execution on affected systems — patch immediately.',
    match:
      /\b(remote code execution|\bRCE\b|arbitrary code execution|unauthenticated code execution|pre-?auth(?:entication)? rce)\b/i,
  },
  {
    id: 'command-injection',
    title: 'Command Injection',
    blurb: 'OS / shell command injection enabling attacker-controlled execution.',
    match: /\b(command injection|os command|shell injection|argument injection)\b/i,
  },
  {
    id: 'auth-bypass',
    title: 'Authentication & Authorization Bypass',
    blurb: 'Missing or broken authentication / authorisation enabling unauthorised actions.',
    match:
      /\b(authentication bypass|auth(?:orisation| bypass)|missing authorization|missing authentication|improper access control)\b/i,
  },
  {
    id: 'privesc',
    title: 'Privilege Escalation',
    blurb: 'Vulnerabilities enabling escalation to higher privileges.',
    match: /\b(privilege escalation|priv(?:ilege)? esc|elevation of privilege|escalate privileges)\b/i,
  },
  {
    id: 'sql-injection',
    title: 'SQL & NoSQL Injection',
    blurb: 'Database injection vulnerabilities exposing or modifying stored data.',
    match: /\b(sql injection|sqli|nosql injection|blind sql)\b/i,
  },
  {
    id: 'xss',
    title: 'Cross-Site Scripting',
    blurb: 'Reflected, stored, or DOM-based XSS in web applications.',
    match: /\b(cross-?site scripting|\bXSS\b|stored xss|reflected xss)\b/i,
  },
  {
    id: 'memory-corruption',
    title: 'Memory Corruption',
    blurb: 'Buffer overflows, use-after-free, type confusion enabling crashes or RCE.',
    match:
      /\b(buffer overflow|heap overflow|stack overflow|use-after-free|type confusion|out-of-bounds (read|write)|double free)\b/i,
  },
  {
    id: 'deserialization',
    title: 'Insecure Deserialization',
    blurb: 'Unsafe deserialization of attacker-controlled data leading to RCE.',
    match: /\b(deserialization|deserialisation|insecure (un|de)?serialization)\b/i,
  },
  {
    id: 'path-traversal',
    title: 'Path Traversal & File Disclosure',
    blurb: 'Directory traversal and arbitrary file read/write vulnerabilities.',
    match:
      /\b(path traversal|directory traversal|arbitrary file (read|write|disclosure)|local file inclusion|\bLFI\b)\b/i,
  },
  {
    id: 'iot-network',
    title: 'Network Infrastructure & IoT Device Vulnerabilities',
    blurb: 'Vulnerabilities in routers, firewalls, and IoT devices on the network edge.',
    match: /\b(router|firewall|edge|VPN|gateway|D-Link|TP-Link|Netgear|Tenda|IoT|firmware)\b/i,
  },
];

const FALLBACK_CATEGORY = {
  id: 'other',
  title: 'Other Vulnerabilities',
  blurb: 'Additional vulnerabilities observed across products and services.',
};

// Naive CVE→MITRE technique mapping by description keywords. Imperfect but useful.
const MITRE_RULES: Array<{ pattern: RegExp; technique: string }> = [
  { pattern: /\b(remote code execution|\bRCE\b|arbitrary code|public-?facing|exploit public)\b/i, technique: 'T1190' },
  { pattern: /\b(command injection|os command)\b/i, technique: 'T1059' },
  { pattern: /\b(privilege escalation|elevation of privilege)\b/i, technique: 'T1068' },
  { pattern: /\b(authentication bypass|missing authentication)\b/i, technique: 'T1078' },
  { pattern: /\b(deserialization|insecure deserialization)\b/i, technique: 'T1059.007' },
  { pattern: /\b(buffer overflow|memory corruption)\b/i, technique: 'T1203' },
  { pattern: /\b(sql injection)\b/i, technique: 'T1190' },
  { pattern: /\b(cross-?site scripting|\bxss\b)\b/i, technique: 'T1059.007' },
  { pattern: /\bphishing\b/i, technique: 'T1566' },
  { pattern: /\bbotnet\b/i, technique: 'T1583.005' },
];

function severityFromCvss(score: number | undefined): Severity {
  if (score === undefined) return 'unknown';
  if (score >= 9.0) return 'critical';
  if (score >= 7.0) return 'high';
  if (score >= 4.0) return 'medium';
  return 'low';
}

function categorizeFinding(title: string, description: string) {
  const haystack = `${title} ${description}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.match.test(haystack)) return rule;
  }
  return FALLBACK_CATEGORY;
}

function deriveMitreTechniques(description: string): string[] {
  const found = new Set<string>();
  for (const r of MITRE_RULES) if (r.pattern.test(description)) found.add(r.technique);
  return Array.from(found);
}

// ---- date helpers -------------------------------------------------------

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoYearWeek(d: Date): string {
  // ISO 8601 week year
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function startOfIsoWeek(d: Date): Date {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() - (day - 1));
  return dt;
}

// ---- fetchers -----------------------------------------------------------

async function fetchKev(): Promise<KevEntry[]> {
  const res = await fetch(KEV_FEED, {
    headers: { 'user-agent': NVD_UA, accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
    cf: { cacheTtlByStatus: { '200-299': 1800, '400-599': 0 }, cacheEverything: true },
  } as RequestInit);
  if (!res.ok) throw new Error(`KEV fetch failed: ${res.status}`);
  const doc = (await res.json()) as KevDoc;
  return doc.vulnerabilities ?? [];
}

async function fetchNvdByIds(cveIds: string[]): Promise<Map<string, NvdCve>> {
  // NVD doesn't support bulk by-ID; query one at a time but cache aggressively.
  // Limit: 5 req per 30s anonymous. Cap at 30 lookups per briefing to stay under budget.
  const out = new Map<string, NvdCve>();
  const ids = cveIds.slice(0, 30);
  for (const id of ids) {
    try {
      const url = `${NVD_API}?cveId=${encodeURIComponent(id)}`;
      const res = await fetch(url, {
        headers: { 'user-agent': NVD_UA, accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
        cf: { cacheTtlByStatus: { '200-299': 86400, '400-599': 0 }, cacheEverything: true },
      } as RequestInit);
      if (!res.ok) continue;
      const json = (await res.json()) as NvdResponse;
      const cve = json.vulnerabilities?.[0]?.cve;
      if (cve) out.set(id, cve);
    } catch {
      // Skip on failure — best effort
    }
  }
  return out;
}

async function fetchAbuseFeed(source: SourceId, timeoutMs = 15_000): Promise<IocEntry[]> {
  try {
    const meta = FEED_SOURCES[source];
    const res = await fetch(meta.url, {
      headers: { 'user-agent': NVD_UA },
      signal: AbortSignal.timeout(timeoutMs),
      cf: { cacheTtlByStatus: { '200-299': 1800, '400-599': 0 }, cacheEverything: true },
    } as RequestInit);
    if (!res.ok) return [];
    const body = await res.text();
    const summary = buildSummary(source, body);
    return summary.entries;
  } catch {
    return [];
  }
}

// ---- builders -----------------------------------------------------------

function withinRange(timestamp: string | undefined, startMs: number, endMs: number): boolean {
  if (!timestamp) return false;
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return false;
  return t >= startMs && t < endMs;
}

function findingFromKev(kev: KevEntry, nvd: NvdCve | undefined): BriefingFinding {
  const cvss =
    nvd?.metrics?.cvssMetricV31?.[0]?.cvssData.baseScore ??
    nvd?.metrics?.cvssMetricV30?.[0]?.cvssData.baseScore ??
    nvd?.metrics?.cvssMetricV2?.[0]?.cvssData.baseScore;
  const description =
    nvd?.descriptions?.find((d) => d.lang === 'en')?.value ?? kev.shortDescription ?? kev.vulnerabilityName ?? '';
  const title =
    `${kev.cveID}: ${kev.vendorProject ?? ''} ${kev.product ?? ''} — ${kev.vulnerabilityName ?? 'Vulnerability'}`
      .replace(/\s+/g, ' ')
      .trim();
  return {
    id: kev.cveID,
    title,
    description,
    severity: severityFromCvss(cvss),
    cvss,
    source: 'CISA KEV',
    source_url: `https://nvd.nist.gov/vuln/detail/${kev.cveID}`,
    mitre_techniques: deriveMitreTechniques(`${title} ${description}`),
    added: kev.dateAdded,
    vendor: kev.vendorProject,
    product: kev.product,
  };
}

function buildSections(findings: BriefingFinding[]): BriefingSection[] {
  const groups = new Map<string, { rule: { id: string; title: string; blurb: string }; findings: BriefingFinding[] }>();
  for (const f of findings) {
    const cat = categorizeFinding(f.title, f.description);
    const slot = groups.get(cat.id) ?? { rule: cat, findings: [] };
    slot.findings.push(f);
    groups.set(cat.id, slot);
  }
  // Severity priority for ordering findings within a section
  const sevRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4 };
  const sectionOrder = [...CATEGORY_RULES.map((r) => r.id), FALLBACK_CATEGORY.id];
  return sectionOrder
    .map((id) => groups.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s && s.findings.length > 0)
    .map((s) => ({
      id: s.rule.id,
      title: s.rule.title,
      blurb: s.rule.blurb,
      count: s.findings.length,
      findings: s.findings.slice().sort((a, b) => sevRank[a.severity] - sevRank[b.severity]),
    }));
}

function bucketIocs(entries: IocEntry[]): BriefingIocBuckets {
  const buckets: BriefingIocBuckets = { urls: [], domains: [], ipv4s: [], hashes: [] };
  for (const e of entries) {
    if (e.type === 'url') buckets.urls.push(e);
    else if (e.type === 'domain') buckets.domains.push(e);
    else if (e.type === 'ipv4') buckets.ipv4s.push(e);
    else if (e.type === 'hash') buckets.hashes.push(e);
  }
  // Cap each bucket at 30 to keep payload manageable
  for (const k of Object.keys(buckets) as Array<keyof BriefingIocBuckets>) buckets[k] = buckets[k].slice(0, 30);
  return buckets;
}

function topVendors(findings: BriefingFinding[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const f of findings) {
    if (!f.vendor) continue;
    counts.set(f.vendor, (counts.get(f.vendor) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([v]) => v);
}

function buildExecutiveSummary(args: {
  type: BriefingType;
  range_label: string;
  findings: BriefingFinding[];
  iocs: BriefingIocBuckets;
  iocsTotal: number;
}): string {
  const { type, range_label, findings, iocs, iocsTotal } = args;
  const span = type === 'weekly' ? 'This week' : 'In the past 24 hours';
  const critCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const vendors = topVendors(findings, 3);
  const vendorStr = vendors.length > 0 ? `affecting ${vendors.join(', ')}` : 'across multiple vendors';

  const parts: string[] = [];
  if (findings.length > 0) {
    parts.push(
      `${span} (${range_label}), CISA's Known Exploited Vulnerabilities catalog added ${findings.length} new entries${critCount > 0 ? `, including ${critCount} critical-severity` : highCount > 0 ? `, with ${highCount} high-severity` : ''} ${vendorStr}.`
    );
  } else {
    parts.push(
      `${span} (${range_label}), no new entries were added to CISA's Known Exploited Vulnerabilities catalog.`
    );
  }

  const iocBits: string[] = [];
  if (iocs.urls.length > 0) iocBits.push(`${iocs.urls.length} malware-distribution URLs`);
  if (iocs.domains.length > 0) iocBits.push(`${iocs.domains.length} malicious domains`);
  if (iocs.ipv4s.length > 0) iocBits.push(`${iocs.ipv4s.length} suspicious IPs`);
  if (iocs.hashes.length > 0) iocBits.push(`${iocs.hashes.length} malware sample hashes`);
  if (iocBits.length > 0) {
    parts.push(
      `Active threat indicators tracked across abuse.ch and OpenPhish feeds totaled ${iocsTotal} entries: ${iocBits.join(', ')}.`
    );
  }

  parts.push(
    'Reference only — verify all indicators in your own environment and apply vendor patches per CISA KEV due-date guidance.'
  );

  return parts.join(' ');
}

function buildStats(findings: BriefingFinding[], sections: BriefingSection[], iocsTotal: number): BriefingStats {
  return {
    findings: findings.length,
    sections: sections.length,
    cves: findings.length,
    kevs: findings.filter((f) => f.source === 'CISA KEV').length,
    iocs: iocsTotal,
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  };
}

// ---- main entry points --------------------------------------------------

export async function buildBriefing(type: BriefingType, anchor: Date = new Date()): Promise<Briefing> {
  // Compute window
  let rangeStart: Date;
  let rangeEnd: Date;
  let dateLabel: string;
  let rangeLabel: string;
  let slug: string;
  let title: string;

  if (type === 'daily') {
    // Daily: covers the previous calendar day (UTC)
    const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
    const start = new Date(end.getTime() - 86400_000);
    rangeStart = start;
    rangeEnd = end;
    dateLabel = isoDate(start);
    rangeLabel = dateLabel;
    slug = `daily-${dateLabel}`;
    title = `Daily Threat Briefing — ${dateLabel}`;
  } else {
    // Weekly: prior ISO week (Mon→Sun) ending the day before anchor
    const end = startOfIsoWeek(anchor); // start of *current* ISO week — exclusive end
    const start = new Date(end.getTime() - 7 * 86400_000);
    rangeStart = start;
    rangeEnd = end;
    dateLabel = isoDate(start);
    rangeLabel = `${isoDate(start)} – ${isoDate(new Date(end.getTime() - 86400_000))}`;
    slug = `weekly-${isoYearWeek(start)}`;
    title = `Weekly Threat Briefing — ${rangeLabel}`;
  }

  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();

  // Fetch in parallel
  const [kev, urlhaus, malwarebazaar, threatfox, openphish, feodo] = await Promise.all([
    fetchKev().catch(() => [] as KevEntry[]),
    fetchAbuseFeed('urlhaus'),
    fetchAbuseFeed('malwarebazaar'),
    fetchAbuseFeed('threatfox'),
    fetchAbuseFeed('openphish'),
    fetchAbuseFeed('feodo'),
  ]);

  // Filter KEV to window
  const kevWindow = kev.filter((k) => withinRange(k.dateAdded, startMs, endMs));
  const nvdMap = await fetchNvdByIds(kevWindow.map((k) => k.cveID));
  const findings = kevWindow.map((k) => findingFromKev(k, nvdMap.get(k.cveID)));

  // Filter IOCs to window (timestamps from feeds are best-effort; some lack tz, accept)
  const allIocs = [...urlhaus, ...malwarebazaar, ...threatfox, ...openphish, ...feodo].filter((e) =>
    e.timestamp ? withinRange(e.timestamp.replace(' ', 'T'), startMs, endMs) : false
  );

  const iocs = bucketIocs(allIocs);
  const iocsTotal = iocs.urls.length + iocs.domains.length + iocs.ipv4s.length + iocs.hashes.length;

  const sections = buildSections(findings);
  const stats = buildStats(findings, sections, iocsTotal);
  const executive_summary = buildExecutiveSummary({ type, range_label: rangeLabel, findings, iocs, iocsTotal });

  const techniqueSet = new Set<string>();
  for (const f of findings) for (const t of f.mitre_techniques) techniqueSet.add(t);

  const sources: string[] = [];
  if (findings.length > 0) sources.push('CISA KEV', 'NVD');
  if (urlhaus.length > 0) sources.push('URLhaus');
  if (malwarebazaar.length > 0) sources.push('MalwareBazaar');
  if (threatfox.length > 0) sources.push('ThreatFox');
  if (openphish.length > 0) sources.push('OpenPhish');
  if (feodo.length > 0) sources.push('Feodo Tracker');

  return {
    slug,
    type,
    title,
    date: dateLabel,
    date_range: rangeLabel,
    range_start: isoDate(rangeStart),
    range_end: isoDate(new Date(rangeEnd.getTime() - 86400_000)),
    generated_at: new Date().toISOString(),
    executive_summary,
    stats,
    sections,
    iocs,
    mitre_techniques: Array.from(techniqueSet).sort(),
    sources,
  };
}

export async function writeBriefing(kv: KVNamespace, briefing: Briefing): Promise<void> {
  await kv.put(`briefing:${briefing.slug}`, JSON.stringify(briefing), {
    metadata: {
      type: briefing.type,
      title: briefing.title,
      date: briefing.date,
      date_range: briefing.date_range,
      stats: briefing.stats,
      sources: briefing.sources,
    },
  });
}

export async function listBriefings(
  kv: KVNamespace,
  filter?: { type?: BriefingType; limit?: number }
): Promise<Array<{ slug: string; metadata: unknown }>> {
  const limit = filter?.limit ?? 50;
  const list = await kv.list({ prefix: 'briefing:', limit: 200 });
  const items = list.keys
    .map((k) => ({ slug: k.name.replace(/^briefing:/, ''), metadata: k.metadata }))
    .filter((k) => {
      if (!filter?.type) return true;
      return k.slug.startsWith(filter.type);
    })
    .slice()
    .sort((a, b) => {
      const am = a.metadata as { date?: string } | undefined;
      const bm = b.metadata as { date?: string } | undefined;
      return (bm?.date ?? '').localeCompare(am?.date ?? '');
    })
    .slice(0, limit);
  return items;
}

export async function readBriefing(kv: KVNamespace, slug: string): Promise<Briefing | null> {
  const body = await kv.get(`briefing:${slug}`, 'json');
  return (body as Briefing | null) ?? null;
}
