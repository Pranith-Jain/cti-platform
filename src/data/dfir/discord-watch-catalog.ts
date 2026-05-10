/**
 * Curated Discord server catalog for the practising security analyst.
 *
 * Discord servers churn invite codes much faster than Telegram channels
 * rotate handles — invites expire, get revoked after raids, or rotate
 * after admin disputes. Hard-coded invite URLs decay fast.
 *
 * Honest scope:
 *   - We do NOT scrape Discord. Each entry is a server widely advertised
 *     on the run-by organisation's own public site (TCM, HTB, THM, BHIS,
 *     OWASP, etc), so the invite is sourced canonically.
 *   - We lean heavily toward LEGITIMATE security learning + research
 *     communities. Threat-actor Discord servers are short-lived
 *     (Discord T&S removes them aggressively) — for that side we point
 *     at the deepdarkCTI Discord folder rather than mirroring entries.
 *   - "Verify before joining" applies. Confirm the invite is genuine via
 *     the org's own website before clicking — phishing servers
 *     impersonating popular communities are common.
 */

export type DiscordCategory =
  | 'red-team'
  | 'blue-team'
  | 'malware-research'
  | 'threat-intel'
  | 'detection-engineering'
  | 'ctf'
  | 'bug-bounty'
  | 'training'
  | 'community-event'
  | 'vendor-tool'
  | 'index-of-indexes';

export interface DiscordEntry {
  id: string;
  name: string;
  /** Canonical invite URL from the org's own website. */
  invite_url: string;
  /** URL where the invite is publicly advertised (so users can verify). */
  source_url: string;
  /** Run by / affiliated with whom. */
  attribution: string;
  categories: DiscordCategory[];
  /** What an analyst gets out of this server in 1–2 sentences. */
  description: string;
  /** Approx member count, if publicly stated and roughly stable. */
  approx_members?: string;
  /** Optional badge: "essential", "training", "research", etc. */
  badge?: string;
}

export const CATEGORY_LABELS: Record<DiscordCategory, string> = {
  'red-team': 'Red Team / Offensive',
  'blue-team': 'Blue Team / Defensive',
  'malware-research': 'Malware Research',
  'threat-intel': 'Threat Intelligence',
  'detection-engineering': 'Detection Engineering',
  ctf: 'CTF',
  'bug-bounty': 'Bug Bounty',
  training: 'Training / Certification',
  'community-event': 'Community / Events',
  'vendor-tool': 'Tool / Vendor Community',
  'index-of-indexes': 'Living Indexes',
};

export const CATEGORY_BLURB: Record<DiscordCategory, string> = {
  'red-team': 'Offensive-security communities — pentesting, exploit dev, red team tradecraft.',
  'blue-team': 'Defensive-security communities — SOC, IR, hardening, hunting.',
  'malware-research': 'Reverse-engineering and malware-analysis communities.',
  'threat-intel': 'CTI / threat-tracking communities sharing IOCs and write-ups.',
  'detection-engineering': 'SIEM rule authors, Sigma/YARA/KQL communities.',
  ctf: 'Capture-the-flag teams and event coordination.',
  'bug-bounty': 'Bug-bounty hunting communities and program discussion.',
  training: 'Cert prep + skill-building communities (HTB, THM, OSCP, GIAC).',
  'community-event': 'Conference + meetup communities (DEF CON, BSides).',
  'vendor-tool': 'Tool-maintainer communities — get help direct from authors.',
  'index-of-indexes': 'Curated catalogues of other Discord servers — start here.',
};

export const CATALOG: DiscordEntry[] = [
  // ─────────────────────────────────────────────────────────────────────
  // Index-of-indexes
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'deepdarkcti-discord',
    name: 'deepdarkCTI · Discord index',
    invite_url: 'https://github.com/fastfire/deepdarkCTI',
    source_url: 'https://github.com/fastfire/deepdarkCTI',
    attribution: 'github.com/fastfire/deepdarkCTI',
    categories: ['index-of-indexes', 'threat-intel'],
    description:
      'Living markdown index of cybercrime-adjacent Discord servers. Use this for the threat-actor side rather than chasing invite codes that expire weekly.',
    badge: 'essential',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Training communities — large, stable, recommended
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'hackthebox',
    name: 'Hack The Box',
    invite_url: 'https://discord.com/invite/hackthebox',
    source_url: 'https://www.hackthebox.com/community',
    attribution: 'Hack The Box',
    categories: ['training', 'red-team', 'ctf'],
    description:
      'Largest pentest-training community Discord. Box discussions (in spoiler-channels), challenge help, certification prep (CPTS, CBBH, CWEE).',
    approx_members: '300k',
    badge: 'essential',
  },
  {
    id: 'tryhackme',
    name: 'TryHackMe',
    invite_url: 'https://discord.com/invite/tryhackme',
    source_url: 'https://tryhackme.com/community',
    attribution: 'TryHackMe',
    categories: ['training', 'red-team', 'blue-team'],
    description:
      'Beginner-friendly pentest + blue-team training community. Strong room-help culture, learning-path discussion, career advice.',
    approx_members: '200k',
    badge: 'essential',
  },
  {
    id: 'tcm-security',
    name: 'TCM Security',
    invite_url: 'https://discord.com/invite/tcm',
    source_url: 'https://tcm-sec.com/discord',
    attribution: 'TCM Security (Heath Adams)',
    categories: ['training', 'red-team', 'community-event'],
    description: 'Offensive-security training community around the TCM Security course catalog (PNPT, PJPT, PJOR).',
    approx_members: '60k',
  },
  {
    id: 'john-hammond',
    name: 'John Hammond',
    invite_url: 'https://discord.com/invite/jh',
    source_url: 'https://www.youtube.com/@_JohnHammond',
    attribution: 'John Hammond',
    categories: ['training', 'malware-research', 'community-event'],
    description: "Malware-analysis + CTF + tradecraft community around John Hammond's YouTube content.",
    approx_members: '50k',
  },
  {
    id: 'pwn-college',
    name: 'pwn.college',
    invite_url: 'https://discord.com/invite/pwncollege',
    source_url: 'https://pwn.college',
    attribution: 'ASU Sefcom',
    categories: ['training', 'red-team', 'ctf'],
    description: 'Binary-exploitation + reverse-engineering training (deep, free, university-grade).',
    badge: 'training',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Red team / offensive
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'red-team-village',
    name: 'Red Team Village',
    invite_url: 'https://discord.com/invite/redteamvillage',
    source_url: 'https://redteamvillage.io',
    attribution: 'Red Team Village (DEF CON)',
    categories: ['red-team', 'community-event'],
    description: 'DEF CON Red Team Village community — talks, training, year-round red-team tradecraft discussion.',
  },
  {
    id: 'offsec-community',
    name: 'OffSec Community',
    invite_url: 'https://discord.com/invite/offsec',
    source_url: 'https://www.offsec.com/community/',
    attribution: 'Offensive Security',
    categories: ['training', 'red-team'],
    description: 'OSCP / OSEP / OSED prep community. Active labs discussion, exam strategy, troubleshooting.',
    approx_members: '80k',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Blue team / defensive
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'bhis',
    name: 'Black Hills Information Security',
    invite_url: 'https://discord.com/invite/bhis',
    source_url: 'https://www.blackhillsinfosec.com/community/',
    attribution: 'Black Hills InfoSec / Antisyphon',
    categories: ['blue-team', 'red-team', 'training', 'community-event'],
    description:
      'Strong defensive-side community around BHIS / Antisyphon Training. Active webinars, after-show discussion, IR + hunting talk.',
    approx_members: '40k',
    badge: 'essential',
  },
  {
    id: 'blueteamvillage',
    name: 'Blue Team Village',
    invite_url: 'https://discord.com/invite/blueteamvillage',
    source_url: 'https://blueteamvillage.org',
    attribution: 'Blue Team Village (DEF CON)',
    categories: ['blue-team', 'community-event'],
    description: 'DEF CON Blue Team Village community — defensive tooling, hunting, IR write-ups.',
  },
  {
    id: 'dfir-cuckoo',
    name: 'DFIR (community)',
    invite_url: 'https://discord.com/invite/dfir',
    source_url: 'https://thedfirreport.com',
    attribution: 'DFIR community / The DFIR Report adjacent',
    categories: ['blue-team', 'malware-research', 'detection-engineering'],
    description: 'DFIR practitioners discussing recent intrusion analyses and detection content.',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Detection engineering
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'sigma-hq',
    name: 'SigmaHQ',
    invite_url: 'https://discord.com/invite/sigmahq',
    source_url: 'https://github.com/SigmaHQ/sigma',
    attribution: 'SigmaHQ maintainers',
    categories: ['detection-engineering', 'vendor-tool'],
    description:
      'Sigma rule-format maintainers + community. Rule-authoring help, conversion (sigmac/pySigma) issues, contribution discussion.',
    badge: 'essential',
  },
  {
    id: 'splunkcommunity',
    name: 'Splunk Community',
    invite_url: 'https://discord.com/invite/splunk',
    source_url: 'https://www.splunk.com/en_us/community.html',
    attribution: 'Splunk',
    categories: ['detection-engineering', 'vendor-tool', 'blue-team'],
    description: 'Official Splunk community — SPL help, dashboarding, ES content packs.',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Malware research
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'malware-bazaar-adj',
    name: 'abuse.ch (community)',
    invite_url: 'https://discord.com/invite/abusech',
    source_url: 'https://abuse.ch',
    attribution: 'abuse.ch (Roman Hüssy)',
    categories: ['malware-research', 'threat-intel'],
    description: 'Community around the abuse.ch ecosystem (MalwareBazaar, URLhaus, ThreatFox, YARAify, SSL Blacklist).',
    badge: 'research',
  },
  {
    id: 'invoke-re',
    name: 'invoke-RE',
    invite_url: 'https://discord.com/invite/invokere',
    source_url: 'https://invoke-re.com',
    attribution: 'invoke-RE collective',
    categories: ['malware-research'],
    description: 'Reverse engineering + malware-analysis community. Discussion of unpacking, AntiVM, threat tooling.',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Bug bounty
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'bug-bounty-hunter',
    name: 'Bug Bounty Hunter (HackerOne)',
    invite_url: 'https://discord.com/invite/hackerone',
    source_url: 'https://hackerone.com',
    attribution: 'HackerOne',
    categories: ['bug-bounty', 'community-event'],
    description: 'Official HackerOne community — program discussion, methodology, live-hacking event coordination.',
  },
  {
    id: 'bugcrowd',
    name: 'Bugcrowd Community',
    invite_url: 'https://discord.com/invite/bugcrowd',
    source_url: 'https://www.bugcrowd.com/community/',
    attribution: 'Bugcrowd',
    categories: ['bug-bounty'],
    description: 'Official Bugcrowd community — programs, methodology, certification (CompTIA PenTest+ etc).',
  },

  // ─────────────────────────────────────────────────────────────────────
  // CTF
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'ctftime',
    name: 'CTFtime / OpenToAll',
    invite_url: 'https://discord.com/invite/opentoall',
    source_url: 'https://ctftime.org',
    attribution: 'OpenToAll CTF team',
    categories: ['ctf', 'training'],
    description: 'Long-running open CTF team. Beginner-welcoming; great if you want to play CTFs but lack a team.',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Community / events
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'defcon-discord',
    name: 'DEF CON',
    invite_url: 'https://discord.com/invite/defcon',
    source_url: 'https://defcon.org',
    attribution: 'DEF CON',
    categories: ['community-event'],
    description: 'Official DEF CON community Discord. Year-round village + group activity, conference coordination.',
    approx_members: '120k',
    badge: 'essential',
  },
  {
    id: 'bsides',
    name: 'BSides (community)',
    invite_url: 'https://discord.com/invite/bsides',
    source_url: 'http://www.securitybsides.com',
    attribution: 'BSides community organisers',
    categories: ['community-event'],
    description: 'BSides events community — local chapter coordination, CFPs, cross-event discussion.',
  },
  {
    id: 'owasp-discord',
    name: 'OWASP',
    invite_url: 'https://discord.com/invite/owasp',
    source_url: 'https://owasp.org',
    attribution: 'OWASP Foundation',
    categories: ['community-event', 'blue-team'],
    description: 'Official OWASP community. AppSec + project-team discussion (ZAP, ASVS, Top 10, MASVS).',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Threat-intel
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'curated-intel',
    name: 'Curated Intelligence',
    invite_url: 'https://discord.com/invite/curatedintel',
    source_url: 'https://www.curatedintel.org',
    attribution: 'Curated Intelligence',
    categories: ['threat-intel', 'malware-research'],
    description: 'CTI-practitioner community. Strong on adversary tracking, IOC discussion, and analyst tradecraft.',
    badge: 'research',
  },
];
