import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import {
  CensusReviewWorkspace,
  type CensusReviewRowView,
} from "@/components/census/census-review-workspace";
import { createFixtureTerritoryRepository } from "@/lib/territory/fixture-repository";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";

function territoryLabel(country: string, subRegion: string): string {
  return subRegion.length > 0 ? `${country} — ${subRegion}` : country;
}

export default async function CensusReviewPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/");
  }

  const { clientBroker, census } = createFixtureAdminServices();
  const cookieStore = await cookies();
  const scope = await resolveTenantScope(
    auth,
    clientBroker,
    cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value,
  );

  if (scope.activeClientId === null) {
    return (
      <CensusReviewWorkspace
        authRole={auth.role}
        clientName={null}
        activeClientId={null}
        switcherOptions={[]}
        rows={[]}
        canReview={auth.role !== "CLIENT"}
      />
    );
  }

  const clientRow = await clientBroker.getClient(auth, scope.activeClientId);
  const submissions = await census.listSubmissionsForReview(auth, scope.activeClientId);
  const territoryRepo = createFixtureTerritoryRepository(TERRITORY_FIXTURES);
  const territories = await territoryRepo.list();
  const territoryById = new Map(territories.map((t) => [t.id, t]));

  const rows: CensusReviewRowView[] = submissions.map(({ submission, locationLines }) => ({
    id: submission.id,
    organisationName: submission.organisationName,
    status: submission.status,
    asOfDateIso: submission.asOfDate.toISOString(),
    preferredPlanType: submission.preferredPlanType,
    contactEmail: submission.contactEmail,
    riskMgmtPlanAvailable: submission.riskMgmtPlanAvailable,
    crisisMgmtPlanAvailable: submission.crisisMgmtPlanAvailable,
    reviewNote: submission.reviewNote,
    locationLines: locationLines.map((line) => {
      const territory = territoryById.get(line.territoryId);
      return {
        territoryLabel: territory
          ? territoryLabel(territory.country, territory.subRegion)
          : line.territoryId,
        siteName: line.siteName,
        essentialHeadcount: line.essentialHeadcount,
        premiumHeadcount: line.premiumHeadcount,
      };
    }),
  }));

  const withBrokers = await clientBroker.listClientsWithBrokers(auth);
  const switcherOptions = withBrokers
    .filter(({ client }) => scope.accessibleClientIds.includes(client.id))
    .map(({ client }) => ({ id: client.id, name: client.name }));

  return (
    <CensusReviewWorkspace
      authRole={auth.role}
      clientName={clientRow.client.name}
      activeClientId={scope.activeClientId}
      switcherOptions={switcherOptions}
      rows={rows}
      canReview={auth.role !== "CLIENT"}
    />
  );
}
