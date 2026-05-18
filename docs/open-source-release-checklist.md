# Open Source Release Checklist

Use this before making the repository public.

## Current Public Baseline

As of 2026-05-18, the repository is public, MIT licensed, and usable as portfolio proof.

Verified locally:

- Rust ingest tests: `npm run rust:test` passed.
- Frontend production build: `npm run build --prefix frontend` passed.
- Docker-based gitleaks working-tree scan: `gitleaks detect --source /repo --redact --no-git` passed with no leaks found.

Still worth doing before a larger public announcement:

- Add screenshots or a short demo recording of upload, mapping, processing, and live activity.
- Replace the no-op SpacetimeDB reducer transport with the real client bridge.
- Add issue templates once the public roadmap is finalized.

## Required Before Public Release

- Rotate any credentials that were ever committed or shared through local `.env` files.
- Rewrite or recreate public Git history so deleted private files, old deployment metadata, and generated build artifacts are not published.
- Confirm `git status --short` only contains intended source, docs, config, lockfiles, and sanitized fixtures.
- Run secret scanning on the final public branch. At minimum, search for provider key formats and review all `.env*.example` files.
- Verify the exact public history with:

```bash
docker run --rm -v "${PWD}:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 detect --source /repo --redact --verbose
```

- Review dependency audit output and document any accepted advisories.
- Confirm Docker Compose can start the stack from a clean checkout with only `.env.example` copied to `.env`.
- Confirm the repository does not include CI/CD workflows unless intentionally added later.

## Nice To Have

- Add screenshots or a short demo recording of upload, mapping, processing, and live activity.
- Add issue templates once the first public roadmap is written.
- Add more screenshots for dashboard charts, mapping review, datasets, and query screens.
