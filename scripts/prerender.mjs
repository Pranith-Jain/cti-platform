#!/usr/bin/env node
/**
 * SSR prerender step. Runs after `vite build` + `vite build --ssr`.
 *
 * For each route in ROUTES below, imports the SSR bundle's `render(url)`,
 * generates the route's HTML, and writes it into dist/<route>/index.html.
 * Cloudflare's Assets binding then serves the prerendered HTML for that
 * route instead of the empty SPA shell — meaning users see real content
 * before React even loads.
 *
 * Client-side React still mounts: main.tsx uses hydrateRoot() (added in
 * Phase 2) which adopts the existing DOM rather than creating new nodes.
 *
 * Phase 1 (this file's current scope): only the home route is rendered,
 * as a proof of concept. The pipeline is staged but PRODUCTION DOES NOT
 * SERVE THE PRERENDERED HTML YET — that happens in Phase 2 when we
 * confirm the model works.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Phase 1: just the home route. Phase 3 will expand this list to all
// static-content routes after the model is proven on Phase 2.
const ROUTES = ['/'];

const SHELL_PATH = resolve(ROOT, 'dist/index.html');
const SERVER_BUNDLE = resolve(ROOT, '.ssr-build/entry-server.js');

async function main() {
  if (!existsSync(SHELL_PATH)) {
    console.error(`prerender: missing ${SHELL_PATH} — run \`vite build\` first.`);
    process.exit(1);
  }
  if (!existsSync(SERVER_BUNDLE)) {
    console.error(
      `prerender: missing ${SERVER_BUNDLE} — run \`vite build --ssr src/entry-server.tsx\` first.`,
    );
    process.exit(1);
  }

  const shell = await readFile(SHELL_PATH, 'utf8');
  // Dynamic import of the local file via file:// URL (ESM requirement).
  const { render } = await import(pathToFileURL(SERVER_BUNDLE).href);
  if (typeof render !== 'function') {
    throw new Error('prerender: server bundle does not export render(url)');
  }

  // Prerendered HTML goes under dist/__prerendered/ so Cloudflare Assets
  // doesn't auto-serve it for the matching route. The Worker's fetch
  // handler explicitly looks up __prerendered/<slug>.html and falls back
  // to the SPA shell (dist/index.html) when it's missing. Keeping the
  // SPA shell untouched means unknown routes still get the correct
  // fallback behavior.
  const prerenderDir = resolve(ROOT, 'dist/__prerendered');
  await mkdir(prerenderDir, { recursive: true });

  const manifest = [];
  let okCount = 0;
  for (const route of ROUTES) {
    try {
      const { html: appHtml } = render(route);
      const finalHtml = shell.replace(/<div id="root"><\/div>/, `<div id="root">${appHtml}</div>`);
      if (finalHtml === shell) {
        throw new Error('prerender: shell did not contain <div id="root"></div> placeholder');
      }
      // Route '/' becomes 'home'; other routes have slashes replaced with
      // double-underscore so we don't accidentally create nested folders.
      const slug = route === '/' ? 'home' : route.slice(1).replace(/\//g, '__');
      const outFile = resolve(prerenderDir, `${slug}.html`);
      await writeFile(outFile, finalHtml, 'utf8');
      manifest.push({ route, file: `__prerendered/${slug}.html` });
      const sizeKB = (finalHtml.length / 1024).toFixed(1);
      console.log(`  ✓ ${route.padEnd(30)} → __prerendered/${slug}.html  (${sizeKB} KB)`);
      okCount++;
    } catch (err) {
      console.error(`  ✗ ${route}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Manifest tells the Worker which routes have prerendered HTML available.
  await writeFile(
    resolve(prerenderDir, 'manifest.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), routes: manifest }, null, 2),
    'utf8',
  );

  console.log(`\nprerender: ${okCount}/${ROUTES.length} routes rendered → dist/__prerendered/`);
  if (okCount === 0) process.exit(1);
}

void main();
