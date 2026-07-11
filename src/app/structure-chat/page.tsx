import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { ACTIVE_CLIENT_COOKIE, resolveTenantScope } from "@/lib/auth/tenant-scope";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import {
  StructureChatWorkspace,
  type StructureSessionView,
} from "@/components/structure-chat/structure-chat-workspace";

export default async function StructureChatPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/");
  if (auth.role === "CLIENT") redirect("/");

  const { clientBroker, structureChat } = createFixtureAdminServices();
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

  const clientRow =
    scope.activeClientId === null ? null : await clientBroker.getClient(auth, scope.activeClientId);

  const templates = await structureChat.listTemplates(auth);
  const sessions = await structureChat.listSessions(auth, scope.activeClientId);
  const byUpdated = [...sessions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const open = byUpdated.find((s) => s.status === "REVIEWING" || s.status === "DRAFTING");
  const latestConfirmed = byUpdated.find((s) => s.status === "CONFIRMED");
  const active = open ?? latestConfirmed ?? null;

  let session: StructureSessionView | null = null;
  if (active) {
    session = {
      id: active.id,
      clientId: active.clientId,
      status: active.status,
      benefitScale: active.benefitScale,
      sourceText: active.sourceText,
      currentDraft: active.currentDraft,
      uncertainFields: active.uncertainFields,
      confirmedPolicyId: active.confirmedPolicyId,
      confirmedTemplateId: active.confirmedTemplateId,
    };
  }

  return (
    <StructureChatWorkspace
      authRole={auth.role}
      clientName={clientRow?.client.name ?? null}
      activeClientId={scope.activeClientId}
      switcherOptions={switcherOptions}
      canConfirm={auth.role === "INSURER_ADMIN"}
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        benefitScale: t.benefitScale,
      }))}
      session={session}
    />
  );
}
