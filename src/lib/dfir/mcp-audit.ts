/**
 * MCP (Model Context Protocol) server security auditor.
 *
 * Accepts a parsed MCP server config (claude_desktop_config.json shape, or a
 * single server entry, or an array of tool descriptions) and returns a list
 * of findings.
 *
 * The checks are heuristic and assume the worst about the host environment
 * (the MCP runs with the user's full OS privileges). False positives are
 * preferable to false negatives.
 */

import { detectInjections } from './prompt-injection-patterns';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  scope: string; // e.g. "mcpServers.fetch.command" or "tools[3].description"
  detail: string;
  remediation: string;
}

export interface McpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  type?: string;
  // Many MCP clients accept raw tool listings under various keys; stay loose.
  tools?: Array<{ name?: string; description?: string }>;
}

export interface McpConfig {
  mcpServers?: Record<string, McpServerEntry>;
  // Alternative keys some clients use:
  servers?: Record<string, McpServerEntry>;
}

const DANGEROUS_CMDS = [
  'rm',
  'del',
  'format',
  'shutdown',
  'mkfs',
  'dd',
  'sudo',
  'su',
  'chmod',
  'chown',
  'eval',
  'exec',
  'sh',
  'bash',
  'zsh',
  'cmd',
  'powershell',
  'pwsh',
];

const SECRET_KEY_HINTS = [
  /API[_-]?KEY/i,
  /SECRET/i,
  /PASSWORD/i,
  /PASS(WD)?\b/i,
  /TOKEN/i,
  /ACCESS[_-]?KEY/i,
  /PRIVATE[_-]?KEY/i,
  /AWS[_-]?(SECRET|ACCESS)/i,
  /OPENAI/i,
  /ANTHROPIC/i,
  /GITHUB[_-]?(PAT|TOKEN)/i,
];

const LITERAL_SECRET_RE =
  /^(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|xox[abprs]-[A-Za-z0-9-]{10,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

function pushIfNew(out: Finding[], f: Finding) {
  if (!out.some((x) => x.id === f.id && x.scope === f.scope)) out.push(f);
}

function auditServer(name: string, server: McpServerEntry, out: Finding[]): void {
  const root = `mcpServers.${name}`;

  // ── Transport: remote URL ─────────────────────────────────────────────
  if (server.url) {
    try {
      const u = new URL(server.url);
      if (u.protocol === 'http:') {
        pushIfNew(out, {
          id: 'remote-http',
          title: 'Remote MCP server over plain HTTP',
          severity: 'high',
          scope: `${root}.url`,
          detail: `Server "${name}" connects over http://, exposing the entire MCP session (including tool calls and arguments) to network observers.`,
          remediation: 'Switch to https://, or run the server locally over stdio.',
        });
      }
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1') {
        // fine
      } else {
        pushIfNew(out, {
          id: 'remote-untrusted',
          title: 'Remote third-party MCP server',
          severity: 'medium',
          scope: `${root}.url`,
          detail: `Server "${name}" calls out to ${u.hostname}. A remote MCP server can inject prompts into every tool call response, see tool arguments (which often contain user data), and silently change behaviour.`,
          remediation: 'Pin to a known commit/version. Prefer local stdio transports for high-trust workflows.',
        });
      }
    } catch {
      pushIfNew(out, {
        id: 'invalid-url',
        title: 'Invalid server URL',
        severity: 'low',
        scope: `${root}.url`,
        detail: `Server "${name}" url is not a valid URL.`,
        remediation: 'Fix the URL or remove the server entry.',
      });
    }
  }

  // ── Command / args ─────────────────────────────────────────────────────
  const cmd = (server.command ?? '').trim();
  if (cmd) {
    const base = cmd.split(/[\\/]/).pop()!.toLowerCase();
    if (DANGEROUS_CMDS.includes(base)) {
      pushIfNew(out, {
        id: 'dangerous-command',
        title: `Dangerous command "${base}"`,
        severity: 'critical',
        scope: `${root}.command`,
        detail: `Server "${name}" launches via "${cmd}", a shell or destructive utility. The MCP host will execute arbitrary commands you didn't write.`,
        remediation: 'Replace with the actual MCP server binary (e.g. a node/python entry-point).',
      });
    }
    if (cmd.includes('|') || cmd.includes(';') || cmd.includes('&&')) {
      pushIfNew(out, {
        id: 'shell-pipeline',
        title: 'Shell-pipeline-style command',
        severity: 'high',
        scope: `${root}.command`,
        detail: `Server "${name}" command contains shell metacharacters. If the host shells-out the value, this is command-injection prone.`,
        remediation: 'Use a single binary path; pass parameters via "args".',
      });
    }
    if (cmd.startsWith('curl ') || cmd.startsWith('wget ') || cmd.includes('| sh') || cmd.includes('|sh')) {
      pushIfNew(out, {
        id: 'curl-pipe-sh',
        title: 'curl|sh-style installer command',
        severity: 'critical',
        scope: `${root}.command`,
        detail: `Server "${name}" downloads and executes code at startup, defeating any review of what's actually run.`,
        remediation: 'Install the MCP server out-of-band, then point command at the resolved binary.',
      });
    }
  }

  // ── Args inspection ────────────────────────────────────────────────────
  const args = server.args ?? [];
  args.forEach((a, i) => {
    if (typeof a !== 'string') return;
    if (LITERAL_SECRET_RE.test(a)) {
      pushIfNew(out, {
        id: 'secret-in-args',
        title: 'Secret embedded in args',
        severity: 'critical',
        scope: `${root}.args[${i}]`,
        detail: `Args contain what looks like a real secret (API key / JWT / GitHub PAT). Args are checked into source control more often than env files.`,
        remediation: 'Move to env or a secret store; reference via env var.',
      });
    }
    if (a.toLowerCase().includes('--allow-shell') || a.toLowerCase().includes('--unrestricted')) {
      pushIfNew(out, {
        id: 'unrestricted-flag',
        title: 'Unrestricted-mode flag',
        severity: 'high',
        scope: `${root}.args[${i}]`,
        detail: `Arg "${a}" disables the server's own safety controls.`,
        remediation: 'Remove the flag and run with the default sandbox.',
      });
    }
  });

  // ── Env block ──────────────────────────────────────────────────────────
  const env = server.env ?? {};
  for (const [k, v] of Object.entries(env)) {
    const looksSecret = SECRET_KEY_HINTS.some((re) => re.test(k));
    if (looksSecret && typeof v === 'string' && v.length > 0 && !v.startsWith('${') && !v.startsWith('$')) {
      // Looks like a real value, not a substitution placeholder.
      if (LITERAL_SECRET_RE.test(v) || (v.length >= 16 && /[A-Za-z]/.test(v) && /[0-9]/.test(v))) {
        pushIfNew(out, {
          id: 'hardcoded-secret',
          title: `Hardcoded secret in env (${k})`,
          severity: 'critical',
          scope: `${root}.env.${k}`,
          detail: `${k} contains a literal value rather than an env-var reference. Anyone with read access to this config has the credential.`,
          remediation:
            'Use a placeholder like ${env:SECRET_NAME} and store the real value in your OS keychain or a .env outside source control.',
        });
      }
    }
  }

  // ── Tool descriptions: prompt injection inside tool metadata ──────────
  const tools = server.tools ?? [];
  tools.forEach((t, i) => {
    const desc = t?.description ?? '';
    if (typeof desc !== 'string' || !desc) return;
    const matches = detectInjections(desc);
    matches.forEach((m) => {
      pushIfNew(out, {
        id: `tool-injection-${m.pattern.id}`,
        title: `Tool description contains injection pattern: ${m.pattern.name}`,
        severity: 'critical',
        scope: `${root}.tools[${i}].description`,
        detail: `Tool "${t.name ?? `#${i}`}" description includes a known prompt-injection pattern. Because tool descriptions are loaded into the model's context every turn, a malicious description can hijack the assistant on any unrelated user query (Tool Description Injection).`,
        remediation:
          'Audit the upstream MCP source. Pin to a reviewed commit. Strip / sanitise tool descriptions before passing them to the model.',
      });
    });
    if (/\b(ssh|exec|eval|bash|powershell|run_command|run_shell)\b/i.test(t.name ?? '')) {
      pushIfNew(out, {
        id: 'broad-tool-name',
        title: `Broad-permission tool: ${t.name}`,
        severity: 'high',
        scope: `${root}.tools[${i}].name`,
        detail: `Tool "${t.name}" is named like a generic shell/exec primitive. Generic primitives let the model run arbitrary commands and are the standard root cause of "excessive agency" findings.`,
        remediation:
          'Replace with task-specific tools (e.g. "list_files", "read_file") with parameter-level allow-lists.',
      });
    }
  });

  // ── No transport at all ────────────────────────────────────────────────
  if (!server.command && !server.url) {
    pushIfNew(out, {
      id: 'no-transport',
      title: 'Server has no command or url',
      severity: 'low',
      scope: root,
      detail: `Server "${name}" defines neither a stdio command nor a remote url; the MCP client will not be able to start it.`,
      remediation: 'Add command/args (stdio) or url (HTTP/SSE).',
    });
  }
}

export function auditMcpConfig(raw: unknown): Finding[] {
  const out: Finding[] = [];
  if (!raw || typeof raw !== 'object') {
    out.push({
      id: 'parse',
      title: 'Input is not a JSON object',
      severity: 'low',
      scope: '$',
      detail: 'Provide a valid claude_desktop_config.json (or any { mcpServers: {...} } structure).',
      remediation: 'Paste the contents of your MCP client config.',
    });
    return out;
  }
  const cfg = raw as McpConfig & Record<string, unknown>;
  const servers: Record<string, McpServerEntry> | undefined = cfg.mcpServers ?? cfg.servers;

  // Allow auditing a single server entry too.
  if (!servers && typeof cfg === 'object' && ('command' in cfg || 'url' in cfg || 'tools' in cfg)) {
    auditServer('(anonymous)', cfg as McpServerEntry, out);
    return out;
  }

  if (!servers || typeof servers !== 'object') {
    out.push({
      id: 'no-servers',
      title: 'No mcpServers / servers key found',
      severity: 'info',
      scope: '$',
      detail:
        'The auditor expected an object with an "mcpServers" key (Claude Desktop / Cursor format) or a single server entry.',
      remediation: 'Paste a config in the standard shape, e.g. { "mcpServers": { "fetch": { "command": "..." } } }.',
    });
    return out;
  }

  for (const [name, entry] of Object.entries(servers)) {
    if (!entry || typeof entry !== 'object') continue;
    auditServer(name, entry, out);
  }

  if (out.length === 0) {
    out.push({
      id: 'clean',
      title: 'No issues found',
      severity: 'info',
      scope: '$',
      detail: `${Object.keys(servers).length} server(s) checked. No heuristic findings — that's not a guarantee of safety, just absence of known bad signals.`,
      remediation: 'Continue to pin upstream versions and review tool descriptions on every update.',
    });
  }
  return out;
}

export function summarise(findings: Finding[]): {
  counts: Record<Severity, number>;
  worst: Severity;
} {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;
  const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  const worst = order.find((s) => counts[s] > 0) ?? 'info';
  return { counts, worst };
}
