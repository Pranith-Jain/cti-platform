export interface Env {
  KV_CACHE?: KVNamespace;
  KV_SHARES?: KVNamespace;
  BRIEFINGS?: KVNamespace;
  R2_FILES?: R2Bucket;
  VT_API_KEY: string;
  ABUSEIPDB_API_KEY: string;
  SHODAN_API_KEY: string;
  OTX_API_KEY: string;
  URLSCAN_API_KEY: string;
  HYBRID_ANALYSIS_API_KEY: string;
  ABUSECH_AUTH_KEY?: string;
  DFIR_DEV_ERRORS?: string;
  DFIR_ANALYTICS?: AnalyticsEngineDataset;
  /**
   * Optional .onion fetch proxy. When both are set, /api/v1/onion-fetch is
   * live. When unset, the route returns 503 service_unavailable. See
   * docs/onion-proxy-design.md for the proxy design.
   */
  ONION_PROXY_URL?: string;
  ONION_PROXY_SECRET?: string;
}
