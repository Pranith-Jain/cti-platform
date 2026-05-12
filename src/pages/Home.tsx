import { Hero, Featured, Contact } from '../components/sections';

/**
 * Home page sections (Hero / Featured / Contact) used to be React.lazy
 * imports wrapped in Suspense. That was a regression for SSR because
 * `renderToString` doesn't wait for Suspense to resolve and emits
 * spinner fallbacks into the prerendered HTML, hurting LCP and forcing
 * extra hydration work. Eager imports here add ~5KB to the Home chunk
 * but let the prerender pipeline emit real Hero / Featured / Contact
 * markup.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Featured />
      <Contact />
    </>
  );
}
