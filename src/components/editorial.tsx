import type { ReactNode } from 'react';

/**
 * Editorial primitives shared across the personal-portfolio half.
 *
 * The site reads as a quarterly intelligence dossier: numbered sections
 * filed under subjects, drop-capped prose, and pull-quotes set in the
 * same Newsreader italic as the section heads. These primitives codify
 * that voice so individual sections don't reinvent the typography.
 */

interface FiledTagProps {
  /** Two-digit issue / section number — 01, 02, 03 … */
  number: string;
  /** Subject line in caps, e.g. "WELCOME", "ABOUT", "EXPERIENCE". */
  subject: string;
  /** Optional date stamp on the right side. Defaults to the current month/year. */
  date?: string;
  /** Optional accent color class for the number bracket. */
  accent?: 'brand' | 'rose' | 'emerald' | 'amber' | 'cyan' | 'violet';
  /** Render in light text for dark backgrounds (e.g. Contact panel). */
  inverted?: boolean;
}

const ACCENT_COLOR = {
  brand: 'text-brand-600 dark:text-brand-400',
  rose: 'text-rose-600 dark:text-rose-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  violet: 'text-violet-600 dark:text-violet-400',
};

const DEFAULT_DATE = 'MAY · MMXXVI';

/**
 * FILED · 02 / SUBJECT — MAY · MMXXVI
 *
 * Renders as a single tracked-out mono line. The "FILED" prefix and
 * number share an accent color; the subject is the bolder text; the
 * date stamp drops to a muted slate on the right side, separated by
 * a long em-dash so it reads as journal metadata.
 */
export function FiledTag({
  number,
  subject,
  date = DEFAULT_DATE,
  accent = 'brand',
  inverted,
}: FiledTagProps): JSX.Element {
  const labelClass = inverted ? 'text-white/85' : 'text-slate-700 dark:text-slate-300';
  const stampClass = inverted ? 'text-white/45' : 'text-slate-500';
  const ruleClass = inverted ? 'bg-white/20' : 'bg-slate-300 dark:bg-slate-700';
  return (
    <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
      <span className={ACCENT_COLOR[accent]}>Filed</span>
      <span className={`${ACCENT_COLOR[accent]} tabular-nums`}>{number}</span>
      <span aria-hidden="true" className={`hidden h-px w-6 ${ruleClass} sm:inline-block`} />
      <span className={labelClass}>{subject}</span>
      <span aria-hidden="true" className={`hidden h-px flex-1 ${ruleClass} sm:inline-block`} />
      <span className={stampClass}>{date}</span>
    </div>
  );
}

interface DropCapParagraphProps {
  /** First character will be rendered as the drop cap; rest as prose. */
  children: string;
  className?: string;
}

/**
 * Magazine-style multi-line drop-cap on a paragraph. The first character
 * floats left, set in the editorial italic-serif at a large size, while
 * the remaining text wraps around it. Used on the lead paragraph of
 * long-form prose blocks (About, briefings) to mark them as "feature
 * articles" inside the dossier.
 */
export function DropCapParagraph({ children, className = '' }: DropCapParagraphProps): JSX.Element {
  const first = children.charAt(0);
  const rest = children.slice(1);
  return (
    <p className={`text-base leading-relaxed text-slate-700 dark:text-slate-300 ${className}`}>
      <span
        aria-hidden="true"
        className="float-left mr-3 mt-1 font-serif text-[3.5rem] font-light italic leading-[0.85] text-brand-700 dark:text-brand-400 sm:text-[4.5rem]"
      >
        {first}
      </span>
      {rest}
    </p>
  );
}

interface PullQuoteProps {
  /** The quotation itself, without quote marks — they're rendered. */
  children: ReactNode;
  /** Optional attribution line. Rendered prefixed with an em-dash. */
  attribution?: string;
  /** Tighten / loosen vertical rhythm. */
  className?: string;
}

/**
 * Editorial pull-quote: a single line of italic-serif display, framed by
 * decorative open/close quotation marks and a long horizontal rule.
 * Sits between sections on Home as a magazine-style breather.
 */
export function PullQuote({ children, attribution, className = '' }: PullQuoteProps): JSX.Element {
  return (
    <figure className={`mx-auto max-w-4xl py-12 sm:py-16 ${className}`}>
      <div aria-hidden="true" className="mb-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Pull · Quote</span>
        <span className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
      </div>
      <blockquote className="relative px-2 sm:px-8">
        <span
          aria-hidden="true"
          className="absolute -left-1 -top-4 font-serif text-7xl italic leading-none text-brand-500/30 dark:text-brand-400/30 sm:-left-4 sm:-top-6 sm:text-8xl"
        >
          &ldquo;
        </span>
        <p className="font-serif text-2xl font-light italic leading-snug text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
          {children}
        </p>
        <span
          aria-hidden="true"
          className="absolute -bottom-10 right-0 font-serif text-7xl italic leading-none text-brand-500/30 dark:text-brand-400/30 sm:-bottom-12 sm:text-8xl"
        >
          &rdquo;
        </span>
      </blockquote>
      {attribution && (
        <figcaption className="mt-8 text-right font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          — {attribution}
        </figcaption>
      )}
    </figure>
  );
}
