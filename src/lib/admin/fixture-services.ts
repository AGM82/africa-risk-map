import { createFixtureAuditWriter } from "@/lib/audit/writer";
import { createFixtureClientBrokerRepository } from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import { createClientBrokerService } from "@/lib/client/service";
import { createFixtureOrgLocationRepository } from "@/lib/org-location/fixture-repository";
import { ORG_LOCATION_FIXTURES } from "@/lib/org-location/fixtures";
import { createOrgLocationService } from "@/lib/org-location/service";
import { createFixtureRecalibrationRepository } from "@/lib/recalibration/fixture-repository";
import { RECALIBRATION_FIXTURES } from "@/lib/recalibration/fixtures";
import { createRecalibrationService } from "@/lib/recalibration/service";
import { createFixtureTerritoryRepository } from "@/lib/territory/fixture-repository";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";
import { createFixtureUserDirectory } from "@/lib/user-admin/directory";
import { MANAGED_USER_FIXTURES } from "@/lib/user-admin/fixtures";
import { createUserAdminService } from "@/lib/user-admin/service";

/**
 * Builds the admin services wired to in-memory fixtures. Used by the /clients,
 * /organisations, /recalibration, and /admin/users surfaces (and server actions)
 * until a Prisma-backed repository is provisioned with Neon + Clerk.
 *
 * A single shared audit writer is returned so ACCESS_CHANGE / CONFIRM entries
 * from all services land in one place within a request.
 */
export function createFixtureAdminServices() {
  const audit = createFixtureAuditWriter();
  const clientBroker = createClientBrokerService(
    createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES),
    audit,
  );
  const orgLocationRepo = createFixtureOrgLocationRepository(ORG_LOCATION_FIXTURES);
  const orgLocation = createOrgLocationService(
    orgLocationRepo,
    createFixtureTerritoryRepository(TERRITORY_FIXTURES),
    clientBroker,
    audit,
  );
  const recalibration = createRecalibrationService(
    createFixtureRecalibrationRepository(RECALIBRATION_FIXTURES),
    orgLocationRepo,
    clientBroker,
    audit,
  );
  const userAdmin = createUserAdminService(
    createFixtureUserDirectory(MANAGED_USER_FIXTURES),
    clientBroker,
    audit,
  );
  return { audit, clientBroker, orgLocation, recalibration, userAdmin };
}
