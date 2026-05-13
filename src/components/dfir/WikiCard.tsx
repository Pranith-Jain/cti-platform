import { Link } from 'react-router-dom';
import type { WikiArticleMeta } from '../../data/dfir/wiki-meta';

export function WikiCard({ article }: { article: WikiArticleMeta }): JSX.Element {
  return (
    <Link
      to={`/threatintel/wiki/${article.slug}`}
      className="block border border-rule bg-surface-page p-5 hover:border-accent transition-colors"
    >
      <span className="block text-xs font-mono uppercase tracking-wider text-accent mb-1">{article.category}</span>
      <h3 className="font-mono font-medium text-lg text-ink-1">{article.title}</h3>
      <p className="mt-2 text-sm text-ink-2 leading-relaxed">{article.description}</p>
    </Link>
  );
}
