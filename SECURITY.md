# Security & Data Handling

This project follows an OWASP-aligned security baseline and South African POPIA obligations. The enforced rules live in `.cursor/rules/10-security-popia.mdc`.

## Non-negotiables

- No secrets in source. Use environment variables; `.env` is git-ignored.
- No real client or personal information in the repository. All sample data must be fictional or templated.
- Personal information is never logged.
- Input is validated at every trust boundary; database queries are parameterised.

## Data classification

Define, per project, the categories of personal information the application processes and the retention and access constraints that apply. See `.cursor/rules/90-project-context.mdc` under Data classification.

## Enforcement

These rules are backed by automated controls, not just prose:

- **Cursor hooks** (`.cursor/hooks.json`) block reads of secret files and destructive shell commands at runtime, and log agent activity.
- **Pre-commit** runs gitleaks secret scanning (when installed) before any commit.
- **CI** runs gitleaks, a Semgrep OWASP Top Ten SAST scan, and `npm audit` on every push and pull request.

## Reporting

Report a suspected vulnerability or personal-information incident privately — do **not** open a public issue or PR.

- Email the security contact: `security@<your-domain>` (replace with your team's address).
- Include the affected component, reproduction steps, and any data potentially exposed.
- For a suspected POPIA data incident, notify the Information Officer immediately so statutory notification timelines can be assessed.
- Expected acknowledgement within 2 business days. Please allow a fix to be released and coordinated before any public disclosure.
