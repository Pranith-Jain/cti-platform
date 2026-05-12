import { Linkedin, Github, Mail, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { personalInfo, stats } from '../../data/content';

/**
 * Hero — calm, typography-first treatment.
 *
 * Single left-aligned column. The headline is plain text (no gradient
 * effects); status/focus/availability live in a quiet mono key:value
 * strip below the credo. Stats are an inline strip rather than four
 * glass cards. The right-side PJ-logo card from the prior design was
 * removed because it visually competed with the headline.
 */
export function Hero() {
  return (
    <section className="relative pt-6 lg:pt-10">
      <div className="max-w-3xl">
        <div className="animate-fade-in-up">
          {/* Status pill — single, mono, quiet */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {personalInfo.availability.toLowerCase()}
          </div>

          {/* Headline — plain weight, no gradient, no double-quote wrapper */}
          <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
            {personalInfo.headline.replace(/^"|"$/g, '')}
          </h1>

          {/* Prose subtitle — same copy, calmer treatment */}
          <p className="mt-6 text-base leading-relaxed text-slate-700 sm:text-lg dark:text-slate-300">
            I&apos;m <span className="font-semibold text-slate-900 dark:text-white">{personalInfo.name}</span>,{' '}
            {personalInfo.description}
          </p>

          {/* Mono key:value strip — replaces the three colored dot lines */}
          <dl className="mt-8 grid gap-2 font-mono text-[12px] text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap gap-2">
              <dt className="text-slate-500">focus</dt>
              <dd className="text-slate-900 dark:text-slate-100">{personalInfo.currentFocus}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-slate-500">learning</dt>
              <dd className="text-slate-900 dark:text-slate-100">{personalInfo.currentlyLearning}</dd>
            </div>
          </dl>

          {/* CTAs — flat borders, no scale animation, no glow */}
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href={personalInfo.calendlyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            >
              Book a call <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <Link
              to="/threatintel"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-brand-500 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-300"
            >
              /threatintel
            </Link>
            <Link
              to="/dfir"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-brand-500 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-300"
            >
              /dfir
            </Link>
          </div>

          {/* Socials — smaller, line up with text rhythm */}
          <div className="mt-8 flex items-center gap-5">
            <a
              href={personalInfo.linkedInUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-brand-400"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" aria-hidden="true" />
            </a>
            <a
              href={personalInfo.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-brand-400"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" aria-hidden="true" />
            </a>
            <a
              href={`mailto:${personalInfo.email}`}
              className="rounded text-slate-500 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-brand-400"
              aria-label="Email"
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Inline stats strip — replaces 4 giant glass cards */}
      <dl className="animate-fade-in-up mt-16 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-slate-200 pt-8 sm:grid-cols-4 dark:border-slate-800">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{stat.label}</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {stat.value}
              </span>
              {stat.suffix && <span className="text-xs font-mono text-slate-500">{stat.suffix}</span>}
            </dd>
            <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400">{stat.description}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
