# Security & Data Handling

This project follows an OWASP-aligned security baseline and South African POPIA obligations. The enforced rules live in `.cursor/rules/10-security-popia.mdc`. Project-specific data classification is in `.cursor/rules/90-project-context.mdc`.

## Non-negotiables

- No secrets in source. Use environment variables; `.env` is git-ignored.
- No real client or personal information in the repository. All sample data must be fictional or templated.
- Personal information is never logged.
- Input is validated at every trust boundary; database queries are parameterised.

## Data classification

See `.cursor/rules/90-project-context.mdc` under Data classification for the personal-information categories this app touches, retention/anonymization rules, and the backup/PITR decision still outstanding before real client data enters the running system.

## Enforcement

These rules are backed by automated controls, not just prose:

- **Cursor hooks** (`.cursor/hooks.json`) block reads of secret files and destructive shell commands at runtime, and log agent activity.
- **Pre-commit** runs gitleaks secret scanning (when installed) before any commit.
- **CI** runs gitleaks, a Semgrep OWASP Top Ten SAST scan, and `npm audit` on every push and pull request.

## Reporting

Report a suspected vulnerability or personal-information incident privately — do **not** open a public issue or PR.

- Prefer [GitHub private vulnerability reporting](https://github.com/AGM82/africa-risk-map/security/advisories/new) for this repository.
- For a suspected POPIA data incident, notify the Human Risks / Lombard Information Officer immediately so statutory notification timelines can be assessed.
- Include the affected component, reproduction steps, and any data potentially exposed.
- Expected acknowledgement within 2 business days. Please allow a fix to be released and coordinated before any public disclosure.
