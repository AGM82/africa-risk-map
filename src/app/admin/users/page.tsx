import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { UsersWorkspace } from "@/components/admin/users-workspace";
import type { ManagedUserView } from "@/components/admin/users-workspace";

export default async function UsersAdminPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/");
  }
  if (auth.role === "CLIENT") {
    redirect("/");
  }

  const { clientBroker, userAdmin } = createFixtureAdminServices();
  const cookieStore = await cookies();
  const scope = await resolveTenantScope(
    auth,
    clientBroker,
    cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value,
  );

  const users: ManagedUserView[] = (await userAdmin.listUsers(auth)).map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    clientId: u.clientId,
    brokerOrganisationId: u.brokerOrganisationId,
    active: u.active,
    pendingInvite: u.pendingInvite,
  }));

  const clients = (await clientBroker.listAccessibleClients(auth)).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const brokers =
    auth.role === "INSURER_ADMIN"
      ? (await clientBroker.listBrokerOrganisations(auth)).map((b) => ({
          id: b.id,
          name: b.name,
        }))
      : [];

  return (
    <UsersWorkspace
      authRole={auth.role}
      users={users}
      clients={clients}
      brokers={brokers}
      activeClientId={scope.activeClientId}
      accessibleClientIds={[...scope.accessibleClientIds]}
    />
  );
}
