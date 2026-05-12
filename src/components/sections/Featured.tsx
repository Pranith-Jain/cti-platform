import { ExternalLink } from 'lucide-react';
import { featuredArticles } from '../../data/content';

/**
 * Featured — restrained card list. No giant "F"/"D" letter avatars,
 * no rounded-[2rem] glass panels. Source name lives in a small mono
 * eyebrow line above the title; category renders as a quiet badge.
 */
export function Featured() {
  return (
    <section id="featured" className="mt-24 scroll-mt-24">
      <div className="mb-10 max-w-3xl">
        <div className="animate-fade-in-up mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
          Recognition
        </div>
        <h2 className="animate-fade-in-up text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Where the work shows up
        </h2>
        <p className="animate-fade-in-up mt-3 text-base text-slate-700 dark:text-slate-400">
          Interviews and writeups across security platforms.
        </p>
      </div>

      <div className="animate-fade-in-up grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {featuredArticles.map((article) => {
          const isExpert = article.category === 'Security Specialist';
          return (
            <a
              key={article.title}
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-500/50 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{article.source}</div>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    isExpert
                      ? 'border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {isExpert ? 'profile' : 'article'}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                {article.title}
              </h3>
              <p className="mt-2 flex-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                {article.description}
              </p>
              <div className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] text-slate-500">
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                {article.category.toLowerCase()}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
