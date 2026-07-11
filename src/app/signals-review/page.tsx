import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { SignalsReviewWorkspace } from "@/components/external-signal/signals-review-workspace";
import { displayLabel } from "@/lib/territory/types";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";

export default async function SignalsReviewPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/");
  if (auth.role !== "INSURER_ADMIN") redirect("/map");

  const { externalSignal } = createFixtureAdminServices();
  const queue = await externalSignal.listQueue(auth);
  const territoryLabel = new Map(
    TERRITORY_FIXTURES.map((t) => [t.id, displayLabel(t.country, t.subRegion)]),
  );

  const rows = queue.map((s) => ({
    id: s.id,
    territoryId: s.territoryId,
    territoryLabel: territoryLabel.get(s.territoryId) ?? s.territoryId,
    source: s.source,
    indicator: s.indicator,
    value: s.value,
    asOfDate: s.asOfDate.toISOString().slice(0, 10),
    fetchedAt: s.fetchedAt.toISOString(),
    reviewSuggested: s.reviewSuggested,
    quote: s.quote,
    sourceUrl: s.sourceUrl,
    affectedSubScore: s.affectedSubScore,
  }));

  return <SignalsReviewWorkspace authRole={auth.role} rows={rows} />;
}
