import { Linkedin, Github, Mail, Terminal, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { personalInfo, stats } from '../../data/content';

/**
 * Hero — brand-identity-first.
 *
 * Two-column composition: prose left, ID-card right. The right-side
 * card is the visual anchor (PJ mark + name + role + live "now" strip).
 * Identity pills below the status badge signal positioning without
 * shouting. One accented phrase in the headline keeps a typographic
 * signature moment.
 */
export function Hero() {
  return (
    <section className="relative pt-6 lg:pt-10">
      <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        {/* LEFT: prose */}
        <div className="animate-fade-in-up">
          {/* Live status pill */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            open for consultations &amp; strategy calls
          </div>

          {/* Identity pills — quieter row */}
          <div className="mb-7 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-700 dark:text-brand-300">
              <Sparkles className="h-2.5 w-2.5" /> Certified AI Security Expert
            </span>
            <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Threat Intel
            </span>
            <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Email Defense
            </span>
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
              AU Ambassador
            </span>
          </div>

          {/* Headline — one signature gradient phrase */}
          <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
            Investigating attacks at human scale.{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent dark:from-brand-400 dark:to-brand-200">
              Building defenders at AI scale.
            </span>
          </h1>

          <p className="mt-6 text-base leading-relaxed text-slate-700 sm:text-lg dark:text-slate-300">
            I&apos;m <span className="font-semibold text-slate-900 dark:text-white">{personalInfo.name}</span>,{' '}
            {personalInfo.description}
          </p>

          {/* Focus / learning — colored dot rhythm restored */}
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              <span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">focus</span>{' '}
                <span className="text-slate-900 dark:text-white">{personalInfo.currentFocus}</span>
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
              <span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">learning</span>{' '}
                <span className="text-slate-900 dark:text-white">{personalInfo.currentlyLearning}</span>
              </span>
            </div>
          </div>

          {/* CTAs — soft shadow, no scale */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={personalInfo.calendlyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            >
              Book a Call <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <Link
              to="/threatintel"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/60 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 dark:border-rose-700/60 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/30"
            >
              <Terminal className="h-3.5 w-3.5" /> Live Threat Intel
            </Link>
            <Link
              to="/dfir"
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300/60 bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-100 dark:border-brand-700/60 dark:bg-brand-900/20 dark:text-brand-300 dark:hover:bg-brand-900/30"
            >
              <Terminal className="h-3.5 w-3.5" /> DFIR Toolkit
            </Link>
          </div>

          {/* Socials */}
          <div className="mt-7 flex items-center gap-5">
            <a
              href={personalInfo.linkedInUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded text-slate-500 transition hover:text-brand-600 dark:hover:text-brand-400"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" aria-hidden="true" />
            </a>
            <a
              href={personalInfo.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded text-slate-500 transition hover:text-brand-600 dark:hover:text-brand-400"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" aria-hidden="true" />
            </a>
            <a
              href={`mailto:${personalInfo.email}`}
              className="rounded text-slate-500 transition hover:text-brand-600 dark:hover:text-brand-400"
              aria-label="Email"
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* RIGHT: ID card + Now widget */}
        <div className="animate-fade-in-up relative">
          {/* Decorative blur — subtle texture */}
          <div
            className="absolute -right-8 -top-8 -z-10 h-56 w-56 rounded-full bg-brand-500/15 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-6 -left-6 -z-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl"
            aria-hidden="true"
          />

          {/* ID Card */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-7">
            {/* Top: PJ logo + meta */}
            <div className="flex items-center justify-between">
              <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl shadow-md">
                <svg
                  viewBox="0 0 36 36"
                  className="h-full w-full"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="pjGradHero" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2c3ee5" />
                      <stop offset="100%" stopColor="#435ef1" />
                    </linearGradient>
                  </defs>
                  <rect width="36" height="36" rx="8" fill="url(#pjGradHero)" />
                  <text
                    x="50%"
                    y="50%"
                    dominantBaseline="central"
                    textAnchor="middle"
                    fill="white"
                    fontFamily="Poppins, sans-serif"
                    fontWeight="800"
                    fontSize="16"
                  >
                    PJ
                  </text>
                </svg>
              </span>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                online
              </div>
            </div>

            <div className="mt-5">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{personalInfo.name}</div>
              <div className="text-sm font-medium text-brand-600 dark:text-brand-400">{personalInfo.shortTitle}</div>
            </div>

            {/* Now widget — personal brand signature */}
            <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/60">
              <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <Sparkles className="h-2.5 w-2.5" /> now
              </div>
              <ul className="space-y-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                <li className="flex items-baseline gap-2">
                  <span className="text-brand-500">$</span>
                  <span>shipping NHI policy scanner</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="text-cyan-500">$</span>
                  <span>reading on MCP attack surface</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="text-emerald-500">$</span>
                  <span>iterating on n8n triage workflows</span>
                </li>
              </ul>
            </div>

            {/* Quick links row */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              <a
                href={`mailto:${personalInfo.email}`}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <Mail className="h-2.5 w-2.5" /> email
              </a>
              <a
                href={personalInfo.linkedInUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <Linkedin className="h-2.5 w-2.5" /> linkedin
              </a>
              <a
                href={personalInfo.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <Github className="h-2.5 w-2.5" /> github
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats — restored card style but tighter, with badges */}
      <div className="animate-fade-in-up mt-16 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-brand-500/5 transition-transform group-hover:scale-125"
              aria-hidden="true"
            />
            <div className="relative">
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">{stat.label}</div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  {stat.value}
                </span>
                {stat.suffix && <span className="font-mono text-xs text-slate-500">{stat.suffix}</span>}
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">{stat.description}</p>
              {stat.badge && (
                <div className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                  <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{stat.badge}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
