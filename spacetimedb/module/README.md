# Verrow SpacetimeDB Module

Rust module for the Verrow live-backend path.

The reducers below are available in the module and generated TypeScript bindings. The Rust ingest API sidecar does not yet call them over a real SpacetimeDB Rust SDK transport; its current confirm/process endpoints return no-op transport receipts until that client is implemented.

## Tables

- `uploaded_files`
- `mapping_suggestions`
- `column_mappings`
- `processing_jobs`
- `data_records`
- `activity_events`
- `data_quality_reports`

## Reducers

- `register_upload`
- `record_mapping_suggestions`
- `confirm_mappings`
- `stage_csv_upload`
- `process_csv_upload`
- `update_job_progress`
- `insert_lead_records`
- `delete_record`
- `append_activity_event`
- `record_data_quality_report`

## Local Workflow

```bash
npm run dev:spacetime
npm run spacetime:publish
npm run spacetime:generate
```

`spacetime:generate` writes TypeScript bindings into `frontend/src/spacetime/bindings`.
