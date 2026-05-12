import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { stats } from '../../data/content';

/**
 * About — single-column prose. The right-side terminal mock from the
 * prior design has been removed because /dfir/ioc-check is one click
 * away and shows the same content live. Inline mono stats strip
 * replaces the four glass cards.
 */
export function About() {
  return (
    <section id="about" className="mt-24 scroll-mt-24">
      <div className="max-w-3xl">
        <div className="animate-fade-in-up">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
            About
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Alerts first, then everything else
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700 dark:text-slate-300">
            <p>
              The work that taught me anything useful was the alert work. Phishing, BEC, malware, lookalike domains. Two
              hundred and fifty incidents in, you start seeing the same attacker patterns, the same defensive blind
              spots, and the same five steps you keep repeating by hand.
            </p>
            <p>
              That's where the automation came from. With{' '}
              <span className="font-semibold text-brand-700 dark:text-brand-400">n8n and a few MCP servers</span>, I
              moved the repeatable parts of triage off the analyst critical path. Mean response dropped from four hours
              to under 75 minutes. The decisions that actually need a human stayed with the human.
            </p>
            <p>
              I ship the tools I wish I'd had on shift. The interactive ones live at{' '}
              <Link
                to="/dfir"
                className="inline-flex items-center gap-0.5 font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-400"
              >
                /dfir <ArrowRight size={12} />
              </Link>
              , the live threat-intel surface at{' '}
              <Link
                to="/threatintel"
                className="inline-flex items-center gap-0.5 font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-400"
              >
                /threatintel <ArrowRight size={12} />
              </Link>
              . Both run on Cloudflare Workers, both are free.
            </p>
            <p>
              Lately I've been spending most of my reading time on{' '}
              <span className="font-semibold text-brand-700 dark:text-brand-400">
                AI security and Non-Human Identity governance
              </span>
              . Prompt injection, MCP attack surface, service-account sprawl. The investigation-first mindset transfers
              well; the tooling is mostly still being built.
            </p>
            <p>If you're hiring for any of this, or working on the same problems in the open, my inbox is below.</p>
          </div>
        </div>

        {/* Inline stats — replaces glass card grid */}
        <dl className="animate-fade-in-up mt-12 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-slate-200 pt-6 sm:grid-cols-4 dark:border-slate-800">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{stat.label}</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{stat.value}</span>
                {stat.suffix && <span className="text-xs font-mono text-slate-500">{stat.suffix}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
