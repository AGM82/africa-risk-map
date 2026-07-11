---
name: Census org intake
overview: "Add MemberOrganisation profile fields and a magic-link census intake (copy-link only, no uploads): Client/Broker invites parks to declare sites and headcounts; Broker/Insurer reviews and accepts into the book without giving member orgs platform logins."
todos:
  - id: schema-migration
    content: "Migration 0011: MemberOrganisation profile fields + CensusInvitation/Submission/LocationLine + RLS"
    status: completed
  - id: census-domain
    content: src/lib/census types, schemas, fixture repo, service (invite/submit/review/accept) + tests
    status: completed
  - id: wire-fixtures
    content: Extend org fixtures + fixture-services; CLIENT stub-create via census service
    status: completed
  - id: public-form
    content: proxy public /census/[token] + form UI + token submit path
    status: completed
  - id: auth-ui
    content: Organisations profile/copy-link + census review queue UI + home link
    status: completed
  - id: docs-verify
    content: docs/census-intake.md, cross-links, 90-project-context; typecheck/lint/test
    status: completed
isProject: false
---

# Member org profile + census intake

## Decisions locked

- **Invite delivery:** copy magic link in UI only (no email provider).
- **Uploads:** deferred (checkboxes for risk/crisis plan availability only).
- **Same form** for new-org onboarding and annual re-census of `ACTIVE` orgs.
- **Draft ≠ book:** submit → `UNDER_REVIEW`; accept writes profile/locations (and endorsements when recalibration is locked).
- **No Clerk accounts** for member-org contacts.

## Architecture

```mermaid
sequenceDiagram
  participant Client as Client_or_Broker
  participant App as App_authenticated
  participant Link as Public_census_token
  participant Park as Member_org_contact
  participant Review as Broker_or_Insurer

  Client->>App: Create_or_select_MemberOrganisation
  Client->>App: Create_CensusInvitation_copy_link
  App->>Link: token_hashed_in_DB
  Park->>Link: Open_form_submit_declaration
  Link->>App: CensusSubmission_SUBMITTED
  App->>App: MemberOrganisation_UNDER_REVIEW
  Review->>App: Accept_or_decline_or_request_changes
  App->>App: Profile_plus_locations_plus_endorsements_if_locked
```

## Data model (migration `0011_census_intake`)

Extend [`MemberOrganisation`](prisma/schema.prisma) with profile fields (nullable, no PII beyond org contact):

- `contactName`, `contactEmail`, `contactPhone` (strings, optional)
- `operationsNote` (short text, optional)
- `lastCensusAcceptedAt` (datetime, optional)

New tables (client-scoped + RLS pattern from [`0005_org_location`](prisma/migrations/0005_org_location/migration.sql)):

- **`CensusInvitation`** — `clientId`, `memberOrganisationId`, `tokenHash` (unique), `purpose` (`NEW` | `UPDATE`), `expiresAt`, `revokedAt?`, `createdByUserId`, timestamps. Raw token never stored.
- **`CensusSubmission`** — bound to invitation + org; `status` (`SUBMITTED` | `ACCEPTED` | `DECLINED` | `CHANGES_REQUESTED`); snapshot of org name/contact; `asOfDate`; `preferredPlanType`; `riskMgmtPlanAvailable` / `crisisMgmtPlanAvailable` booleans; `reviewNote?`, `reviewedByUserId?`, `reviewedAt?`; `payload` is normalized via child lines (not a free-form blob).
- **`CensusLocationLine`** — `submissionId`, `territoryId`, `siteName`, `essentialHeadcount`, `premiumHeadcount` (ints ≥ 0; at least one location; sum of headcounts ≥ 1 to submit).

Store only **counts by PlanType** on the public form (Essential/Premium). Broker maps to `CoverCategory` on accept using the on-risk policy schedule (same pattern as premium what-if).

## Domain: `src/lib/census/`

Pure, fixture-tested service (mirror [`src/lib/org-location/`](src/lib/org-location/) + [`src/lib/reporting/`](src/lib/reporting/)):

| Method                                                      | Who                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `createInvitation`                                          | `INSURER_ADMIN`, `BROKER`, **`CLIENT`** (own client only) |
| `listInvitations` / `revokeInvitation`                      | same                                                      |
| `getFormByToken` / `submitByToken`                          | public (token + expiry + not revoked)                     |
| `listSubmissionsForReview`                                  | any role with client access (CLIENT read-only)            |
| `acceptSubmission` / `declineSubmission` / `requestChanges` | `INSURER_ADMIN`, `BROKER` only                            |

**Accept rules:**

1. Update MemberOrganisation profile from submission snapshot; set `status: ACTIVE`; set underwriting _availability_ flags only when checked (do **not** auto-set `fullUnderwritingApproved`).
2. Upsert locations by `(memberOrganisationId, territoryId, siteName)`:
   - **Recalibration not locked:** set `OrganisationLocation.headcount` to declared totals (Essential/Premium → `assignedPlanType` + matching on-risk `coverCategoryId` when resolvable); no endorsements yet.
   - **Recalibration locked:** mirror [`confirmWhatIf`](src/lib/premium/service.ts) — ensure location exists with bookkeeping headcount; write `ADD`/`REMOVE` endorsements for the delta vs current on-risk headcount per category; refuse accept if preferred Premium fails existing underwriting gates ([`eligibility.ts`](src/lib/org-location/eligibility.ts)).
3. Audit with existing actions: invitation `CREATE`, submit `CREATE` on `CensusSubmission`, accept `CONFIRM`, decline/request-changes `UPDATE`. Actor for public submit: `actorUserId: "census:<invitationId>"`, `actorRole: CLIENT` (or keep role as a string the audit writer already accepts — match fixture writer types).

**Invite constraints:** one non-revoked, non-expired open invitation per org; creating a new one revokes the previous. Default expiry **14 days**. Token: 32+ bytes random, SHA-256 hash stored.

Wire into [`fixture-services.ts`](src/lib/admin/fixture-services.ts). Extend org fixtures with contact fields and 1–2 sample invitations/submissions for UI demos.

Slightly open CLIENT write for **stub org create + invite only** via census service (not general location CRUD). Keep location/endorsement writes on accept path for Broker/Insurer.

## Public + authenticated UI

- Extend [`src/proxy.ts`](src/proxy.ts): add `/census(.*)` to `isPublicRoute`.
- **Public form:** `src/app/census/[token]/page.tsx` — org identity, contact, as-of date, location rows (territory select from shared territory list exposed by token-scoped loader), Essential/Premium counts, plan checkboxes, submit. Expired/revoked → clear error state.
- **Authenticated:**
  - Enrich [`/organisations`](src/app/organisations/page.tsx) workspace: profile fields, “Copy census link”, invitation status, last accepted date.
  - New **`/census-review`** (or tab on organisations): queue of `SUBMITTED` / `CHANGES_REQUESTED` submissions; Accept / Decline / Request changes with note. CLIENT sees status, no review buttons.
- Home hub link on [`src/app/page.tsx`](src/app/page.tsx).

Server actions: authenticated invite/review under `requireAuthContext`; public submit via Route Handler or token-only server action that **never** calls `requireAuthContext`.

## Docs & project context

- New [`docs/census-intake.md`](docs/census-intake.md): lifecycle, token security, accept→ledger rules, POPIA (org contact only; no named insured persons).
- Cross-link from [`docs/org-location.md`](docs/org-location.md).
- Update canonical list in [`.cursor/rules/90-project-context.mdc`](.cursor/rules/90-project-context.mdc).
- Save this plan at [`.cursor/plans/census-org-intake.plan.md`](.cursor/plans/census-org-intake.plan.md) (CreatePlan output).

## Explicitly out of scope

- Transactional email / Inngest invite jobs
- Document upload / R2 for plans
- Member-org Clerk users
- Custom survey builder / named employee lists
- Changing premium what-if to force census (Broker path remains; census is parallel intake)

## Verification

- `npm run typecheck` / `lint` / `test`
- Domain tests: token expiry/revoke, submit validation, accept unlocked vs locked endorsement deltas, CLIENT cannot accept, underwriting gate on Premium accept
- A11y on public form + review workspace via `expectNoA11yViolations`

## Branch

`feat/census-intake` from current `main` (after dashboards PR merge if still open — otherwise branch from latest main).
