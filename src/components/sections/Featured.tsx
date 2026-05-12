import { ExternalLink } from 'lucide-react';
import { featuredArticles } from '../../data/content';

/**
 * Featured — restored "F"/"D" letter mark on each card as a signature
 * visual. Background blur blob behind the grid gives the section
 * subtle texture without competing with the cards.
 */
export function Featured() {
  return (
    <section id="featured" className="relative mt-24 scroll-mt-24">
      {/* Subtle texture blob */}
      <div
        className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="mb-10 max-w-3xl">
        <div className="animate-fade-in-up mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
          Recognition
        </div>
        <h2 className="animate-fade-in-up text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Where the work shows up
        </h2>
        <p className="animate-fade-in-up mt-3 text-base text-slate-700 dark:text-slate-400">
          Interviews and write-ups across security platforms.
        </p>
      </div>

      <div className="animate-fade-in-up grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featuredArticles.map((article) => {
          const isExpert = article.category === 'Security Specialist';
          const markLetter = isExpert ? 'F' : 'D';
          return (
            <a
              key={article.title}
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                {/* Signature letter mark */}
                <div
                  className={`grid h-11 w-11 place-items-center rounded-xl font-black text-base ${
                    isExpert
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-md shadow-brand-600/20'
                  }`}
                  aria-hidden="true"
                >
                  {markLetter}
                </div>
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    isExpert
                      ? 'border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {isExpert ? 'profile' : 'article'}
                </span>
              </div>
              <h3 className="text-base font-semibold leading-tight text-slate-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                {article.title}
              </h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                {article.description}
              </p>
              <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <span>{article.source}</span>
                <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
