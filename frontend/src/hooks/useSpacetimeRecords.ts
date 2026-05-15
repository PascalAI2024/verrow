import { useMemo } from 'react';
import { SpacetimeSubscriptionOptions } from '../spacetime/client';
import {
LeadCategory,
SPACETIME_TABLES,
SpacetimeLiveFilter,
SpacetimeRecord,
} from '../spacetime/models';
import { transformSpacetimeRecord } from '../spacetime/transforms';
import { useSpacetimeLiveCollection } from './useSpacetimeLiveCollection';

export interface UseSpacetimeRecordsOptions {
  fileId?: string;
  datasetId?: string;
  leadCategory?: LeadCategory;
  minQualityScore?: number;
  limit?: number;
}

export const useSpacetimeRecords = (options: UseSpacetimeRecordsOptions = {}) => {
  const filters = useMemo(() => {
    const nextFilters: SpacetimeLiveFilter[] = [];
    if (options.fileId) nextFilters.push({ field: 'source_file', value: options.fileId });
    if (options.datasetId) nextFilters.push({ field: 'dataset_id', value: options.datasetId });
    if (options.leadCategory) nextFilters.push({ field: 'lead_category', value: options.leadCategory });
    if (options.minQualityScore !== undefined) {
      nextFilters.push({ field: 'quality_score', op: 'gte', value: options.minQualityScore });
    }
    return nextFilters;
  }, [options.datasetId, options.fileId, options.leadCategory, options.minQualityScore]);

  const query = useMemo<SpacetimeSubscriptionOptions<SpacetimeRecord>>(() => ({
    table: SPACETIME_TABLES.records,
    filters,
    limit: options.limit,
    orderBy: 'created_at',
    orderDirection: 'desc',
    transform: transformSpacetimeRecord,
  }), [filters, options.limit]);

  return useSpacetimeLiveCollection<SpacetimeRecord>(query);
};
