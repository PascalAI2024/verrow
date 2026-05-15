import { ReactNode,useMemo } from 'react';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection } from './bindings';
import { getSpacetimeConfig } from './config';

interface SpacetimeProviderProps {
  children: ReactNode;
}

export const SpacetimeProvider = ({ children }: SpacetimeProviderProps) => {
  const config = getSpacetimeConfig();

  const connectionBuilder = useMemo(() => {
    if (!config.enabled) return null;

    let builder = DbConnection.builder()
      .withUri(config.host)
      .withDatabaseName(config.database)
      .withLightMode(true);

    if (config.authToken) {
      builder = builder.withToken(config.authToken);
    }

    return builder;
  }, [config.authToken, config.database, config.enabled, config.host]);

  if (!connectionBuilder) {
    return <>{children}</>;
  }

  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      {children}
    </SpacetimeDBProvider>
  );
};
