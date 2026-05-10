/**
 * Wiki topic → tool map. Used by WikiArticle.tsx to insert auto-links
 * from prose mentions of common DFIR concepts to the relevant tool
 * page. Order matters: longer/more-specific phrases come first so
 * "MITRE ATT&CK" doesn't get partially-matched as "MITRE".
 *
 * Each entry can include a `prefill` field for query-string preset that
 * the destination tool reads (e.g. /dfir/cve?q= for the search box).
 *
 * Add new entries as wiki articles grow — keep this list curated; we
 * don't want every common word turning into a link.
 */

export interface ToolTopic {
  /** Match this term (case-insensitive, whole-word). */
  term: string;
  /** Where to send the user. */
  href: string;
  /** Tooltip shown on hover so the auto-link is self-explanatory. */
  blurb: string;
}

export const TOOL_TOPICS: ToolTopic[] = [
  // Authoritative concepts → matrix / lookup pages
  { term: 'MITRE ATT&CK', href: '/dfir/mitre', blurb: 'Browse the ATT&CK matrix and tag your detection coverage' },
  { term: 'ATT&CK', href: '/dfir/mitre', blurb: 'Browse the ATT&CK matrix and tag your detection coverage' },
  { term: 'CISA KEV', href: '/dfir/cve', blurb: 'Search the Known Exploited Vulnerabilities catalog' },
  { term: 'EPSS', href: '/dfir/cve', blurb: 'Look up Exploit Prediction Scoring System scores' },

  // Email-auth → domain inspector
  { term: 'SPF', href: '/dfir/domain', blurb: 'Check SPF, DKIM, DMARC, MX, and TXT for any domain' },
  { term: 'DKIM', href: '/dfir/domain', blurb: 'Check SPF, DKIM, DMARC, MX, and TXT for any domain' },
  { term: 'DMARC', href: '/dfir/domain', blurb: 'Check SPF, DKIM, DMARC, MX, and TXT for any domain' },
  { term: 'BIMI', href: '/dfir/domain', blurb: 'Check email-auth records for any domain' },

  // Detection authoring
  { term: 'Sigma rule', href: '/dfir/rules', blurb: 'Browse curated Sigma + YARA rule repositories' },
  { term: 'YARA', href: '/dfir/rules', blurb: 'Browse curated Sigma + YARA rule repositories' },
  { term: 'Sigma', href: '/dfir/rules', blurb: 'Browse curated Sigma + YARA rule repositories' },

  // IOC + STIX + threat intel
  { term: 'STIX', href: '/dfir/stix', blurb: 'View STIX 2.1 bundles in a structured graph' },
  { term: 'TAXII', href: '/dfir/stix', blurb: 'View STIX 2.1 bundles in a structured graph' },
  { term: 'IOC', href: '/dfir/extract', blurb: 'Extract indicators from raw text with refanging' },

  // PowerShell + malware analysis
  { term: 'PowerShell', href: '/dfir/powershell-deobf', blurb: 'Multi-pass deobfuscator for PowerShell loaders' },
  { term: 'EncodedCommand', href: '/dfir/powershell-deobf', blurb: 'Decode PowerShell -EncodedCommand payloads' },
  { term: 'LOLBin', href: '/dfir/lolbins', blurb: 'Browse Living-Off-the-Land Binary technique catalogue' },
  { term: 'LOLBAS', href: '/dfir/lolbins', blurb: 'Browse Living-Off-the-Land Binary technique catalogue' },

  // Phishing + email
  { term: 'phishing', href: '/dfir/phishing', blurb: 'Analyse email headers + URL/IOC extraction from raw .eml' },

  // Crypto
  { term: 'OFAC', href: '/dfir/crypto-trace', blurb: 'Sanctions-check any BTC/EVM/Solana address' },
  { term: 'wallet drainer', href: '/dfir/crypto-trace', blurb: 'ScamSniffer-flagged drainer addresses surface here' },

  // Breach + exposure
  { term: 'HIBP', href: '/dfir/breach', blurb: 'Check breach exposure for an email or password hash' },
  { term: 'Have I Been Pwned', href: '/dfir/breach', blurb: 'Check breach exposure for an email or password hash' },
  { term: 'subdomain takeover', href: '/dfir/takeover', blurb: 'Check a domain for subdomain-takeover risk' },

  // Privacy
  { term: 'GDPR', href: '/dfir/privacy-hub', blurb: 'Browse the privacy & data-protection hub' },
  { term: 'CCPA', href: '/dfir/privacy-hub', blurb: 'Browse the privacy & data-protection hub' },

  // OSINT
  { term: 'OSINT', href: '/dfir/osint-framework', blurb: 'Open-source intelligence framework' },
  { term: 'Wayback Machine', href: '/dfir/wayback', blurb: 'Wayback Machine timeline pivot' },
  { term: 'GitHub recon', href: '/dfir/github', blurb: 'Profile metadata + commit-email leak scan' },
  { term: 'EXIF', href: '/dfir/exif', blurb: 'EXIF metadata parser for images' },
];
