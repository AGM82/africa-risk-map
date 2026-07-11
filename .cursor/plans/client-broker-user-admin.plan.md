# Plan: `client-broker-model` + `user-admin`

**Status:** implemented  
**Model (implementation):** Grok 4.5 High Fast  
**Branch:** `feat/client-broker-user-admin`  
**Does not edit:** `.cursor/plans/africa-risk-map-platform-plan.md`

## Goal

Ship Client / BrokerOrganisation / ClientBrokerAssignment (Prisma + fixture
services + admin UI) together with Clerk-backed user administration
(invite/role/deactivate + ACCESS_CHANGE audit), fixture-first — no live Neon
required for CI.

## Delivered

- Migration `0004_client_broker` with RLS (broker-visible-clients subquery)
- `src/lib/client/`, `src/lib/user-admin/`, `src/lib/audit/`
- `resolveTenantScope` + `arm_active_client_id` cookie switcher
- Routes `/clients`, `/admin/users`
- Docs: `docs/client-broker.md`, `docs/user-admin.md`

## Out of scope

MemberOrganisation, Policy, live Neon seed, full icon-rail nav.
