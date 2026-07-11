# Census intake (member org profile + magic link)

Copy-link census declarations for member organisations (parks/reserves). No email
provider and no document uploads in this slice. Parks never get Clerk logins.

Canonical domain: `src/lib/census/`.  
Schema: `prisma/schema.prisma` + migration `0011_census_intake`.  
Public UI: `/census/[token]`.  
Review UI: `/census-review`.  
Invite/copy link: `/organisations`.

## Lifecycle

```text
Invite (copy link) → Public form submit → UNDER_REVIEW
  → Accept (book) | Request changes | Decline
```

- **Draft ≠ book.** Submit creates a `CensusSubmission`; live locations /
  endorsements change only on **Accept**.
- Same form for **NEW** (onboarding) and **UPDATE** (annual re-census).
- Creating a new invitation revokes any prior open invite for that org.
- Default invite TTL: **14 days**. Raw token is shown once; only SHA-256
  `tokenHash` is stored.

## Who can do what

| Action                                        | Roles                               |
| --------------------------------------------- | ----------------------------------- |
| Stub-create member org + create/revoke invite | Insurer, Broker, **Client**         |
| Public submit by token                        | Anyone with a valid link (no Clerk) |
| List submissions                              | Any role with client access         |
| Accept / decline / request changes            | Insurer, Broker only                |

## Accept rules

1. Preflight underwriting/eligibility for every declared plan count, then upsert
   locations. Only after location writes succeed: update MemberOrganisation
   profile, set `ACTIVE`, set `lastCensusAcceptedAt`, and mark the submission
   `ACCEPTED` (so a failed gate cannot leave the org looking accepted).
2. Set risk/crisis _available_ flags when checked — never auto-set
   `fullUnderwritingApproved`.
3. Upsert locations by `(org, territory, siteName, planType)`:
   - Declared `0` clears an existing slot (unlocked: set headcount; locked:
     `REMOVE` endorsement). No slot and declared `0` is a no-op.
   - **Recalibration unlocked:** set `OrganisationLocation.headcount` directly.
   - **Locked:** create location at headcount 0 if needed; write `ADD`/`REMOVE`
     endorsements for the delta vs current book (same pattern as premium what-if).
4. Underwriting gates (`eligibility.ts`) still apply on accept for Premium /
   high-risk territories.

## Decline rules

- **NEW** invite: mark the member org `DECLINED` (onboarding rejected).
- **UPDATE** (recensus): decline only the submission; restore the org to
  `ACTIVE` so the live book is not deactivated.

## POPIA

Collect **organisation contact** only (name, email, phone). Headcounts are
counts by Essential/Premium — never named insured persons. Public submit audits
as `actorUserId: census:<invitationId>`, `actorRole: CLIENT`.

## Out of scope here

- Transactional email / Inngest invite jobs
- Document upload for risk/crisis plans
- Member-org platform users
- Custom survey builder

## Related

- [`docs/org-location.md`](org-location.md) — MemberOrganisation / locations
- [`docs/premium-calculator.md`](premium-calculator.md) — what-if endorse path
- [`docs/recalibration.md`](recalibration.md) — lock gate for ledger writes
