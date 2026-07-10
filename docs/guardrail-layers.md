# guardrail-layers.json — reference guide

`guardrail-layers.json` at the repository root is the **canonical, machine-readable source of truth** for the cursor-guardrails adoption-layer model and risk-tier mapping.

Downstream tools — primarily [Throughline](https://github.com/AGM82/throughline) — read from this file instead of hardcoding the layer model. When the template changes, the version bumps, a GitHub Release is tagged, and downstream repos receive an automatic refresh PR.

See [`docs/connect-guardrails.md`](./connect-guardrails.md) for how a project actually gets connected (direct, or via a tool like Throughline), [`docs/guardrail-prescription.md`](./guardrail-prescription.md) for the per-project handoff contract, and [`docs/project-lifecycle.md`](./project-lifecycle.md) for the wider lifecycle this manifest supports.

---

## Two numbering schemes — do not conflate

The cursor-guardrails project uses **two different numbering systems** for different purposes. They look similar but mean different things:

| Scheme                  | Numbers                                                                                                                    | Purpose                                                                                       | Where used                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Mechanism tiers 0–6** | 0 = Workflow, 1 = Advisory, 2 = Toolchain, 3 = Runtime, 4 = Automation, 5 = Workflows, 6 = Review                          | Taxonomy of _how_ each protection mechanism works (advisory, deterministic, automation, etc.) | `README.md`, `playbook.html` instructions table                    |
| **Adoption layers 1–7** | 1 = AI instructions, 2 = Git hygiene, 3 = Commit discipline, 4 = Code quality, 5 = CI, 6 = Code compliance, 7 = Governance | Sequence for _adopting_ the template on a project, ordered by risk and disruption             | `/guardrail-upgrade` command, `guardrail-layers.json`, Throughline |

`guardrail-layers.json` encodes the **adoption layers (1–7)** only. The mechanism-tier table is a human-facing explanation and is not machine-readable.

---

## Schema

```jsonc
{
  "schemaVersion": 1, // bump only on breaking shape changes
  "guardrailVersion": "1.1.0", // mirrors .cursor/guardrail-version; semver
  "description": "...",
  "source": "https://github.com/AGM82/cursor-guardrails",
  "lastUpdated": "YYYY-MM-DD",

  "adoptionLayers": {
    "1": {
      "name": "AI instructions",
      "description": "...",
      "safe": true, // true = safe to add; false = merge carefully
      "files": ["..."], // canonical file list for this layer
      "domains": ["..."], // optional: capability domains covered (Layer 1 only)
    },
    // layers 2–7 follow the same shape
  },

  "riskTiers": {
    "Low": { "requiredLayers": [1, 2, 3], "rationale": "..." },
    "Medium": { "requiredLayers": [1, 2, 3, 4, 5], "rationale": "..." },
    "High": { "requiredLayers": [1, 2, 3, 4, 5, 6], "rationale": "..." },
  },

  "schemaChangelog": [{ "schemaVersion": 1, "date": "...", "note": "..." }],
}
```

### Version bump rules

| Change                                        | What bumps                                    |
| --------------------------------------------- | --------------------------------------------- |
| New rule file added to Layer 1                | `guardrailVersion` patch (e.g. 1.1.0 → 1.1.1) |
| Layer description or rationale updated        | `guardrailVersion` patch                      |
| New layer added or `requiredLayers` changed   | `guardrailVersion` minor (e.g. 1.1.0 → 1.2.0) |
| Breaking shape change (field renamed/removed) | `schemaVersion` + `guardrailVersion` major    |

`guardrailVersion` must always match `.cursor/guardrail-version`. The weekly workflow auto-bumps on tool upgrades; layer/rule changes are bumped manually as part of the PR.

---

## How downstream tools consume this file

### Recommended: vendored copy (default for Throughline)

The downstream tool commits a copy of `guardrail-layers.json` into its own repo (e.g. `src/data/guardrail-layers.json`). This keeps it:

- **Reproducible** — the same build always sees the same model
- **Auditable** — the exact version prescribed is visible in version control
- **Offline-safe** — no network dependency at build or runtime
- **Deterministic** — critical for regulated tools where governance decisions must be frozen and traceable

The copy is refreshed automatically by a GitHub Actions workflow (see below). Human review and merge of the refresh PR is the confirmation step.

### Raw GitHub URL (for reference / drift checks)

```
https://raw.githubusercontent.com/AGM82/cursor-guardrails/main/guardrail-layers.json
```

Use this URL in drift checks and validation scripts — not in production runtime paths.

### What to avoid

- **Runtime fetch in the governed path:** a network call at request time means the prescribed model can vary between builds and is not auditable. Never do this in a governance tool.
- **Git submodule:** fiddly to maintain and breaks clean fork/template workflows.

---

## Automated refresh: how downstream repos stay current

Two complementary mechanisms keep downstream tools in sync:

### A — GitHub Release anchor (passive, always-on)

When `.cursor/guardrail-version` or `guardrail-layers.json` changes on `main`, the `propagate-guardrail-version.yml` workflow creates a GitHub Release tagged `guardrail-vX.Y.Z`. This gives downstream tools a stable, versioned API endpoint:

```
GET https://api.github.com/repos/AGM82/cursor-guardrails/releases/latest
```

Downstream drift checks compare `tag_name` (e.g. `guardrail-v1.1.0`) against the vendored `guardrailVersion`. No secret required — uses the public GitHub API.

### B — Push sync via `repository_dispatch` (immediate notification)

The same workflow fires a `repository_dispatch` event (type `guardrail-version-bump`) to each registered downstream repo. The payload carries `version` and `manifestUrl`. The downstream workflow opens a refresh PR immediately — no waiting for the next schedule.

This requires a `DOWNSTREAM_DISPATCH_TOKEN` secret in this repository (see below).

---

## Setting up `DOWNSTREAM_DISPATCH_TOKEN`

This is a one-time, manual setup. Without it, mechanism B is skipped gracefully — mechanism A (scheduled drift check) still works.

### 1. Create a fine-grained PAT

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. Name: `cursor-guardrails → throughline dispatch`
3. Expiration: 1 year (set a calendar reminder to rotate)
4. Resource owner: your GitHub account
5. Repository access: **Only select repositories** → select the Throughline repo
6. Permissions → Repository permissions:
   - **Contents:** Read and write (needed for `POST /repos/{owner}/{repo}/dispatches`)
7. Generate and copy the token (shown only once)

### 2. Add to Cursor Guardrails secrets

1. Go to the cursor-guardrails repo → **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `DOWNSTREAM_DISPATCH_TOKEN`
3. Value: the token you just copied

### 3. Register the downstream repo

In `.github/workflows/propagate-guardrail-version.yml`, the `downstream_repos` array lists each repo to notify. Add any new downstream consumer there.

### Token rotation

When the token expires: create a new one with the same settings, update the `DOWNSTREAM_DISPATCH_TOKEN` secret. The workflow will resume immediately.

---

## Adding a new downstream consumer

1. Add the repo to the `downstream_repos` array in `propagate-guardrail-version.yml`.
2. Expand the fine-grained PAT's repository access to include the new repo (or create a new token).
3. Update the Throughline integration prompt to document the pattern for the new project.

---

## Schema stability guarantee

`schemaVersion: 1` fields will not be renamed or removed without a `schemaVersion` bump. Additive changes (new optional fields) are made freely and noted in `schemaChangelog`. Downstream consumers should ignore unknown fields gracefully.
