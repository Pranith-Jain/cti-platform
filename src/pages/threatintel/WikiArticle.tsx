import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Wrench } from 'lucide-react';
import { wikiMeta } from '../../data/dfir/wiki-meta';
import { type ToolTopic } from '../../data/dfir/tool-topics';
import { injectToolLinks } from '../../lib/dfir/inject-tool-links';

export default function WikiArticle(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLDivElement | null>(null);
  const articleMeta = wikiMeta.find((a) => a.slug === slug);
  const [html, setHtml] = useState<string>('');
  const [relatedTools, setRelatedTools] = useState<ToolTopic[]>([]);

  // Lazy-load the wiki body data + the markdown libs (~80KB combined). The
  // article meta (title, description, category) is already in scope via the
  // slim wiki-meta module so the page renders immediately while bodies stream in.
  useEffect(() => {
    // Clear stale render from the previous slug. Without this, navigating
    // wiki-to-wiki briefly shows the previous article's body until the new
    // dynamic import resolves.
    setHtml('');
    setRelatedTools([]);
    if (!articleMeta) return;
    let cancelled = false;
    void (async () => {
      const [{ wikiArticles }, { marked }, { default: DOMPurify }] = await Promise.all([
        import('../../data/dfir/wiki-articles'),
        import('marked'),
        import('isomorphic-dompurify'),
      ]);
      const article = wikiArticles.find((a) => a.slug === slug);
      if (!article || cancelled) return;
      const { body: linked, matched } = injectToolLinks(article.body);
      const raw = marked.parse(linked) as string;
      const sanitised = DOMPurify.sanitize(raw, {
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|#|\/):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
        ADD_ATTR: ['title'],
      });
      if (!cancelled) {
        setHtml(sanitised);
        setRelatedTools(matched);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleMeta, slug]);

  // Intercept clicks on internal /dfir links so they navigate via React
  // Router instead of triggering a full page reload.
  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href') ?? '';
      if (href.startsWith('/dfir/')) {
        // Internal — let modifier-clicks open in new tab as the browser would.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target.target === '_blank') return;
        e.preventDefault();
        navigate(href);
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [navigate, html]);

  if (!articleMeta) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-20 text-ink-1">
        <Link
          to="/threatintel/wiki"
          className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-accent mb-8 font-mono"
        >
          <ArrowLeft size={14} /> /threatintel/wiki
        </Link>
        <h1 className="font-serif font-bold text-3xl">Article not found</h1>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 text-ink-1">
      <Link
        to="/threatintel/wiki"
        className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-accent mb-8 font-mono"
      >
        <ArrowLeft size={14} /> /threatintel/wiki
      </Link>
      <span className="block text-xs font-mono uppercase tracking-wider text-accent mb-2">{articleMeta.category}</span>
      <h1 className="text-4xl font-serif font-bold mb-4">{articleMeta.title}</h1>
      <p className="text-lg text-ink-2 mb-8">{articleMeta.description}</p>

      <article
        ref={articleRef}
        className="prose prose-invert max-w-none [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:mt-8 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:mt-6 [&_p]:text-ink-2 [&_strong]:text-ink-1 [&_a]:text-accent [&_code]:text-accent [&_code]:font-mono [&_pre]:bg-surface-raised [&_pre]:border [&_pre]:border-rule [&_pre]:p-4 [&_pre]:rounded [&_li]:text-ink-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {relatedTools.length > 0 && (
        <section className="mt-12 border border-rule bg-surface-raised p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent font-mono mb-3 inline-flex items-center gap-2">
            <Wrench size={12} /> Related tools in this portfolio
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {relatedTools.map((t) => (
              <li key={t.href}>
                <Link to={t.href} className="block border border-rule bg-surface-page px-3 py-2 hover:border-rule">
                  <span className="font-serif font-semibold text-sm text-ink-1">{t.term}</span>
                  <span className="block text-[11px] font-mono text-ink-3 mt-0.5">{t.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
