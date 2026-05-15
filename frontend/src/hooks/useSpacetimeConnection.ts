import { useEffect,useState } from 'react';
import { getSpacetimeClient,isSpacetimeJsonGatewayEnabled } from '../services/spacetime';
import { SpacetimeClientState } from '../spacetime/client';

export interface UseSpacetimeConnectionResult extends SpacetimeClientState {
  enabled: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const useSpacetimeConnection = (autoConnect = true): UseSpacetimeConnectionResult => {
  const client = getSpacetimeClient();
  const enabled = isSpacetimeJsonGatewayEnabled();
  const [state, setState] = useState<SpacetimeClientState>(client.getState());

  useEffect(() => {
    const unsubscribe = client.onStatusChange(setState);

    if (enabled && autoConnect) {
      client.connect();
    }

    return unsubscribe;
  }, [autoConnect, client, enabled]);

  return {
    ...state,
    enabled,
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
  };
};
