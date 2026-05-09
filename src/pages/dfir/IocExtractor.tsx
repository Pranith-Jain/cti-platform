import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ClipboardCopy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

type IocBucket = 'ipv4' | 'ipv6' | 'domain' | 'url' | 'md5' | 'sha1' | 'sha256' | 'email';

const PATTERNS: Record<IocBucket, RegExp> = {
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  ipv6: /\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g,
  url: /\b(?:https?|hxxps?):\/\/[^\s<>"')]+/gi,
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\b/gi,
  md5: /\b[a-f0-9]{32}\b/gi,
  sha1: /\b[a-f0-9]{40}\b/gi,
  sha256: /\b[a-f0-9]{64}\b/gi,
  email: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi,
};

const ORDER: IocBucket[] = ['ipv4', 'ipv6', 'domain', 'url', 'md5', 'sha1', 'sha256', 'email'];
const LABELS: Record<IocBucket, string> = {
  ipv4: 'IPv4',
  ipv6: 'IPv6',
  domain: 'Domains',
  url: 'URLs',
  md5: 'MD5',
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  email: 'Emails',
};

function refang(input: string): string {
  return input
    .replace(/\[\.\]/g, '.')
    .replace(/\(\.\)/g, '.')
    .replace(/\[:\]/g, ':')
    .replace(/hxxps?:\/\//gi, (m) => m.replace(/x/g, 't'))
    .replace(/\[at\]/gi, '@');
}

function defang(s: string, type: IocBucket): string {
  if (type === 'url') return s.replace(/\./g, '[.]').replace(/^https?/i, (m) => m.replace(/t/gi, 'x'));
  if (type === 'ipv4' || type === 'ipv6' || type === 'domain' || type === 'email') return s.replace(/\./g, '[.]');
  return s;
}

interface ExtractResult {
  bucket: IocBucket;
  values: string[];
}

function extract(text: string): ExtractResult[] {
  const refanged = refang(text);
  const consumed = new Set<string>(); // hash matches dedupe by string; keep order

  // Order matters: hashes first (longest), then URLs, then ipv4, then ipv6, then email, then domain (last to avoid eating others)
  const order: IocBucket[] = ['sha256', 'sha1', 'md5', 'url', 'ipv4', 'ipv6', 'email', 'domain'];
  const out: Record<IocBucket, Set<string>> = {
    ipv4: new Set(),
    ipv6: new Set(),
    domain: new Set(),
    url: new Set(),
    md5: new Set(),
    sha1: new Set(),
    sha256: new Set(),
    email: new Set(),
  };

  let working = refanged;
  for (const bucket of order) {
    const matches = working.match(PATTERNS[bucket]) ?? [];
    for (const m of matches) {
      const lower = bucket === 'url' ? m : m.toLowerCase();
      // skip if already counted as a longer/more-specific type
      if (consumed.has(lower)) continue;
      // domains inside a URL/email shouldn't double-count
      if (bucket === 'domain') {
        const inUrl = [...out.url].some((u) => u.toLowerCase().includes(lower));
        const inEmail = [...out.email].some((e) => e.toLowerCase().includes(lower));
        if (inUrl || inEmail) continue;
      }
      out[bucket].add(lower);
      consumed.add(lower);
    }
    // remove matches from working text so domain pass doesn't pick them up
    if (bucket === 'url' || bucket === 'email') {
      working = working.replace(PATTERNS[bucket], ' ');
    }
  }

  return ORDER.map((b) => ({ bucket: b, values: [...out[b]].sort() })).filter((r) => r.values.length > 0);
}

export default function IocExtractor(): JSX.Element {
  const [input, setInput] = useState('');
  const [defanged, setDefanged] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const results = useMemo(() => extract(input), [input]);
  const totalCount = results.reduce((acc, r) => acc + r.values.length, 0);

  const renderValue = (b: IocBucket, v: string) => (defanged ? defang(v, b) : v);

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-12 text-slate-900 dark:text-slate-100">
      <Link
        to="/dfir"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 mb-8 font-mono"
      >
        <ArrowLeft size={14} /> /dfir
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-4xl font-display font-bold mb-2">IOC Extractor</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl">
          Paste any blob of text, like an email, log line, blog post, or threat report. The extractor pulls out every
          IP, domain, URL, hash, and email it finds. Refanging is automatic.
        </p>
      </motion.div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste your text here…"
        rows={10}
        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 dark:focus:border-brand-400"
      />

      <div className="flex items-center justify-between mt-4 mb-8">
        <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
          {totalCount} indicator{totalCount === 1 ? '' : 's'} extracted
        </span>
        <label className="flex items-center gap-2 text-sm font-mono text-slate-600 dark:text-slate-400 cursor-pointer">
          <input type="checkbox" checked={defanged} onChange={(e) => setDefanged(e.target.checked)} />
          defang for output
        </label>
      </div>

      {results.length === 0 && input.trim() && (
        <p className="text-sm font-mono text-slate-500">No indicators detected.</p>
      )}

      <div className="space-y-6">
        {results.map(({ bucket, values }) => {
          const blob = values.map((v) => renderValue(bucket, v)).join('\n');
          const id = `${bucket}-${values.length}`;
          return (
            <section
              key={bucket}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                  {LABELS[bucket]} <span className="text-xs font-mono text-slate-500 ml-2">{values.length}</span>
                </h3>
                <button
                  onClick={() => copy(id, blob)}
                  className="inline-flex items-center gap-1 text-xs font-mono text-brand-600 dark:text-brand-400 hover:underline"
                  type="button"
                >
                  {copied === id ? <Check size={12} /> : <ClipboardCopy size={12} />}
                  {copied === id ? 'copied' : 'copy all'}
                </button>
              </div>
              <ul className="space-y-1 font-mono text-sm text-slate-700 dark:text-slate-300 break-all">
                {values.map((v) => (
                  <li key={v}>{renderValue(bucket, v)}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
