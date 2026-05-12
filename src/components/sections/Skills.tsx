import { Mail, Search, Users, Shield, Cloud, Zap } from 'lucide-react';
import { skills } from '../../data/content';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  Search,
  Users,
  Shield,
  Cloud,
  Zap,
};

/**
 * Skills — tighter cards, less chrome. Each card is a small panel with
 * an icon and a bullet list. No hover-glow, no -translate, no rounded-3xl.
 * The eyebrow uses mono caps (same rhythm as Hero/About).
 */
export function Skills() {
  return (
    <section id="skills" className="mt-24 scroll-mt-24">
      <div className="mb-10 max-w-3xl">
        <div className="animate-fade-in-up mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
          Expertise
        </div>
        <h2 className="animate-fade-in-up text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Core competencies
        </h2>
        <p className="animate-fade-in-up mt-3 text-base text-slate-700 dark:text-slate-400">
          Threat intelligence, cyber criminology, email security, and cloud identity defense.
        </p>
      </div>

      <div className="animate-fade-in-up grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => {
          const IconComponent = iconMap[skill.icon];
          return (
            <div
              key={skill.title}
              className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-500/50 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                {IconComponent && <IconComponent className="h-4 w-4" aria-hidden="true" />}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{skill.title}</div>
              <ul className="mt-3 space-y-1.5 text-[13px] text-slate-700 dark:text-slate-400">
                {skill.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
