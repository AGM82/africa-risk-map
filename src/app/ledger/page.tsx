import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { LedgerWorkspace } from "@/components/reporting/ledger-workspace";

export default async function LedgerPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/");

  const { clientBroker, reporting, recalibration } = createFixtureAdminServices();
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

  let clientName: string | null = null;
  let rows: Awaited<ReturnType<typeof reporting.listEndorsementLedger>> = [];
  let csv = "";
  let recalibrationLocked = false;

  if (scope.activeClientId) {
    const client = await clientBroker.getClient(auth, scope.activeClientId);
    clientName = client.client.name;
    rows = await reporting.listEndorsementLedger(auth, scope.activeClientId);
    csv = reporting.exportLedgerCsv(rows);
    const locked = await recalibration.getLockedBatch(auth, scope.activeClientId);
    recalibrationLocked = locked !== null;
  }

  return (
    <LedgerWorkspace
      authRole={auth.role}
      clientName={clientName}
      activeClientId={scope.activeClientId}
      switcherOptions={switcherOptions}
      canWrite={auth.role !== "CLIENT"}
      recalibrationLocked={recalibrationLocked}
      rows={rows}
      csv={csv}
    />
  );
}
