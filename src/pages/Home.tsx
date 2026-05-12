import { Hero, Featured, Contact } from '../components/sections';
import { PullQuote } from '../components/editorial';

/**
 * Home page sections (Hero / pull-quote / Featured / Contact) used to be
 * React.lazy imports wrapped in Suspense. That was a regression for SSR
 * because `renderToString` doesn't wait for Suspense to resolve and
 * emits spinner fallbacks into the prerendered HTML, hurting LCP and
 * forcing extra hydration work. Eager imports here add ~5KB to the Home
 * chunk but let the prerender pipeline emit real markup.
 *
 * The PullQuote breaks up the page between Hero and Featured. It's the
 * dossier's editorial breather — same line is quoted in About prose,
 * displayed here at magazine display size so the page reads as a
 * three-act sequence: subject brief → press index → contact.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <PullQuote attribution="Pranith Jain · About">I ship the tools I wish I&rsquo;d had on shift.</PullQuote>
      <Featured />
      <Contact />
    </>
  );
}
