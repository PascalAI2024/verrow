import {
SpacetimeActivity,
SpacetimeFile,
SpacetimeJob,
SpacetimeRecord,
} from './models';

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

const asString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

const asNumber = (value: unknown, fallback = 0): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const asOptionalNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const asDateString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
};

const pick = (row: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
};

export const transformSpacetimeJob = (value: unknown): SpacetimeJob => {
  const row = asRecord(value);

  return {
    id: asString(pick(row, 'id', 'jobId')),
    status: asString(row.status, 'waiting') as SpacetimeJob['status'],
    progress: asNumber(row.progress),
    step: asString(row.step) || undefined,
    message: asString(row.message) || undefined,
    fileId: asString(pick(row, 'fileId', 'file_id')) || undefined,
    datasetId: asString(pick(row, 'datasetId', 'dataset_id')) || undefined,
    result: row.result,
    error: asString(row.error) || undefined,
    createdAt: asDateString(pick(row, 'createdAt', 'created_at')),
    updatedAt: asDateString(pick(row, 'updatedAt', 'updated_at')),
  };
};

export const transformSpacetimeFile = (value: unknown): SpacetimeFile => {
  const row = asRecord(value);

  return {
    id: asString(row.id),
    name: asString(pick(row, 'name', 'filename'), asString(pick(row, 'originalName', 'original_name'), 'Untitled file')),
    originalName: asString(pick(row, 'originalName', 'original_name'), asString(pick(row, 'name', 'filename'), 'Untitled file')),
    size: asNumber(row.size),
    status: asString(row.status, 'processing') as SpacetimeFile['status'],
    uploadDate: asDateString(pick(row, 'uploadDate', 'upload_date', 'uploadedAt', 'uploaded_at', 'createdAt', 'created_at')),
    recordCount: asOptionalNumber(pick(row, 'recordCount', 'record_count')),
    columnCount: asOptionalNumber(pick(row, 'columnCount', 'column_count')) ?? (Array.isArray(row.headers) ? row.headers.length : undefined),
    jobId: asString(pick(row, 'jobId', 'job_id')) || undefined,
    datasetId: asString(pick(row, 'datasetId', 'dataset_id')) || undefined,
    qualityScore: asOptionalNumber(pick(row, 'qualityScore', 'quality_score')),
    error: asString(row.error) || undefined,
  };
};

export const transformSpacetimeRecord = (value: unknown): SpacetimeRecord => {
  const row = asRecord(value);

  return {
    ...row,
    id: asString(row.id),
    fileId: asString(pick(row, 'fileId', 'file_id', 'sourceFile', 'source_file')) || undefined,
    datasetId: asString(pick(row, 'datasetId', 'dataset_id')) || undefined,
    leadCategory: asString(pick(row, 'leadCategory', 'lead_category'), 'unknown') as SpacetimeRecord['leadCategory'],
    qualityScore: asOptionalNumber(pick(row, 'qualityScore', 'quality_score')),
    name: asString(pick(row, 'name', 'contactName', 'contact_name', 'businessName', 'business_name')) || undefined,
    firstName: asString(pick(row, 'firstName', 'first_name')) || undefined,
    lastName: asString(pick(row, 'lastName', 'last_name')) || undefined,
    email: asString(row.email) || undefined,
    phone: asString(row.phone) || undefined,
    company: asString(pick(row, 'company', 'businessName', 'business_name')) || undefined,
    jobTitle: asString(pick(row, 'jobTitle', 'job_title', 'contactTitle', 'contact_title')) || undefined,
    industry: asString(row.industry) || undefined,
    location: asString(row.location) || [row.city, row.state, row.country].filter(Boolean).join(', ') || undefined,
    city: asString(row.city) || undefined,
    state: asString(row.state) || undefined,
    country: asString(row.country) || undefined,
    source: asString(row.source) || undefined,
    createdAt: row.createdAt || row.created_at ? asDateString(pick(row, 'createdAt', 'created_at')) : undefined,
    updatedAt: row.updatedAt || row.updated_at ? asDateString(pick(row, 'updatedAt', 'updated_at')) : undefined,
  };
};

export const transformSpacetimeActivity = (value: unknown): SpacetimeActivity => {
  const row = asRecord(value);

  return {
    id: asString(row.id),
    timestamp: asDateString(row.timestamp),
    action: asString(row.action),
    entityType: asString(pick(row, 'entityType', 'entity_type')),
    entityId: asString(pick(row, 'entityId', 'entity_id')) || undefined,
    details: asRecord(row.details ?? tryParseJson(row.details_json)),
    userId: asString(pick(row, 'userId', 'user_id')) || undefined,
    status: asString(row.status) || undefined,
    duration: asOptionalNumber(pick(row, 'duration', 'duration_ms')),
  };
};

const tryParseJson = (value: unknown): unknown => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};
