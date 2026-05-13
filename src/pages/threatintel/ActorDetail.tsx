import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { threatActors } from '../../data/dfir/threat-actors';

export default function ActorDetail(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const actor = threatActors.find((a) => a.slug === slug);

  if (!actor) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-20 text-ink-1">
        <Link
          to="/threatintel/actors"
          className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-accent mb-8 font-mono"
        >
          <ArrowLeft size={14} /> /threatintel/actors
        </Link>
        <h1 className="font-serif font-bold text-3xl">Actor not found</h1>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 text-ink-1">
      <Link
        to="/threatintel/actors"
        className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-accent mb-8 font-mono"
      >
        <ArrowLeft size={14} /> /threatintel/actors
      </Link>

      <div className="mb-8">
        <h1 className="text-5xl font-serif font-bold mb-3">{actor.name}</h1>
        {actor.aliases.length > 0 && (
          <p className="text-base font-mono text-ink-2 mb-4">aka {actor.aliases.join(', ')}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <span
            className={`text-xs font-mono px-2 py-1 rounded border ${
              actor.status === 'active'
                ? 'bg-emerald-500/15 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                : 'bg-surface-raised text-ink-2 border-rule'
            }`}
          >
            {actor.status}
          </span>
          <span className="text-xs font-mono px-2 py-1 rounded border bg-accent-soft text-accent border-rule">
            {actor.sophistication}
          </span>
          {actor.country && (
            <span className="text-xs font-mono px-2 py-1 rounded border border-rule text-ink-2">{actor.country}</span>
          )}
        </div>
      </div>

      <section className="mb-8 border border-rule bg-surface-page p-6">
        <p className="text-base text-ink-2 leading-relaxed whitespace-pre-line">{actor.description}</p>
      </section>

      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <section className="border border-rule bg-surface-page p-6">
          <h2 className="font-serif font-bold text-lg mb-3">Motivation</h2>
          <p className="font-mono text-sm text-ink-1">{actor.motivation}</p>
          {actor.active_since && (
            <p className="mt-2 font-mono text-xs text-ink-2">active since: {actor.active_since}</p>
          )}
          {actor.last_activity && <p className="font-mono text-xs text-ink-2">last activity: {actor.last_activity}</p>}
        </section>

        <section className="border border-rule bg-surface-page p-6">
          <h2 className="font-serif font-bold text-lg mb-3">Targets</h2>
          <ul className="space-y-1 text-sm font-mono text-ink-2">
            {actor.targets.map((t) => (
              <li key={t}>· {t}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mb-8 border border-rule bg-surface-page p-6">
        <h2 className="font-serif font-bold text-lg mb-3">Malware &amp; Tools</h2>
        {actor.malware.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actor.malware.map((m) => (
              <span
                key={m}
                className="text-xs font-mono px-2 py-1 rounded bg-surface-raised text-ink-1 border border-rule"
              >
                {m}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm font-mono text-ink-2">No specific malware attributed.</p>
        )}
      </section>

      <section className="mb-8 border border-rule bg-surface-page p-6">
        <h2 className="font-serif font-bold text-lg mb-3">MITRE ATT&amp;CK Techniques</h2>
        <div className="flex flex-wrap gap-2">
          {actor.techniques.map((t) => (
            <a
              key={t}
              href={`https://attack.mitre.org/techniques/${t.replace('.', '/')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono px-2 py-1 rounded bg-surface-raised text-accent border border-rule hover:border-rule"
            >
              {t}
            </a>
          ))}
        </div>
      </section>

      {actor.references && actor.references.length > 0 && (
        <section className="border border-rule bg-surface-page p-6">
          <h2 className="font-serif font-bold text-lg mb-3">References</h2>
          <ul className="space-y-2">
            {actor.references.map((r) => (
              <li key={r}>
                <a
                  href={r}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-accent hover:underline inline-flex items-center gap-1"
                >
                  {r} <ExternalLink size={10} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
