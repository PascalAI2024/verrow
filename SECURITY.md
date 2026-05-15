# Security

## Supported Versions

Security fixes are accepted for the current `main` branch.

## Reporting a Vulnerability

Please do not open a public issue for suspected secrets exposure, injection risks, or data leakage. Use GitHub private vulnerability reporting from the repository's Security tab. If private reporting is not enabled on your fork or mirror, contact the maintainer privately before publishing details.

Include:

- A short description of the issue.
- Steps to reproduce, if available.
- Affected version or commit.
- Any relevant logs with secrets redacted.

## Data Handling Notes

Verrow is built for lead and contact CSVs. Treat uploaded files as sensitive by default, avoid committing sample data with real personal information, and rotate any API keys that were ever committed to a public branch.

## Before Making A Repository Public

- Run `gitleaks detect --redact` against the full Git history.
- Rotate or revoke any credential that ever appeared in Git history, even if the file has since been deleted.
- Publish from a rewritten history or a fresh clean repository if any real secret was committed.
- Keep only sanitized `.env.example` files in Git; local `.env` files must stay untracked.
- Enable GitHub secret scanning and private vulnerability reporting before announcing the project.
