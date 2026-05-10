# `.onion` egress proxy — design

Status: **design only, not deployed**. Code lives in `infra/onion-proxy/`. Worker route is feature-flagged off until `ONION_PROXY_URL` is set.

## Why this exists

`/dfir/onion-watch` surfaces the canonical `.onion` mirror addresses for top ransomware leak sites (Ransomlook-backed). It cannot fetch the actual page content — Cloudflare Workers cannot egress through Tor.

For the ransomware leak-post case we already do better than fetching: `/dfir/darkweb` renders Ransomlook's PNG screenshot of each leak page, which is the visible content of the `.onion` site, served from clearnet. Most analysts want the screenshot, not the HTML.

A general-purpose `.onion` fetcher is useful in a smaller set of cases:

- Probing whether a known mirror is alive _right now_ (Ransomlook's status is up to 1h stale).
- Pulling the title / `<meta>` / first-paragraph of a less-tracked `.onion` site.
- Quick header inspection (server version, redirect chain) without firing up Tor Browser.

It is **not** a replacement for Tor Browser for any actual investigation. Read the [opsec section](#opsec--threat-model) before you decide to deploy this at all.

## Architecture

```
[ user browser ]
       │  GET /api/v1/onion-fetch?url=http://example3xyz...onion/
       ▼
[ CF Worker (pranithjain) ]
       │  - per-IP rate limit (existing middleware)
       │  - SSRF guard #1: must be http/https + must end in `.onion`
       │  - HMAC-sign request, POST to proxy
       ▼
[ HTTPS via Caddy (Let's Encrypt cert) ]
       │
       ▼
[ proxy.go on VPS ]
       │  - verify HMAC + nonce window (replay protection)
       │  - SSRF guard #2: parse URL, hostname must match \.onion$
       │  - body cap, timeout cap
       │  - dial via local Tor SOCKS5 (127.0.0.1:9050)
       ▼
[ tor daemon, same VPS ]
       │
       ▼
[ Tor network → .onion site ]
```

Two layers of SSRF guards because either layer alone would be enough — defence in depth lets us fail closed if one layer drifts.

## Components

### VPS service

Three processes on a single small box:

1. **`tor`** (Debian package). Listens on `127.0.0.1:9050` SOCKS5. Default config; no exit-relay role, just a client.
2. **`proxy`** (Go binary built from `infra/onion-proxy/proxy.go`). Listens on `127.0.0.1:8080`. Single endpoint `POST /fetch`.
3. **`caddy`**. Listens on `:443`. Reverse-proxies to `proxy` on `:8080`. Auto-TLS via Let's Encrypt.

Only `:443` is exposed to the internet (ufw default-deny + allow 443/tcp + allow 22/tcp from your admin IP).

### Proxy contract

```http
POST /fetch HTTP/1.1
Content-Type: application/json
X-Nonce: 2026-05-10T13:30:00Z
X-Sig:   <base64 HMAC-SHA256(secret, nonce + "\n" + sha256(body))>

{"url":"http://...onion/path","max_bytes":1048576,"timeout_ms":15000}
```

Response (success):

```json
{
  "status": 200,
  "content_type": "text/html; charset=utf-8",
  "final_url": "http://...onion/path",
  "elapsed_ms": 4231,
  "truncated": false,
  "body_b64": "PGh0bWw+..."
}
```

Response (error): `{ "error": "tor_dial_failed", "elapsed_ms": 12000 }` with appropriate HTTP status (4xx/5xx).

### Auth

- **Shared secret** generated once with `openssl rand -hex 32`.
- Stored in:
  - VPS: `/etc/onion-proxy/secret` (chmod 600, owned by service user)
  - Cloudflare Worker: `wrangler secret put ONION_PROXY_SECRET`
- HMAC of `nonce \n sha256(body)`. Verified constant-time. No bearer token in headers ever.
- **Nonce** = ISO-8601 UTC timestamp from the Worker. Server rejects if outside `now ± 300s`. Recent nonces stored in a small in-memory ring (~1024 entries) to reject replays within the window.

### Limits (proxy-side, hard-coded)

| Knob                 | Default | Cap               |
| -------------------- | ------- | ----------------- |
| `max_bytes`          | 1 MB    | 5 MB              |
| `timeout_ms`         | 15 s    | 30 s              |
| Concurrent in-flight | —       | 4 (semaphore)     |
| Requests per minute  | —       | 60 (token bucket) |

If the proxy is under load it returns `429` immediately rather than queueing — Workers should treat it as transient and surface "proxy busy".

### Logging

Logged: timestamp, source IP (= the CF Worker egress IP, so essentially constant), `.onion` host (NOT path), response status, response bytes, elapsed ms.

**Never logged:** URL path, query string, headers, request/response body, anything from Tor.

Retention: 24 hours, then deleted by a daily cron. Yes, this is short — see opsec.

### Worker route

`GET /api/v1/onion-fetch?url=<urlencoded>` →

```json
{
  "ok": true,
  "status": 200,
  "final_url": "...",
  "content_type": "text/html",
  "body_b64": "...",
  "truncated": false,
  "elapsed_ms": 4231,
  "fetched_at": "2026-05-10T13:30:11Z"
}
```

Worker behaviour:

- Returns `503 service_unavailable` if `ONION_PROXY_URL` is not set in the Worker's bindings — feature-flag for "is this deployed yet".
- SSRF check: parses URL, requires `http:` or `https:` scheme and `*.onion` host. Rejects everything else with `400`.
- Per-IP rate limit via existing `rateLimit` middleware (already on `/api/v1/*`).
- Edge-cache the response 5 min keyed on URL — `.onion` content is volatile but a 5-min cache prevents thundering herds.
- On proxy error, surface the proxy's status code transparently (no obfuscation).

## Opsec & threat model

The honest table.

| Threat                                                                                    | Mitigation                                                                                                                       | Residual risk                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operator (you) becomes a single point of correlation between user IP and `.onion` request | Short log retention, no path/header logging, redacted-only logs                                                                  | **High.** If you ever subpoena-dump or get popped, the CF logs (user IP → request path) plus VPS logs (timing) link the user to the host they visited. Real defence: don't operate this for sensitive use-cases. |
| User's session metadata leaks to the `.onion` site (cookies, browser fingerprint)         | None needed — the proxy is server-side, not a browser                                                                            | Low. Better than Tor Browser in this specific way (the site sees the proxy's headers, not the user's).                                                                                                           |
| `.onion` site fingerprints the proxy + bans it                                            | Use realistic UA, accept 4xx as success                                                                                          | **High.** Many ransomware leak sites + cybercrime forums actively detect Tor-proxy patterns and serve captchas or block. Realistic success rate ≪ 50%.                                                           |
| Abuse: someone scripts the public endpoint to crawl `.onion` content via your IP          | Rate limit + max_bytes cap + auth secret. Worker route additionally rate-limited per-IP.                                         | Medium. Auth secret is the strongest control; without it an attacker would need to compromise your Worker.                                                                                                       |
| Tor exit traffic logs                                                                     | N/A — `.onion` is end-to-end inside Tor, no exit relay involved                                                                  | None for `.onion`. Would matter if you also fetched clearnet via Tor.                                                                                                                                            |
| Malicious response content (XSS in returned HTML rendering, malware download)             | Return body base64-encoded so callers must explicitly decode + render. Don't auto-render in our UI without user click + warning. | Low if respected; high if a future UI just `<iframe srcdoc>`s the result.                                                                                                                                        |
| The VPS gets pwned and its logs / secret exfiltrated                                      | Secret rotation runbook. Logs are 24h-bounded. Service runs as unprivileged user.                                                | Medium. A compromised proxy could log everything before you notice.                                                                                                                                              |

### What we are NOT mitigating

- **Don't use this for real investigations.** Tor Browser on a clean device with no logged-in accounts is the only defensible answer when you actually need to look at something hostile.
- **Don't whitelist sensitive `.onion` hosts.** This proxy is for "what does ALPHV's leak page say right now" type lookups, not for browsing private resources.
- **Don't enable arbitrary clearnet fetching through this.** SSRF guards enforce `.onion`-only on both ends. If you need a generic fetch proxy, that's a different (and much riskier) design.

## Cost & infra options

| Option                           | Monthly | Notes                                                                                                                                  |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Hetzner CX11 (Falkenstein)       | €3.92   | 1 vCPU, 2 GB RAM, 40 GB SSD. Fine for tor + proxy + caddy.                                                                             |
| Hetzner CAX11 (ARM, Falkenstein) | €3.79   | Same, ARM. Go binary builds for arm64 fine.                                                                                            |
| Oracle Cloud Always Free (ARM)   | $0      | 4 OCPUs / 24 GB RAM ARM. Generous, but Oracle has aggressively reclaimed inactive Always Free instances. Don't depend on this for SLA. |
| AWS Lightsail micro              | $3.50   | 1 vCPU, 1 GB RAM. 1 TB transfer.                                                                                                       |
| Cloudflare Workers (changed)     | n/a     | Workers cannot egress through Tor. There is no "Cloudflare-only" version of this.                                                      |

Bandwidth is trivial — 1 MB body cap × ~1 req/min ceiling = ~40 MB/day worst case.

## Why this is feature-flagged

The Worker route returns `503 service_unavailable` until you `wrangler secret put ONION_PROXY_URL` and `ONION_PROXY_SECRET`. This means:

- The toolkit ships safely without anyone having to deploy infra.
- We can merge + deploy the Worker side, and the `.onion`-fetch endpoint just stays dormant.
- If the proxy goes down, the Worker route fails clean instead of 500ing.

## Decision needed

I built the design, the proxy code, and the Worker integration — but I deliberately did not provision a VPS, register a hostname, or generate the secret. Before deploying:

1. Pick the host: Hetzner is the path of least resistance (real SLA, no Always-Free reclamation drama). Oracle Free is the "cheap and risky" option.
2. Decide if you actually want to operate this. Re-read the opsec table. The honest answer for most use-cases is: skip this, link analysts to Tor Browser.
3. If yes: follow `infra/onion-proxy/RUNBOOK.md`.
