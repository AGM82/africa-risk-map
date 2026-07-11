import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { AuditWorkspace } from "@/components/reporting/audit-workspace";

export default async function AuditPage() {
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

  const clientName =
    scope.activeClientId === null
      ? null
      : (await clientBroker.getClient(auth, scope.activeClientId)).client.name;

  const rows = await reporting.listAuditLog(auth, scope.activeClientId);
  const csv = reporting.exportAuditCsv(rows);

  return (
    <AuditWorkspace
      authRole={auth.role}
      clientName={clientName}
      activeClientId={scope.activeClientId}
      switcherOptions={switcherOptions}
      rows={rows}
      csv={csv}
    />
  );
}
