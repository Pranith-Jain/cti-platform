/**
 * Raw WHOIS over TCP/43 via Cloudflare Workers' `cloudflare:sockets` API.
 *
 * Used as a fallback when RDAP fails — most importantly for Identity Digital
 * TLDs (.ai/.capital/.io/.tech) which 429 the CF Worker IP pool on RDAP
 * but happily answer port-43 WHOIS from the same IPs.
 *
 * Two-step lookup:
 *   1. Query whois.iana.org:43 with the TLD; parse the "whois:" line to
 *      discover the registry's WHOIS server.
 *   2. Query that registry server:43 with the full domain; parse RFC822-ish
 *      "key: value" pairs into the same RdapResult shape we already use.
 */

import { connect } from 'cloudflare:sockets';
import type { RdapResult } from './rdap';

const SOCKET_TIMEOUT_MS = 6000;
const MAX_RESPONSE_BYTES = 64 * 1024;

async function whoisQuery(hostname: string, query: string): Promise<string> {
  const socket = connect({ hostname, port: 43 });
  try {
    const writer = socket.writable.getWriter();
    await writer.write(new TextEncoder().encode(`${query}\r\n`));
    writer.releaseLock();

    const reader = socket.readable.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    const deadline = Date.now() + SOCKET_TIMEOUT_MS;

    for (;;) {
      if (Date.now() > deadline) break;
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      total += value.length;
      if (total >= MAX_RESPONSE_BYTES) break;
    }

    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      buffer.set(c, offset);
      offset += c.length;
    }
    return new TextDecoder('utf-8').decode(buffer);
  } finally {
    try {
      await socket.close();
    } catch {
      /* ignore close errors */
    }
  }
}

function findRegistryServer(ianaResponse: string): string | undefined {
  // Look for "whois: hostname" or "refer: hostname"
  const m = /^\s*(?:whois|refer):\s*(\S+)\s*$/im.exec(ianaResponse);
  return m && m[1] ? m[1].toLowerCase() : undefined;
}

/**
 * Parse RFC822-ish WHOIS response into the RdapResult shape.
 * Handles multiple registry formats: ICANN-style (Verisign, Identity Digital,
 * Google), Nominet (.uk), DENIC (.de), JPRS (.jp), etc. Best-effort.
 */
function parseWhoisResponse(text: string): Partial<RdapResult> {
  const lines = text.split(/\r?\n/);
  const nameservers = new Set<string>();
  const status: string[] = [];
  let registrar: string | undefined;
  let created: string | undefined;
  let expires: string | undefined;
  let updated: string | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('%') || line.startsWith('#') || line.startsWith('>>>')) continue;
    const colon = line.indexOf(':');
    if (colon < 1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const val = line.slice(colon + 1).trim();
    if (!val) continue;

    switch (key) {
      case 'registrar':
      case 'sponsoring registrar':
      case 'registrar name':
        if (!registrar) registrar = val;
        break;
      case 'creation date':
      case 'created':
      case 'registered':
      case 'registered on':
      case 'domain registration date':
        if (!created) created = val;
        break;
      case 'registry expiry date':
      case 'registrar registration expiration date':
      case 'expiration date':
      case 'expires':
      case 'expiry date':
      case 'expire':
        if (!expires) expires = val;
        break;
      case 'updated date':
      case 'last updated':
      case 'last modified':
      case 'changed':
        if (!updated) updated = val;
        break;
      case 'name server':
      case 'nserver':
      case 'nameserver':
      case 'name servers':
        // Normalise — some registries write "ns1.example.com 1.2.3.4"
        {
          const ns = val.split(/\s+/)[0];
          if (ns) nameservers.add(ns.toLowerCase().replace(/\.$/, ''));
        }
        break;
      case 'domain status':
      case 'status':
        status.push(val);
        break;
      default:
        break;
    }
  }

  return {
    registrar,
    created,
    expires,
    updated,
    nameservers: Array.from(nameservers),
    status,
  };
}

function tldOf(domain: string): string | undefined {
  const parts = domain.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : undefined;
}

export async function whoisTcpLookup(domain: string): Promise<RdapResult | null> {
  const lower = domain.trim().toLowerCase();
  const tld = tldOf(lower);
  if (!tld) return null;

  // Step 1: discover the registry whois server via IANA
  let registryServer: string | undefined;
  try {
    const ianaResp = await whoisQuery('whois.iana.org', tld);
    registryServer = findRegistryServer(ianaResp);
  } catch {
    return null;
  }
  if (!registryServer) return null;

  // Step 2: query the registry
  let response: string;
  try {
    response = await whoisQuery(registryServer, lower);
  } catch {
    return null;
  }

  // Some registrars send a "Registrar WHOIS Server: whois.foo.com" line — chase one hop further
  // (only for TLDs where the registry returns "thin" data — e.g. .com via Verisign).
  const referMatch = /^\s*Registrar WHOIS Server:\s*(\S+)\s*$/im.exec(response);
  const referHost = referMatch?.[1]?.toLowerCase();
  if (referHost && referHost !== registryServer) {
    try {
      const thicker = await whoisQuery(referHost, lower);
      // Prefer the thick response if it has a Registrar field
      if (/^\s*registrar:/im.test(thicker)) response = thicker;
    } catch {
      /* fall through with thin response */
    }
  }

  const parsed = parseWhoisResponse(response);
  // If we got nothing useful, signal failure so the caller can fall back further.
  if (!parsed.registrar && (parsed.nameservers ?? []).length === 0 && !parsed.created) {
    return null;
  }

  return {
    registrar: parsed.registrar,
    created: parsed.created,
    expires: parsed.expires,
    updated: parsed.updated,
    nameservers: parsed.nameservers ?? [],
    status: parsed.status ?? [],
  };
}
