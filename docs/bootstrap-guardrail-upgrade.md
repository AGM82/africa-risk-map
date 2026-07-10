# Bootstrapping guardrail-upgrade on an existing project

The `/guardrail-upgrade` slash command lives inside `.cursor/commands/` — so the
first time you adopt guardrails on a project, that file does not exist yet.
This document gives you three ways to get started — most people only need
Option A.

---

## One-time setup — clone the template

All three options below need `TEMPLATE_PATH`: a folder on your machine that is
a git clone of the `cursor-guardrails` repo itself, separate from the project
you are upgrading. If you don't have this folder yet, create it once, anywhere
outside the project you're upgrading:

```
git clone https://github.com/AGM82/cursor-guardrails
```

Use a plain clone — **not** GitHub's "Use this template" button. That button
is for starting a brand-new project; it creates a disconnected copy with no
link back to this repo, so it can never receive updates with `git pull`. A
plain clone — a **reference clone** — stays linked, and both Option A and
`/guardrail-upgrade` now refresh it automatically (see "Keeping your
reference clone current" below) — you never need to run `git pull` there by
hand.

---

## Option A — Copy-paste prompt (works day zero, nothing to install)

Open your existing project in Cursor. Start a new Agent chat and paste this
block exactly, replacing `TEMPLATE_PATH` with the real path on your machine:

```
Upgrade this project from the cursor-guardrails template.

Template path:
C:\Users\andrewM\OneDrive - Lombard Insurance\Documents\Projects\cursor-guardrails

Follow this workflow:
1. Verify the template path is a git clone and refresh it so nothing below
   reads a stale snapshot: run `git -C "TEMPLATE_PATH" pull --ff-only origin
   main`. If the folder does not exist or is not a git repo, tell me to run
   `git clone https://github.com/AGM82/cursor-guardrails "TEMPLATE_PATH"`
   once (not GitHub's "Use this template" button — that can't receive
   updates), then stop and wait for me to confirm before continuing. If the
   pull fails for another reason, compare
   TEMPLATE_PATH/.cursor/guardrail-version against the published version at
   raw.githubusercontent.com/AGM82/cursor-guardrails/main/.cursor/guardrail-version,
   warn me if it's behind, and continue anyway.
2. Copy .cursor/commands/ from the template into this project (create the
   folder if it does not exist).
3. Capture a pre-upgrade baseline: run typecheck, lint, build, and test
   (skip any that do not exist). Save output to .cursor/guardrail-baseline.log.
4. Commit everything as: chore: snapshot before guardrail upgrade
5. Check for guardrail-prescription.json (project root, then .cursor/) — if
   found, use its tier and requiredLayers directly and skip the questions
   below. Otherwise ask me 3 quick questions to build a project profile:
   project type (frontend-ui / backend-api / full-stack / library-or-cli /
   script-or-prototype), risk level (Low / Medium / High), and whether I
   already have my own ESLint/Prettier/tsconfig setup. Use
   TEMPLATE_PATH/guardrail-layers.json -> projectProfiles and riskTiers to
   turn my answers into a recommended layer set.
6. Compare both projects and show a gap analysis table by layer, alongside
   the recommended layer set from step 5.
7. Ask me which layers to apply before changing anything.
8. Never overwrite src/, package.json, or tsconfig.json — merge only.
9. After the approved layers: run a code compliance audit (Layer 6) and
   report Blocker / Should-fix / Nit findings. Fix blockers before finishing.
10. Show the Layer 7 governance checklist.
```

This produces the same result as `/guardrail-upgrade` once Layer 1 is installed.

---

## Option B — Copy the commands folder (2 minutes)

Open File Explorer. Copy this folder:

```
C:\Users\andrewM\OneDrive - Lombard Insurance\Documents\Projects\cursor-guardrails\.cursor\commands\
```

Into your existing project at:

```
your-project\.cursor\commands\
```

Create `.cursor\commands\` if it does not exist.

Then in Cursor Agent chat, type:

```
/guardrail-upgrade
```

When asked for the template path, paste:

```
C:\Users\andrewM\OneDrive - Lombard Insurance\Documents\Projects\cursor-guardrails
```

---

## Option C — PowerShell one-liner

From a terminal in your existing project folder:

```powershell
$template = "C:\Users\andrewM\OneDrive - Lombard Insurance\Documents\Projects\cursor-guardrails"
$dest = ".cursor\commands"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item "$template\.cursor\commands\*" $dest -Recurse -Force
Write-Host "Commands bootstrapped. Now type /guardrail-upgrade in Cursor chat."
```

---

## What happens next

After bootstrapping, `/guardrail-upgrade` will:

1. Refresh your reference clone (`git pull --ff-only`) before reading
   anything from it, so you always upgrade from the latest published
   template — see "Keeping your reference clone current" below
2. Run a pre-upgrade baseline (saves current typecheck/lint errors)
3. Snapshot git
4. Check for a Throughline `guardrail-prescription.json` — if found, use its
   tier and layers directly; otherwise ask 3 quick project-profile questions
   (type, risk, existing toolchain) and recommend a tailored layer set — not
   every project needs the same layers
5. Compare the project against the template and show a gap analysis
6. Apply approved layers — infrastructure only, never touching your `src/`
7. Run a code compliance audit (Layer 6) against your own code
8. Present a governance activation checklist (Layer 7)

---

## Keeping your reference clone current

You do not need to remember to update `TEMPLATE_PATH` yourself. Both Option A
and the installed `/guardrail-upgrade` command run `git -C "TEMPLATE_PATH"
pull --ff-only origin main` at the very start, before copying or reading
anything from it.

If that pull can't complete — you're offline, there are uncommitted edits in
the clone, or it's on a detached HEAD — the agent will not force or reset
anything on your behalf. Instead it falls back to comparing
`TEMPLATE_PATH/.cursor/guardrail-version` against the published version and
warns you if your reference clone is behind, then continues with whatever is
on disk. If you see that warning, run `git pull` in `TEMPLATE_PATH` yourself
when convenient and re-run the upgrade.

This only works if `TEMPLATE_PATH` is a plain clone with `origin` pointing at
`AGM82/cursor-guardrails` (see "One-time setup" above) — a "Use this
template" copy has no upstream to pull from. Treat the reference clone as
read-only: don't edit files inside it, so the fast-forward pull always
succeeds cleanly.

---

## Suggested first-time layer order

There is no single "right" layer order for every project — that is what the
project-profile step (Layer 0.4) is for. As a rule of thumb:

- **Low risk** (prototype, internal script): the profile recommends layers
  `1 2 3` — AI governance, git hygiene, and commit discipline, without
  forcing a full CI pipeline on something that may be thrown away.
- **Medium risk** (a real feature others depend on): the profile recommends
  `1 2 3 4 5` — adds the code-quality toolchain and CI pipeline.
- **High risk** (production, handles data, customer-facing): the profile
  recommends `1 2 3 4 5 6` — adds the code compliance audit before Layer 7
  governance activation.

Reply `all` instead of the recommendation if you are confident the project
has no conflicting ESLint or TypeScript setup and want to apply everything
in one pass.

---

## See also

- Full upgrade command: `.cursor/commands/guardrail-upgrade.md`
- Direct vs Throughline, step by step for both: `docs/connect-guardrails.md`
- The `guardrail-prescription.json` contract: `docs/guardrail-prescription.md`
- Lessons from a real adoption: `docs/guardrail-upgrade-observations.md`
- User-level rule (universal habits): `docs/user-level-rule.md`
