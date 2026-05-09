/**
 * Subdomain takeover fingerprints.
 * Sourced from the can-i-take-over-xyz catalog and nuclei/projectdiscovery templates.
 * Each entry: a CNAME pattern (regex) + an optional body fingerprint to confirm dangling state.
 */

export interface TakeoverFingerprint {
  service: string;
  cname: RegExp;
  /** If unset, dangling status is inferred from CNAME alone. */
  fingerprint?: string;
  /** Treat status code N as confirmation when fingerprint is also unset. */
  status?: number;
  vulnerable: boolean;
  recommendation: string;
}

export const TAKEOVER_FINGERPRINTS: TakeoverFingerprint[] = [
  {
    service: 'AWS S3',
    cname: /\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i,
    fingerprint: 'NoSuchBucket',
    vulnerable: true,
    recommendation: 'Re-create the S3 bucket with the same name and region, or remove the CNAME.',
  },
  {
    service: 'GitHub Pages',
    cname: /\.github\.io$/i,
    fingerprint: "There isn't a GitHub Pages site here",
    vulnerable: true,
    recommendation: 'Re-claim the user/org/repo on GitHub or remove the CNAME.',
  },
  {
    service: 'Heroku',
    cname: /\.herokuapp\.com$|\.herokudns\.com$/i,
    fingerprint: 'No such app',
    vulnerable: true,
    recommendation: 'Re-create the Heroku app under your account or remove the CNAME.',
  },
  {
    service: 'Azure',
    cname: /\.(?:azurewebsites|cloudapp|trafficmanager|cloudapp\.azure|azureedge)\.net$|\.blob\.core\.windows\.net$/i,
    fingerprint: '404 Web Site not found',
    vulnerable: true,
    recommendation: 'Re-create the Azure resource or remove the CNAME.',
  },
  {
    service: 'Shopify',
    cname: /\.myshopify\.com$/i,
    fingerprint: 'Sorry, this shop is currently unavailable',
    vulnerable: true,
    recommendation: 'Re-claim the Shopify store or remove the CNAME.',
  },
  {
    service: 'Tumblr',
    cname: /\.tumblr\.com$/i,
    fingerprint: "There's nothing here",
    vulnerable: true,
    recommendation: 'Reclaim the Tumblr blog or remove the CNAME.',
  },
  {
    service: 'Bitbucket',
    cname: /\.bitbucket\.io$/i,
    fingerprint: 'Repository not found',
    vulnerable: true,
    recommendation: 'Re-create the Bitbucket repo or remove the CNAME.',
  },
  {
    service: 'Cargo',
    cname: /\.cargocollective\.com$/i,
    fingerprint: '404 Not Found',
    vulnerable: true,
    recommendation: 'Re-claim the Cargo site or remove the CNAME.',
  },
  {
    service: 'Pantheon',
    cname: /\.pantheonsite\.io$/i,
    fingerprint: 'The gods are wise',
    vulnerable: true,
    recommendation: 'Re-create the Pantheon site or remove the CNAME.',
  },
  {
    service: 'Statuspage',
    cname: /\.statuspage\.io$/i,
    fingerprint: 'You are being redirected',
    vulnerable: true,
    recommendation: 'Re-claim the Statuspage page or remove the CNAME.',
  },
  {
    service: 'Surge',
    cname: /\.surge\.sh$/i,
    fingerprint: 'project not found',
    vulnerable: true,
    recommendation: 'Re-create the Surge.sh project or remove the CNAME.',
  },
  {
    service: 'Tilda',
    cname: /\.tilda\.ws$/i,
    fingerprint: 'Domain has been assigned',
    vulnerable: true,
    recommendation: 'Re-claim the Tilda site or remove the CNAME.',
  },
  {
    service: 'Webflow',
    cname: /\.webflow\.io$/i,
    fingerprint: 'The page you are looking for',
    vulnerable: true,
    recommendation: 'Re-claim the Webflow site or remove the CNAME.',
  },
  {
    service: 'Zendesk',
    cname: /\.zendesk\.com$/i,
    fingerprint: 'Help Center Closed',
    vulnerable: true,
    recommendation: 'Re-create the Zendesk help center or remove the CNAME.',
  },
  {
    service: 'Fastly',
    cname: /\.fastly\.net$/i,
    fingerprint: 'Fastly error: unknown domain',
    vulnerable: true,
    recommendation: 'Reclaim the Fastly service or remove the CNAME.',
  },
];
