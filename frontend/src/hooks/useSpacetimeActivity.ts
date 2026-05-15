import { useMemo } from 'react';
import { SpacetimeSubscriptionOptions } from '../spacetime/client';
import {
SPACETIME_TABLES,
SpacetimeActivity,
SpacetimeLiveFilter,
} from '../spacetime/models';
import { transformSpacetimeActivity } from '../spacetime/transforms';
import { useSpacetimeLiveCollection } from './useSpacetimeLiveCollection';

export interface UseSpacetimeActivityOptions {
  entityType?: string;
  entityId?: string;
  action?: string;
  status?: string;
  limit?: number;
}

const sortActivityByTimestamp = (left: SpacetimeActivity, right: SpacetimeActivity): number => {
  return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
};

export const useSpacetimeActivity = (options: UseSpacetimeActivityOptions = {}) => {
  const filters = useMemo(() => {
    const nextFilters: SpacetimeLiveFilter[] = [];
    if (options.entityType) nextFilters.push({ field: 'entity_type', value: options.entityType });
    if (options.entityId) nextFilters.push({ field: 'entity_id', value: options.entityId });
    if (options.action) nextFilters.push({ field: 'action', value: options.action });
    if (options.status) nextFilters.push({ field: 'status', value: options.status });
    return nextFilters;
  }, [options.action, options.entityId, options.entityType, options.status]);

  const query = useMemo<SpacetimeSubscriptionOptions<SpacetimeActivity>>(() => ({
    table: SPACETIME_TABLES.activity,
    filters,
    limit: options.limit ?? 25,
    orderBy: 'timestamp',
    orderDirection: 'desc',
    transform: transformSpacetimeActivity,
    sort: sortActivityByTimestamp,
  }), [filters, options.limit]);

  return useSpacetimeLiveCollection<SpacetimeActivity>(query);
};
