// onion-proxy is a tiny .onion fetch proxy. It accepts HMAC-authenticated
// POST /fetch requests, dials the requested URL through a local Tor SOCKS5
// instance, and returns the response. .onion-only on both layers (URL parse
// + hostname check). See docs/onion-proxy-design.md for the full design.
//
// Build:   go build -trimpath -ldflags="-s -w" -o onion-proxy proxy.go
// Run:     ONION_PROXY_SECRET_FILE=/etc/onion-proxy/secret ./onion-proxy
//
// Stdlib + golang.org/x/net/proxy (the only non-stdlib dep, for SOCKS5).
package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	xproxy "golang.org/x/net/proxy"
)

const (
	defaultListen      = "127.0.0.1:8080"
	defaultTorSOCKS    = "127.0.0.1:9050"
	defaultMaxBytes    = 1 << 20 // 1 MiB
	hardMaxBytes       = 5 << 20 // 5 MiB
	defaultTimeoutMs   = 15_000
	hardTimeoutMs      = 30_000
	nonceWindow        = 5 * time.Minute
	concurrencyLimit   = 4
	rateBucketCapacity = 60
	rateBucketRefill   = time.Second // 60/min
	nonceRingSize      = 1024
	userAgent          = "Mozilla/5.0 (compatible; pranithjain-onion-proxy/1.0)"
)

type fetchReq struct {
	URL       string `json:"url"`
	MaxBytes  int64  `json:"max_bytes"`
	TimeoutMs int    `json:"timeout_ms"`
}

type fetchResp struct {
	Status      int    `json:"status"`
	ContentType string `json:"content_type"`
	FinalURL    string `json:"final_url"`
	ElapsedMs   int64  `json:"elapsed_ms"`
	Truncated   bool   `json:"truncated"`
	BodyB64     string `json:"body_b64"`
}

type errResp struct {
	Error     string `json:"error"`
	Detail    string `json:"detail,omitempty"`
	ElapsedMs int64  `json:"elapsed_ms,omitempty"`
}

// nonceRing is a tiny FIFO of recently-seen nonces, used to reject replays
// inside the validity window. ~1024 entries → covers ~17 req/sec sustained
// for 5 minutes, which is well above our rate limit.
type nonceRing struct {
	mu    sync.Mutex
	seen  map[string]struct{}
	order []string
	cap   int
}

func newNonceRing(cap int) *nonceRing {
	return &nonceRing{seen: make(map[string]struct{}, cap), order: make([]string, 0, cap), cap: cap}
}

// add returns true if the nonce was new (and is now recorded), false if
// it was a replay.
func (r *nonceRing) add(n string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, dup := r.seen[n]; dup {
		return false
	}
	if len(r.order) >= r.cap {
		evict := r.order[0]
		r.order = r.order[1:]
		delete(r.seen, evict)
	}
	r.seen[n] = struct{}{}
	r.order = append(r.order, n)
	return true
}

// Token-bucket rate limiter. One bucket process-wide; we are not a
// multi-tenant service.
type tokenBucket struct {
	mu     sync.Mutex
	tokens int
	max    int
	refill time.Duration
	last   time.Time
}

func newBucket(max int, refill time.Duration) *tokenBucket {
	return &tokenBucket{tokens: max, max: max, refill: refill, last: time.Now()}
}

func (b *tokenBucket) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	now := time.Now()
	elapsed := now.Sub(b.last)
	add := int(elapsed / b.refill)
	if add > 0 {
		b.tokens += add
		if b.tokens > b.max {
			b.tokens = b.max
		}
		b.last = b.last.Add(time.Duration(add) * b.refill)
	}
	if b.tokens <= 0 {
		return false
	}
	b.tokens--
	return true
}

type server struct {
	secret    []byte
	torDialer xproxy.Dialer
	bucket    *tokenBucket
	sem       chan struct{}
	nonces    *nonceRing
}

func writeErr(w http.ResponseWriter, status int, code, detail string, elapsed time.Duration) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errResp{Error: code, Detail: detail, ElapsedMs: elapsed.Milliseconds()})
}

// validateOnion parses the URL and enforces:
//   - http:// or https:// scheme
//   - hostname ending in ".onion"
//   - no embedded credentials, no fragment fancy stuff
func validateOnion(raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, errors.New("scheme must be http or https")
	}
	if u.User != nil {
		return nil, errors.New("embedded credentials not allowed")
	}
	host := u.Hostname()
	if host == "" {
		return nil, errors.New("missing host")
	}
	// Hostname must be <something>.onion, case-insensitive.
	if !strings.HasSuffix(strings.ToLower(host), ".onion") {
		return nil, errors.New("only .onion hosts permitted")
	}
	// Defence in depth: reject anything resembling private/internal.
	if strings.Contains(host, ":") {
		return nil, errors.New("ipv6 host disallowed")
	}
	return u, nil
}

func (s *server) handleFetch(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if r.Method != http.MethodPost {
		writeErr(w, http.StatusMethodNotAllowed, "method_not_allowed", "", 0)
		return
	}
	if !s.bucket.allow() {
		writeErr(w, http.StatusTooManyRequests, "rate_limited", "global cap", 0)
		return
	}
	select {
	case s.sem <- struct{}{}:
		defer func() { <-s.sem }()
	default:
		writeErr(w, http.StatusServiceUnavailable, "busy", "concurrent in-flight cap", 0)
		return
	}

	// Auth: HMAC-SHA256(secret, nonce + "\n" + sha256_hex(body))
	nonce := r.Header.Get("X-Nonce")
	sig := r.Header.Get("X-Sig")
	if nonce == "" || sig == "" {
		writeErr(w, http.StatusUnauthorized, "missing_auth", "X-Nonce + X-Sig required", 0)
		return
	}
	t, err := time.Parse(time.RFC3339, nonce)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "bad_nonce", "X-Nonce must be RFC3339 UTC", 0)
		return
	}
	if d := time.Since(t); d > nonceWindow || d < -nonceWindow {
		writeErr(w, http.StatusUnauthorized, "stale_nonce", "outside ±5 min window", 0)
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 4096))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "body_read_failed", "", 0)
		return
	}
	bodyHash := sha256.Sum256(body)
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(nonce))
	mac.Write([]byte("\n"))
	mac.Write([]byte(hex.EncodeToString(bodyHash[:])))
	want := mac.Sum(nil)
	got, err := base64.StdEncoding.DecodeString(sig)
	if err != nil || !hmac.Equal(got, want) {
		writeErr(w, http.StatusUnauthorized, "bad_sig", "", 0)
		return
	}
	if !s.nonces.add(nonce) {
		writeErr(w, http.StatusUnauthorized, "replay", "nonce already used", 0)
		return
	}

	// Parse + validate the request.
	var req fetchReq
	if err := json.Unmarshal(body, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad_json", err.Error(), 0)
		return
	}
	u, err := validateOnion(req.URL)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad_url", err.Error(), 0)
		return
	}
	maxBytes := req.MaxBytes
	if maxBytes <= 0 {
		maxBytes = defaultMaxBytes
	}
	if maxBytes > hardMaxBytes {
		maxBytes = hardMaxBytes
	}
	timeoutMs := req.TimeoutMs
	if timeoutMs <= 0 {
		timeoutMs = defaultTimeoutMs
	}
	if timeoutMs > hardTimeoutMs {
		timeoutMs = hardTimeoutMs
	}

	// Build a one-shot HTTP client that dials via Tor.
	httpClient := &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				if network != "tcp" && network != "tcp4" && network != "tcp6" {
					return nil, fmt.Errorf("unsupported network %s", network)
				}
				ctxd, ok := s.torDialer.(xproxy.ContextDialer)
				if ok {
					return ctxd.DialContext(ctx, "tcp", addr)
				}
				return s.torDialer.Dial("tcp", addr)
			},
			DisableKeepAlives:  true,
			DisableCompression: false,
			MaxIdleConns:       0,
		},
		Timeout: time.Duration(timeoutMs) * time.Millisecond,
		// Cap redirects but allow same-host hops (some leak sites bounce /a → /a/).
		CheckRedirect: func(r *http.Request, via []*http.Request) error {
			if len(via) >= 4 {
				return errors.New("too many redirects")
			}
			if _, err := validateOnion(r.URL.String()); err != nil {
				return fmt.Errorf("redirect target invalid: %w", err)
			}
			return nil
		},
	}

	httpReq, _ := http.NewRequest(http.MethodGet, u.String(), nil)
	httpReq.Header.Set("User-Agent", userAgent)
	httpReq.Header.Set("Accept", "text/html,application/xhtml+xml,application/json,*/*;q=0.8")
	httpReq.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "tor_dial_failed", redactErr(err.Error()), time.Since(start))
		return
	}
	defer resp.Body.Close()

	// Read up to maxBytes+1 so we can flag truncation.
	limited := io.LimitReader(resp.Body, maxBytes+1)
	bodyBytes, err := io.ReadAll(limited)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "body_read_failed", redactErr(err.Error()), time.Since(start))
		return
	}
	truncated := false
	if int64(len(bodyBytes)) > maxBytes {
		bodyBytes = bodyBytes[:maxBytes]
		truncated = true
	}

	out := fetchResp{
		Status:      resp.StatusCode,
		ContentType: resp.Header.Get("Content-Type"),
		FinalURL:    resp.Request.URL.String(),
		ElapsedMs:   time.Since(start).Milliseconds(),
		Truncated:   truncated,
		BodyB64:     base64.StdEncoding.EncodeToString(bodyBytes),
	}

	// Redacted log: host only, no path/query.
	log.Printf("fetch host=%s status=%d bytes=%d elapsed_ms=%d truncated=%v",
		u.Hostname(), resp.StatusCode, len(bodyBytes), out.ElapsedMs, truncated)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(out)
}

// redactErr scrubs anything that looks like a path or full URL from error
// strings before they hit logs / the response.
func redactErr(s string) string {
	// Replace anything looking like http(s)://...onion/... with redacted form.
	out := s
	for _, scheme := range []string{"http://", "https://"} {
		for {
			i := strings.Index(out, scheme)
			if i < 0 {
				break
			}
			j := i + len(scheme)
			end := j
			for end < len(out) && out[end] != ' ' && out[end] != '"' {
				end++
			}
			out = out[:i] + "[redacted-url]" + out[end:]
		}
	}
	return out
}

func (s *server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "ts": time.Now().UTC().Format(time.RFC3339)})
}

func main() {
	listen := envOr("ONION_PROXY_LISTEN", defaultListen)
	torAddr := envOr("ONION_PROXY_TOR", defaultTorSOCKS)
	secretFile := envOr("ONION_PROXY_SECRET_FILE", "/etc/onion-proxy/secret")

	rawSecret, err := os.ReadFile(secretFile)
	if err != nil {
		log.Fatalf("read secret: %v", err)
	}
	secret := []byte(strings.TrimSpace(string(rawSecret)))
	if len(secret) < 32 {
		log.Fatalf("secret must be ≥32 chars (got %d)", len(secret))
	}

	dialer, err := xproxy.SOCKS5("tcp", torAddr, nil, &net.Dialer{Timeout: 10 * time.Second})
	if err != nil {
		log.Fatalf("socks5 dialer: %v", err)
	}

	srv := &server{
		secret:    secret,
		torDialer: dialer,
		bucket:    newBucket(rateBucketCapacity, rateBucketRefill),
		sem:       make(chan struct{}, concurrencyLimit),
		nonces:    newNonceRing(nonceRingSize),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/fetch", srv.handleFetch)
	mux.HandleFunc("/healthz", srv.handleHealth)

	httpSrv := &http.Server{
		Addr:              listen,
		Handler:           mux,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      45 * time.Second, // > hardTimeoutMs to allow encoding
		IdleTimeout:       30 * time.Second,
	}
	log.Printf("onion-proxy listening on %s, tor=%s", listen, torAddr)
	if err := httpSrv.ListenAndServe(); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
