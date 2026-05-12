import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { personalInfo } from '../data/content';
import { usePageViewCounter, formatViewCount } from '../hooks';

/**
 * Footer as a magazine colophon. Three editorial columns:
 *   I.  Index of sections (table-of-contents style, mono numerals)
 *   II. Masthead / typeface credit / edition stamp
 *   III. Contact + repo, with the page-view counter as a circulation note
 *
 * No glassmorphism. Hairline rules between columns. Tracked-out mono
 * caps for section heads. Year set in roman numerals — small touch
 * that signals "this is set, not generated."
 */

interface ColophonHeadProps {
  numeral: 'I' | 'II' | 'III';
  label: string;
}

function ColophonHead({ numeral, label }: ColophonHeadProps): JSX.Element {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-brand-600 dark:text-brand-400">
        {numeral}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
    </div>
  );
}

const SECTIONS_INDEX: Array<{ no: string; subject: string; href: string }> = [
  { no: '01', subject: 'Welcome', href: '#top' },
  { no: '02', subject: 'About', href: '/about' },
  { no: '03', subject: 'Experience', href: '/experience' },
  { no: '04', subject: 'Projects', href: '/projects' },
  { no: '05', subject: 'Recognition', href: '/#featured' },
  { no: '06', subject: 'Expertise', href: '/skills' },
  { no: '07', subject: 'Contact', href: '/#contact' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { count, isNewSession } = usePageViewCounter();

  return (
    <footer className="mt-32 border-t border-slate-200 dark:border-slate-800" role="contentinfo">
      {/* Top rule pair — magazine-style heavy + hairline */}
      <div aria-hidden="true" className="-mt-px h-0.5 bg-slate-900 dark:bg-white/60" />

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {/* Masthead bar */}
        <div className="mb-12 flex flex-col items-baseline justify-between gap-3 sm:flex-row">
          <a
            href="#top"
            className="group inline-flex items-baseline gap-3 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            aria-label={`${personalInfo.name} — back to top`}
          >
            <span className="font-serif text-3xl font-light italic leading-none text-slate-900 transition-transform duration-200 ease-spring group-hover:-translate-y-0.5 dark:text-white">
              P.&nbsp;Jain
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">Dossier</span>
          </a>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Issue&nbsp;26.05 — Threat&nbsp;Intel · Email&nbsp;Defense · Cloud&nbsp;Identity
          </div>
        </div>

        {/* Three-column colophon */}
        <div className="grid gap-12 sm:grid-cols-3 sm:gap-8">
          {/* I. Index */}
          <section>
            <ColophonHead numeral="I" label="Index" />
            <ul className="space-y-1.5 font-mono text-[12px]">
              {SECTIONS_INDEX.map((s) => {
                const isExternal = s.href.startsWith('#') || s.href.startsWith('/#');
                const className =
                  'group flex items-baseline gap-3 text-slate-700 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300';
                const inner = (
                  <>
                    <span className="tabular-nums text-slate-500">{s.no}</span>
                    <span className="flex-1 italic">{s.subject}</span>
                    <span
                      aria-hidden="true"
                      className="h-px flex-1 bg-slate-200 transition-colors group-hover:bg-brand-400 dark:bg-slate-800"
                    />
                  </>
                );
                if (isExternal) {
                  return (
                    <li key={s.no}>
                      <a href={s.href} className={className}>
                        {inner}
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={s.no}>
                    <Link to={s.href} className={className}>
                      {inner}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* II. Masthead / typeface credit / edition */}
          <section>
            <ColophonHead numeral="II" label="Colophon" />
            <dl className="space-y-3 font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              <div>
                <dt className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Set in</dt>
                <dd className="mt-1 text-slate-800 dark:text-slate-200">
                  <span className="font-serif text-[15px] italic">Newsreader</span> · Space&nbsp;Grotesk · Inter
                </dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Hosted</dt>
                <dd className="mt-1 text-slate-800 dark:text-slate-200">Cloudflare Workers · edge · no signup</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Filed from</dt>
                <dd className="mt-1 text-slate-800 dark:text-slate-200">Remote</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Built with</dt>
                <dd className="mt-1 text-slate-800 dark:text-slate-200">React · Vite · Tailwind · Hono</dd>
              </div>
            </dl>
          </section>

          {/* III. Contact + circulation */}
          <section>
            <ColophonHead numeral="III" label="Bureau" />
            <ul className="space-y-2 font-mono text-[12px]">
              <li>
                <a
                  href={`mailto:${personalInfo.email}`}
                  className="group inline-flex items-baseline gap-2 text-slate-700 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
                >
                  <span className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Email</span>
                  <span className="underline decoration-1 underline-offset-4 group-hover:decoration-brand-500">
                    hello@pranithjain.qzz.io
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={personalInfo.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-baseline gap-2 text-slate-700 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
                >
                  <span className="text-[9px] uppercase tracking-[0.22em] text-slate-500">LinkedIn</span>
                  <span className="underline decoration-1 underline-offset-4">in/pranithjain</span>
                </a>
              </li>
              <li>
                <a
                  href={personalInfo.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-baseline gap-2 text-slate-700 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
                >
                  <span className="text-[9px] uppercase tracking-[0.22em] text-slate-500">GitHub</span>
                  <span className="underline decoration-1 underline-offset-4">@Pranith-Jain</span>
                </a>
              </li>
              <li>
                <a
                  href={personalInfo.calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-baseline gap-2 text-slate-700 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
                >
                  <span className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Calls</span>
                  <span className="underline decoration-1 underline-offset-4">calendly · 30m</span>
                </a>
              </li>
            </ul>

            {/* Circulation note */}
            <div
              className="mt-6 inline-flex items-center gap-2 rounded border border-slate-200 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800"
              aria-live="polite"
              aria-atomic="true"
            >
              <Eye className="h-3 w-3" aria-hidden="true" />
              Circulation&nbsp;·&nbsp;
              <span className="text-slate-800 dark:text-slate-200">{formatViewCount(count)}</span>
              {isNewSession && <span className="sr-only"> (new session)</span>}
            </div>
          </section>
        </div>

        {/* Bottom rule + copyright */}
        <div className="mt-14 flex flex-col items-baseline justify-between gap-3 border-t border-slate-200 pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 sm:flex-row dark:border-slate-800">
          <span>
            © MMXXVI · {personalInfo.name} · All rights reserved · <span aria-label="Year">{currentYear}</span>
          </span>
          <span className="text-slate-400 dark:text-slate-600">— end of issue —</span>
        </div>
      </div>
    </footer>
  );
}
