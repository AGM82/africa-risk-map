# Cursor Guardrails — links and quick reference

One place for the URLs, repos, and docs that make up the cursor-guardrails ecosystem. Bookmark this page.

**Current template version:** see [`.cursor/guardrail-version`](../.cursor/guardrail-version) (also mirrored in [`guardrail-layers.json`](../guardrail-layers.json)).

---

## Playbook (live app)

The playbook is a single-file dashboard (`playbook.html`) hosted on Cloudflare Pages. It surfaces guardrail updates, AI suggestions, releases, and lets you trigger the bi-weekly AI review (requires a GitHub PAT with `workflow` scope, stored in session only).

| What                      | Link                                                               |
| ------------------------- | ------------------------------------------------------------------ |
| **Playbook (production)** | https://cursor-guardrails.pages.dev/playbook.html                  |
| Playbook source (GitHub)  | https://github.com/AGM82/cursor-guardrails/blob/main/playbook.html |
| Cloudflare Pages setup    | [docs/cloudflare-setup.md](./cloudflare-setup.md)                  |

---

## GitHub — repository

| What                                 | Link                                                                |
| ------------------------------------ | ------------------------------------------------------------------- |
| **Repository**                       | https://github.com/AGM82/cursor-guardrails                          |
| Use this template (new project only) | https://github.com/AGM82/cursor-guardrails/generate                 |
| Issues (all)                         | https://github.com/AGM82/cursor-guardrails/issues                   |
| Pull requests                        | https://github.com/AGM82/cursor-guardrails/pulls                    |
| Actions (CI + automation)            | https://github.com/AGM82/cursor-guardrails/actions                  |
| Releases                             | https://github.com/AGM82/cursor-guardrails/releases                 |
| Tags                                 | https://github.com/AGM82/cursor-guardrails/tags                     |
| Labels                               | https://github.com/AGM82/cursor-guardrails/labels                   |
| Settings → Secrets                   | https://github.com/AGM82/cursor-guardrails/settings/secrets/actions |

For adopting guardrails on an existing project, use a plain `git clone` (a "reference clone") instead of the button above — see [docs/connect-guardrails.md](./connect-guardrails.md).

---

## GitHub — automation workflows

| Workflow                        | Purpose                                                                                                                                                                              | Link                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **CI**                          | Typecheck, lint, test+coverage, build, audit, manifest drift, audit-hook self-test, SBOM generation, build provenance attestation, package-signature verification, secret scan, SAST | https://github.com/AGM82/cursor-guardrails/actions/workflows/ci.yml                          |
| **Bi-weekly AI review**         | AI guardrail suggestions → GitHub issue + watchlist                                                                                                                                  | https://github.com/AGM82/cursor-guardrails/actions/workflows/bi-weekly-ai-review.yml         |
| **Weekly guardrail review**     | Dependency/tooling drift → issue + optional auto-PRs                                                                                                                                 | https://github.com/AGM82/cursor-guardrails/actions/workflows/weekly-guardrail-review.yml     |
| **Propagate guardrail version** | Pushes version bumps to downstream repos (e.g. Throughline)                                                                                                                          | https://github.com/AGM82/cursor-guardrails/actions/workflows/propagate-guardrail-version.yml |

---

## GitHub — issue labels (playbook feeds)

| Label              | Used for                                | Filter                                                                       |
| ------------------ | --------------------------------------- | ---------------------------------------------------------------------------- |
| `ai-suggestions`   | Rolling bi-weekly AI review suggestions | https://github.com/AGM82/cursor-guardrails/issues?q=label%3Aai-suggestions   |
| `ai-investigation` | Focused one-off AI investigations       | https://github.com/AGM82/cursor-guardrails/issues?q=label%3Aai-investigation |
| `guardrail-review` | Weekly tooling/stack update findings    | https://github.com/AGM82/cursor-guardrails/issues?q=label%3Aguardrail-review |

**Decision log (accepted/declined suggestions):** [`.github/ai-review-decisions.json`](../.github/ai-review-decisions.json)

---

## Machine-readable artefacts

Downstream tools (e.g. Throughline) and the playbook read these directly.

| What                                 | URL                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| **Adoption layer model** (canonical) | https://raw.githubusercontent.com/AGM82/cursor-guardrails/main/guardrail-layers.json |
| Latest release (GitHub API)          | https://api.github.com/repos/AGM82/cursor-guardrails/releases/latest                 |
| Schema reference                     | [docs/guardrail-layers.md](./guardrail-layers.md)                                    |

Tag releases as `guardrail-vX.Y.Z` on GitHub to participate in the version-propagation workflow.

---

## Related repositories

| Repo                                                      | Role                                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [AGM82/throughline](https://github.com/AGM82/throughline) | Governance tool that vendors `guardrail-layers.json` and receives auto refresh PRs |

Integration prompt for Throughline: [docs/throughline-integration-prompt.md](./throughline-integration-prompt.md)

---

## In-repo documentation

| Doc                                                                           | Contents                                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [README.md](../README.md)                                                     | Template overview, tiers, setup, branch protection                 |
| [AGENTS.md](../AGENTS.md)                                                     | Cross-tool agent entry point (always-on summary)                   |
| [docs/connect-guardrails.md](./connect-guardrails.md)                         | Direct vs Throughline: step-by-step for both connection paths      |
| [docs/bootstrap-guardrail-upgrade.md](./bootstrap-guardrail-upgrade.md)       | Day-zero prompt for adopting guardrails on an existing project     |
| [docs/guardrail-prescription.md](./guardrail-prescription.md)                 | `guardrail-prescription.json` — the Throughline handoff contract   |
| [docs/project-lifecycle.md](./project-lifecycle.md)                           | Two-track SDLC lifecycle model (Build once, Maintain forever)      |
| [docs/throughline-lifecycle-prompt.md](./throughline-lifecycle-prompt.md)     | Prompt aligning Throughline with the prescription + lifecycle      |
| [docs/throughline-github-app-prompt.md](./throughline-github-app-prompt.md)   | Prompt building the Path B+ GitHub App live-monitoring integration |
| [docs/guardrail-upgrade-observations.md](./guardrail-upgrade-observations.md) | Lessons from a real adoption                                       |
| [docs/guardrail-layers.md](./guardrail-layers.md)                             | `guardrail-layers.json` schema and consumption                     |
| [docs/cloudflare-setup.md](./cloudflare-setup.md)                             | Playbook hosting + Cloudflare Access                               |
| [docs/user-level-rule.md](./user-level-rule.md)                               | Cursor user-level rule text (Settings → Rules)                     |
| [CONTRIBUTING.md](../CONTRIBUTING.md)                                         | Contribution guidelines                                            |
| [SECURITY.md](../SECURITY.md)                                                 | Security policy and reporting                                      |

---

## Cursor slash commands

Type these in Cursor Agent chat (defined in [`.cursor/commands/`](../.cursor/commands/)):

| Command              | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `/review`            | Run checks; report findings by severity before fixing         |
| `/audit`             | Whole-repo, point-in-time health audit — not scoped to a diff |
| `/pr`                | Confirm checks, write Conventional Commit, push, open PR      |
| `/update-deps`       | Update dependencies one at a time with re-testing             |
| `/guardrail-upgrade` | Gap analysis against this template; implement approved layers |

---

## External tools and references

| Tool                        | Link                                                                                          | Used for                                |
| --------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------- |
| Cursor                      | https://cursor.com/docs                                                                       | Primary AI coding agent                 |
| Cursor background agents    | https://docs.cursor.com/background-agent                                                      | Autonomy boundaries (see `00-core.mdc`) |
| GitHub CLI (`gh`)           | https://cli.github.com                                                                        | PRs, issues, releases from terminal     |
| gitleaks                    | https://github.com/gitleaks/gitleaks                                                          | Secret scanning (CI + optional local)   |
| Semgrep OWASP Top Ten       | https://semgrep.dev/p/owasp-top-ten                                                           | SAST in CI                              |
| MCP security                | https://spec.modelcontextprotocol.io/specification/architecture/security                      | MCP server governance                   |
| GitHub PAT (workflow scope) | https://github.com/settings/tokens/new?scopes=workflow&description=cursor-guardrails+playbook | Playbook: trigger AI review workflow    |
| Cloudflare dashboard        | https://dash.cloudflare.com                                                                   | Pages + Access for playbook             |

---

## Local development

```bash
npm install          # activate husky hooks
npm run dev          # Vite dev server
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run test         # Vitest (+ coverage thresholds in CI)
npm run build        # Production build
npm run knip         # Dead code / unused deps / unused exports (used by /audit)
```

Canonical reference files: `src/components/Greeting.tsx`, `src/lib/currency.ts`, and their tests.
