import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { AppContent } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

/**
 * SSR entry point. Builds via `vite build --ssr src/entry-server.tsx`
 * into `dist/server/entry-server.js`.
 *
 * The prerender script (scripts/prerender.mjs) imports the built bundle's
 * `render()` and calls it per-route to produce static HTML.
 *
 * Phase 1 limitation: we render to string (not stream) and do not run any
 * data loaders. Components that fetch via useEffect see no data during
 * SSR — only the markup wrapper renders. Client takes over on hydration
 * and fetches the data normally. That alone is enough to fix FCP/LCP on
 * content-driven pages; data-driven pages (cve-list, briefings) won't see
 * a Lighthouse improvement until Phase 4 (runtime SSR with data loaders).
 */

export interface RenderResult {
  /** Server-rendered HTML for the page body (will be injected into index.html). */
  html: string;
}

export function render(url: string): RenderResult {
  const html = renderToString(
    <StrictMode>
      <ErrorBoundary>
        <StaticRouter location={url}>
          <AppContent />
        </StaticRouter>
      </ErrorBoundary>
    </StrictMode>
  );
  return { html };
}
