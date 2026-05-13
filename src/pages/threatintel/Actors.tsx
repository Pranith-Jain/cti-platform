import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { threatActors, type ActorStatus, type Sophistication } from '../../data/dfir/threat-actors';
import { ActorCard } from '../../components/dfir/ActorCard';
import { ActorFilterBar } from '../../components/dfir/ActorFilterBar';

export default function Actors(): JSX.Element {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ActorStatus>('all');
  const [sophistication, setSophistication] = useState<'all' | Sophistication>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threatActors.filter((a) => {
      if (status !== 'all' && a.status !== status) return false;
      if (sophistication !== 'all' && a.sophistication !== sophistication) return false;
      if (q) {
        const hay = (a.name + ' ' + a.aliases.join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, status, sophistication]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 text-ink-1">
      <Link
        to="/threatintel"
        className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-accent mb-8 font-mono"
      >
        <ArrowLeft size={14} /> /threatintel
      </Link>
      <div>
        <h1 className="text-4xl font-serif font-bold mb-2">Threat Actors</h1>
        <p className="text-ink-2 mb-8 max-w-2xl">
          A catalog of known APT groups, ransomware operators, and threat actors. Click any card for details.
        </p>
      </div>

      <ActorFilterBar
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        sophistication={sophistication}
        setSophistication={setSophistication}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((a) => (
          <ActorCard key={a.slug} actor={a} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="font-mono text-sm text-ink-2 mt-8">No actors match the current filters.</p>
      )}

      <p className="mt-12 text-xs font-mono text-ink-2">
        Showing {filtered.length} of {threatActors.length} actors.
      </p>

      <section className="mt-6 border border-rule bg-surface-raised p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-2">Have a STIX 2.1 bundle?</h2>
        <p className="text-sm text-ink-1 leading-relaxed">
          Open the{' '}
          <Link to="/dfir/stix" className="text-accent hover:underline font-semibold">
            STIX Viewer
          </Link>{' '}
          to paste a bundle and explore the relationship graph in your browser.
        </p>
      </section>
    </div>
  );
}
