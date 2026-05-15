# Rust Services

This directory contains Rust services for Verrow. The first service is `ingest-api`, an Axum API that fronts CSV upload, column preview, mapping suggestions, and SpacetimeDB reducer intent.

## Ingest API

```bash
cd rust-services/ingest-api
cargo run
```

The service listens on `0.0.0.0:3010` by default.

Useful local checks:

```bash
cd rust-services/ingest-api
cargo fmt
cargo check
cargo test
```

### Configuration

```env
INGEST_API_BIND_ADDR=0.0.0.0:3010
INGEST_API_MAX_UPLOAD_BYTES=10485760
INGEST_API_CSV_SAMPLE_ROWS=25
SPACETIMEDB_URL=http://localhost:3001
SPACETIMEDB_MODULE=verrow
```

`SPACETIMEDB_URL` and `SPACETIMEDB_MODULE` are optional today. They only report whether settings are present. The sidecar still uses a no-op reducer transport: confirm/process requests are accepted by the sidecar, logged as reducer intent, and returned with `delivered_to_spacetimedb: false` until a real Rust SDK client is implemented.

When running through the repository Docker Compose stack, SpacetimeDB is exposed on `localhost:3001` and the ingest API is exposed on `localhost:3010`.

### Endpoints

- `GET /health` returns service health, whether SpacetimeDB settings are present, and the reducer transport mode. Today `reducer_transport.mode` is `noop` and `reducer_transport.ready` is `false`.
- `POST /v1/csv/uploads` accepts multipart form data with a CSV field named `file`, parses headers and sample rows, and returns heuristic mapping suggestions.
- `POST /v1/mapping/suggestions` accepts JSON headers and optional sample rows, then returns mapping suggestions without uploading a file.
- `POST /v1/uploads/{upload_id}/confirm` validates and stores a human-confirmed mapping, then records `stage_csv_upload` reducer intent through the current transport.
- `POST /v1/uploads/{upload_id}/process` records `process_csv_upload` reducer intent through the current transport for a confirmed upload.

### Example

```bash
curl -s -F "file=@../../sample_data.csv" http://localhost:3010/v1/csv/uploads
```

```bash
curl -s \
  -H "content-type: application/json" \
  -d '{"headers":["Full Name","Email","Company"],"sample_rows":[{"Full Name":"Ada Lovelace","Email":"ada@example.com","Company":"Analytical Engines LLC"}]}' \
  http://localhost:3010/v1/mapping/suggestions
```

Confirm an upload using the `upload_id` returned by the upload endpoint:

```bash
curl -s \
  -H "content-type: application/json" \
  -d '{"dataset_name":"vendor-leads","mapping":[{"source_column":"Full Name","target_field":"fullName"},{"source_column":"Email","target_field":"email"},{"source_column":"Company","target_field":"company"}]}' \
  http://localhost:3010/v1/uploads/{upload_id}/confirm
```

Then request processing:

```bash
curl -s -X POST http://localhost:3010/v1/uploads/{upload_id}/process
```

### Current Scope

Uploads are held in memory and bounded by `INGEST_API_MAX_UPLOAD_BYTES`. The SpacetimeDB integration is intentionally abstracted behind a trait; the current no-op implementation reports reducer intent for `stage_csv_upload` and `process_csv_upload`, which are present in `spacetimedb/module`, but it does not deliver those calls to SpacetimeDB.
