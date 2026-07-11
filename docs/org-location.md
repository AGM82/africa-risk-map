# Member organisations & locations

Client-scoped **MemberOrganisation** and **OrganisationLocation** models for
reserve/park operators and their territory headcounts.

Canonical domain: `src/lib/org-location/`.  
Schema: `prisma/schema.prisma` + migration `0005_org_location`.  
UI: `/organisations` (scoped to active client).

## Models

### MemberOrganisation

- Belongs to a **Client** (`clientId` tenant key)
- `name`, lifecycle `status` (`PENDING_SUBMISSION` → `UNDER_REVIEW` → `ACTIVE` / `DECLINED`)
- `defaultPlanType` (`ESSENTIAL` / `PREMIUM`) — interim until CoverCategory per Policy
- Underwriting flags: `riskMgmtPlanOnFile`, `crisisMgmtPlanOnFile`, `fullUnderwritingApproved`
- RLS: same broker-visible-clients pattern as `0004_client_broker`

### OrganisationLocation

- A member org's presence in a shared **Territory** with `siteName`, `headcount`, `assignedPlanType`
- Denormalized `clientId` for RLS
- `coverCategoryId` nullable placeholder for policy-structure
- Territory delete is **RESTRICT**; cascades from member org until Endorsements exist

## Underwriting gates

`src/lib/org-location/eligibility.ts` enforces:

| Gate                      | Rule                                                      |
| ------------------------- | --------------------------------------------------------- |
| Territory benefit options | `DECLINE` blocks all; Essential only in `CATEGORIES_1_2`  |
| Very High / Extreme       | Requires risk + crisis management plans on the member org |
| Premium at location       | Requires `fullUnderwritingApproved` on the member org     |

## Service

`createOrgLocationService(repo, territories, clientBroker, audit)`:

| Method                                                                                        | Who                               |
| --------------------------------------------------------------------------------------------- | --------------------------------- |
| `listMemberOrganisations*` / `getMemberOrganisation`                                          | Any role (client-scoped read)     |
| `createMemberOrganisation` / `updateMemberOrganisation` / `createLocation` / `updateLocation` | `INSURER_ADMIN` and `BROKER` only |

Fixture repository: `createFixtureOrgLocationRepository(ORG_LOCATION_FIXTURES)`.

## Out of scope here

- Policy / CoverCategory FK wiring → policy-structure to-dos
- Endorsement ledger → premium-calculator / recalibration-wizard
- Map pin overlay for org locations → future map integration
