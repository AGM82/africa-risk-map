# premium-calculator

Endorsement ledger + FIXED_SUM / PPPM premium engine, CoverCategory FK on
locations, `/calculator` UI with what-if gates and risk-mix drift.

## Delivered

- Prisma + `0009_endorsement` RLS (Endorsement + CoverCategory FK)
- `src/lib/premium/` compute (PPPM + Stated Benefits wage-roll), risk-mix, gates, service + tests
- Endorsement on `src/lib/org-location/`; recalibration lock bootstraps BASELINE
- `/calculator` workspace; org form cover-category select
- Docs: `docs/premium-calculator.md`

## Deferred

- Real African Parks production schedule/wage figures (demo placeholder until live load)
- Endorsement history table / reverse UI → dashboards-reporting

## Next

- `dashboards-reporting` — Composer (Phase 6)
