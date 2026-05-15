import { useCallback,useEffect,useMemo,useState } from 'react';
import { getSpacetimeClient,isSpacetimeJsonGatewayEnabled } from '../services/spacetime';
import {
SpacetimeConnectionStatus,
SpacetimeSubscriptionOptions,
} from '../spacetime/client';
import {
SpacetimeCollectionState,
SpacetimeLiveQuery,
} from '../spacetime/models';

export interface UseSpacetimeLiveCollectionResult<T> extends SpacetimeCollectionState<T> {
  enabled: boolean;
  status: SpacetimeConnectionStatus;
  refresh: () => void;
}

const initialState = <T>(enabled: boolean): SpacetimeCollectionState<T> => ({
  data: [],
  isLoading: enabled,
  error: null,
  lastUpdatedAt: null,
});

export const useSpacetimeLiveCollection = <T>(
  query: SpacetimeSubscriptionOptions<T>,
): UseSpacetimeLiveCollectionResult<T> => {
  const client = getSpacetimeClient();
  const enabled = isSpacetimeJsonGatewayEnabled();
  const [collection, setCollection] = useState<SpacetimeCollectionState<T>>(() => initialState<T>(enabled));
  const [status, setStatus] = useState<SpacetimeConnectionStatus>(client.getState().status);

  const queryKey = useMemo(() => JSON.stringify({
    table: query.table,
    filters: query.filters,
    limit: query.limit,
    orderBy: query.orderBy,
    orderDirection: query.orderDirection,
  } satisfies SpacetimeLiveQuery), [query.filters, query.limit, query.orderBy, query.orderDirection, query.table]);

  useEffect(() => {
    const unsubscribeStatus = client.onStatusChange((state) => setStatus(state.status));

    if (!enabled) {
      setCollection(initialState<T>(false));
      return unsubscribeStatus;
    }

    const unsubscribeCollection = client.subscribe(query, setCollection);

    return () => {
      unsubscribeCollection();
      unsubscribeStatus();
    };
  }, [client, enabled, query, queryKey]);

  const refresh = useCallback(() => {
    if (enabled) {
      client.refresh();
    }
  }, [client, enabled]);

  return {
    ...collection,
    enabled,
    status,
    refresh,
  };
};
