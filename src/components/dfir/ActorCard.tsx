import { Link } from 'react-router-dom';
import type { ThreatActor } from '../../data/dfir/threat-actors';

const SOPH_STYLES: Record<string, string> = {
  'nation-state': 'bg-threat/10 text-threat border-threat/40',
  expert: 'bg-warn/10 text-warn border-warn/40',
  advanced: 'bg-warn/10 text-warn border-warn/40',
  intermediate: 'bg-surface-raised text-ink-2 border-rule',
  novice: 'bg-surface-raised text-ink-3 border-rule',
};

export function ActorCard({ actor }: { actor: ThreatActor }): JSX.Element {
  return (
    <Link
      to={`/threatintel/actors/${actor.slug}`}
      className="block border border-rule bg-surface-page p-5 hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-mono font-medium text-lg text-ink-1">{actor.name}</h3>
          {actor.aliases.length > 0 && (
            <p className="text-xs font-mono text-ink-3 mt-0.5">{actor.aliases.slice(0, 3).join(' · ')}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
          <span
            className={`text-xs font-mono px-2 py-0.5 border ${
              actor.status === 'active'
                ? 'bg-safe/10 text-safe border-safe/40'
                : 'bg-surface-raised text-ink-3 border-rule'
            }`}
          >
            {actor.status}
          </span>
          <span
            className={`text-xs font-mono px-2 py-0.5 border ${SOPH_STYLES[actor.sophistication] ?? SOPH_STYLES.novice}`}
          >
            {actor.sophistication}
          </span>
        </div>
      </div>
      <p className="text-sm text-ink-2 leading-relaxed line-clamp-3 mb-3">{actor.description}</p>
      <div className="flex items-center gap-3 text-xs font-mono text-ink-3">
        {actor.country && <span>{actor.country}</span>}
        <span>{actor.techniques.length} techniques</span>
        <span>{actor.malware.length} tools</span>
      </div>
    </Link>
  );
}
