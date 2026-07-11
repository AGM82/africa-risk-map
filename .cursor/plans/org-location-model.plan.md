# org-location-model

MemberOrganisation + OrganisationLocation — client-scoped org/location/headcount
tracking with underwriting gates. Depends on client-broker-model (merged PR #11).

## Delivered

- Prisma models + `0005_org_location` migration with RLS
- Domain: `src/lib/org-location/` (types, schema, eligibility, fixture repo, service)
- UI: `/organisations` with active-client switcher
- Docs: `docs/org-location.md`, `90-project-context.mdc` canonical paths

## Next

- `recalibration-wizard` — reconcile fixture org/locations against ledger baselines
- `policy-structure` — CoverCategory FK replaces interim `PlanType`
