import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { OrganisationsWorkspace } from "@/components/organisations/organisations-workspace";
import type { OrganisationRowView } from "@/components/organisations/organisations-workspace";
import { createFixtureTerritoryRepository } from "@/lib/territory/fixture-repository";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";

function territoryLabel(country: string, subRegion: string): string {
  return subRegion.length > 0 ? `${country} — ${subRegion}` : country;
}

export default async function OrganisationsPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/");
  }

  const { clientBroker, orgLocation } = createFixtureAdminServices();
  const cookieStore = await cookies();
  const scope = await resolveTenantScope(
    auth,
    clientBroker,
    cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value,
  );

  if (scope.activeClientId === null) {
    return (
      <OrganisationsWorkspace
        authRole={auth.role}
        clientName={null}
        activeClientId={null}
        accessibleClientIds={[...scope.accessibleClientIds]}
        switcherOptions={[]}
        rows={[]}
        territories={[]}
        canWrite={auth.role !== "CLIENT"}
      />
    );
  }

  const clientRow = await clientBroker.getClient(auth, scope.activeClientId);
  const withLocations = await orgLocation.listMemberOrganisationsWithLocations(
    auth,
    scope.activeClientId,
  );
  const territoryRepo = createFixtureTerritoryRepository(TERRITORY_FIXTURES);
  const territories = await territoryRepo.list();
  const territoryById = new Map(territories.map((t) => [t.id, t]));

  const rows: OrganisationRowView[] = withLocations.map(({ organisation, locations }) => ({
    id: organisation.id,
    name: organisation.name,
    status: organisation.status,
    defaultPlanType: organisation.defaultPlanType,
    riskMgmtPlanOnFile: organisation.riskMgmtPlanOnFile,
    crisisMgmtPlanOnFile: organisation.crisisMgmtPlanOnFile,
    fullUnderwritingApproved: organisation.fullUnderwritingApproved,
    locations: locations.map((loc) => {
      const territory = territoryById.get(loc.territoryId);
      return {
        id: loc.id,
        siteName: loc.siteName,
        territoryLabel: territory
          ? territoryLabel(territory.country, territory.subRegion)
          : loc.territoryId,
        headcount: loc.headcount,
        assignedPlanType: loc.assignedPlanType,
      };
    }),
  }));

  const withBrokers = await clientBroker.listClientsWithBrokers(auth);
  const switcherOptions = withBrokers
    .filter(({ client }) => scope.accessibleClientIds.includes(client.id))
    .map(({ client }) => ({ id: client.id, name: client.name }));

  return (
    <OrganisationsWorkspace
      authRole={auth.role}
      clientName={clientRow.client.name}
      activeClientId={scope.activeClientId}
      accessibleClientIds={[...scope.accessibleClientIds]}
      switcherOptions={switcherOptions}
      rows={rows}
      territories={territories.map((t) => ({
        id: t.id,
        label: territoryLabel(t.country, t.subRegion),
        riskCategory: t.riskCategory,
        benefitOptions: t.benefitOptions,
      }))}
      canWrite={auth.role !== "CLIENT"}
    />
  );
}
