# /guardrail-upgrade

Audit this project against the cursor-guardrails template, present a gap analysis by layer, and — after confirmation — implement the upgrades. Covers Layers 0–7: bootstrap through governance.

---

## Layer 0 — Bootstrap (run first, always)

1. Ask the user: "What is the full path to your cursor-guardrails template folder?"
   Example: `C:\Users\me\Projects\cursor-guardrails`
   Store this as **TEMPLATE_PATH** for all steps below.

2. **Verify and refresh the reference clone**, so every layer below reads from the latest published guardrails instead of a stale snapshot:
   - Check whether `TEMPLATE_PATH` exists and is a git repository (contains a `.git` folder).
   - **If it does not exist, or is not a git repo:** this is a one-time setup gap. Tell the user:
     > "Your template path isn't a git clone yet. Run this once, then re-run this command:
     > `git clone https://github.com/AGM82/cursor-guardrails "TEMPLATE_PATH"`
     > Use a plain clone, not GitHub's 'Use this template' button — that creates a disconnected repo with no upstream link, so it could never receive updates."
     > Stop here until the user confirms the clone exists, then continue.
   - **If it exists:** refresh it before reading anything from it: `git -C "TEMPLATE_PATH" pull --ff-only origin main`.
     - On success, the clone is now current — continue.
     - **If the pull fails** (offline, uncommitted local edits in the clone, detached HEAD, etc.): do not force, reset, or stash on the user's behalf. Instead, fall back to a staleness check — read `TEMPLATE_PATH/.cursor/guardrail-version` and compare it against the published value at `https://raw.githubusercontent.com/AGM82/cursor-guardrails/main/.cursor/guardrail-version`. If the local clone is behind, warn the user (e.g. "Your reference clone is on 1.3.2; the published template is on 1.3.5 — run `git pull` in TEMPLATE_PATH when you can.") and continue using the files as they are on disk.

3. Check whether this project already has `.cursor/commands/guardrail-upgrade.md`.
   - **If it is missing** (first-time adoption): copy the entire `.cursor/commands/` folder from `TEMPLATE_PATH` into this project's `.cursor/commands/` (create `.cursor/commands/` if it does not exist), then confirm: "Commands folder bootstrapped. Continuing upgrade…"
   - **If it already exists**, continue.

> **Windows PowerShell note:** Run commands separately if `&&` fails. Replace `cmd1 && cmd2` with two separate lines.

---

## Layer 0.5 — Pre-upgrade baseline

Before any changes, capture the current state of the project:

Run (skip any script that does not exist in `package.json`):

```
npm run typecheck
npm run lint
npm run build
npm run test
```

Save the output to `.cursor/guardrail-baseline.log` (this file is gitignored — it stays local).

If there is no `package.json`, note that and skip this step.

This baseline lets you distinguish errors the guardrails introduced from errors that already existed.

---

## Layer 0.6 — Snapshot git

Save a safe undo point before making any changes:

```
git add -A
git commit -m "chore: snapshot before guardrail upgrade"
```

If this project has no git repo yet:

```
git init -b main
git add -A
git commit -m "chore: initial commit before guardrails"
```

---

## Layer 0.4 — Project profile

Not every project has the same needs. Before running the gap analysis, the
layer recommendation needs to be tailored instead of a blanket "apply
everything." There are two ways this happens — check for a prescription
first, and only fall back to asking questions if there isn't one.

### Step 1 — Check for a Throughline (or other governance tool) prescription

Look for `guardrail-prescription.json` at the project root, then
`.cursor/guardrail-prescription.json`. See `TEMPLATE_PATH/docs/guardrail-prescription.md`
for the full contract.

- **If found and `contractVersion` is `1`:**
  1. Compare its `guardrailVersion` against `TEMPLATE_PATH/.cursor/guardrail-version`. If they differ, warn the user (e.g. "This prescription was classified against v1.3.4; the reference clone is on v1.3.5 — consider re-running Throughline to re-certify.") and continue anyway — a stale prescription is still a reasonable default.
  2. Announce it: "Using a prescription from `<source>`: tier `<tier>` → layers `<requiredLayers>`, classified `<classifiedAt>`." Show `rationale` if present.
  3. Set **RECOMMENDED_LAYERS** to its `requiredLayers` and **skip Step 2** (the 3 questions) entirely.
  4. Do not write to or modify this file — it is an input the project owns, not an output of this command.
- **If found but `contractVersion` is not recognised:** warn ("Unrecognised prescription contractVersion — falling back to the standard profile questions.") and proceed to Step 2.
- **If not found:** proceed to Step 2.

### Step 2 — Self-serve project profile (only if no prescription was used)

Ask the user 3 quick questions so the layer recommendation is tailored
instead of a blanket "apply everything." The canonical questions,
type-to-domain mapping, and risk-to-layer mapping live in
`guardrail-layers.json` → `projectProfiles` (reusing the existing
`riskTiers` block — do not invent a new layer mapping).

Ask:

1. **"What kind of project is this?"** — `frontend-ui` / `backend-api` /
   `full-stack` / `library-or-cli` / `script-or-prototype`.
   Look up `projectProfiles.types[<answer>]` to see which domain rule files
   are `activeDomains` now vs `inertUntilUsedDomains` (safe to install
   either way — inert ones simply have no effect until the project grows
   into them, per `90-project-context.mdc`).
2. **"What is the risk level of this project?"** — `Low` / `Medium` / `High`.
   Look up `riskTiers[<answer>].requiredLayers` for the recommended layer set.
3. **"Does the project already have its own ESLint/Prettier/tsconfig setup?"**
   — `yes` / `no`. If `yes`, treat Layer 4 as extra merge-carefully: read
   both configs in full before adding strict settings, and never overwrite.

Store the resulting recommended layer set as **RECOMMENDED_LAYERS** — it
replaces the blanket "all" suggestion in the gap-analysis prompt below.

---

## Layer 1–5 — Audit: read both sides

Read the following files from TEMPLATE_PATH and from THIS project. For each file, note whether it exists here and — if it does — whether it contains the key content the template has.

**Layer 1 — AI instructions** (always safe to add; nothing here touches application code)

> The canonical file list for Layer 1 is maintained in `guardrail-layers.json` at the template root under `adoptionLayers["1"].files`. The list below is the human-readable reference; if they ever diverge, the JSON is authoritative.

- `.cursor/rules/00-core.mdc`
- `.cursor/rules/10-security-popia.mdc`
- `.cursor/rules/20-commits.mdc`
- `.cursor/rules/30-react-stack.mdc`
- `.cursor/rules/31-design.mdc`
- `.cursor/rules/32-ux-behavioural.mdc`
- `.cursor/rules/33-data-science.mdc`
- `.cursor/rules/40-tooling-supply-chain.mdc`
- `.cursor/rules/50-ai-tooling.mdc`
- `.cursor/rules/60-backend-api.mdc` (only relevant once the project has a server/API — safe to add regardless, it is glob-scoped and inert otherwise)
- `.cursor/rules/61-database.mdc` (only relevant once the project has a database)
- `.cursor/rules/62-deployment-observability.mdc` (only relevant once the project deploys somewhere beyond local)
- `.cursor/rules/90-project-context.mdc`
- `.cursor/commands/review.md`
- `.cursor/commands/pr.md`
- `.cursor/commands/update-deps.md`
- `.cursor/commands/guardrail-upgrade.md`
- `.cursor/hooks.json`
- `.cursor/hooks/guard-shell.mjs`
- `.cursor/hooks/guard-read.mjs`
- `.cursor/hooks/audit.mjs`
- `.cursor/mcp.json`
- `.cursorignore`
- `AGENTS.md`

**Layer 2 — Git hygiene** (safe to add; copy or merge)

- `.gitattributes`
- `.gitignore` — check for: `.env`, `.env.*`, `node_modules/`, `dist/`, `build/`, `coverage/`, `.cursor/hooks/logs/`
- `.nvmrc`
- `.npmrc`
- `.editorconfig`
- `LICENSE`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `.github/CODEOWNERS`
- `.github/dependabot.yml` — check for: `react-runtime` group, ESLint ecosystem major-bump ignores
- `.github/pull_request_template.md`

**Layer 3 — Commit discipline** (safe; adds tooling without touching source)

- `commitlint.config.mjs` (note: `.mjs`, not `.js`)
- `.husky/pre-commit`
- `.husky/commit-msg`
- `package.json` → `lint-staged` block

**Layer 4 — Code quality toolchain** (merge carefully; may surface existing errors)

- `eslint.config.js` / `eslint.config.mjs` — verify `.cursor/**` is in `ignores`/`globalIgnores`
- `.prettierrc.json`
- `tsconfig.json` — check for strict flags: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`
- `package.json` → scripts: `typecheck`, `lint`, `lint:fix`, `format`, `test`
- `package.json` → `engines.node`

**Layer 5 — CI pipeline** (merge carefully; check for existing workflow)

- `.github/workflows/ci.yml` — check for: `secret-scan` job, `sast` job, `sbom` job, `npm audit` step, `npm audit signatures` step, `attest-build-provenance` step, `permissions: contents: read`, `concurrency` block

---

## Present gap analysis

Show a table with these columns: **Layer | File | Status | Action**

Status values:

- `MISSING` — file does not exist in this project at all
- `OUTDATED` — file exists but is missing key sections the template has
- `CURRENT` — file exists and matches template intent
- `N/A` — not applicable (e.g. project is not Node-based)

Group rows by layer. Show a summary line per layer (e.g. "Layer 1: 3 missing, 2 outdated, 11 current").

**Do not make any changes yet.** Ask the user:

> "Which layers would you like to upgrade? Enter layer numbers (e.g. `1 2 3`) or `all`. Based on Layer 0.4 (the prescription, if one was found, otherwise your answers), **RECOMMENDED_LAYERS** is recommended for a project at this risk level — reply `all` to go further than that."

---

## Upgrade approved layers (1–5)

Work through each approved layer in order. For each file:

**If MISSING:**

- Copy the file from TEMPLATE_PATH into this project.
- Files containing `<PLACEHOLDER>` text (`LICENSE`, `90-project-context.mdc`, `CODEOWNERS`, `SECURITY.md`): copy as-is and list all placeholders for the user to fill in after.

**If OUTDATED — config/tooling files** (`package.json`, `eslint.config.*`, `tsconfig.json`, `.husky/pre-commit`, `.github/workflows/ci.yml`, `.github/dependabot.yml`):

- Read BOTH versions in full.
- Add only the missing sections — do NOT overwrite.
- Preserve all project-specific content.
- Show what you are adding before writing it.

**If OUTDATED — documentation** (`SECURITY.md`, `CONTRIBUTING.md`, `AGENTS.md`):

- Show the user the specific sections that would be added.
- Get confirmation before writing.

After completing each layer, run (skip any that do not exist in `package.json`):

```
npm run typecheck
npm run lint
```

Report any errors and fix them before moving to the next layer.

---

## Layer 6 — Code compliance audit (required for existing projects)

This layer is not about files from the template — it is about aligning the **project's own code** with the rules just installed.

1. Run all checks and compare against `.cursor/guardrail-baseline.log`:

   ```
   npm run typecheck
   npm run lint
   npm run build
   ```

   Identify which errors existed before (in baseline) vs which are new (introduced by guardrails).

2. Audit `src/`, `app/`, or the project's main source directories against:
   - `.cursor/rules/90-project-context.mdc` — domain language, canonical patterns, architecture constraints
   - `.cursor/rules/10-security-popia.mdc` — input validation, secrets, personal data logging
   - `.cursor/rules/30-react-stack.mdc` — if this is a UI project

3. Output a findings table:

   | Severity       | Finding                             | File | Line |
   | -------------- | ----------------------------------- | ---- | ---- |
   | **Blocker**    | Must fix before upgrade is complete |      |      |
   | **Should-fix** | Fix soon; not a merge blocker       |      |      |
   | **Nit**        | Polish; can be deferred             |      |      |

4. Fix all **Blocker** findings. Confirm with the user before starting.

5. Re-run checks. Commit when clean:
   ```
   git add -A
   git commit -m "fix: align existing code with guardrails (Layer 6)"
   ```

> Use `/review` for the same severity-grouped analysis on individual changesets.

---

## Layer 7 — Governance activation

Human steps — confirm these are done before declaring the upgrade complete:

- [ ] Branch protection is enabled on `main` (Settings → Branches → ruleset with three required checks)
- [ ] The next change to this project will go via a feature branch + PR, not a direct push to `main`
- [ ] Open Dependabot PRs have been reviewed individually; any grouped PR that fails CI has been closed
- [ ] `gh` CLI is installed (optional but enables `/pr`): `winget install --id GitHub.cli` or see [cli.github.com](https://cli.github.com)
- [ ] `gitleaks` is installed locally for pre-commit parity with CI (optional; CI enforces it regardless)

---

## Record upgrade version

After completing all approved layers, write the applied template version to this project.
Read the current template version from `TEMPLATE_PATH/.cursor/guardrail-version` (also mirrored in
`TEMPLATE_PATH/guardrail-layers.json` → `guardrailVersion`) — do not hardcode a version number, it will
always go stale. Write that exact value into this project's `.cursor/guardrail-version`:

```
cat TEMPLATE_PATH/.cursor/guardrail-version > .cursor/guardrail-version
```

Add `.cursor/guardrail-version` to this project's git tracking if it is not already tracked:

```
git add .cursor/guardrail-version
git commit -m "chore: record guardrail template version"
```

On future runs, `/guardrail-upgrade` compares this file against `TEMPLATE_PATH/.cursor/guardrail-version` to identify drift.

---

## Hard rules (never break these)

- Treat `TEMPLATE_PATH` as read-only — never create, edit, or delete files inside the reference clone itself. This keeps `git pull --ff-only` always able to fast-forward cleanly on the next run.
- Treat `guardrail-prescription.json` (if present) as read-only too — never create, edit, or delete it. It is an input from Throughline or another governance tool, not an output of this command.
- Never copy `src/`, `index.html`, `vite.config.ts`, or any application code into a project that already has its own.
- Never overwrite a `.env` file or create one with real values.
- Never remove lines from an existing `.gitignore` — only add.
- Never replace a `tsconfig.json` wholesale — always merge strict settings in.
- Never disable a linter or type rule to silence an error; fix the cause.
- If anything is ambiguous (e.g. the project has a conflicting ESLint setup), stop and ask rather than guessing.
- Do not declare the upgrade complete if any Blocker findings from Layer 6 remain unresolved.
