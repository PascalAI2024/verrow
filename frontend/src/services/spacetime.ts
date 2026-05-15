import { SpacetimeClientState,SpacetimeLiveClient } from '../spacetime/client';
import {
getSpacetimeConfig,
isSpacetimeEnabled,
isSpacetimeJsonGatewayEnabled,
} from '../spacetime/config';

let client: SpacetimeLiveClient | null = null;

export const getSpacetimeClient = (): SpacetimeLiveClient => {
  if (!client) {
    client = new SpacetimeLiveClient(getSpacetimeConfig());
  }
  return client;
};

export const resetSpacetimeClient = (): void => {
  if (client) {
    client.disconnect();
  }
  client = null;
};

export const getSpacetimeState = (): SpacetimeClientState => getSpacetimeClient().getState();

export { isSpacetimeEnabled,isSpacetimeJsonGatewayEnabled };
