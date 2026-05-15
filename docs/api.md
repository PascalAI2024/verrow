# API

The default API surface is the Rust ingest service in `rust-services/ingest-api`.

## Health

```http
GET /health
```

Returns service health and reducer transport status.

```json
{
  "status": "ok",
  "service": "verrow-ingest-api",
  "version": "0.1.0",
  "spacetime_settings_present": true,
  "reducer_transport": {
    "mode": "noop",
    "ready": false,
    "settings_present": true,
    "detail": "Reducer calls are accepted by the sidecar but not delivered to SpacetimeDB yet."
  }
}
```

## Upload CSV

```http
POST /v1/csv/uploads
Content-Type: multipart/form-data
```

Form field:

- `file`: CSV file.

Example:

```bash
curl -s -F "file=@sample_data.csv" http://localhost:3010/v1/csv/uploads
```

Returns:

- `upload_id`
- `filename`
- `headers`
- `sample_rows`
- `sampled_rows`
- `total_rows_observed`
- `suggestions`
- `warnings`

## Suggest Mappings

```http
POST /v1/mapping/suggestions
Content-Type: application/json
```

```json
{
  "headers": ["Full Name", "Email", "Company"],
  "sample_rows": [
    {
      "Full Name": "Ada Lovelace",
      "Email": "ada@example.com",
      "Company": "Analytical Engines LLC"
    }
  ]
}
```

Returns one suggestion per header, including confidence, reason, and alternatives.

## Confirm Upload

```http
POST /v1/uploads/{upload_id}/confirm
Content-Type: application/json
```

```json
{
  "dataset_name": "vendor-leads",
  "mapping": [
    { "source_column": "Full Name", "target_field": "fullName" },
    { "source_column": "Email", "target_field": "email" },
    { "source_column": "Company", "target_field": "company" }
  ]
}
```

Validation rules:

- Mapping cannot be empty.
- Each `source_column` must exist in the uploaded CSV headers.
- Each `target_field` can only be mapped once.

The response includes a reducer transport receipt. Until the real SpacetimeDB bridge is wired, `delivered_to_spacetimedb` is expected to be `false`.

## Process Upload

```http
POST /v1/uploads/{upload_id}/process
```

Requests processing for a confirmed upload and returns a reducer transport receipt.
