# Roadmap

## Ready

- Verrow branding and open-source repo structure.
- React 19 + Material UI 9 + Vite 8 frontend build.
- Vite+ lint/build commands.
- Rust Axum ingest API.
- CSV upload, preview, and heuristic mapping suggestions.
- Mapping confirmation validation.
- Processing-intent endpoint.
- SpacetimeDB module tables and reducers.
- Docker Compose default stack.

## In Progress

- Real Rust-to-SpacetimeDB reducer delivery.
- Dashboard/data views backed directly by live SpacetimeDB subscriptions.
- End-to-end processing from confirmed mappings into live `data_records`.
- More complete UI states for empty, loading, error, and partial-live modes.

## Later

- Duplicate detection and merge workflows on the Rust/SpacetimeDB path.
- Quality scoring refinements for completeness, validity, and dedupe signals.
- Batch dataset relationship workflows.
- Export flows from live records.
- Optional AI-assisted mapping and query helpers on the new backend path.
