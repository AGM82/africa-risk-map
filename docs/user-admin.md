# User administration

Invite, role/scope assignment, and deactivate/reactivate for platform users.
Identity lives in Clerk; role and scope live in Clerk `publicMetadata`.

Canonical domain: `src/lib/user-admin/`.  
Audit writer: `src/lib/audit/`.  
UI: `/admin/users` (Insurer and Broker only).

## Who can manage whom

| Actor           | May manage                                                           |
| --------------- | -------------------------------------------------------------------- |
| `INSURER_ADMIN` | INSURER_ADMIN, BROKER, CLIENT (any client)                           |
| `BROKER`        | CLIENT users for clients their BrokerOrganisation currently services |
| `CLIENT`        | Nobody                                                               |

BROKER invites require `brokerOrganisationId`. CLIENT invites require `clientId`.

## Ports

- **`UserDirectory`** — `invite` / `list` / `setScope` / `setActive`
  - Fixture: `createFixtureUserDirectory` (tests + local UI)
  - Live: `createClerkUserDirectory` (Clerk invitations + `publicMetadata` + ban/unban)
- **`AuditWriter`** — every successful invite/scope/activate change writes
  `AuditAction.ACCESS_CHANGE`

No insured-person or financial data is ever sent to Clerk (POPIA). Fixture
emails use `@example.com` only.

## Session token

Clerk Dashboard must include a custom session token claim:

```json
{ "metadata": "{{user.public_metadata}}" }
```

See `types/globals.d.ts`. Without this, `getAuthContext()` cannot read role/scope.

## Out of scope here

- Full icon-rail shell / command palette
- Live Neon-backed audit persistence (fixture writer today)
