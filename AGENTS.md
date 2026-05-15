# AGENTS.md

This file guides Codex and other coding agents working in this repository.

## Project Overview

Verrow is an open-source lead data workbench that turns raw lead CSV files into trusted records. The default architecture is React + Rust + SpacetimeDB.

## Tech Stack

- **Frontend**: React 19 + TypeScript 6 + Material UI 9 + Vite 8 + Vite+
- **Backend**: Rust Axum ingest API
- **Live Database**: SpacetimeDB 2.2 Rust module
- **Charts**: Recharts
- **AI**: Optional provider-backed mapping experiments
- **Deployment**: Docker Compose

## Essential Commands

### Frontend

```bash
npm ci --prefix frontend
npm run dev --prefix frontend
npm run build --prefix frontend
npm run lint --prefix frontend -- --deny-warnings
npm run check:vite-plus --prefix frontend
npm run build:vite-plus --prefix frontend
```

### Rust and SpacetimeDB

```bash
npm run dev:rust-ingest
npm run dev:spacetime
npm run rust:check
npm run rust:test
npm run spacetime:build
npm run spacetime:generate
```

### Docker

```bash
cp .env.example .env
docker compose up --build
```

## Architecture

### Core Flow

1. CSV files upload to the Rust Axum ingest API.
2. The ingest API extracts headers, samples rows, and suggests schema mappings.
3. Users review and confirm mappings in the React workbench.
4. The Rust sidecar records processing intent and prepares reducer calls.
5. SpacetimeDB owns live uploads, mappings, jobs, records, activity, and quality reports.
6. React consumes generated SpacetimeDB TypeScript bindings when live mode is enabled.

### Key Areas

- `frontend/`: React app, upload flow, mapping review, data browser, dashboards, charts, query, and settings.
- `rust-services/ingest-api/`: multipart CSV upload, preview extraction, mapping suggestions, validation, and reducer transport abstraction.
- `spacetimedb/module/`: Rust tables and reducers for live product state.
- `shared/`: shared lead-data type definitions.
- `docs/`: feature docs, API examples, diagrams, roadmap, and brand notes.

## Development Notes

- Keep the repo focused on the Rust + SpacetimeDB runtime.
- Do not add CI/CD workflows unless the maintainer explicitly asks for them.
- Do not commit local `.env` files, uploaded lead data, private keys, access tokens, build output, or generated reports.
- Use sanitized CSV fixtures only.
- Prefer Rust-side CSV processing over browser-only parsing for product behavior.
- Keep SpacetimeDB table/reducer changes paired with generated TypeScript binding updates.
- Keep frontend UI states honest about what is live, mocked, empty, or waiting on reducer delivery.

## Common Tasks

### Add A Lead Field

1. Update `shared/types/index.ts`.
2. Update `spacetimedb/module/src/lib.rs`.
3. Update Rust mapping logic in `rust-services/ingest-api/src/mapper.rs`.
4. Regenerate frontend bindings with `npm run spacetime:generate`.
5. Update mapping UI copy if the field should be user-selectable.

### Debug Upload Processing

1. Check `GET /health` on the Rust ingest API.
2. Inspect the upload response for headers, warnings, and suggestions.
3. Check confirm/process reducer receipts.
4. Enable `VITE_ENABLE_SPACETIME=true` when verifying live subscriptions.

### Verify Before Pushing

```bash
npm run lint --prefix frontend -- --deny-warnings
npm run build --prefix frontend
npm run build:vite-plus --prefix frontend
npm run rust:test
docker run --rm -v "${PWD}:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 detect --source /repo --redact --verbose
```
