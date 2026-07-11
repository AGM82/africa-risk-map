import { redirect } from "next/navigation";
import { RiskMapWorkspace } from "@/components/map/risk-map-workspace";
import { getAuthContext } from "@/lib/auth/session";

export default async function MapPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/");
  }

  return <RiskMapWorkspace auth={auth} />;
}
