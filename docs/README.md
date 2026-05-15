# Verrow Documentation

This directory contains the public project documentation for Verrow.

## Start Here

- `features.md`: Product capabilities and current feature coverage.
- `api.md`: Rust ingest API reference and examples.
- `roadmap.md`: Ready, in-progress, and later work.
- `brand.md`: Name, positioning, visual assets, and brand notes.
- `open-source-release-checklist.md`: Final checks before publishing.

## Architecture

- `../ARCHITECTURE.md`: System overview and component responsibilities.
- `sequence-diagrams.md`: Mermaid sequence and flow diagrams.
- `spacetime-rust-vertical-slice.md`: Rust + SpacetimeDB runtime notes.

## System Schematic

```mermaid
flowchart LR
    User["User"]
    UI["React 19 + Vite+ Workbench"]
    Ingest["Rust Axum Ingest API"]
    Module["SpacetimeDB Rust Module"]
    STDB["SpacetimeDB 2.2"]
    Charts["Charts + Insights"]

    User -->|"CSV upload and review"| UI
    UI -->|"multipart upload"| Ingest
    Ingest -->|"headers, samples, suggestions"| UI
    UI -->|"confirmed mappings"| Ingest
    Ingest -. "reducer bridge in progress" .-> STDB
    STDB --> Module
    STDB -->|"live tables"| UI
    UI --> Charts
```

## Current Runtime

The default Docker Compose stack starts:

- `frontend`
- `rust-ingest-api`
- `spacetimedb`
- `spacetimedb-init`

No CI/CD workflow is included in this repository.
