# CTI Platform — Threat Intel on the Edge

> **Status:** Live production deployment. The entire platform runs as part of the monorepo at [github.com/Pranith-Jain/Pranith-Jain.github.io](https://github.com/Pranith-Jain/Pranith-Jain.github.io) — this repo contains the original prototype and design artifacts.

**Live:** [pranithjain.qzz.io/threatintel](https://pranithjain.qzz.io/threatintel)

---

## What's live

A working CTI surface on the edge. No backend servers, no database, no subscription.

### Live Feeds (15 surfaces)

| Surface | Description |
|---------|-------------|
| Dark Web Watch | Aggregated leak-site, ransomware, breach activity from 15 RSS sources with keyword watchlist |
| Live Ransomware Activity | Recent ransomware leak-site claims from Ransomlook with per-victim screenshots |
| Infostealer Live Tracker | HudsonRock victim exposure, demonforums ULP, stealer-log Telegram channels |
| Threat Pulse | Fresh threat entities ranked by cross-source activity over 24h |
| Cybersec Telegram Firehose | Curated public Telegram channel message stream |
| Cybersec Reddit Firehose | 16 infosec subreddits |
| Cybersec Social Firehose | 16 researchers on Bluesky + Mastodon |
| Live Breach Disclosures | Have I Been Pwned feed with verification flags |
| Cyber Crime & Fraud | DOJ indictments, crypto-crime tracing, breach reporting |
| Tech & AI News | 16-source feed for AI labs and cyber M&A |
| Cyber Threat Map | Live geolocated choropleth across 7 IOC source types |
| Scam Watch | FTC + FBI IC3 alerts, deepfake-scam news, Reddit victim reports |

### Intel & Analysis (5 surfaces)

| Surface | Description |
|---------|-------------|
| Intel Briefings | Daily and weekly auto-generated digests with CVE, KEV, and IOC sections |
| Writeups Feed | 18+ analyst blogs and vendor research labs aggregated live |
| Threat Actors | APT catalogue with TTPs and MITRE technique mapping |
| MITRE ATT&CK | Full matrix with per-technique deep-dives and actor pivot |
| Threat Intel Metrics | 10-panel dashboard: most-active groups, CVE severity, KEV cadence, IOC volume |

### IOC & Detection (4 surfaces)

| Surface | Description |
|---------|-------------|
| Live IOC Stream | Chronological firehose from 10 sources (TweetFeed, URLhaus, ThreatFox, C2IntelFeeds, etc.) |
| IOC Correlation | Cross-source consensus ranking across 18 independent feeds |
| CVE List | NVD published-CVE feed merged with CISA KEV catalogue |
| Live CVE Updates | Severity, KEV flag, ransomware-use flag, actor attribution |

### Catalogs & Reference (7 surfaces)

| Surface | Description |
|---------|-------------|
| Domain Monitor | Typosquatting scanner with DNS resolution (inspired by haveibeensquatted.com) |
| Detection Rules | Sigma, YARA, Elastic, Splunk, KQL, Suricata — live commit feeds |
| CVE Resources Catalog | ~70 curated CVE sources |
| SecOps Tools Catalog | ~140 hand-picked tools across 14 categories |
| OSINT Framework | 70+ curated OSINT tools, filterable by pricing tier |
| Telegram Catalog | Curated index of public threat-intel Telegram channels |
| Knowledge Base | Long-form articles on Telegram OSINT tradecraft and MITRE workflows |

### Data Sources

- **CISA KEV** — actively exploited vulnerabilities
- **NVD** — CVE feed with CVSS scoring
- **Ransomlook** — ransomware leak-site claims with screenshots
- **ransomware.live PRO** — authenticated API (stats, cyberattacks, negotiation logs)
- **HudsonRock** — infostealer victim exposure
- **Have I Been Pwned** — breach disclosure API
- **TweetFeed** — IOC drops from Twitter
- **URLhaus** — malware URLs
- **ThreatFox** — malware indicators
- **C2IntelFeeds** — C2 server indicators
- **Feodo Tracker** — botnet C2 trackers
- **OpenPhish** — phishing URLs
- **PhishStats** — phishing domain data
- **Blocklist.de** — brute-force IPs
- **Binary Defense** — ban list
- **Ipsum** — multi-source IP reputation
- **Phishing Army** — phishing domain blocklist
- **Bitwire** — threat intelligence feed
- **SANS ISC** — Internet Storm Center
- **Multiple RSS feeds** — 40+ sources across cyber news, vendor blogs, analyst writeups

### Architecture

- **Runtime:** Cloudflare Workers (Hono) + KV + Cache API
- **Cron:** Daily (00:05 UTC) and weekly (Mon 00:15) briefing generation; hourly snapshot warming
- **Security:** CSP/HSTS/X-Frame-Options, SSRF guard, rate limiting, no hardcoded secrets

### Quick links

- **Live:** [pranithjain.qzz.io/threatintel](https://pranithjain.qzz.io/threatintel)
- **DFIR Toolkit:** [pranithjain.qzz.io/dfir](https://pranithjain.qzz.io/dfir)
- **Source:** [github.com/Pranith-Jain/Pranith-Jain.github.io](https://github.com/Pranith-Jain/Pranith-Jain.github.io)
