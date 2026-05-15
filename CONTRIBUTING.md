# Contributing

Thanks for helping make Verrow better.

## Development Setup

1. Install Node.js 22, Rust, and Docker.
2. Copy `.env.example` to `.env`.
3. Install frontend dependencies:

```bash
npm ci --prefix frontend
```

4. Start the default services:

```bash
docker compose up -d spacetimedb spacetimedb-init rust-ingest-api
```

5. Run the frontend:

```bash
npm run dev --prefix frontend
```

Rust contributors can run the ingest API directly:

```bash
cargo test --manifest-path rust-services/ingest-api/Cargo.toml
cargo run --manifest-path rust-services/ingest-api/Cargo.toml
```

## Pull Requests

- Keep changes focused and explain the user-visible impact.
- Include tests for behavior changes.
- Run the frontend build, Vite+ build, and Rust ingest tests before opening a PR.
- Do not commit real environment files, credentials, uploaded CSVs, generated build output, or local reports.
- Do not add CI/CD workflows unless the maintainer explicitly asks for them.
- Run a secret scan before pushing:

```bash
docker run --rm -v "${PWD}:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 detect --source /repo --redact --no-git
```

## Project Direction

Verrow should reinforce one loop: ingest messy lead CSVs, map columns safely, score and clean records, organize datasets, and make the resulting leads searchable, chartable, and exportable.
