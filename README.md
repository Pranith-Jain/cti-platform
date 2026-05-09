# pranithjain.qzz.io

Personal portfolio for **Pranith Jain** — security analyst and detection engineer — bundled with a working DFIR toolkit. Hosted on Cloudflare Workers, free at the edge.

**Live:** [https://pranithjain.qzz.io](https://pranithjain.qzz.io) · [/dfir](https://pranithjain.qzz.io/dfir)

---

## What this repo contains

Two things in one deploy:

1. A React + Vite + TypeScript portfolio site (Home, About, Skills, Experience, Projects, Contact).
2. A **24-tool DFIR toolkit** living under `/dfir/*`, served by a Hono-based Worker API at `/api/v1/*`.

The portfolio site and the API run from the same Cloudflare Worker. Same origin, no CORS, no separate hosting bill.

## DFIR toolkit at a glance

**Featured tools** (`/dfir`):

| Tool               | Path               | What it does                                                                                         |
| ------------------ | ------------------ | ---------------------------------------------------------------------------------------------------- |
| IOC Checker        | `/dfir/ioc-check`  | Streams 22 threat-intel sources in parallel for IPs, domains, URLs, hashes                           |
| IOC Extractor      | `/dfir/extract`    | Pulls IOCs from any text blob, refang-aware                                                          |
| Subdomain Takeover | `/dfir/takeover`   | CNAME chain + 15 dangling-service fingerprints                                                       |
| Phishing Analyzer  | `/dfir/phishing`   | Email headers, auth, embedded URLs cross-checked against threat intel                                |
| MITRE ATT&CK       | `/dfir/mitre`      | Matrix + technique deep-dive + actor mapping                                                         |
| STIX Viewer        | `/dfir/stix`       | Visualise STIX 2.1 bundles as an interactive relationship graph                                      |
| Dark Web Watch     | `/dfir/darkweb`    | Aggregated leak-site, ransomware, breach activity from 15 sources, with persistent keyword watchlist |
| Cyber Threat Map   | `/dfir/threat-map` | Live geolocated choropleth of malicious infrastructure across 7 IOC sources                          |
| Intel Briefings    | `/dfir/briefings`  | Daily and weekly digests, cron-built from KEV + abuse.ch + snapshot blocklists                       |

**Utilities** (`/dfir/...`): Domain Lookup, Exposure Scanner, File Analyzer, JWT Inspector, Homograph Detector, CVE Lookup, URL Preview, ASN Lookup, Breach Checker, EXIF Parser, Decoder, Knowledge Base, Recent Lookups, Threat Actors, Privacy Check.

**22 IOC providers** wired across IOC Checker, File Analyzer, Phishing Analyzer, and Domain Checker:

- **Commercial (API key)**: VirusTotal, AbuseIPDB, Shodan, OTX, URLScan, Hybrid Analysis
- **abuse.ch (one shared free key)**: ThreatFox, URLhaus, MalwareBazaar
- **Public lists / no signup**: Feodo Tracker, Spamhaus DROP/EDROP, Tor exit list, OpenPhish, Cloudflare DoH, Bitwire, Blocklist.de, Binary Defense, Ipsum (3+ source consensus), Phishing Army, CIRCL Hashlookup, TweetFeed, CINS Army

## Tech stack

| Layer     | Choice                                                                                     |
| --------- | ------------------------------------------------------------------------------------------ |
| Frontend  | React 18 + Vite + TypeScript + Tailwind                                                    |
| Routing   | React Router v6 (lazy-loaded routes)                                                       |
| Animation | Framer Motion                                                                              |
| Map viz   | react-simple-maps with locally-bundled natural-earth atlas                                 |
| Graph viz | @xyflow/react (lazy-loaded only on `/dfir/stix`)                                           |
| Backend   | Cloudflare Workers + Hono                                                                  |
| Storage   | Cloudflare KV (briefings, sparse rate-limit), Cache API (provider results, blocklist text) |
| Cron      | Daily 00:05 UTC, Weekly Mon 00:15 UTC (briefing generation)                                |
| Tests     | Vitest + Testing Library                                                                   |

## Repository layout

```
.
├── src/                     # React app
│   ├── pages/
│   │   ├── *.tsx            # Home, About, Skills, Experience, Projects, NotFound
│   │   └── dfir/*.tsx       # Per-tool pages
│   ├── components/
│   │   ├── sections/*       # Hero, About section, Contact, etc.
│   │   └── dfir/*           # IOC chips, ToolGrid, ThreatIntelFeed, etc.
│   ├── lib/dfir/*           # Client-side parsers, indicator detection, privacy probes
│   ├── services/            # RSS service (proxy-aware fetcher)
│   └── data/                # content.ts, threat-actors, wiki, RSS feed catalog
├── api/src/                 # Worker (Hono) API
│   ├── index.ts             # Route registration
│   ├── routes/*             # ioc, domain, file, phishing, exposure, takeover,
│   │                        # threat-map, briefings, feeds proxy, etc.
│   ├── providers/*          # 22 IOC providers (each ~50-80 LOC)
│   └── lib/*                # ioc-feed-parsers, scoring, cache, rate-limit, dns,
│                            # rdap, crt-sh, email-auth, briefing-builder
├── worker/index.ts          # Worker entry, dispatches to api/src and serves SPA assets
├── public/                  # Static assets (sitemap.xml, world-110m.json, robots.txt)
├── wrangler.jsonc           # Cloudflare config
└── vite.config.ts
```

## Local dev

```bash
npm install
npm run dev          # Vite at http://localhost:5173
npm run dev:api      # Worker at http://localhost:8787 (proxies /api/v1 from vite)
npm test             # Vitest
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
```

## Deploy

```bash
npm run deploy       # vite build && wrangler deploy
```

Requires `wrangler login` and a Cloudflare account that owns the `pranithjain.qzz.io` zone (or fork the repo and update `wrangler.jsonc` with your own zone).

## Secrets

API keys (none required for the public-list providers):

```bash
npx wrangler secret put VT_API_KEY              # VirusTotal
npx wrangler secret put ABUSEIPDB_API_KEY
npx wrangler secret put SHODAN_API_KEY
npx wrangler secret put OTX_API_KEY
npx wrangler secret put URLSCAN_API_KEY
npx wrangler secret put HYBRID_ANALYSIS_API_KEY
npx wrangler secret put ABUSECH_AUTH_KEY        # one key unlocks ThreatFox, URLhaus, MalwareBazaar
```

The toolkit boots usefully with **zero keys** thanks to the public-list providers; commercial keys add depth.

## Cost / quotas

Engineered to fit the **Cloudflare Workers free tier** end-to-end:

- IOC provider results cache to the **Cache API**, not KV (KV daily-write quota stays untouched).
- `/api/v1/feeds/proxy` is exempt from KV-backed rate limiting since the SSRF allow-list is the real defense and counting hits in KV burned the daily quota.
- World atlas (108 KB) is bundled locally to avoid CSP-forbidden CDN fetches.

## Data sources

See `src/data/rssFeeds.ts` for the full RSS catalog and `api/src/providers/*` for the IOC provider list. Threat-intel data refreshes hourly server-side; briefings rebuild via cron.

## Credit / contact

Built and maintained by Pranith Jain. Email available via the Contact section. Logo + design are mine; please don't lift them as-is.

The toolkit is opinionated about which sources are worth pulling and how to weight them. PRs that add a genuinely-distinctive source or improve scoring math are welcome; PRs that just stuff the catalog less so.
