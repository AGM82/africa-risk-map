import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { DashboardWorkspace, type DashboardView } from "@/components/reporting/dashboard-workspace";

export default async function DashboardPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/");

  const { clientBroker, reporting } = createFixtureAdminServices();
  const cookieStore = await cookies();
  const scope = await resolveTenantScope(
    auth,
    clientBroker,
    cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value,
  );

  const withBrokers = await clientBroker.listClientsWithBrokers(auth);
  const switcherOptions = withBrokers
    .filter(({ client }) => scope.accessibleClientIds.includes(client.id))
    .map(({ client }) => ({ id: client.id, name: client.name }));

  let dashboard: DashboardView | null = null;
  let clientName: string | null = null;

  if (scope.activeClientId) {
    const snap = await reporting.getClientDashboard(auth, scope.activeClientId);
    clientName = snap.clientName;
    dashboard = {
      clientName: snap.clientName,
      organisationCount: snap.organisationCount,
      locationCount: snap.locationCount,
      totalLives: snap.totalLives,
      monthlyPremium: snap.book?.totalMonthlyPremium ?? null,
      monthlyAggregate: snap.book?.totalMonthlyAggregate ?? null,
      policyYear: snap.book?.policyYear ?? null,
      unsupportedReason: snap.unsupportedReason,
      riskMixOutside: snap.riskMix?.outsideTolerance ?? false,
      recalibrationLocked: snap.recalibrationLocked,
      monthlySeries: snap.monthlySeries,
      insight: snap.insight,
    };
  }

  return (
    <DashboardWorkspace
      authRole={auth.role}
      clientName={clientName}
      activeClientId={scope.activeClientId}
      switcherOptions={switcherOptions}
      dashboard={dashboard}
    />
  );
}
