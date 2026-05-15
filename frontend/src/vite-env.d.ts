/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REST_GATEWAY_URL?: string;
  readonly VITE_ENABLE_REST_GATEWAY?: string;
  readonly VITE_ENABLE_SPACETIME?: string;
  readonly VITE_RUST_INGEST_API_URL?: string;
  readonly VITE_SPACETIME_DB?: string;
  readonly VITE_SPACETIME_HOST?: string;
  readonly VITE_SPACETIME_MODULE?: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
