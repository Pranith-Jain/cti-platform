/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DFIR_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __BUILD_DATE__: string;
