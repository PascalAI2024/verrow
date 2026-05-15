# Open Source Release Checklist

Use this before making the repository public.

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
