# `guardrail-prescription.json` — the Throughline handoff contract

A small, versioned file that lets a downstream governance tool (primarily [Throughline](https://github.com/AGM82/throughline)) hand its risk classification and layer recommendation to `/guardrail-upgrade`, so the command doesn't have to re-ask the 3 project-profile questions and the applied layers stay traceable to a specific classification.

This is a **separate, additive contract** — it does not change the shape of [`guardrail-layers.json`](../guardrail-layers.json), which remains the canonical adoption-layer model. `guardrail-prescription.json` is a per-project _output_ of applying that model to one specific project.

---

## Where it lives

`/guardrail-upgrade` looks for the file in this order and uses the first one found:

1. `guardrail-prescription.json` (project root)
2. `.cursor/guardrail-prescription.json`

If neither exists, the command falls back to its own self-serve 3-question `projectProfiles` flow (see [`.cursor/commands/guardrail-upgrade.md`](../.cursor/commands/guardrail-upgrade.md), Layer 0.4) — nothing about that flow changes for projects that don't use Throughline.

## Shape

```jsonc
{
  "$contract": "cursor-guardrails/guardrail-prescription",
  "contractVersion": 1,
  "guardrailVersion": "1.3.5", // the cursor-guardrails version this was classified against
  "source": "throughline",
  "classifiedAt": "2026-07-05", // ISO date
  "tier": "High", // Low / Medium / High — must match a key in guardrail-layers.json -> riskTiers
  "requiredLayers": [1, 2, 3, 4, 5, 6], // must match riskTiers[tier].requiredLayers, or be a deliberate override
  "rationale": "Optional human-readable note — e.g. the dominant risk factors that drove this tier.", // optional
}
```

| Field              | Required | Meaning                                                                                                                                                                                                         |
| ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$contract`        | yes      | Always `"cursor-guardrails/guardrail-prescription"` — lets a reader confirm this is the right file before parsing it as this contract.                                                                          |
| `contractVersion`  | yes      | Integer. `1` today. A reader that doesn't recognise the value should warn and fall back to self-serve profiling — never guess at an unknown shape.                                                              |
| `guardrailVersion` | yes      | The `guardrailVersion` from `guardrail-layers.json` at classification time. Used for the drift check below.                                                                                                     |
| `source`           | yes      | Which tool produced this file. `"throughline"` today; other governance tools may use their own identifier.                                                                                                      |
| `classifiedAt`     | yes      | ISO date the classification was made.                                                                                                                                                                           |
| `tier`             | yes      | The risk tier — one of the keys in `guardrail-layers.json` -> `riskTiers`.                                                                                                                                      |
| `requiredLayers`   | yes      | Array of layer numbers. Normally identical to `riskTiers[tier].requiredLayers` at the time of classification — an emitter may include extra layers deliberately, but should not omit any without a `rationale`. |
| `rationale`        | no       | Free text. Surfaced to the user alongside the tier when `/guardrail-upgrade` announces the prescription.                                                                                                        |

## The version-drift rule

Before using the file, `/guardrail-upgrade` compares its `guardrailVersion` against the reference clone's `.cursor/guardrail-version`:

- **Match:** use the prescription as-is.
- **Prescription is behind:** warn (e.g. "This prescription was classified against v1.3.4; the reference clone is on v1.3.5 — consider re-running Throughline to re-certify.") and continue using it — a stale prescription is still a reasonable default, just flagged.
- **Prescription is ahead** (rare — reference clone hasn't been pulled): same warning, inverted.

This mirrors the existing template-clone staleness check in Layer 0 — never block on drift, always warn and continue with what's on disk.

## Forward compatibility

`/guardrail-upgrade` ignores unrecognised `contractVersion` values by falling back to self-serve profiling, and ignores unrecognised extra fields in a recognised `contractVersion` (additive fields may be introduced later without a version bump, the same convention `guardrail-layers.json` uses for its own `schemaChangelog`).

## What this file is not

- It is **not** a copy of the guardrail files themselves. Rules, hooks, CI, and toolchain always come directly from the reference clone via `/guardrail-upgrade` — never from Throughline.
- It is **not** written by `/guardrail-upgrade`. The command only ever reads it; the project (or whichever tool produced it) owns it.
- It does **not** replace `.cursor/guardrail-version` (which records what was actually _applied_, after the fact). `guardrail-prescription.json` records what was _recommended_, before the fact.

## See also

- [`docs/connect-guardrails.md`](./connect-guardrails.md) — Path A vs Path B, step by step
- [`docs/throughline-lifecycle-prompt.md`](./throughline-lifecycle-prompt.md) — how Throughline emits this file
- [`docs/guardrail-layers.md`](./guardrail-layers.md) — the manifest this file's `tier`/`requiredLayers` are derived from
