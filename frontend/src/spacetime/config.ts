export interface SpacetimeClientConfig {
  enabled: boolean;
  jsonGatewayEnabled: boolean;
  host: string;
  database: string;
  moduleName?: string;
  authToken?: string;
  reconnect: boolean;
  reconnectInitialDelayMs: number;
  reconnectMaxDelayMs: number;
}

const readEnv = (name: string): string | undefined => {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  return env[name];
};

const parseBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value.toLowerCase());
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const getSpacetimeConfig = (): SpacetimeClientConfig => ({
  enabled: parseBoolean(readEnv('VITE_ENABLE_SPACETIME')),
  jsonGatewayEnabled: parseBoolean(readEnv('VITE_ENABLE_SPACETIME_JSON_GATEWAY')),
  host: readEnv('VITE_SPACETIME_HOST') || 'ws://localhost:3001',
  database: readEnv('VITE_SPACETIME_DB') || 'verrow',
  moduleName: readEnv('VITE_SPACETIME_MODULE'),
  authToken: readEnv('VITE_SPACETIME_TOKEN'),
  reconnect: !parseBoolean(readEnv('VITE_SPACETIME_DISABLE_RECONNECT')),
  reconnectInitialDelayMs: parseNumber(readEnv('VITE_SPACETIME_RECONNECT_INITIAL_MS'), 1000),
  reconnectMaxDelayMs: parseNumber(readEnv('VITE_SPACETIME_RECONNECT_MAX_MS'), 15000),
});

export const isSpacetimeEnabled = (): boolean => getSpacetimeConfig().enabled;
export const isSpacetimeJsonGatewayEnabled = (): boolean => getSpacetimeConfig().jsonGatewayEnabled;
