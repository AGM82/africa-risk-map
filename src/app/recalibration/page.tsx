import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { RecalibrationWorkspace } from "@/components/recalibration/recalibration-workspace";
import type { PlanProgressView } from "@/components/recalibration/recalibration-workspace";

export default async function RecalibrationPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/");
  }

  const { clientBroker, recalibration } = createFixtureAdminServices();
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

  if (scope.activeClientId === null) {
    return (
      <RecalibrationWorkspace
        authRole={auth.role}
        clientName={null}
        activeClientId={null}
        switcherOptions={switcherOptions}
        canWrite={auth.role !== "CLIENT"}
        snapshot={null}
      />
    );
  }

  const clientRow = await clientBroker.getClient(auth, scope.activeClientId);
  const snapshot = await recalibration.getProgress(auth, scope.activeClientId);
  const byPlan: PlanProgressView[] = snapshot.progress.byPlan.map((p) => ({
    planType: p.planType,
    actual: p.actual,
    baseline: p.baseline,
    delta: p.delta,
    balanced: p.balanced,
  }));

  return (
    <RecalibrationWorkspace
      authRole={auth.role}
      clientName={clientRow.client.name}
      activeClientId={scope.activeClientId}
      switcherOptions={switcherOptions}
      canWrite={auth.role !== "CLIENT"}
      snapshot={{
        batchId: snapshot.batch.id,
        status: snapshot.batch.status,
        lockedAt: snapshot.batch.lockedAt?.toISOString() ?? null,
        byPlan,
        actualTotal: snapshot.progress.actualTotal,
        baselineTotal: snapshot.progress.baselineTotal,
        progressRatio: snapshot.progress.progressRatio,
        balanced: snapshot.progress.balanced,
      }}
    />
  );
}
