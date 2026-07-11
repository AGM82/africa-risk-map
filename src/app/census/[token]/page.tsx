import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { CensusPublicForm } from "@/components/census/census-public-form";
import { CensusInvitationInvalidError } from "@/lib/census/service";

type PageProps = Readonly<{
  params: Promise<{ token: string }>;
}>;

export default async function CensusTokenPage({ params }: PageProps) {
  const { token } = await params;
  const { census } = createFixtureAdminServices();

  try {
    const form = await census.getFormByToken(token);
    return (
      <CensusPublicForm
        token={token}
        purpose={form.purpose}
        expiresAtIso={form.expiresAt.toISOString()}
        organisation={form.organisation}
        territories={form.territories}
      />
    );
  } catch (error) {
    const message =
      error instanceof CensusInvitationInvalidError
        ? error.message
        : "This census link cannot be used.";
    return (
      <main className="bg-background mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Link unavailable</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
      </main>
    );
  }
}
