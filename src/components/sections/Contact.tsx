import { Mail, Calendar, Linkedin, Github, FileText } from 'lucide-react';
import { personalInfo } from '../../data/content';
import { CopyToClipboard } from '../../components/CopyToClipboard';

/**
 * Contact — quiet dark slate panel. The double-blur-blobs + dot grid
 * + 6xl mega-heading from the prior design were removed in favour of
 * a flat panel with the same dark slate background, same CTAs, and a
 * calmer typographic rhythm.
 */
export function Contact() {
  return (
    <section id="contact" className="mt-24 scroll-mt-24" aria-labelledby="contact-heading">
      <div className="animate-fade-in-up overflow-hidden rounded-2xl bg-slate-900 px-6 py-12 sm:px-10 sm:py-16 dark:bg-brand-950">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-brand-300">Contact</div>
          <h2 id="contact-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to secure your digital presence?
          </h2>
          <p className="mt-4 max-w-2xl text-base text-slate-300">
            Whether you need threat intelligence, email security hardening, or cloud identity protection, I&apos;m here
            to help. My work bridges technical controls with business-critical trust signals across 150+ global brands.
          </p>

          {/* Primary CTAs — flat, no scale animation, smaller padding */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${personalInfo.email}`}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              aria-label={`Send email to ${personalInfo.email}`}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email
            </a>
            <a
              href={personalInfo.calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              aria-label="Schedule a 30-minute consultation call"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Book a call
            </a>
            <div className="ml-auto flex items-center">
              <CopyToClipboard text={personalInfo.email} label="Copy email address" />
            </div>
          </div>

          {/* Socials — clean mono row, no gradient hover */}
          <ul
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-6 font-mono text-[12px]"
            aria-label="Social media and professional links"
          >
            <li>
              <a
                href={personalInfo.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
                aria-label="LinkedIn profile (opens in new tab)"
              >
                <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
                linkedin
              </a>
            </li>
            <li>
              <a
                href={personalInfo.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
                aria-label="GitHub profile (opens in new tab)"
              >
                <Github className="h-3.5 w-3.5" aria-hidden="true" />
                github
              </a>
            </li>
            <li>
              <a
                href={personalInfo.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
                aria-label="Resume (opens in new tab)"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                resume
              </a>
            </li>
            <li>
              <a
                href={personalInfo.featuredUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
                aria-label="Featured Experts profile (opens in new tab)"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                featured
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
