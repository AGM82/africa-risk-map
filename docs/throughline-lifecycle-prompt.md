# Throughline lifecycle alignment prompt

Paste the text below into Cursor in the Throughline project. It complements
[`docs/throughline-integration-prompt.md`](./throughline-integration-prompt.md)
(which handled vendoring `guardrail-layers.json` and building
`getGuardrailProfile()`) by adding the piece that was still missing: emitting
the `guardrail-prescription.json` handoff file so a project doesn't have to
re-answer profiling questions that Throughline already answered
deterministically, and surfacing the same Build/Maintain lifecycle stages
cursor-guardrails documents.

Read [`docs/guardrail-prescription.md`](./guardrail-prescription.md) and
[`docs/project-lifecycle.md`](./project-lifecycle.md) in cursor-guardrails
before running this prompt — it assumes that contract and stage model.

---

## PROMPT (copy everything below this line)

```
I need you to close the loop between this project's deterministic guardrail
profile and cursor-guardrails' /guardrail-upgrade command, and surface our
lifecycle stages consistently. Work through the steps below in order. Run
npm run typecheck, npm run lint, and npm run test after each step and fix
any failures before continuing.

---

BACKGROUND

This project already vendors cursor-guardrails' guardrail-layers.json
(src/data/guardrail-layers.json) and computes a deterministic profile via
getGuardrailProfile(tier) in src/lib/guardrail-profile.ts, which returns:

  {
    templateRef: string,        // "cursor-guardrails (apply via /guardrail-upgrade)"
    guardrailVersion: string,
    prescribedAt: string,
    layers: Array<{ layer: number, name: string, description: string,
                     safe: boolean, artefacts: string[], required: boolean }>,
    buildHighlights: string[],
  }

That output tells the user which layers to apply, but nothing actually hands
this to /guardrail-upgrade in the target project — the user has to manually
re-answer /guardrail-upgrade's own 3 profiling questions, which can produce a
different (and unaudited) answer than the tier Throughline just certified.

cursor-guardrails now defines a small contract for exactly this handoff:
guardrail-prescription.json (see cursor-guardrails' docs/guardrail-prescription.md
for the authoritative shape). /guardrail-upgrade already knows how to detect
this file, drift-check it, and skip its own questions when it's present. This
project just needs to emit it.

The deterministic guarantee must be preserved exactly as classifier.ts and
guardrail-profile.ts already document: no AI call, no network call, no
randomness, anywhere in this path.

---

STEP 1 — Add a prescription builder (pure function, no side effects)

In src/lib/guardrail-profile.ts (or a new src/lib/guardrail-prescription.ts
if that keeps the file focused), add:

  export interface GuardrailPrescription {
    $contract: "cursor-guardrails/guardrail-prescription";
    contractVersion: 1;
    guardrailVersion: string;
    source: "throughline";
    classifiedAt: string;      // ISO date
    tier: RiskTier;
    requiredLayers: number[];
    rationale?: string;
  }

  export function buildGuardrailPrescription(
    tier: RiskTier,
    classifiedAt: string,       // pass in, do not call Date.now() inside — keep this pure and testable
    rationale?: string,
  ): GuardrailPrescription {
    const profile = getGuardrailProfile(tier);
    return {
      $contract: "cursor-guardrails/guardrail-prescription",
      contractVersion: 1,
      guardrailVersion: profile.guardrailVersion,
      source: "throughline",
      classifiedAt,
      requiredLayers: profile.layers.filter((l) => l.required).map((l) => l.layer),
      tier,
      ...(rationale ? { rationale } : {}),
    };
  }

Keep this a pure function — same inputs always yield the same output. No AI
call, no fetch, no Date.now()/randomness inside it.

If a `rationale` string would be useful, derive it deterministically from the
classifier's factorResults (e.g. join the names of factors scored "High"),
not from any AI-generated text.

---

STEP 2 — Surface a "Download prescription" action in the Build Package

Wherever the Build Package (or equivalent classification-result screen)
currently displays getGuardrailProfile() output:

2a. Call buildGuardrailPrescription(tier, new Date().toISOString().slice(0, 10), rationale)
    at the point the user views or exports the Build Package — NOT inside
    the pure function itself. The impure "what is today's date" call belongs
    in the calling UI code, not in the deterministic core.

2b. Add a button/action "Download guardrail-prescription.json" that
    serialises the result with JSON.stringify(prescription, null, 2) and
    triggers a browser download (or writes to disk if this runs server-side)
    named exactly guardrail-prescription.json.

2c. Add a one-line instruction next to the button:
    "Drop this file into the target project's root, then run
    /guardrail-upgrade — it will be detected automatically."

---

STEP 3 — Surface the Build/Maintain lifecycle stages

cursor-guardrails documents a two-track model (see its docs/project-lifecycle.md):
a Build track of 8 standard SDLC stages that runs once per project, and a
Maintain track that runs forever (the guardrail-upgrade loop this project
already participates in via sync-guardrail-manifest.yml).

3a. Wherever this project shows its own workflow or project stages to the
    user (e.g. a project detail view, a status stepper), add the 8 Build
    stage names as a reference list if one does not already exist:
    Discover & Define, Design, Build, Verify, Secure, Review, Release,
    (then Operate & Maintain as the ongoing Stage 8, shown separately as
    it is not a "step" but a loop).

3b. Do NOT invent new business logic to auto-advance a project through these
    stages — this is a display/reference addition only, unless project
    management stage-tracking is already a scoped, separate piece of work.
    If it is not, stop after adding the reference list and ask before going
    further.

---

STEP 4 — Add a test for the prescription builder

In the existing test suite (alongside guardrail-manifest.test.ts or similar):

4a. Assert buildGuardrailPrescription returns a fixed, expected shape for a
    known tier (e.g. "High") against the currently vendored manifest —
    $contract, contractVersion === 1, guardrailVersion matches the vendored
    manifest, requiredLayers matches manifest.riskTiers.High.requiredLayers.

4b. Assert calling it twice with the same arguments produces byte-identical
    JSON (proves purity/determinism).

---

STEP 5 — Verify and commit

5a. Run: npm run typecheck — fix all errors before continuing.
5b. Run: npm run lint — fix all errors before continuing.
5c. Run: npm run test — fix all failures before continuing.
5d. Stage all changes and create a commit:

    git add -A
    git commit -m "feat(guardrails): emit guardrail-prescription.json for /guardrail-upgrade handoff

    - Add buildGuardrailPrescription(), a pure function deriving the
      contract from the existing deterministic guardrail profile
    - Add a 'Download guardrail-prescription.json' action to the Build
      Package so a target project's /guardrail-upgrade can consume it
      without re-answering its own profiling questions
    - Surface the cursor-guardrails Build/Maintain lifecycle stages as
      a reference list
    - Add a determinism test for the new builder"

5e. Open a PR and confirm CI passes before merging.

---

HARD STOPS

- Do not make any runtime network call inside buildGuardrailPrescription()
  or classifyRisk() or getGuardrailProfile(). All three must remain pure,
  deterministic, build-time/call-time-only functions.
- Do not let any AI-generated text set tier, requiredLayers, or
  guardrailVersion — those always come from the deterministic classifier
  and the vendored manifest.
- Do not add AI-generated content to the `rationale` field — derive it only
  from the classifier's own factorResults, or omit it.
- Do not disable TypeScript strict mode or any ESLint rule to make this
  compile. Fix the cause of every error.
- Do not skip the test step. If tests fail after your changes, fix them.
- Do not build stage auto-advancement logic (Step 3) unless it is already a
  separate, scoped piece of work — ask first.
```
