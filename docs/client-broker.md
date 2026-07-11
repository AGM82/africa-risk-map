# Client & broker model

Multi-tenant backbone: **Client** (tenant root), **BrokerOrganisation**, and
effective-dated **ClientBrokerAssignment**.

Canonical domain: `src/lib/client/`.  
Schema: `prisma/schema.prisma` + migration `0004_client_broker`.  
UI: `/clients`.

## Models

### Client

- `id` is the tenant key (`AuthContext.clientId`)
- `name`, unique `code` slug, `status` (`ACTIVE` / `INACTIVE`)
- RLS: Insurer all; CLIENT own row; BROKER clients with a current assignment to
  their broker org (`effectiveTo IS NULL`)

### BrokerOrganisation

- Shared admin entity (no `clientId`)
- Insurer-managed; BROKER users see only their own org via RLS
- Delete of a broker with assignments is **RESTRICT**

### ClientBrokerAssignment

- Links client ↔ broker with `effectiveFrom` / `effectiveTo`
- Closing an assignment (broker change) sets `effectiveTo` — history is kept
- Cascades when a Client is deleted

The broker-visible-clients subquery in the `clients` RLS policy is the pattern
later org/location/policy tables should copy.

## Service

`createClientBrokerService(repo, audit)`:

| Method                                                                        | Who                             |
| ----------------------------------------------------------------------------- | ------------------------------- |
| `listAccessibleClients` / `getClient`                                         | Any authenticated role (scoped) |
| `createClient` / `updateClient` / `createBrokerOrganisation` / `assignBroker` | `INSURER_ADMIN` only            |

Today the repository is the in-memory fixture adapter
(`createFixtureClientBrokerRepository`). Swap for Prisma when Neon is live.

## Active client switcher

Durable scope stays in Clerk metadata. For Insurer/Broker users with multiple
clients, `arm_active_client_id` (httpOnly cookie) selects the active client via
`resolveTenantScope` — Clerk metadata is not rewritten on every switch.

## Out of scope here

- Policy / rates → policy-structure to-dos
- Live Neon seed / migrate deploy
