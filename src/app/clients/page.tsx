import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { ClientsWorkspace } from "@/components/clients/clients-workspace";
import type { ClientRowView } from "@/components/clients/clients-workspace";

export default async function ClientsPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/");
  }

  const { clientBroker } = createFixtureAdminServices();
  const cookieStore = await cookies();
  const scope = await resolveTenantScope(
    auth,
    clientBroker,
    cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value,
  );

  const withBrokers = await clientBroker.listClientsWithBrokers(auth);
  const rows: ClientRowView[] = withBrokers.map(({ client, broker }) => ({
    id: client.id,
    name: client.name,
    code: client.code,
    status: client.status,
    brokerName: broker?.name ?? null,
  }));

  const brokers =
    auth.role === "INSURER_ADMIN"
      ? (await clientBroker.listBrokerOrganisations(auth)).map((b) => ({
          id: b.id,
          name: b.name,
        }))
      : [];

  return (
    <ClientsWorkspace
      authRole={auth.role}
      rows={rows}
      brokers={brokers}
      activeClientId={scope.activeClientId}
      accessibleClientIds={[...scope.accessibleClientIds]}
    />
  );
}
