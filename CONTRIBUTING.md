# Contributing

## Prerequisites

- Node.js (version pinned in `.nvmrc`; currently 20). If you use `nvm`, run `nvm use`.
- npm (ships with Node).
- Optional but recommended: [gitleaks](https://github.com/gitleaks/gitleaks#installing) for local secret scanning. CI enforces it regardless; local install gives faster feedback.
- Optional but recommended: [gh CLI](https://cli.github.com) enables the `/pr` slash command to open pull requests from the terminal. Install on Windows: `winget install --id GitHub.cli`.

> **Windows PowerShell note:** PowerShell does not support the `&&` command separator. Run chained commands on separate lines, or use `;` between them.

## Setup

```bash
npm install
```

This installs dependencies and activates the Git hooks (husky).

## Day-to-day commands

| Command              | What it does                          |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Start the local dev server            |
| `npm run build`      | Production build (typecheck + bundle) |
| `npm run typecheck`  | TypeScript, no emit                   |
| `npm run lint`       | ESLint                                |
| `npm run test`       | Run the test suite once               |
| `npm run test:watch` | Run tests in watch mode               |
| `npm run format`     | Format with Prettier                  |

A change is ready when `npm run typecheck`, `npm run lint`, and `npm run test` all pass.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`
(e.g. `feat(schedule): add ZAR premium breakdown`). `commitlint` enforces this on commit.
See `.cursor/rules/20-commits.mdc`.

## What runs automatically

- **On commit (husky):** secret scan (gitleaks, if installed) + `lint-staged` (ESLint + Prettier on staged files), and a commit-message check.
- **In the Cursor agent (hooks):** `.cursor/hooks/` block destructive shell commands and reads of secret files, and log activity.
- **In CI (GitHub Actions):** typecheck, lint, test, build, `npm audit`, gitleaks secret scan, and a Semgrep OWASP SAST scan.

## Pull requests

Fill in the PR template. PRs must pass all CI checks. `CODEOWNERS` controls who reviews what — update it with your real team handles.

## Secret-scan false positives

If gitleaks flags a non-secret, add a `gitleaks.toml` allowlist entry (path or regex) rather than disabling the scan. Never commit real secrets to "test" the scanner.
