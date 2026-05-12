import { Search, Zap, Shield, FileText, Monitor, Mail } from 'lucide-react';
import { experiences } from '../../data/content';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Search,
  Zap,
  Shield,
  FileText,
  Monitor,
  Mail,
};

/**
 * Experience — restrained cards. Mono metadata row above the role title
 * for date / company. Subsections render as small caps headers with
 * tight bullet lists.
 */
export function Experience() {
  return (
    <section id="experience" className="mt-20 scroll-mt-24">
      <div className="mb-10 max-w-3xl">
        <div className="animate-fade-in-up mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
          Experience
        </div>
        <h2 className="animate-fade-in-up text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Experience highlights
        </h2>
      </div>

      <div className="grid gap-5">
        {experiences.map((exp, index) => (
          <article
            key={`${exp.title}-${index}`}
            className="animate-fade-in-up relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 transition hover:border-brand-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Left accent rail */}
            <div
              className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-500 to-brand-400"
              aria-hidden="true"
            />
            <header className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900 dark:text-white">{exp.title}</div>
                <div className="mt-0.5 font-mono text-[12px] text-slate-600 dark:text-slate-400">
                  {exp.company}
                  {exp.location && ` · ${exp.location}`} · {exp.period}
                </div>
              </div>
              {exp.badge && (
                <span className="inline-flex shrink-0 items-center self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
                  {exp.badge}
                </span>
              )}
            </header>

            {exp.sections &&
              exp.sections.map((section, sIndex) => {
                const IconComponent = iconMap[section.icon];
                const sectionId = `experience-${section.title
                  .toLowerCase()
                  .replace(/[^\w\s-]/g, '')
                  .replace(/\s+/g, '-')}`;
                return (
                  <div
                    key={section.title}
                    id={sectionId}
                    className={`scroll-mt-28 ${sIndex < exp.sections!.length - 1 ? 'mb-4' : ''}`}
                  >
                    <h4 className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
                      {IconComponent && <IconComponent className="h-3 w-3" />}
                      {section.title}
                    </h4>
                    <ul className="space-y-1.5 text-[13px] text-slate-700 dark:text-slate-300">
                      {section.items.map((item, iIndex) => (
                        <li key={iIndex} className="relative pl-4">
                          <span className="absolute left-0 top-1.5 inline-block h-1 w-1 rounded-full bg-brand-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

            {exp.items && (
              <ul className="space-y-1.5 text-[13px] text-slate-700 dark:text-slate-300">
                {exp.items.map((item, iIndex) => (
                  <li key={iIndex} className="relative pl-4">
                    <span className="absolute left-0 top-1.5 inline-block h-1 w-1 rounded-full bg-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
