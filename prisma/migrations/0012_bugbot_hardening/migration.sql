-- BugBot hardening: one open broker assignment per client; tighten audit RLS
-- so platform-wide (clientId IS NULL) rows are insurer-only.
--
-- NOTE: hand-authored. Numbered 0012 to leave 0011 for census intake when that
-- branch merges first. Verify with `npx prisma migrate diff` before deploy.

-- At most one current (open) broker assignment per client.
CREATE UNIQUE INDEX "client_broker_assignments_one_open_per_client"
  ON "client_broker_assignments" ("clientId")
  WHERE "effectiveTo" IS NULL;

-- Replace audit tenant policy: NULL clientId is no longer readable by all roles.
DROP POLICY IF EXISTS "audit_log_entries_tenant_isolation" ON "audit_log_entries";

CREATE POLICY "audit_log_entries_tenant_isolation" ON "audit_log_entries"
  USING (
    current_setting('app.current_role', true) = 'INSURER_ADMIN'
    OR (
      "clientId" IS NOT NULL
      AND "clientId" = current_setting('app.current_client_id', true)
    )
    OR (
      "clientId" IS NOT NULL
      AND "clientId" IN (
        SELECT "clientId" FROM "client_broker_assignments"
        WHERE "brokerOrganisationId" = current_setting('app.current_broker_org_id', true)
          AND "effectiveTo" IS NULL
      )
    )
  );
