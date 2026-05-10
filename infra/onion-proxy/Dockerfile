# Multi-stage build of the onion-proxy.
# Final image bundles the Go binary + tor + a minimal supervisord so the
# container exposes one process boundary while running both daemons.
#
# Build:   docker build -t onion-proxy:latest .
# Run:     docker run -d --name onion-proxy -p 127.0.0.1:8080:8080 \
#            -v /etc/onion-proxy/secret:/etc/onion-proxy/secret:ro \
#            onion-proxy:latest

# ---- builder ----
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY proxy.go ./
RUN go mod tidy && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/onion-proxy proxy.go

# ---- runtime ----
FROM alpine:3.19
RUN apk add --no-cache tor supervisor ca-certificates tini && \
    adduser -D -u 1001 -s /sbin/nologin proxy && \
    mkdir -p /etc/onion-proxy /var/log/supervisor && \
    chown proxy:proxy /etc/onion-proxy

COPY --from=builder /out/onion-proxy /usr/local/bin/onion-proxy
COPY supervisord.conf /etc/supervisord.conf
COPY torrc /etc/tor/torrc

EXPOSE 8080
ENV ONION_PROXY_LISTEN=0.0.0.0:8080 \
    ONION_PROXY_TOR=127.0.0.1:9050 \
    ONION_PROXY_SECRET_FILE=/etc/onion-proxy/secret

ENTRYPOINT ["/sbin/tini", "--", "/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
