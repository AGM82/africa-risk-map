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
import { createPremiumCalculatorService } from "@/lib/premium/service";
import { createFixtureRecalibrationRepository } from "@/lib/recalibration/fixture-repository";
import { RECALIBRATION_FIXTURES } from "@/lib/recalibration/fixtures";
import { createRecalibrationService } from "@/lib/recalibration/service";
import { createDefaultStructureDrafter } from "@/lib/structure-chat/anthropic-drafter";
import { createFixtureStructureChatRepository } from "@/lib/structure-chat/fixture-repository";
import { STRUCTURE_CHAT_FIXTURES } from "@/lib/structure-chat/fixtures";
import { createStructureChatService } from "@/lib/structure-chat/service";
import { createReportingService } from "@/lib/reporting/service";
import { createFixtureTerritoryRepository } from "@/lib/territory/fixture-repository";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";
import { createFixtureUserDirectory } from "@/lib/user-admin/directory";
import { MANAGED_USER_FIXTURES } from "@/lib/user-admin/fixtures";
import { createUserAdminService } from "@/lib/user-admin/service";

type FixtureAdminServices = ReturnType<typeof buildFixtureAdminServices>;

const globalForFixtures = globalThis as unknown as {
  fixtureAdminServices?: FixtureAdminServices;
};

function buildFixtureAdminServices() {
  const audit = createFixtureAuditWriter();
  const clientBroker = createClientBrokerService(
    createFixtureClientBrokerRepository(CLIENT_BROKER_FIXTURES),
    audit,
  );
  const territoryRepo = createFixtureTerritoryRepository(TERRITORY_FIXTURES);
  const orgLocationRepo = createFixtureOrgLocationRepository(ORG_LOCATION_FIXTURES);
  const orgLocation = createOrgLocationService(orgLocationRepo, territoryRepo, clientBroker, audit);
  const policyRepo = createFixturePolicyRepository(POLICY_FIXTURES);
  const policy = createPolicyService(policyRepo, clientBroker, audit, async () => {
    const territories = await territoryRepo.list();
    return territories.map((t) => ({ id: t.id, benefitOptions: t.benefitOptions }));
  });
  const recalibration = createRecalibrationService(
    createFixtureRecalibrationRepository(RECALIBRATION_FIXTURES),
    orgLocationRepo,
    clientBroker,
    audit,
    {
      getOnRiskPolicyId: async (clientId) => {
        const active = await policyRepo.getActivePolicy(clientId);
        return active?.id ?? null;
      },
    },
  );
  const premium = createPremiumCalculatorService(
    orgLocationRepo,
    territoryRepo,
    policy,
    recalibration,
    clientBroker,
    audit,
  );
  const reporting = createReportingService(
    orgLocationRepo,
    territoryRepo,
    policy,
    premium,
    recalibration,
    clientBroker,
    audit,
  );
  const structureChat = createStructureChatService(
    createFixtureStructureChatRepository(STRUCTURE_CHAT_FIXTURES),
    clientBroker,
    policy,
    createDefaultStructureDrafter(),
    audit,
  );
  const userAdmin = createUserAdminService(
    createFixtureUserDirectory(MANAGED_USER_FIXTURES),
    clientBroker,
    audit,
  );
  return {
    audit,
    clientBroker,
    orgLocation,
    recalibration,
    policy,
    premium,
    reporting,
    structureChat,
    userAdmin,
  };
}

/**
 * Builds admin services wired to in-memory fixtures until Prisma adapters land.
 * Cached on globalThis so mutations (e.g. Structure Chat sessions) survive
 * server-action → revalidate within the same Node process.
 */
export function createFixtureAdminServices() {
  if (!globalForFixtures.fixtureAdminServices) {
    globalForFixtures.fixtureAdminServices = buildFixtureAdminServices();
  }
  return globalForFixtures.fixtureAdminServices;
}
