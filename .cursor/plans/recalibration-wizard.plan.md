# recalibration-wizard

RecalibrationBatch + PlanType baseline reconciliation + lock-when-balanced UI.
Depends on org-location-model (merged PR #12).

## Delivered

- Prisma `RecalibrationBatch` + `0006_recalibration` RLS migration
- Domain: `src/lib/recalibration/` (reconcile, fixture repo, service)
- UI: `/recalibration` with progress bar and lock confirm
- Docs: `docs/recalibration.md`

## Next

- `policy-structure` — Policy / CoverCategory (replace interim PlanType baselines)
- `premium-calculator` — Endorsement ledger after baseline lock
