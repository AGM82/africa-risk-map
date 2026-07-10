# Guardrail upgrade — observations from a real adoption

This document captures lessons learned from the first real-world adoption of the
cursor-guardrails template onto an existing project. All client-specific details
have been removed; the patterns are universal.

---

## Context

A greenfield internal tool project (referred to here as **Project X**) had been
running for several weeks with application code in place before the guardrails
template existed. The team then attempted to adopt the template mid-project using
the `/guardrail-upgrade` command.

---

## What worked well

- **Layer 1–3 adoption was seamless.** Copying AI rules, git hygiene files, and
  commit tooling caused zero breakage. These layers are genuinely safe to apply
  to any project.

- **The gap analysis table** gave the team an accurate picture of what was
  missing. Seeing the full list by layer helped them understand the value and
  prioritise which layers to do first.

- **Cursor hook installation** (Layer 1) immediately surfaced a shell command
  the agent had been running that would have been blocked had the hooks been in
  place from day one.

- **ESLint security rules** (Layer 4) found two real issues in existing code on
  first run: an unvalidated input and a `console.log` that included a user
  identifier.

---

## What did not work (and the fixes shipped in this release)

### Issue 1 — Bootstrap chicken-and-egg

**Problem:** The `/guardrail-upgrade` command did not exist in the target project.
Slash commands are project-scoped — the command only exists if it has already been
copied into `.cursor/commands/`. Users had to manually paste a long prompt to get
started.

**Fix:** Layer 0 of the revised command explicitly bootstraps itself. A new file
[`docs/bootstrap-guardrail-upgrade.md`](bootstrap-guardrail-upgrade.md) provides
a copy-paste prompt, a file-copy path, and a PowerShell one-liner so users have
three ways to bootstrap without needing anything pre-installed.

---

### Issue 2 — Code alignment was not in scope

**Problem:** The original `/guardrail-upgrade` command stopped after installing
infrastructure files. It did not audit the project's _existing code_ against the
newly installed rules — so the team discovered TypeScript and ESLint errors only
when they next opened a file.

**Fix:** Layer 6 (code compliance audit) is now a required step for existing
projects. It runs checks, diffs against the pre-upgrade baseline, and produces a
Blocker / Should-fix / Nit findings table. Blockers must be resolved before the
upgrade is declared complete.

---

### Issue 3 — Audit checklist had gaps

**Problem:** Several files present in the template were not in the audit checklist:
`.cursorignore`, `.npmrc`, `.github/pull_request_template.md`, and
`commitlint.config.mjs` (the command spec listed `.js`).

**Fix:** Expanded audit checklist across Layers 1–5 now includes all these files.
The `commitlint.config.mjs` entry reflects the correct extension (the template
also ships `.mjs` from this release).

---

### Issue 4 — No version tracking

**Problem:** After an upgrade there was no record of which template version had
been applied. On a second adoption run, the command had no way to flag which
layers were outdated.

**Fix:** After a completed upgrade, the command writes `.cursor/guardrail-version`
with the template semver. Future runs compare this against
`TEMPLATE_PATH/.cursor/guardrail-version` and flag OUTDATED layers. The template
itself ships `1.0.0` as its initial version.

---

### Issue 5 — Governance checklist was implicit

**Problem:** Nobody explicitly confirmed that branch protection was enabled or that
the team had switched to a PR-only workflow after the upgrade. One direct push to
`main` got through before the rules were enforced.

**Fix:** Layer 7 (governance activation) is now an explicit step with a human
checklist. The upgrade is not declared complete until these boxes are confirmed.

---

### Issue 6 — commitlint ESM warning

**Problem:** Projects with `"type": "module"` in `package.json` produced a
`MODULE_TYPELESS_PACKAGE_JSON` warning when commitlint loaded `commitlint.config.js`.

**Fix:** Renamed to `commitlint.config.mjs`. The `.mjs` extension is unambiguously
ESM in all Node.js versions.

---

### Issue 7 — PR template did not acknowledge test-free projects

**Problem:** The PR checklist required `npm run test` unconditionally. Early-stage
projects often have no test suite yet, causing friction on every PR.

**Fix:** The PR template now splits checks into **Required** (typecheck, lint) and
**Optional** (test) with a note to remove the optional section if no test script
exists. The `/pr` command also checks `package.json` before requiring the test run.

---

### Issue 8 — `/pr` command failed silently without `gh` CLI

**Problem:** If `gh` was not installed, the `/pr` command failed at step 5 with
no useful output. The user had to figure out manually how to open a PR.

**Fix:** The `/pr` command now detects `gh` availability. If it is absent, it
outputs the GitHub compare URL and the PR text so the user can complete the PR in
the browser.

---

### Issue 9 — Dependabot grouped PRs caused merge conflicts

**Problem:** A single large Dependabot PR batching multiple unrelated upgrades
(including `react` and `react-dom` separately) failed CI and caused conflicts when
trying to merge the other PRs first.

**Fix:** `dependabot.yml` now defines a `react-runtime` group (keeps `react` and
`react-dom` together) and `ignore` rules for ESLint ecosystem major bumps, which
require a manual compatibility check before upgrading. The new guidance in
`40-tooling-supply-chain.mdc` advises closing grouped PRs that fail CI and
updating packages individually.

---

### Issue 10 — ESLint linted `.cursor/` hook scripts as React

**Problem:** The Cursor hook scripts (`guard-shell.mjs`, `guard-read.mjs`,
`audit.mjs`) are Node.js ESM, not React. Linting them with the TypeScript/React
rule set produced irrelevant errors.

**Fix:** `.cursor/**` is now in the top-level `ignores` array in `eslint.config.js`.

---

## Roadmap items (not automated in this release)

These are documented for awareness; they are not in scope for the current release:

- **Scheduled drift detection:** a GitHub Action that opens an issue when the
  project's `.cursor/guardrail-version` lags the template's latest tag by more
  than one minor version.

- **Node version upgrade path:** `.nvmrc` ships `20`; Vite 8 requires `22.12+`.
  Projects wanting Vite 8 should bump `.nvmrc` to `22.12` and update the CI
  `node-version` matrix. Document in `CONTRIBUTING.md` when ready.

- **`gitleaks` local install guide:** CI enforces secret scanning regardless, but
  local install gives faster feedback. Add installation steps to `CONTRIBUTING.md`
  when a standard cross-platform path is confirmed.

---

## Summary

The guardrails system itself was validated by this adoption — the toolchain caught
real issues. The gaps were entirely in the **process spec**: the command assumed
guardrails were already partially in place, skipped code alignment, and lacked
governance confirmation. All gaps are addressed in this release.
