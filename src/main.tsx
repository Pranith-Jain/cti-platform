import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element');
}

const tree = (
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Prerendered routes ship real HTML inside <div id="root">. Hydrate that
// markup so React adopts the existing DOM instead of replacing it. Empty
// SPA-shell routes (vite-built dist/index.html with no inner content)
// still go through createRoot.
//
// Detection: any prerendered output has at least one element child.
if (rootElement.firstElementChild) {
  ReactDOM.hydrateRoot(rootElement, tree);
} else {
  ReactDOM.createRoot(rootElement).render(tree);
}
