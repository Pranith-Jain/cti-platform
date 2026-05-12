import { useState } from 'react';
import { Github, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { projects } from '../../data/content';

const TRUNCATE_THRESHOLD = 240;

interface ProjectCardProps {
  project: (typeof projects)[number];
}

function ProjectCard({ project }: ProjectCardProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = project.description.length > TRUNCATE_THRESHOLD;

  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div
        className="absolute right-0 top-0 -mr-12 -mt-12 h-32 w-32 rounded-full bg-brand-500/[0.04] transition-transform group-hover:scale-125"
        aria-hidden="true"
      />
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{project.title}</h3>
        {project.badge && (
          <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
            {project.badge}
          </span>
        )}
      </header>
      <p
        className={`mt-2 text-[13px] text-slate-700 dark:text-slate-300 ${needsToggle && !expanded ? 'line-clamp-3' : ''}`}
      >
        {project.description}
      </p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-brand-600 hover:underline dark:text-brand-400"
        >
          {expanded ? (
            <>
              <ChevronUp size={11} /> show less
            </>
          ) : (
            <>
              <ChevronDown size={11} /> read more
            </>
          )}
        </button>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:border-slate-700 dark:text-slate-300"
          >
            {tag}
          </span>
        ))}
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-0.5 font-mono text-[10px] text-slate-700 transition hover:border-brand-500 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-300"
            aria-label={`View ${project.title} on GitHub`}
          >
            <Github className="h-3 w-3" aria-hidden="true" />
            code
          </a>
        )}
        {project.href && (
          <Link
            to={project.href}
            className="inline-flex items-center gap-1 rounded border border-brand-400 bg-brand-50 px-2 py-0.5 font-mono text-[10px] text-brand-700 transition hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-800/40"
            aria-label={`View ${project.title}`}
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            view
          </Link>
        )}
        {project.externalUrl && (
          <a
            href={project.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded border border-brand-400 bg-brand-50 px-2 py-0.5 font-mono text-[10px] text-brand-700 transition hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-800/40"
            aria-label={`Open ${project.title} live demo`}
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            live
          </a>
        )}
      </div>
    </article>
  );
}

export function Projects() {
  return (
    <section id="projects" className="mt-20 scroll-mt-24">
      <div className="mb-10 max-w-3xl">
        <div className="animate-fade-in-up mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
          Projects
        </div>
        <h2 className="animate-fade-in-up text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Selected projects &amp; initiatives
        </h2>
      </div>

      <div className="animate-fade-in-up grid gap-3">
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  );
}
