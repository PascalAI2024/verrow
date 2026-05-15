import { useMemo } from 'react';
import { SpacetimeSubscriptionOptions } from '../spacetime/client';
import {
SPACETIME_TABLES,
SpacetimeJob,
SpacetimeLiveFilter,
} from '../spacetime/models';
import { transformSpacetimeJob } from '../spacetime/transforms';
import { useSpacetimeLiveCollection } from './useSpacetimeLiveCollection';

export interface UseSpacetimeJobsOptions {
  fileId?: string;
  status?: SpacetimeJob['status'];
  limit?: number;
}

const sortJobsByUpdatedAt = (left: SpacetimeJob, right: SpacetimeJob): number => {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
};

export const useSpacetimeJobs = (options: UseSpacetimeJobsOptions = {}) => {
  const filters = useMemo(() => {
    const nextFilters: SpacetimeLiveFilter[] = [];
    if (options.fileId) nextFilters.push({ field: 'file_id', value: options.fileId });
    if (options.status) nextFilters.push({ field: 'status', value: options.status });
    return nextFilters;
  }, [options.fileId, options.status]);

  const query = useMemo<SpacetimeSubscriptionOptions<SpacetimeJob>>(() => ({
    table: SPACETIME_TABLES.jobs,
    filters,
    limit: options.limit,
    orderBy: 'updated_at',
    orderDirection: 'desc',
    transform: transformSpacetimeJob,
    sort: sortJobsByUpdatedAt,
  }), [filters, options.limit]);

  return useSpacetimeLiveCollection<SpacetimeJob>(query);
};

export const useSpacetimeJob = (jobId?: string) => {
  const filters = useMemo(() => {
    return jobId ? [{ field: 'id', value: jobId }] : [];
  }, [jobId]);

  const query = useMemo<SpacetimeSubscriptionOptions<SpacetimeJob>>(() => ({
    table: SPACETIME_TABLES.jobs,
    filters,
    limit: 1,
    transform: transformSpacetimeJob,
  }), [filters]);

  const result = useSpacetimeLiveCollection<SpacetimeJob>(query);

  return {
    ...result,
    job: result.data[0] || null,
  };
};
