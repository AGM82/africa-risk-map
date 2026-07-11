import { createFixtureAuditWriter } from "@/lib/audit/writer";
import { createFixtureClientBrokerRepository } from "@/lib/client/fixture-repository";
import { CLIENT_BROKER_FIXTURES } from "@/lib/client/fixtures";
import { createClientBrokerService } from "@/lib/client/service";
import { createFixtureOrgLocationRepository } from "@/lib/org-location/fixture-repository";
import { ORG_LOCATION_FIXTURES } from "@/lib/org-location/fixtures";
import { createOrgLocationService } from "@/lib/org-location/service";
import { createFixturePolicyRepository } from "@/lib/policy/fixture-repository";
import { POLICY_FIXTURES } from "@/lib/policy/fixtures";
import { createPolicyService } from "@/lib/policy/service";
import { createFixtureRecalibrationRepository } from "@/lib/recalibration/fixture-repository";
import { RECALIBRATION_FIXTURES } from "@/lib/recalibration/fixtures";
import { createRecalibrationService } from "@/lib/recalibration/service";
import { createFixtureTerritoryRepository } from "@/lib/territory/fixture-repository";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";
import { createFixtureUserDirectory } from "@/lib/user-admin/directory";
import { MANAGED_USER_FIXTURES } from "@/lib/user-admin/fixtures";
import { createUserAdminService } from "@/lib/user-admin/service";

/**
 * Builds admin services wired to in-memory fixtures until Prisma adapters land.
 */
export function createFixtureAdminServices() {
  const audit = createFixtureAuditWriter();
  const clientBroker = createClientBrokerService(
    createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES),
    audit,
  );
  const territoryRepo = createFixtureTerritoryRepository(TERRITORY_FIXTURES);
  const orgLocationRepo = createFixtureOrgLocationRepository(ORG_LOCATION_FIXTURES);
  const orgLocation = createOrgLocationService(orgLocationRepo, territoryRepo, clientBroker, audit);
  const recalibration = createRecalibrationService(
    createFixtureRecalibrationRepository(RECALIBRATION_FIXTURES),
    orgLocationRepo,
    clientBroker,
    audit,
  );
  const policy = createPolicyService(
    createFixturePolicyRepository(POLICY_FIXTURES),
    clientBroker,
    audit,
    async () => {
      const territories = await territoryRepo.list();
      return territories.map((t) => ({ id: t.id, benefitOptions: t.benefitOptions }));
    },
  );
  const userAdmin = createUserAdminService(
    createFixtureUserDirectory(MANAGED_USER_FIXTURES),
    clientBroker,
    audit,
  );
  return { audit, clientBroker, orgLocation, recalibration, policy, userAdmin };
}
