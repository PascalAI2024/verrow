import { useMemo } from 'react';
import { SpacetimeSubscriptionOptions } from '../spacetime/client';
import {
SPACETIME_TABLES,
SpacetimeFile,
SpacetimeLiveFilter,
} from '../spacetime/models';
import { transformSpacetimeFile } from '../spacetime/transforms';
import { useSpacetimeLiveCollection } from './useSpacetimeLiveCollection';

export interface UseSpacetimeFilesOptions {
  datasetId?: string;
  status?: SpacetimeFile['status'];
  limit?: number;
}

const sortFilesByUploadDate = (left: SpacetimeFile, right: SpacetimeFile): number => {
  return new Date(right.uploadDate).getTime() - new Date(left.uploadDate).getTime();
};

export const useSpacetimeFiles = (options: UseSpacetimeFilesOptions = {}) => {
  const filters = useMemo(() => {
    const nextFilters: SpacetimeLiveFilter[] = [];
    if (options.datasetId) nextFilters.push({ field: 'dataset_id', value: options.datasetId });
    if (options.status) nextFilters.push({ field: 'status', value: options.status });
    return nextFilters;
  }, [options.datasetId, options.status]);

  const query = useMemo<SpacetimeSubscriptionOptions<SpacetimeFile>>(() => ({
    table: SPACETIME_TABLES.files,
    filters,
    limit: options.limit,
    orderBy: 'uploaded_at',
    orderDirection: 'desc',
    transform: transformSpacetimeFile,
    sort: sortFilesByUploadDate,
  }), [filters, options.limit]);

  return useSpacetimeLiveCollection<SpacetimeFile>(query);
};
