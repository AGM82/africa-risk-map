import { redirect } from "next/navigation";
import { RiskMapWorkspace } from "@/components/map/risk-map-workspace";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { getAuthContext } from "@/lib/auth/session";

export default async function MapPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/");
  }

  const { externalSignal } = createFixtureAdminServices();
  const all = await externalSignal.listAll(auth);
  const signals = all.map((s) => ({
    id: s.id,
    territoryId: s.territoryId,
    source: s.source,
    indicator: s.indicator,
    value: s.value,
    status: s.status,
    reviewSuggested: s.reviewSuggested,
    asOfDate: s.asOfDate.toISOString().slice(0, 10),
  }));

  return <RiskMapWorkspace auth={auth} signals={signals} />;
}
