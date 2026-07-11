import { createFixtureAuditWriter } from "@/lib/audit/writer";
import { createFixtureClientBrokerRepository } from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import { createClientBrokerService } from "@/lib/client/service";
import { createFixtureUserDirectory } from "@/lib/user-admin/directory";
import { MANAGED_USER_FIXTURES } from "@/lib/user-admin/fixtures";
import { createUserAdminService } from "@/lib/user-admin/service";

/**
 * Builds the admin services wired to in-memory fixtures. Used by the /clients
 * and /admin/users surfaces (and server actions) until a Prisma-backed
 * repository/directory is provisioned with Neon + Clerk.
 *
 * A single shared audit writer is returned so ACCESS_CHANGE entries from both
 * services land in one place within a request.
 */
export function createFixtureAdminServices() {
  const audit = createFixtureAuditWriter();
  const clientBroker = createClientBrokerService(
    createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES),
    audit,
  );
  const userAdmin = createUserAdminService(
    createFixtureUserDirectory(MANAGED_USER_FIXTURES),
    clientBroker,
    audit,
  );
  return { audit, clientBroker, userAdmin };
}
