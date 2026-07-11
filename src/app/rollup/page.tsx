import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { RollupWorkspace } from "@/components/reporting/rollup-workspace";

export default async function RollupPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/");
  if (auth.role !== "INSURER_ADMIN") redirect("/dashboard");

  const { reporting } = createFixtureAdminServices();
  const rows = await reporting.getInsurerRollup(auth);
  const csv = reporting.exportRollupCsv(rows);

  return <RollupWorkspace authRole={auth.role} rows={rows} csv={csv} />;
}
