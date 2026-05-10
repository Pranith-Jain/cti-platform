# onion-proxy — deploy & ops runbook

Read [`docs/onion-proxy-design.md`](../../docs/onion-proxy-design.md) **first**. The opsec section is not optional. If you don't want to operate the proxy at all, the Worker side is feature-flagged off — just skip this runbook and the route stays dormant.

## Pre-flight

You will need:

- A small VPS (Hetzner CX11 / CAX11 = path of least resistance). 2 GB RAM, 1 vCPU, 20+ GB disk.
- A subdomain (e.g. `onion-proxy.your-domain.tld`) with an A record → VPS IP.
- A working `wrangler` login on this repo so you can `wrangler secret put`.

## 1. Provision the VPS

Pick one. The proxy does not need a static IP — it can move freely.

**Hetzner Cloud (recommended):**

```bash
# In their console: create CX11, image = "Debian 12", SSH key = yours.
# Note the public IPv4 + IPv6.
```

**Oracle Cloud Always Free (cheap & risky):** create one Ampere A1 instance with Ubuntu 22.04. Open port 443 in the security list. Beware: Oracle aggressively reclaims idle instances; do not run anything you'd miss here.

## 2. DNS

Create an A record (and AAAA if you have IPv6):

```
onion-proxy.your-domain.tld   A    <vps-ipv4>
```

## 3. Initial host hardening

```bash
ssh root@<vps>
adduser admin
adduser admin sudo
rsync --archive --chown=admin:admin ~/.ssh /home/admin
# Lock down sshd
sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
# Firewall
apt-get update && apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 443/tcp
ufw --force enable
# Unattended security updates
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades  # answer yes
exit
```

## 4. Generate the shared secret

On the VPS:

```bash
sudo mkdir -p /etc/onion-proxy
sudo openssl rand -hex 32 | sudo tee /etc/onion-proxy/secret > /dev/null
sudo chmod 600 /etc/onion-proxy/secret
sudo cat /etc/onion-proxy/secret  # copy this string
```

Stash the secret value somewhere you can retrieve it once for the wrangler step. Do not commit it.

## 5. Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker admin
# Log out + back in for the group to take effect.
```

## 6. Deploy the proxy

```bash
# As 'admin':
git clone https://github.com/<you>/portfolio.git ~/portfolio
cd ~/portfolio/infra/onion-proxy
docker compose up -d --build

# Verify the container is up and tor bootstrapped (~30 s on first run):
docker compose logs onion-proxy | grep -E "Bootstrapped 100|onion-proxy listening"

# Local sanity check from the VPS (no signature, will get 401 — that's fine):
curl -i http://127.0.0.1:8080/healthz
# {"ok":true,"ts":"..."}
```

## 7. Front with Caddy (TLS)

```bash
sudo apt-get install -y caddy
sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
onion-proxy.your-domain.tld {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8080
    log {
        output discard          # do not duplicate request logs at the edge
    }
    header {
        # Tighten headers; this isn't a public web app.
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "no-referrer"
        # Caller is the Worker; reject anything pretending to be a browser
        # accidentally hitting it.
        ?Server "onion-proxy"
    }
}
EOF
sudo systemctl restart caddy
# Caddy will auto-fetch a Let's Encrypt cert. Watch:
sudo journalctl -u caddy -f
```

Verify from outside the VPS:

```bash
curl https://onion-proxy.your-domain.tld/healthz
# {"ok":true,"ts":"..."}
```

## 8. Tell the Worker about the proxy

From your dev machine, in the repo root:

```bash
echo "https://onion-proxy.your-domain.tld" | wrangler secret put ONION_PROXY_URL
echo "<the-32-byte-hex-secret-from-step-4>" | wrangler secret put ONION_PROXY_SECRET
wrangler deploy
```

The Worker route flips from 503 → live on the next deploy.

## 9. End-to-end smoke test

```bash
# Pick any working .onion (e.g. one from /api/v1/onion-watch). DuckDuckGo's
# .onion is a stable, low-risk choice for testing:
curl -s "https://pranithjain.qzz.io/api/v1/onion-fetch?url=https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/" | jq '{status, content_type, truncated, elapsed_ms, body_first_120: (.body_b64 | @base64d | .[0:120])}'
```

If you get `{"status":200, ...}` with HTML in `body_first_120`, you're live.

## Ops

### Rotate the secret

```bash
# On the VPS:
sudo openssl rand -hex 32 | sudo tee /etc/onion-proxy/secret > /dev/null
docker compose restart onion-proxy
sudo cat /etc/onion-proxy/secret  # copy

# On dev:
echo "<new-secret>" | wrangler secret put ONION_PROXY_SECRET
wrangler deploy
```

There is no overlap window — clients will see ~10s of `bad_sig` 401s during the swap. Do this when traffic is low.

### View logs

```bash
docker compose logs -f --tail=100 onion-proxy
# Each fetch line: host=<onion> status=<code> bytes=<n> elapsed_ms=<n>
# Path / query / body are NEVER logged.
```

### Kill switch

```bash
docker compose down
# OR remove the worker secret to force 503 globally:
wrangler secret delete ONION_PROXY_URL
wrangler deploy
```

### Renew the TLS cert

Caddy auto-renews. Nothing to do.

### Tor not bootstrapping?

```bash
docker exec -it onion-proxy cat /var/log/tor/notices.log | tail -30
```

Common causes: VPS provider blocks outbound 9001/9030 (rare), DNS broken inside the container, or Tor's directory authorities are unreachable from your region (try restarting; bootstrap is occasionally flaky).

### Updating the proxy

```bash
cd ~/portfolio
git pull
cd infra/onion-proxy
docker compose up -d --build
```

## What "broken" looks like

| Symptom                                              | Likely cause                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `503 service_unavailable` from `/api/v1/onion-fetch` | Worker secrets not set, or `ONION_PROXY_URL` empty. Check `wrangler secret list`.                 |
| `502 proxy_unreachable`                              | VPS down, caddy stopped, DNS broken. `curl https://<host>/healthz` from your laptop.              |
| `401 bad_sig`                                        | Secret mismatch between Worker and VPS. Re-run step 8 with the current VPS secret.                |
| `401 stale_nonce`                                    | VPS clock out of sync. `sudo timedatectl status`; install `chrony`.                               |
| `400 bad_url`                                        | Caller passed something that isn't `*.onion`. Working as intended.                                |
| `502 tor_dial_failed`                                | The .onion target is offline / serving a captcha / blocking Tor proxies. Mostly out of our hands. |
| `429 rate_limited` from the proxy                    | Global token bucket hit (60/min). Back off.                                                       |
| `503 busy`                                           | All 4 concurrent slots in use. Transient.                                                         |

## What we are NOT supporting

- Authenticated `.onion` sites (no cookie / session forwarding).
- POST / PUT / DELETE — only GET via the proxy.
- Streaming responses — body is fully buffered up to `max_bytes`.
- Clearnet fetching. The proxy refuses anything not ending in `.onion`.
- Long-running connections (websockets, server-sent events).

If you need any of these, you want a different design.
