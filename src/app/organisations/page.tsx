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

  const { clientBroker, orgLocation, policy, census } = createFixtureAdminServices();
  const cookieStore = await cookies();
  const scope = await resolveTenantScope(
    auth,
    clientBroker,
    cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value,
  );

  const canInviteCensus = true;

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
        coverCategories={[]}
        canWrite={auth.role !== "CLIENT"}
        canInviteCensus={canInviteCensus}
      />
    );
  }

  const clientRow = await clientBroker.getClient(auth, scope.activeClientId);
  const withLocations = await orgLocation.listMemberOrganisationsWithLocations(
    auth,
    scope.activeClientId,
  );
  const invitations = await census.listInvitations(auth, scope.activeClientId);
  const now = Date.now();
  const openInviteByOrg = new Map(
    invitations
      .filter((i) => i.revokedAt === null && i.expiresAt.getTime() > now)
      .map((i) => [i.memberOrganisationId, i.purpose] as const),
  );

  const territoryRepo = createFixtureTerritoryRepository(TERRITORY_FIXTURES);
  const territories = await territoryRepo.list();
  const territoryById = new Map(territories.map((t) => [t.id, t]));
  const schedule = await policy.getActiveSchedule(auth, scope.activeClientId);
  const categoryById = new Map(
    (schedule?.categories ?? []).map(({ category }) => [category.id, category]),
  );
  const coverCategories = (schedule?.categories ?? []).map(({ category }) => ({
    id: category.id,
    label: category.categoryLabel,
    planType: category.planType,
  }));

  const rows: OrganisationRowView[] = withLocations.map(({ organisation, locations }) => ({
    id: organisation.id,
    name: organisation.name,
    status: organisation.status,
    defaultPlanType: organisation.defaultPlanType,
    riskMgmtPlanOnFile: organisation.riskMgmtPlanOnFile,
    crisisMgmtPlanOnFile: organisation.crisisMgmtPlanOnFile,
    fullUnderwritingApproved: organisation.fullUnderwritingApproved,
    contactName: organisation.contactName,
    contactEmail: organisation.contactEmail,
    contactPhone: organisation.contactPhone,
    operationsNote: organisation.operationsNote,
    lastCensusAcceptedAtIso: organisation.lastCensusAcceptedAt?.toISOString() ?? null,
    openInvitationPurpose: openInviteByOrg.get(organisation.id) ?? null,
    locations: locations.map((loc) => {
      const territory = territoryById.get(loc.territoryId);
      const category = loc.coverCategoryId ? categoryById.get(loc.coverCategoryId) : undefined;
      return {
        id: loc.id,
        siteName: loc.siteName,
        territoryLabel: territory
          ? territoryLabel(territory.country, territory.subRegion)
          : loc.territoryId,
        headcount: loc.headcount,
        assignedPlanType: loc.assignedPlanType,
        coverCategoryLabel: category?.categoryLabel ?? null,
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
      coverCategories={coverCategories}
      canWrite={auth.role !== "CLIENT"}
      canInviteCensus={canInviteCensus}
    />
  );
}
