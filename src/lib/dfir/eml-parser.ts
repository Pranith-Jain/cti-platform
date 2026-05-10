/**
 * Pure-client RFC 5322 / MIME parser focused on attachment extraction.
 *
 * Scope: extract Content-Disposition: attachment parts (and inline parts
 * with a filename) plus their decoded bytes, then SHA-256 each one. Used
 * by /dfir/eml. Not a full mail parser — header decoding is best-effort,
 * we don't follow message/rfc822 nesting unless the user pastes the
 * inner message manually.
 *
 * Encodings handled:
 *   - 7bit / 8bit / binary  (passthrough)
 *   - base64                (atob with padding fix)
 *   - quoted-printable      (=XX hex + soft line breaks)
 *
 * Charset of HEADERS handled via RFC 2047 encoded-word (=?utf-8?B?...?=
 * and =?iso-8859-1?Q?...?=). Body charset stays as bytes — we hash bytes,
 * we don't decode bodies as text.
 *
 * Hard limits: 10 MB total .eml input, 5 MB per part. Beyond those, the
 * parser bails with a clear error.
 */

const MAX_INPUT = 10 * 1024 * 1024;
const MAX_PART_BYTES = 5 * 1024 * 1024;

export interface EmlHeader {
  name: string;
  value: string;
}

export interface EmlAttachment {
  /** Decoded filename, or "(unnamed)" if none. */
  filename: string;
  /** MIME content-type without parameters. */
  contentType: string;
  /** content-disposition: attachment | inline | (none). */
  disposition: 'attachment' | 'inline' | 'unknown';
  /** Decoded byte length. */
  size: number;
  /** Hex-encoded SHA-256 of the decoded bytes. */
  sha256: string;
  /** Hex-encoded SHA-1 of the decoded bytes (for compatibility with older corpora). */
  sha1: string;
  /** Hex-encoded MD5 of the decoded bytes (legacy IOC compatibility). */
  md5: string;
  /** True if the part exceeded the per-part byte cap and was truncated. */
  truncated: boolean;
}

export interface ParsedEml {
  headers: EmlHeader[];
  /** Decoded subject (RFC 2047 unwrapped). */
  subject?: string;
  /** Decoded from header (display + addr-spec). */
  from?: string;
  to?: string;
  date?: string;
  /** Top-level Content-Type. */
  contentType?: string;
  attachments: EmlAttachment[];
  /** Soft warnings — parsing continued, but something was odd. */
  warnings: string[];
}

/* ──────────────────────────────────────────────────────────────────
 * Header decoding (RFC 2047 encoded-word)
 * ────────────────────────────────────────────────────────────────── */

function decodeQ(s: string): string {
  // =XX → byte; underscore → space
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '=' && i + 2 < s.length) {
      const hex = s.slice(i + 1, i + 3);
      const code = parseInt(hex, 16);
      if (!Number.isNaN(code)) {
        out += String.fromCharCode(code);
        i += 2;
        continue;
      }
    }
    if (ch === '_') out += ' ';
    else out += ch;
  }
  return out;
}

function decodeEncodedWord(token: string): string {
  // =?charset?encoding?text?=
  const m = /^=\?([^?]+)\?([BbQq])\?([^?]*)\?=$/.exec(token);
  if (!m || !m[1] || !m[2] || m[3] == null) return token;
  const charset = m[1].toLowerCase();
  const encoding = m[2].toUpperCase();
  const text = m[3];
  let bytes: Uint8Array;
  try {
    if (encoding === 'B') {
      const bin = atob(text);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    } else {
      const decoded = decodeQ(text);
      bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i) & 0xff;
    }
    return new TextDecoder(charset === 'utf8' ? 'utf-8' : charset, { fatal: false }).decode(bytes);
  } catch {
    return token;
  }
}

function decodeHeaderValue(value: string): string {
  // Replace encoded-words inline. "Adjacent" encoded-words have whitespace
  // collapsed between them per RFC.
  return value.replace(/(=\?[^?]+\?[BbQq]\?[^?]*\?=)(\s+(?==\?))?/g, (_full, word: string) => decodeEncodedWord(word));
}

/* ──────────────────────────────────────────────────────────────────
 * Header parsing
 * ────────────────────────────────────────────────────────────────── */

interface ParsedHeader {
  raw: string;
  name: string;
  value: string;
  /** Map of param name → value, with quotes stripped. */
  params: Record<string, string>;
}

/**
 * Split eml into header block + body, then unfold header continuations
 * (lines starting with whitespace are continuations of the prior header).
 */
function splitHeaderBody(eml: string): { headers: string[]; body: string } {
  const sep = eml.search(/\r?\n\r?\n/);
  if (sep < 0) return { headers: [], body: eml };
  const headerBlock = eml.slice(0, sep);
  const body = eml.slice(sep).replace(/^(\r?\n){2}/, '');
  const lines = headerBlock.split(/\r?\n/);
  const folded: string[] = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && folded.length > 0) {
      folded[folded.length - 1] += ' ' + line.trim();
    } else if (line.length > 0) {
      folded.push(line);
    }
  }
  return { headers: folded, body };
}

function parseHeaderLine(line: string): ParsedHeader | null {
  const idx = line.indexOf(':');
  if (idx < 0) return null;
  const name = line.slice(0, idx).trim();
  const rest = line.slice(idx + 1).trim();

  // Split off parameters at "; key=value; key2=value2"
  const params: Record<string, string> = {};
  const segments: string[] = [];
  let depth = 0;
  let inQuote = false;
  let cur = '';
  for (const ch of rest) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === '(' && !inQuote) depth += 1;
    if (ch === ')' && !inQuote) depth = Math.max(0, depth - 1);
    if (ch === ';' && !inQuote && depth === 0) {
      segments.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur) segments.push(cur);

  const value = (segments[0] ?? '').trim();
  for (let i = 1; i < segments.length; i += 1) {
    const seg = segments[i]!.trim();
    const eq = seg.indexOf('=');
    if (eq < 0) continue;
    const k = seg.slice(0, eq).trim().toLowerCase();
    let v = seg.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    params[k] = v;
  }
  return { raw: line, name, value, params };
}

/* ──────────────────────────────────────────────────────────────────
 * Body decoding
 * ────────────────────────────────────────────────────────────────── */

function decodeBase64ToBytes(s: string): Uint8Array {
  // Strip whitespace, fix padding
  const cleaned = s.replace(/[\r\n\s]/g, '');
  const padded = cleaned.padEnd(cleaned.length + ((4 - (cleaned.length % 4)) % 4), '=');
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeQpToBytes(s: string): Uint8Array {
  // Soft line breaks: =\r?\n → empty
  const noSoft = s.replace(/=\r?\n/g, '');
  const out: number[] = [];
  for (let i = 0; i < noSoft.length; i += 1) {
    const ch = noSoft[i];
    if (ch === '=' && i + 2 < noSoft.length) {
      const hex = noSoft.slice(i + 1, i + 3);
      const code = parseInt(hex, 16);
      if (!Number.isNaN(code)) {
        out.push(code);
        i += 2;
        continue;
      }
    }
    out.push((ch ?? '\0').charCodeAt(0) & 0xff);
  }
  return new Uint8Array(out);
}

function passthroughToBytes(s: string): Uint8Array {
  // 7bit / 8bit / binary: each char becomes a byte (low 8 bits).
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/* ──────────────────────────────────────────────────────────────────
 * MIME multipart walker
 * ────────────────────────────────────────────────────────────────── */

interface MimePart {
  headers: ParsedHeader[];
  body: string;
}

function splitParts(body: string, boundary: string): string[] {
  const marker = `--${boundary}`;
  const closeMarker = `--${boundary}--`;
  const parts: string[] = [];
  // Normalise line endings so split is consistent.
  const normalised = body.replace(/\r\n/g, '\n');
  const lines = normalised.split('\n');
  let cur: string[] | null = null;
  for (const line of lines) {
    if (line === marker) {
      if (cur) parts.push(cur.join('\n'));
      cur = [];
      continue;
    }
    if (line === closeMarker) {
      if (cur) parts.push(cur.join('\n'));
      cur = null;
      break;
    }
    if (cur) cur.push(line);
  }
  return parts;
}

function parsePart(raw: string): MimePart {
  const { headers, body } = splitHeaderBody(raw);
  const parsedHeaders: ParsedHeader[] = [];
  for (const h of headers) {
    const ph = parseHeaderLine(h);
    if (ph) parsedHeaders.push(ph);
  }
  return { headers: parsedHeaders, body };
}

function findHeader(headers: ParsedHeader[], name: string): ParsedHeader | undefined {
  const lower = name.toLowerCase();
  return headers.find((h) => h.name.toLowerCase() === lower);
}

/* ──────────────────────────────────────────────────────────────────
 * Hashing
 * ────────────────────────────────────────────────────────────────── */

async function digestHex(algorithm: 'SHA-256' | 'SHA-1' | 'MD5', bytes: Uint8Array): Promise<string> {
  // SubtleCrypto doesn't ship MD5. We compute MD5 in pure JS as the
  // common case: legacy IOC databases still use it.
  if (algorithm === 'MD5') return md5Hex(bytes);
  const buf = await crypto.subtle.digest(algorithm, bytes as unknown as BufferSource);
  const arr = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < arr.length; i += 1) out += arr[i]!.toString(16).padStart(2, '0');
  return out;
}

/* ──────────────────────────────────────────────────────────────────
 * MD5 (RFC 1321) — minimal pure-JS implementation
 * Used because SubtleCrypto.digest does not support 'MD5'. We need
 * MD5 because legacy IOC corpora (VirusTotal pre-2010 entries, OTX
 * indicator pulses, certain old YARA rules) still key by MD5.
 * ────────────────────────────────────────────────────────────────── */

function md5Hex(bytes: Uint8Array): string {
  // Reference impl, keep small. Not constant-time, fine for this use.
  const r = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const k = new Uint32Array([
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8,
    0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
    0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87,
    0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039,
    0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
    0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb,
    0xeb86d391,
  ]);
  // Append padding.
  const bitLen = bytes.length * 8;
  const padLen = (56 - ((bytes.length + 1) % 64) + 64) % 64;
  const buf = new Uint8Array(bytes.length + 1 + padLen + 8);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  // Length in little-endian 64 bits
  const view = new DataView(buf.buffer);
  view.setUint32(buf.length - 8, bitLen >>> 0, true);
  view.setUint32(buf.length - 4, Math.floor(bitLen / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  for (let off = 0; off < buf.length; off += 64) {
    const m = new Uint32Array(16);
    for (let i = 0; i < 16; i += 1) m[i] = view.getUint32(off + i * 4, true);
    let a = a0,
      b = b0,
      c = c0,
      d = d0;
    for (let i = 0; i < 64; i += 1) {
      let f = 0,
        g = 0;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const temp = d;
      d = c;
      c = b;
      const sum = (a + f + k[i]! + m[g]!) >>> 0;
      const shift = r[(i >>> 4) * 4 + (i % 4)]!;
      b = (b + ((sum << shift) | (sum >>> (32 - shift)))) >>> 0;
      a = temp;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, a0, true);
  ov.setUint32(4, b0, true);
  ov.setUint32(8, c0, true);
  ov.setUint32(12, d0, true);
  let hex = '';
  for (let i = 0; i < 16; i += 1) hex += out[i]!.toString(16).padStart(2, '0');
  return hex;
}

/* ──────────────────────────────────────────────────────────────────
 * Public API
 * ────────────────────────────────────────────────────────────────── */

export async function parseEml(eml: string): Promise<ParsedEml> {
  const warnings: string[] = [];
  if (eml.length > MAX_INPUT) {
    throw new Error(`Input too large: ${eml.length} bytes > ${MAX_INPUT} bytes max`);
  }

  const { headers: hdrLines, body } = splitHeaderBody(eml);
  const headers: ParsedHeader[] = [];
  for (const line of hdrLines) {
    const ph = parseHeaderLine(line);
    if (ph) headers.push(ph);
  }

  const decodedHeaders: EmlHeader[] = headers.map((h) => ({
    name: h.name,
    value: decodeHeaderValue(h.value),
  }));

  const subject = decodedHeaders.find((h) => h.name.toLowerCase() === 'subject')?.value;
  const from = decodedHeaders.find((h) => h.name.toLowerCase() === 'from')?.value;
  const to = decodedHeaders.find((h) => h.name.toLowerCase() === 'to')?.value;
  const date = decodedHeaders.find((h) => h.name.toLowerCase() === 'date')?.value;

  const ct = findHeader(headers, 'content-type');
  const contentType = ct?.value;

  const attachments: EmlAttachment[] = [];

  // Recursive walker — flat-walks every leaf MIME part. message/rfc822
  // nesting is treated as a leaf (the user can paste the inner message).
  async function walk(partHeaders: ParsedHeader[], partBody: string, depth: number): Promise<void> {
    if (depth > 20) {
      warnings.push('multipart nesting too deep — bailing at depth 20');
      return;
    }
    const ctHeader = findHeader(partHeaders, 'content-type');
    const ctValue = (ctHeader?.value ?? '').toLowerCase();
    const boundary = ctHeader?.params['boundary'];
    if (ctValue.startsWith('multipart/') && boundary) {
      const subParts = splitParts(partBody, boundary);
      for (const sp of subParts) {
        const parsed = parsePart(sp);
        await walk(parsed.headers, parsed.body, depth + 1);
      }
      return;
    }

    // Leaf part. Is it an attachment?
    const cdHeader = findHeader(partHeaders, 'content-disposition');
    const cdValue = (cdHeader?.value ?? '').toLowerCase();
    const filename =
      cdHeader?.params['filename'] ??
      cdHeader?.params['filename*'] ??
      ctHeader?.params['name'] ??
      ctHeader?.params['name*'] ??
      null;

    const isAttachment = cdValue === 'attachment' || (filename != null && cdValue !== 'inline-only');
    const hasFilename = filename != null && filename.length > 0;

    // We treat any leaf part with a filename as an attachment for
    // forensics purposes — analysts typically want every embedded file
    // hashed, not just those flagged disposition: attachment.
    if (!isAttachment && !hasFilename) return;

    const cteHeader = findHeader(partHeaders, 'content-transfer-encoding');
    const cte = (cteHeader?.value ?? '7bit').toLowerCase();

    let bytes: Uint8Array;
    try {
      if (cte === 'base64') bytes = decodeBase64ToBytes(partBody);
      else if (cte === 'quoted-printable') bytes = decodeQpToBytes(partBody);
      else bytes = passthroughToBytes(partBody);
    } catch (e) {
      warnings.push(`failed to decode part "${filename ?? '(unnamed)'}": ${(e as Error).message}`);
      return;
    }

    let truncated = false;
    if (bytes.length > MAX_PART_BYTES) {
      bytes = bytes.slice(0, MAX_PART_BYTES);
      truncated = true;
    }

    const [sha256, sha1, md5] = await Promise.all([
      digestHex('SHA-256', bytes),
      digestHex('SHA-1', bytes),
      digestHex('MD5', bytes),
    ]);

    attachments.push({
      filename: hasFilename ? decodeHeaderValue(filename!) : '(unnamed)',
      contentType: ctValue.split(';')[0]!.trim() || 'application/octet-stream',
      disposition: cdValue === 'attachment' ? 'attachment' : cdValue === 'inline' ? 'inline' : 'unknown',
      size: bytes.length,
      sha256,
      sha1,
      md5,
      truncated,
    });
  }

  await walk(headers, body, 0);

  return {
    headers: decodedHeaders,
    subject,
    from,
    to,
    date,
    contentType,
    attachments,
    warnings,
  };
}
